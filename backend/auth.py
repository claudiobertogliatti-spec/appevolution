"""
JWT Authentication Module for Evolution PRO OS
Handles user registration, login, and token management
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "evolution-pro-os-secret-key-2026")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "partner"  # admin, partner


class UserCreate(UserBase):
    password: str


class UserInDB(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hashed_password: str
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None
    # Partner-specific fields
    partner_id: Optional[str] = None
    phase: Optional[str] = "F1"
    # Admin-specific fields
    admin_type: Optional[str] = None  # claudio, antonella


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    partner_id: Optional[str] = None
    phase: Optional[str] = None
    admin_type: Optional[str] = None
    # Campi per cliente_analisi
    user_type: Optional[str] = None
    questionario_compilato: Optional[bool] = None
    pagamento_analisi: Optional[bool] = None
    analisi_generata: Optional[bool] = None
    nome: Optional[str] = None
    cognome: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "partner"
    partner_id: Optional[str] = None
    admin_type: Optional[str] = None


# Password utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


# Token utilities
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    return encoded_jwt


def decode_token(token: str) -> Optional[TokenData]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")
        
        if user_id is None:
            return None
        
        return TokenData(user_id=user_id, email=email, role=role)
    
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        return None


# User operations (to be used with MongoDB)
class AuthService:
    """Authentication service for user management"""
    
    def __init__(self, db):
        self.db = db
        self.collection = db.users
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        user = await self.collection.find_one({"email": email}, {"_id": 0})
        return user
    
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        user = await self.collection.find_one({"id": user_id}, {"_id": 0})
        return user
    
    async def create_user(self, user_data: RegisterRequest) -> dict:
        """Create a new user"""
        # Check if user exists
        existing = await self.get_user_by_email(user_data.email)
        if existing:
            raise ValueError("Email already registered")
        
        # Create user
        user = UserInDB(
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            hashed_password=get_password_hash(user_data.password),
            partner_id=user_data.partner_id,
            admin_type=user_data.admin_type
        )
        
        await self.collection.insert_one(user.model_dump())
        
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "partner_id": user.partner_id,
            "admin_type": user.admin_type
        }
    
    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(email)
        
        if not user:
            return None
        
        # Check both hashed_password and password_hash fields (for cliente_analisi users)
        stored_hash = user.get("hashed_password") or user.get("password_hash", "")
        if not stored_hash or not verify_password(password, stored_hash):
            return None
        
        if not user.get("is_active", True):
            return None
        
        # Update last login
        await self.collection.update_one(
            {"email": email},
            {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        return user
    
    async def login(self, email: str, password: str) -> Optional[Token]:
        """Login and return token"""
        user = await self.authenticate_user(email, password)
        
        if not user:
            return None
        
        # Create token
        access_token = create_access_token(
            data={
                "sub": user["id"],
                "email": user["email"],
                "role": user["role"]
            }
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=JWT_EXPIRATION_HOURS * 3600,
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                name=user["name"],
                role=user["role"],
                is_active=user.get("is_active", True),
                partner_id=user.get("partner_id"),
                phase=user.get("phase"),
                admin_type=user.get("admin_type"),
                # Campi cliente_analisi
                user_type=user.get("user_type"),
                questionario_compilato=user.get("questionario_compilato"),
                pagamento_analisi=user.get("pagamento_analisi"),
                analisi_generata=user.get("analisi_generata"),
                nome=user.get("nome"),
                cognome=user.get("cognome")
            )
        )
    
    async def seed_default_users(self):
        """Create default admin users if they don't exist"""
        default_admins = [
            {
                "email": "claudio@evolutionpro.it",
                "name": "Claudio Bertogliatti",
                "password": "Evolution2026!",
                "role": "admin",
                "admin_type": "claudio"
            },
            {
                "email": "antonella@evolutionpro.it", 
                "name": "Antonella Rossi",
                "password": "Evolution2026!",
                "role": "admin",
                "admin_type": "antonella"
            },
            {
                "email": "claudio.bertogliatti@gmail.com",
                "name": "Claudio Bertogliatti",
                "password": "Evoluzione74",
                "role": "admin",
                "admin_type": "claudio"
            }
        ]
        
        for admin in default_admins:
            existing = await self.get_user_by_email(admin["email"])
            if not existing:
                await self.create_user(RegisterRequest(**admin))
                logger.info(f"Created default admin: {admin['email']}")
