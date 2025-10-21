from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

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

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Chemical Schemas
class ChemicalBase(BaseModel):
    name: str
    cas_number: str
    smiles: str
    molecular_formula: Optional[str] = None

class ChemicalCreate(ChemicalBase):
    pass

class ChemicalUpdate(BaseModel):
    name: Optional[str] = None
    cas_number: Optional[str] = None
    smiles: Optional[str] = None

class Chemical(ChemicalBase):
    id: int
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

# MSDS Schemas
class MSDSBase(BaseModel):
    source_url: Optional[str] = None
    hazard_statements: Optional[Dict[str, Any]] = None
    precautionary_statements: Optional[Dict[str, Any]] = None
    handling_notes: Optional[str] = None

class MSDSCreate(MSDSBase):
    chemical_id: int

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

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None