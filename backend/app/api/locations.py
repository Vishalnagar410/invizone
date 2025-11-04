# backend/app/api/locations.py - NEW FILE
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User, Location, Chemical
from app.schemas import Location as LocationSchema, LocationCreate, LocationUpdate
from app.auth.auth import get_current_user, require_admin
from app.websocket import broadcast_location_update  # WebSocket integration

router = APIRouter()

@router.get("/", response_model=List[LocationSchema])
def read_locations(
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = Query(None),
    lab_name: Optional[str] = Query(None),
    room: Optional[str] = Query(None),
    storage_condition: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all locations with optional filtering
    """
    query = db.query(Location)
    
    if department:
        query = query.filter(Location.department.ilike(f"%{department}%"))
    if lab_name:
        query = query.filter(Location.lab_name.ilike(f"%{lab_name}%"))
    if room:
        query = query.filter(Location.room.ilike(f"%{room}%"))
    if storage_condition:
        query = query.filter(Location.storage_conditions == storage_condition)
    
    locations = query.order_by(Location.name).offset(skip).limit(limit).all()
    return locations

@router.get("/{location_id}", response_model=LocationSchema)
def read_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get location by ID
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.post("/", response_model=LocationSchema)
def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Create new location (Admin only)
    """
    # Check if location with same hierarchy already exists
    existing = db.query(Location).filter(
        Location.department == location.department,
        Location.lab_name == location.lab_name,
        Location.room == location.room,
        Location.shelf == location.shelf,
        Location.rack == location.rack,
        Location.position == location.position
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Location with this hierarchy already exists")
    
    db_location = Location(**location.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    
    # Broadcast new location via WebSocket
    broadcast_location_update(LocationSchema(**db_location.__dict__).dict())
    
    return db_location

@router.put("/{location_id}", response_model=LocationSchema)
def update_location(
    location_id: int,
    location_update: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Update location (Admin only)
    """
    db_location = db.query(Location).filter(Location.id == location_id).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    update_data = location_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_location, field, value)
    
    db.commit()
    db.refresh(db_location)
    
    # Broadcast update via WebSocket
    broadcast_location_update(LocationSchema(**db_location.__dict__).dict())
    
    return db_location

@router.delete("/{location_id}")
def delete_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Delete location (Admin only) - Only if no chemicals are using it
    """
    db_location = db.query(Location).filter(Location.id == location_id).first()
    if not db_location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Check if any chemicals are using this location
    chemicals_using = db.query(Chemical).filter(Chemical.location_id == location_id).count()
    if chemicals_using > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete location. {chemicals_using} chemicals are using this location."
        )
    
    db.delete(db_location)
    db.commit()
    
    # Broadcast deletion via WebSocket
    broadcast_location_update({"id": location_id, "deleted": True})
    
    return {"message": "Location deleted successfully"}

@router.get("/hierarchy/departments")
def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get unique departments
    """
    departments = db.query(Location.department).distinct().all()
    return [dept[0] for dept in departments if dept[0]]

@router.get("/hierarchy/labs")
def get_labs(
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get unique lab names, optionally filtered by department
    """
    query = db.query(Location.lab_name).distinct()
    if department:
        query = query.filter(Location.department == department)
    
    labs = query.all()
    return [lab[0] for lab in labs if lab[0]]

@router.get("/hierarchy/rooms")
def get_rooms(
    department: Optional[str] = Query(None),
    lab_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get unique rooms, optionally filtered by department and lab
    """
    query = db.query(Location.room).distinct()
    if department:
        query = query.filter(Location.department == department)
    if lab_name:
        query = query.filter(Location.lab_name == lab_name)
    
    rooms = query.all()
    return [room[0] for room in rooms if room[0]]

@router.get("/{location_id}/chemicals")
def get_chemicals_at_location(
    location_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all chemicals at a specific location
    """
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    chemicals = db.query(Chemical).filter(Chemical.location_id == location_id).offset(skip).limit(limit).all()
    
    from app.schemas import ChemicalWithStock
    return [
        ChemicalWithStock(
            **chem.__dict__,
            stock=chem.stock,
            msds=chem.msds,
            location=location
        )
        for chem in chemicals
    ]

@router.get("/storage-conditions/types")
def get_storage_condition_types():
    """
    Get available storage condition types
    """
    from app.models import StorageCondition
    return [condition.value for condition in StorageCondition]