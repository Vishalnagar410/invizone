"""
Base Model Configuration
Contains the base SQLAlchemy model and common mixins
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from ..database import Base

# Common base model with common fields
class BaseModel:
    """Base model with common fields and methods"""
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=func.now())
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

# You can also create mixins for common functionality
class TimestampMixin:
    """Mixin for timestamp fields"""
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
