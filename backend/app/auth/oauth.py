# backend/app/auth/oauth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from ..database import get_db
from ..models import User
from .auth import create_access_token, create_refresh_token

load_dotenv()

router = APIRouter()

# Google OAuth Configuration (for mock mode we only check client id existence)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@router.post("/google")
async def google_oauth(token: str, db: Session = Depends(get_db)):
    """
    Authenticate user with Google OAuth token (mock implementation).
    Expects a 'token' string in POST body or query which in mock form is 'mock_email@example.com'.
    In production you should verify the Google token properly.
    """
    try:
        # Guard: ensure dev/test mode is configured
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable."
            )
        
        # ---------- Mock verification ----------
        # For demo/testing: expect tokens that start with 'mock_'
        # Example: token = "mock_vishal@example.com"
        if not token or not isinstance(token, str) or not token.startswith('mock_'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token format. For mock mode token must start with 'mock_'."
            )
        
        # Extract email from the mock token
        email = token.replace('mock_', '')
        if not email or '@' not in email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token: email not found in mock token."
            )
        
        # Look up user by email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user (adjust fields to your User model)
            user = User(
                email=email,
                full_name=email.split('@')[0],
                role="viewer",   # or appropriate default
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create access & refresh tokens via your auth utility
        access_token = create_access_token(data={"sub": user.email})
        refresh_token = create_refresh_token(data={"sub": user.email})
        
        return JSONResponse({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": getattr(user, "id", None),
                "email": user.email,
                "full_name": getattr(user, "full_name", None),
                "role": getattr(user, "role", None),
                "is_active": getattr(user, "is_active", True),
                "created_at": getattr(user, "created_at", None).isoformat() if getattr(user, "created_at", None) else None
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        # Unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth authentication failed: {str(e)}"
        )
