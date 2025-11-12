"""
Authentication Package
Contains JWT authentication and authorization utilities
"""

from .auth import (
    verify_password,
    get_password_hash,
    get_user_by_email,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_current_active_user,
    require_admin
)
from .auth import router as auth_router

# Only import oauth_router if the oauth module exists
try:
    from .oauth import router as oauth_router
    __all__ = [
        "verify_password",
        "get_password_hash", 
        "get_user_by_email",
        "authenticate_user",
        "create_access_token",
        "create_refresh_token",
        "get_current_user",
        "get_current_active_user",
        "require_admin",
        "auth_router",
        "oauth_router"
    ]
    print("✅ OAuth router loaded successfully")
except ImportError as e:
    print(f"⚠️  OAuth router not available: {e}")
    __all__ = [
        "verify_password",
        "get_password_hash", 
        "get_user_by_email",
        "authenticate_user",
        "create_access_token",
        "create_refresh_token",
        "get_current_user",
        "get_current_active_user",
        "require_admin",
        "auth_router"
    ]