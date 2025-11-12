# backend/app/api/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import User
from ..schemas import User as UserSchema
from ..auth.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[UserSchema])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all users for dropdown selection (e.g., requisitioner, approved_by)
    """
    try:
        users = db.query(User).filter(User.is_active == True).offset(skip).limit(limit).all()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@router.get("/dropdown", response_model=List[dict])
def get_users_for_dropdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get users in format suitable for dropdown selection
    """
    try:
        users = db.query(User).filter(User.is_active == True).all()
        return [
            {
                "id": user.id,
                "label": f"{user.full_name or 'Unknown'} ({user.email})",
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            }
            for user in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users for dropdown: {str(e)}")

@router.get("/{user_id}", response_model=UserSchema)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user by ID
    """
    try:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.get("/email/{email}", response_model=UserSchema)
def get_user_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user by email
    """
    try:
        user = db.query(User).filter(User.email == email, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.get("/search/", response_model=List[UserSchema])
def search_users(
    query: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search users by name or email
    """
    try:
        users = db.query(User).filter(
            User.is_active == True,
            (User.email.ilike(f"%{query}%")) | (User.full_name.ilike(f"%{query}%"))
        ).offset(skip).limit(limit).all()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching users: {str(e)}")

@router.get("/role/{role}", response_model=List[UserSchema])
def get_users_by_role(
    role: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get users by role
    """
    try:
        if role not in ["admin", "viewer"]:
            raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'viewer'")
        
        users = db.query(User).filter(
            User.role == role,
            User.is_active == True
        ).offset(skip).limit(limit).all()
        return users
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users by role: {str(e)}")

@router.get("/stats/count")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user statistics
    """
    try:
        total_users = db.query(User).filter(User.is_active == True).count()
        admin_count = db.query(User).filter(User.role == "admin", User.is_active == True).count()
        viewer_count = db.query(User).filter(User.role == "viewer", User.is_active == True).count()
        
        return {
            "total_users": total_users,
            "admin_count": admin_count,
            "viewer_count": viewer_count,
            "admin_percentage": (admin_count / total_users * 100) if total_users > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user stats: {str(e)}")