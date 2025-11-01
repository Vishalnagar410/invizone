# backend/app/api/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

try:
    from app.database import get_db
    from app.models import User, UserRole
    from app.schemas import User as UserSchema, UserCreate, UserUpdate, PasswordUpdate
    from app.auth.auth import get_current_user, require_admin, get_password_hash, verify_password
except ImportError:
    from ..database import get_db
    from ..models import User, UserRole
    from ..schemas import User as UserSchema, UserCreate, UserUpdate, PasswordUpdate
    from ..auth.auth import get_current_user, require_admin, get_password_hash, verify_password

router = APIRouter()

# -----------------------------------------
# GET ALL USERS (Admin only)
# -----------------------------------------
@router.get("/", response_model=List[UserSchema])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get all users (Admin only)
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users

# -----------------------------------------
# GET CURRENT LOGGED-IN USER
# -----------------------------------------
@router.get("/me", response_model=UserSchema)
async def read_user_me(current_user: User = Depends(get_current_user)):
    """
    Get details of the current authenticated user
    """
    return current_user

# -----------------------------------------
# UPDATE CURRENT USER
# -----------------------------------------
@router.put("/me", response_model=UserSchema)
async def update_user_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user profile
    """
    if user_update.email and user_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        current_user.email = user_update.email
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    db.commit()
    db.refresh(current_user)
    return current_user

# -----------------------------------------
# UPDATE CURRENT USER PASSWORD
# -----------------------------------------
@router.put("/me/password")
async def update_user_password(
    password_update: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user password
    """
    # Verify current password
    if not verify_password(password_update.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_update.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

# -----------------------------------------
# CREATE NEW USER (Admin only)
# -----------------------------------------
@router.post("/", response_model=UserSchema)
def create_user(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create a new user (Admin only)
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_create.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_create.password)
    db_user = User(
        email=user_create.email,
        hashed_password=hashed_password,
        full_name=user_create.full_name,
        role=user_create.role or "viewer"
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# -----------------------------------------
# GET USER BY ID (Admin only)
# -----------------------------------------
@router.get("/{user_id}", response_model=UserSchema)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Get user by ID (Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# -----------------------------------------
# UPDATE USER (Admin only)
# -----------------------------------------
@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update user (Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.email and user_update.email != user.email:
        existing_user = db.query(User).filter(User.email == user_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        user.email = user_update.email
    
    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    
    if user_update.role is not None:
        user.role = user_update.role
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    db.commit()
    db.refresh(user)
    return user

# -----------------------------------------
# TOGGLE USER ACTIVE STATUS (Admin only)
# -----------------------------------------
@router.patch("/{user_id}/toggle-active", response_model=UserSchema)
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Toggle user active status (Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deactivating own account
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot deactivate your own account"
        )
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user

# -----------------------------------------
# DELETE USER (Admin only)
# -----------------------------------------
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete user (Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting own account
    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}