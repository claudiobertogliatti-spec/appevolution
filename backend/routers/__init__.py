# Evolution PRO OS - Routers Package
# This package contains modular API routers split from the main server.py
# 
# Migration Status:
# - auth.py: Prepared (endpoints still in server.py)
# - orion.py: Prepared (endpoints still in server.py)
# 
# New features should be added to these router files.
# Gradual migration of existing endpoints will happen over time.

from .auth import router as auth_router
from .orion import router as orion_router

__all__ = ['auth_router', 'orion_router']
