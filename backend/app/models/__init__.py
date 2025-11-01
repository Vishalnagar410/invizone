"""
Database Models Package
Contains all SQLAlchemy models for the application.
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    Text, JSON, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid

# ✅ Flexible import (supports both relative and absolute imports)
try:
    from app.database import Base
except ImportError:
    from ..database import Base


# -----------------------------------------
# ENUM DEFINITIONS
# -----------------------------------------
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VIEWER = "viewer"


# -----------------------------------------
# USER TABLE
# -----------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    chemicals = relationship("Chemical", back_populates="creator")
    usage_records = relationship("UsageHistory", back_populates="user")


# -----------------------------------------
# LOCATION TABLE (NEW)
# -----------------------------------------
class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # e.g., "Storage Room A"
    room = Column(String(100))  # e.g., "Lab 101"
    rack = Column(String(100))  # e.g., "Rack 3"
    shelf = Column(String(100))  # e.g., "Shelf 2"
    position = Column(String(100))  # e.g., "Tray 5"
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    chemicals = relationship("Chemical", back_populates="location")


# -----------------------------------------
# CHEMICAL TABLE (UPDATED)
# -----------------------------------------
class Chemical(Base):
    __tablename__ = "chemicals"

    id = Column(Integer, primary_key=True, index=True)
    unique_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    barcode = Column(String(255), unique=True, index=True)
    name = Column(String(255), nullable=False)
    cas_number = Column(String(100), unique=True, index=True)
    smiles = Column(Text)
    canonical_smiles = Column(Text)
    inchikey = Column(String(27), unique=True, index=True)
    molecular_formula = Column(String(100))
    molecular_weight = Column(Float)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)  # NEW
    initial_quantity = Column(Float, default=0.0)
    initial_unit = Column(String(50), default="g")
    created_at = Column(DateTime, default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    creator = relationship("User", back_populates="chemicals")
    stock = relationship("Stock", back_populates="chemical", uselist=False)
    msds = relationship("MSDS", back_populates="chemical")
    location = relationship("Location", back_populates="chemicals")  # NEW
    usage_history = relationship("UsageHistory", back_populates="chemical")  # NEW


# -----------------------------------------
# STOCK TABLE
# -----------------------------------------
class Stock(Base):
    __tablename__ = "stock"

    chemical_id = Column(Integer, ForeignKey("chemicals.id"), primary_key=True)
    current_quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="g")
    trigger_level = Column(Float, default=10.0)
    last_updated = Column(DateTime, default=func.now())

    # Relationships
    chemical = relationship("Chemical", back_populates="stock")


# -----------------------------------------
# USAGE HISTORY TABLE (NEW)
# -----------------------------------------
class UsageHistory(Base):
    __tablename__ = "usage_history"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    quantity_used = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False)
    used_by = Column(Integer, ForeignKey("users.id"))
    used_at = Column(DateTime, default=func.now())
    notes = Column(Text)
    
    # Relationships
    chemical = relationship("Chemical", back_populates="usage_history")
    user = relationship("User", back_populates="usage_records")


# -----------------------------------------
# MSDS TABLE
# -----------------------------------------
class MSDS(Base):
    __tablename__ = "msds"

    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    source_url = Column(String(500))
    hazard_statements = Column(JSON)
    precautionary_statements = Column(JSON)
    handling_notes = Column(Text)
    retrieved_at = Column(DateTime, default=func.now())

    # Relationships
    chemical = relationship("Chemical", back_populates="msds")


# -----------------------------------------
# ALERT TABLE
# -----------------------------------------
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    alert_type = Column(String(50))
    message = Column(Text)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    chemical = relationship("Chemical")


# -----------------------------------------
# EXPORTS
# -----------------------------------------
__all__ = ["User", "Chemical", "Stock", "MSDS", "Alert", "UserRole", "Location", "UsageHistory"]