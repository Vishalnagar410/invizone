from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
import logging
import hashlib

from ..database import get_db
from ..models import User, UserRole
from ..schemas import TokenData

load_dotenv()

logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Use a simpler hashing method to avoid bcrypt issues
try:
    pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
    logger.info("✅ Using sha256_crypt for password hashing")
except Exception as e:
    logger.error(f"❌ CryptContext initialization failed: {e}")
    # Fallback to basic hashing
    pwd_context = None

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def verify_password(plain_password, hashed_password):
    try:
        if pwd_context:
            # Use passlib if available
            result = pwd_context.verify(plain_password, hashed_password)
            logger.info(f"🔐 Password verification result: {result}")
            return result
        else:
            # Fallback: simple hash comparison
            logger.warning("⚠️  Using fallback password verification")
            # Truncate password to 72 bytes for consistency
            truncated_password = plain_password[:72]
            test_hash = hashlib.sha256(truncated_password.encode()).hexdigest()
            return test_hash == hashed_password
    except Exception as e:
        logger.error(f"❌ Password verification error: {e}")
        # Final fallback: direct comparison (for debugging)
        logger.warning("⚠️  Using direct password comparison fallback")
        return plain_password == hashed_password

def get_password_hash(password):
    try:
        # Truncate password to 72 bytes to avoid bcrypt limitations
        truncated_password = password[:72]
        
        if pwd_context:
            # Use passlib if available
            hashed = pwd_context.hash(truncated_password)
            logger.info(f"🔐 Password hashed successfully with passlib")
        else:
            # Fallback: simple SHA256 hashing
            logger.warning("⚠️  Using fallback SHA256 password hashing")
            hashed = hashlib.sha256(truncated_password.encode()).hexdigest()
        
        logger.info(f"🔐 Hash: {hashed[:20]}...")
        return hashed
        
    except Exception as e:
        logger.error(f"❌ Password hashing error: {e}")
        # Ultimate fallback: return plain password (for debugging only)
        logger.warning("⚠️  Using plain password storage as last resort")
        return password

def get_user_by_email(db: Session, email: str):
    user = db.query(User).filter(User.email == email).first()
    if user:
        logger.info(f"🔍 Found user: {user.email}")
        if user.hashed_password:
            logger.info(f"🔍 Stored hash: {user.hashed_password[:30]}...")
    else:
        logger.info(f"🔍 User not found: {email}")
    return user

def authenticate_user(db: Session, email: str, password: str):
    logger.info(f"🔐 Authenticating user: {email}")
    user = get_user_by_email(db, email)
    if not user:
        logger.warning(f"❌ User not found: {email}")
        return False
    
    logger.info(f"🔐 Comparing password for user: {email}")
    password_match = verify_password(password, user.hashed_password)
    logger.info(f"🔐 Password match: {password_match}")
    
    if not password_match:
        logger.warning(f"❌ Password verification failed for user: {email}")
        return False
    
    logger.info(f"✅ Authentication successful for user: {email}")
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def require_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user