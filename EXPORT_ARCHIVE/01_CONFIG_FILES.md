# PARTE 1: FILE DI CONFIGURAZIONE

## 📁 /app/backend/requirements.txt
```
aiofiles==25.1.0
aiohappyeyeballs==2.6.1
aiohttp==3.13.3
aiosignal==1.4.0
annotated-types==0.7.0
anyio==4.12.1
attrs==25.4.0
bcrypt==4.1.3
black==26.1.0
boto3==1.42.42
botocore==1.42.42
certifi==2026.1.4
cffi==2.0.0
charset-normalizer==3.4.4
click==8.3.1
cloudinary==1.44.1
cryptography==46.0.4
distro==1.9.0
dnspython==2.8.0
ecdsa==0.19.1
email-validator==2.3.0
emergentintegrations==0.1.0
fastapi==0.110.1
fastuuid==0.14.0
ffmpeg-python==0.2.0
filelock==3.20.3
flake8==7.3.0
frozenlist==1.8.0
fsspec==2026.1.0
future==1.0.0
google-ai-generativelanguage==0.6.15
google-api-core==2.29.0
google-api-python-client==2.189.0
google-auth==2.49.0.dev0
google-auth-httplib2==0.3.0
google-auth-oauthlib==1.2.4
google-genai==1.62.0
google-generativeai==0.8.6
googleapis-common-protos==1.72.0
grpcio==1.76.0
grpcio-status==1.71.2
h11==0.16.0
hf-xet==1.2.0
httpcore==1.0.9
httplib2==0.31.2
httpx==0.28.1
huggingface_hub==1.4.0
idna==3.11
importlib_metadata==8.7.1
iniconfig==2.3.0
isort==7.0.0
Jinja2==3.1.6
jiter==0.13.0
jmespath==1.1.0
jq==1.11.0
jsonschema==4.26.0
jsonschema-specifications==2025.9.1
librt==0.7.8
litellm==1.80.0
llvmlite==0.46.0
markdown-it-py==4.0.0
MarkupSafe==3.0.3
mccabe==0.7.0
mdurl==0.1.2
more-itertools==10.8.0
motor==3.3.1
mpmath==1.3.0
multidict==6.7.1
mypy==1.19.1
mypy_extensions==1.1.0
networkx==3.6.1
numba==0.63.1
numpy==2.3.5
oauthlib==3.3.1
openai==1.99.9
packaging==26.0
pandas==3.0.0
passlib==1.7.4
pathspec==1.0.4
pillow==12.1.0
platformdirs==4.5.1
pluggy==1.6.0
propcache==0.4.1
proto-plus==1.27.1
protobuf==5.29.6
pyasn1==0.6.2
pyasn1_modules==0.4.2
pycodestyle==2.14.0
pycparser==3.0
pydantic==2.12.5
pydantic_core==2.41.5
pydub==0.25.1
pyflakes==3.4.0
Pygments==2.19.2
PyJWT==2.11.0
pymongo==4.5.0
pyparsing==3.3.2
pytest==9.0.2
python-dateutil==2.9.0.post0
python-dotenv==1.2.1
python-jose==3.5.0
python-multipart==0.0.22
pytokens==0.4.1
PyYAML==6.0.3
referencing==0.37.0
regex==2026.1.15
requests==2.32.5
requests-oauthlib==2.0.0
rich==14.3.2
rpds-py==0.30.0
rsa==4.9.1
s3transfer==0.16.0
s5cmd==0.2.0
shellingham==1.5.4
six==1.17.0
sniffio==1.3.1
starlette==0.37.2
stripe==14.3.0
sympy==1.14.0
tenacity==9.1.2
tiktoken==0.12.0
tokenizers==0.22.2
tqdm==4.67.3
typer==0.21.1
typer-slim==0.21.1
typing-inspection==0.4.2
typing_extensions==4.15.0
tzdata==2025.3
uritemplate==4.2.0
urllib3==2.6.3
uvicorn==0.25.0
watchfiles==1.1.1
websockets==15.0.1
yarl==1.22.0
zipp==3.23.0
reportlab==4.4.10
resend>=2.0.0
```

