from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    VIEWER = "viewer"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(SQLEnum(UserRole), default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    chemicals = relationship("Chemical", back_populates="creator")

class Chemical(Base):
    __tablename__ = "chemicals"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    cas_number = Column(String(100), unique=True, index=True)
    smiles = Column(Text)
    canonical_smiles = Column(Text)
    inchikey = Column(String(27), unique=True, index=True)
    molecular_formula = Column(String(100))
    molecular_weight = Column(Float)
    created_at = Column(DateTime, default=func.now())
    created_by = Column(Integer, ForeignKey("users.id"))
    
    creator = relationship("User", back_populates="chemicals")
    stock = relationship("Stock", back_populates="chemical", uselist=False)
    msds = relationship("MSDS", back_populates="chemical")

class Stock(Base):
    __tablename__ = "stock"
    
    chemical_id = Column(Integer, ForeignKey("chemicals.id"), primary_key=True)
    current_quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="g")
    trigger_level = Column(Float, default=10.0)
    last_updated = Column(DateTime, default=func.now())
    
    chemical = relationship("Chemical", back_populates="stock")

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

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    chemical_id = Column(Integer, ForeignKey("chemicals.id"))
    alert_type = Column(String(50))
    message = Column(Text)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    chemical = relationship("Chemical")