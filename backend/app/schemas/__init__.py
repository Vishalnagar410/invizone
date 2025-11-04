# backend/app/schemas/__init__.py
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# User Role Enum
class UserRole(str, Enum):
    ADMIN = "admin"
    VIEWER = "viewer"

# Storage Condition Enum
class StorageCondition(str, Enum):
    RT = "RT"
    COLD_2_8 = "2-8°C"
    FREEZER_20 = "-20°C"
    FREEZER_80 = "-80°C"
    CUSTOM = "Custom"

# Adjustment Reason Enum
class AdjustmentReason(str, Enum):
    USAGE = "Usage"
    SPILLAGE = "Spillage"
    RECEIVED = "Received"
    CORRECTION = "Correction"
    TRANSFER = "Transfer"
    EXPIRED = "Expired"
    OTHER = "Other"

# Barcode Type Enum
class BarcodeType(str, Enum):
    CODE128 = "code128"
    QR = "qr"

# Location Schemas
class LocationBase(BaseModel):
    name: str
    department: Optional[str] = None
    lab_name: Optional[str] = None
    room: Optional[str] = None
    shelf: Optional[str] = None
    rack: Optional[str] = None
    position: Optional[str] = None
    storage_conditions: Optional[StorageCondition] = StorageCondition.RT
    custom_storage_condition: Optional[str] = None
    description: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    lab_name: Optional[str] = None
    room: Optional[str] = None
    shelf: Optional[str] = None
    rack: Optional[str] = None
    position: Optional[str] = None
    storage_conditions: Optional[StorageCondition] = None
    custom_storage_condition: Optional[str] = None
    description: Optional[str] = None

class Location(LocationBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: Optional[str] = "viewer"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Chemical Schemas (UPDATED)
class ChemicalBase(BaseModel):
    name: str
    cas_number: str
    smiles: str
    location_id: Optional[int] = None
    molecular_formula: Optional[str] = None
    initial_quantity: Optional[float] = 0.0
    initial_unit: Optional[str] = "g"

class ChemicalCreate(ChemicalBase):
    pass

class ChemicalUpdate(BaseModel):
    name: Optional[str] = None
    cas_number: Optional[str] = None
    smiles: Optional[str] = None
    location_id: Optional[int] = None
    initial_quantity: Optional[float] = None
    initial_unit: Optional[str] = None

class Chemical(ChemicalBase):
    id: int
    unique_id: str
    barcode: str
    canonical_smiles: str
    inchikey: str
    molecular_weight: Optional[float] = None
    created_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

# Stock Schemas
class StockBase(BaseModel):
    current_quantity: float
    unit: str = "g"
    trigger_level: float

class StockCreate(StockBase):
    chemical_id: int

class StockUpdate(StockBase):
    pass

class Stock(StockBase):
    chemical_id: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

# Usage History Schemas
class UsageHistoryBase(BaseModel):
    quantity_used: float
    unit: str
    notes: Optional[str] = None

class UsageHistoryCreate(UsageHistoryBase):
    chemical_id: int

class UsageHistory(UsageHistoryBase):
    id: int
    chemical_id: int
    used_by: int
    used_at: datetime
    user: Optional[User] = None
    
    class Config:
        from_attributes = True

# Barcode Image Schemas (NEW)
class BarcodeImageBase(BaseModel):
    barcode_type: BarcodeType
    barcode_data: str

class BarcodeImageCreate(BarcodeImageBase):
    chemical_id: int

class BarcodeImage(BarcodeImageBase):
    id: int
    chemical_id: int
    image_blob: Optional[bytes] = None
    image_path: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Stock Adjustment Schemas (NEW)
class StockAdjustmentBase(BaseModel):
    before_quantity: float
    after_quantity: float
    change_amount: float
    reason: AdjustmentReason
    note: Optional[str] = None

class StockAdjustmentCreate(StockAdjustmentBase):
    chemical_id: int

class StockAdjustment(StockAdjustmentBase):
    id: int
    chemical_id: int
    admin_id: int
    timestamp: datetime
    admin: Optional[User] = None
    chemical: Optional[Chemical] = None
    
    class Config:
        from_attributes = True

# MSDS Schemas
class MSDSBase(BaseModel):
    source_url: Optional[str] = None
    hazard_statements: Optional[Dict[str, Any]] = None
    precautionary_statements: Optional[Dict[str, Any]] = None
    handling_notes: Optional[str] = None

class MSDSCreate(MSDSBase):
    chemical_id: int

class MSDSUpdate(MSDSBase):
    pass

class MSDS(MSDSBase):
    id: int
    chemical_id: int
    retrieved_at: datetime
    
    class Config:
        from_attributes = True

# Alert Schemas
class AlertBase(BaseModel):
    alert_type: str
    message: str

class AlertCreate(AlertBase):
    chemical_id: int

class Alert(AlertBase):
    id: int
    chemical_id: int
    is_resolved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Combined Schemas for API responses
class ChemicalWithStock(Chemical):
    stock: Optional[Stock] = None
    msds: Optional[MSDS] = None
    location: Optional[Location] = None
    usage_history: List[UsageHistory] = []
    barcode_images: List[BarcodeImage] = []
    stock_adjustments: List[StockAdjustment] = []

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# Hazard Summary Schema
class HazardSummary(BaseModel):
    risk_level: Optional[str] = None
    ghs_pictograms: Optional[List[str]] = None
    hazard_statements: Optional[List[str]] = None
    precautionary_statements: Optional[List[str]] = None
    has_hazards: Optional[bool] = None
    hazard_count: Optional[int] = None
    precaution_count: Optional[int] = None

# Stock Summary Schema
class StockSummary(BaseModel):
    total_chemicals: int
    low_stock_chemicals: int
    out_of_stock_chemicals: int
    chemicals_without_msds: int
    low_stock_count: int
    total_quantity: float
    low_stock_percentage: float

# Barcode Schema
class BarcodeData(BaseModel):
    chemical_id: int
    unique_id: str
    barcode: str
    name: str
    cas_number: str

# PubChem Response Schema
class PubChemCompound(BaseModel):
    cid: Optional[int] = None
    name: Optional[str] = None
    smiles: Optional[str] = None
    canonical_smiles: Optional[str] = None
    molecular_formula: Optional[str] = None
    molecular_weight: Optional[float] = None
    cas_number: Optional[str] = None

# WebSocket Message Schemas (NEW)
class WebSocketMessage(BaseModel):
    type: str  # 'chemical_created', 'stock_updated', 'adjustment_made'
    data: Dict[str, Any]
    timestamp: datetime = None

    class Config:
        from_attributes = True

# Export all schemas
__all__ = [
    "User", "UserCreate", "UserUpdate", "PasswordUpdate", "UserRole",
    "Chemical", "ChemicalCreate", "ChemicalUpdate", "ChemicalWithStock",
    "Stock", "StockCreate", "StockUpdate",
    "MSDS", "MSDSCreate", "MSDSUpdate",
    "Alert", "AlertCreate",
    "Token", "TokenData",
    "HazardSummary", "StockSummary",
    "BarcodeData", "PubChemCompound",
    "Location", "LocationCreate", "LocationUpdate",
    "UsageHistory", "UsageHistoryCreate",
    "BarcodeImage", "BarcodeImageCreate", "BarcodeType",
    "StockAdjustment", "StockAdjustmentCreate", "AdjustmentReason",
    "StorageCondition", "WebSocketMessage"
]