## 📁 /app/backend/.env.example
```
# === DATABASE ===
MONGO_URL=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=evolution_pro

# === AUTHENTICATION ===
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# === AI ===
EMERGENT_LLM_KEY=sk-emergent-XXXXX

# === TELEGRAM BOT ===
TELEGRAM_BOT_TOKEN=XXXXX:YYYYY
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_ADMIN_CHAT_ID=123456789
OPENCLAW_CHAT_ID=123456789

# === STRIPE ===
STRIPE_API_KEY=sk_test_XXXXX

# === CLOUDINARY ===
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=XXXXX
CLOUDINARY_API_SECRET=XXXXX

# === SYSTEME.IO ===
SYSTEME_API_KEY=XXXXX
SYSTEME_MCP_KEY=XXXXX
SYSTEME_WEBHOOK_SECRET=XXXXX

# === HEYGEN (optional) ===
HEYGEN_API_KEY=XXXXX

# === CORS ===
CORS_ORIGINS=*
```

## 📁 /app/frontend/package.json
```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@hookform/resolvers": "^5.0.1",
    "@radix-ui/react-accordion": "^1.2.8",
    "@radix-ui/react-alert-dialog": "^1.1.11",
    "@radix-ui/react-aspect-ratio": "^1.1.4",
    "@radix-ui/react-avatar": "^1.1.7",
    "@radix-ui/react-checkbox": "^1.2.3",
    "@radix-ui/react-collapsible": "^1.1.8",
    "@radix-ui/react-context-menu": "^2.2.12",
    "@radix-ui/react-dialog": "^1.1.11",
    "@radix-ui/react-dropdown-menu": "^2.1.12",
    "@radix-ui/react-hover-card": "^1.1.11",
    "@radix-ui/react-label": "^2.1.4",
    "@radix-ui/react-menubar": "^1.1.12",
    "@radix-ui/react-navigation-menu": "^1.2.10",
    "@radix-ui/react-popover": "^1.1.11",
    "@radix-ui/react-progress": "^1.1.4",
    "@radix-ui/react-radio-group": "^1.3.4",
    "@radix-ui/react-scroll-area": "^1.2.6",
    "@radix-ui/react-select": "^2.2.2",
    "@radix-ui/react-separator": "^1.1.4",
    "@radix-ui/react-slider": "^1.3.2",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.2.2",
    "@radix-ui/react-tabs": "^1.1.9",
    "@radix-ui/react-toast": "^1.2.11",
    "@radix-ui/react-toggle": "^1.1.6",
    "@radix-ui/react-toggle-group": "^1.1.7",
    "@radix-ui/react-tooltip": "^1.2.4",
    "@stripe/stripe-js": "^8.8.0",
    "axios": "^1.8.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "cra-template": "1.2.0",
    "date-fns": "^4.1.0",
    "embla-carousel-react": "^8.6.0",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.507.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-day-picker": "8.10.1",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.56.2",
    "react-resizable-panels": "^3.0.1",
    "react-router-dom": "^7.5.1",
    "react-scripts": "5.0.1",
    "recharts": "^3.6.0",
    "sonner": "^2.0.3",
    "tailwind-merge": "^3.2.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "zod": "^3.24.4"
  },
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@babel/plugin-proposal-private-property-in-object": "^7.21.11",
    "@craco/craco": "^7.1.0",
    "@eslint/js": "9.23.0",
    "autoprefixer": "^10.4.20",
    "eslint": "9.23.0",
    "eslint-plugin-import": "2.31.0",
    "eslint-plugin-jsx-a11y": "6.10.2",
    "eslint-plugin-react": "7.37.4",
    "eslint-plugin-react-hooks": "5.2.0",
    "globals": "15.15.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17"
  },
  "packageManager": "yarn@1.22.22+sha512.a6b2f7906b721bba3d67d4aff083df04dad64c399707841b7acf00f6b133b7ac24255f2652fa22ae3534329dc6180534e98d17432037ff6fd140556e2bb3137e"
}
```

## 📁 /app/frontend/.env.example
```
# Backend API URL
REACT_APP_BACKEND_URL=https://your-api-domain.com

# WebSocket port (for development)
WDS_SOCKET_PORT=443
```

## 📁 /app/frontend/tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};```
