"""
Evolution PRO OS - Auth Router
Authentication & User Management

Note: Main auth endpoints are still in server.py
This file is prepared for gradual migration
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from .dependencies import db, get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Security
security = HTTPBearer(auto_error=False)

# Models (duplicated from server.py for reference)
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str
    partner_id: Optional[str] = None
    admin_type: Optional[str] = None

# Note: Auth endpoints are still in server.py
# This file is prepared for future migration

