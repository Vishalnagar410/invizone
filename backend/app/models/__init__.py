"""
Database Models Package - ENHANCED VERSION
Builds upon existing models with new features
"""

from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Boolean,
    Text, JSON, ForeignKey, Enum as SQLEnum, BLOB
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid

try:
    from app.database import Base
except ImportError:
    from ..database import Base

# -----------------------------------------
# ENUM DEFINITIONS - ENHANCED
# -----------------------------------------
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VIEWER = "viewer"

class StorageCondition(str, enum.Enum):
    RT = "RT"
    COLD_2_8 = "2-8°C"
    FREEZER_20 = "-20°C"
    FREEZER_80 = "-80°C"
    CUSTOM = "Custom"

class AdjustmentReason(str, enum.Enum):
    USAGE = "Usage"
    SPILLAGE = "Spillage"
    RECEIVED = "Received"
    CORRECTION = "Correction"
    TRANSFER = "Transfer"
    EXPIRED = "Expired"
    OTHER = "Other"

class BarcodeType(str, enum.Enum):
    CODE128 = "code128"
    QR = "qr"

# -----------------------------------------
# USER TABLE (UNCHANGED - compatible)
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
    stock_adjustments = relationship("StockAdjustment", back_populates="admin")

# -----------------------------------------
# LOCATION TABLE (NEW - hierarchical)
# -----------------------------------------
class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    department = Column(String(100))
    lab_name = Column(String(100))
    room = Column(String(100))
    shelf = Column(String(100))
    rack = Column(String(100))
    position = Column(String(100))
    storage_conditions = Column(SQLEnum(StorageCondition), default=StorageCondition.RT)
    custom_storage_condition = Column(String(100))
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    chemicals = relationship("Chemical", back_populates="location")

# -----------------------------------------
# CHEMICAL TABLE (ENHANCED - adds location_id)
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
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)  # NEW FIELD
    initial_quantity = Column(Float, default=0.0)
    initial_unit = Column(String(50), default="g")
    created_at = Column(DateTime, default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))

    # Relationships - Enhanced
    creator = relationship("User", back_populates="chemicals")
    stock = relationship("Stock", back_populates="chemical", uselist=False)
    msds = relationship("MSDS", back_populates="chemical")
    location = relationship("Location", back_populates="chemicals")  # NEW RELATIONSHIP
    usage_history = relationship("UsageHistory", back_populates="chemical")
    barcode_images = relationship("BarcodeImage", back_populates="chemical")  # NEW
    stock_adjustments = relationship("StockAdjustment", back_populates="chemical")  # NEW

# -----------------------------------------
# STOCK TABLE (UNCHANGED - compatible)
# -----------------------------------------
class Stock(Base):
    __tablename__ = "stock"

    chemical_id = Column(Integer, ForeignKey("chemicals.id"), primary_key=True)
    current_quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="g")
    trigger_level = Column(Float, default=10.0)
    last_updated = Column(DateTime, default=func.now())

    chemical = relationship("Chemical", back_populates="stock")

# -----------------------------------------
# USAGE HISTORY TABLE (UNCHANGED - compatible)
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
    
    chemical = relationship("Chemical", back_populates="usage_history")
    user = relationship("User", back_populates="usage_records")

# -----------------------------------------
# BARCODE IMAGE TABLE (NEW)
# -----------------------------------------
class BarcodeImage(Base):
    __tablename__ = "barcode_images"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    barcode_type = Column(SQLEnum(BarcodeType), nullable=False)
    barcode_data = Column(Text, nullable=False)
    image_blob = Column(BLOB)
    image_path = Column(String(500))
    created_at = Column(DateTime, default=func.now())
    
    chemical = relationship("Chemical", back_populates="barcode_images")

# -----------------------------------------
# STOCK ADJUSTMENT TABLE (NEW - audit trail)
# -----------------------------------------
class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    admin_id = Column(Integer, ForeignKey("users.id"))
    before_quantity = Column(Float, nullable=False)
    after_quantity = Column(Float, nullable=False)
    change_amount = Column(Float, nullable=False)
    reason = Column(SQLEnum(AdjustmentReason), nullable=False)
    note = Column(Text)
    timestamp = Column(DateTime, default=func.now())
    
    chemical = relationship("Chemical", back_populates="stock_adjustments")
    admin = relationship("User", back_populates="stock_adjustments")

# -----------------------------------------
# MSDS TABLE (UNCHANGED - compatible)
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

    chemical = relationship("Chemical", back_populates="msds")

# -----------------------------------------
# ALERT TABLE (UNCHANGED - compatible)
# -----------------------------------------
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    alert_type = Column(String(50))
    message = Column(Text)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    chemical = relationship("Chemical")

__all__ = [
    "User", "Chemical", "Stock", "MSDS", "Alert", "UserRole", 
    "Location", "UsageHistory", "BarcodeImage", "StockAdjustment",
    "StorageCondition", "AdjustmentReason", "BarcodeType"
]