# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
import traceback

try:
    from app.database import get_db
    from app.models import User
    from app.schemas import Token, UserCreate, User as UserSchema
    from app.auth.auth import (
        authenticate_user, create_access_token, create_refresh_token,
        get_password_hash, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES,
        get_user_by_email, verify_password
    )
except ImportError:
    from ..database import get_db
    from ..models import User
    from ..schemas import Token, UserCreate, User as UserSchema
    from ..auth.auth import (
        authenticate_user, create_access_token, create_refresh_token,
        get_password_hash, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES,
        get_user_by_email, verify_password
    )

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=UserSchema)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    logger.info(f"Attempting to register user: {user_data.email}")
    
    # Check if user already exists
    db_user = get_user_by_email(db, user_data.email)
    if db_user:
        logger.warning(f"Registration failed - email already exists: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create new user
        logger.info(f"Creating user with data: {user_data.email}, {user_data.full_name}")
        hashed_password = get_password_hash(user_data.password)
        logger.info(f"Password hashed successfully")
        
        # For security, new registrations are always viewers
        # Admin users must be created by existing admins or via scripts
        user_role = "viewer"  # Force viewer role for new registrations
        
        db_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=user_role
        )
        
        logger.info(f"Adding user to database")
        db.add(db_user)
        db.commit()
        logger.info(f"User committed to database")
        
        db.refresh(db_user)
        logger.info(f"User registered successfully: {user_data.email} (ID: {db_user.id})")
        
        return db_user
        
    except Exception as e:
        db.rollback()
        logger.error(f"Registration error for {user_data.email}: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login user and return access token
    """
    logger.info(f"Login attempt for user: {form_data.username}")
    
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        logger.warning(f"Login failed for user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning(f"Login failed - inactive user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    logger.info(f"Login successful for user: {form_data.username}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token
    }

@router.post("/login-debug")
def login_debug(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Debug endpoint for login issues
    """
    try:
        logger.info(f"🔧 DEBUG: Login attempt for user: {form_data.username}")
        
        user = get_user_by_email(db, form_data.username)
        if not user:
            logger.warning(f"🔧 DEBUG: User not found: {form_data.username}")
            return {
                "success": False,
                "error": "User not found",
                "user_exists": False
            }
        
        logger.info(f"🔧 DEBUG: User found: {user.email}")
        logger.info(f"🔧 DEBUG: Stored hash: {user.hashed_password}")
        
        # Test password verification
        password_match = verify_password(form_data.password, user.hashed_password)
        logger.info(f"🔧 DEBUG: Password verification result: {password_match}")
        
        if not password_match:
            return {
                "success": False,
                "error": "Password does not match",
                "user_exists": True,
                "password_match": False,
                "stored_hash": user.hashed_password[:50] + "..." if user.hashed_password else "None"
            }
        
        # Create tokens if successful
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(data={"sub": user.email})
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "refresh_token": refresh_token,
            "user_exists": True,
            "password_match": True
        }
        
    except Exception as e:
        logger.error(f"🔧 DEBUG: Login debug error: {str(e)}")
        logger.error(f"🔧 DEBUG: Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": f"Debug endpoint error: {str(e)}",
            "traceback": traceback.format_exc()
        }

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get current user information
    """
    return current_user

@router.get("/test")
async def auth_test():
    """
    Test endpoint for authentication
    """
    return {"message": "Auth endpoint is working"}

@router.get("/health")
async def auth_health():
    """Auth service health check"""
    return {"status": "healthy", "service": "Auth Service"}