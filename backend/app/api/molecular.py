from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import logging
import json

from app.database import get_db
from app.auth.auth import get_current_user
from app.services.molecular_service import molecular_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/calculate-properties")
async def calculate_molecular_properties(
    smiles: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Calculate molecular properties from SMILES using RDKit
    """
    try:
        if not smiles or not smiles.strip():
            raise HTTPException(status_code=400, detail="SMILES string is required")
        
        # Clean SMILES
        clean_smiles = smiles.replace('\\', '').strip()
        
        # Calculate properties
        properties = molecular_service.calculate_molecular_properties(clean_smiles)
        
        if not properties:
            raise HTTPException(status_code=400, detail="Could not calculate molecular properties")
        
        return {
            "status": "success",
            "smiles": clean_smiles,
            "properties": properties
        }
        
    except Exception as e:
        logger.error(f"Molecular property calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize-structure")
async def optimize_molecular_structure(
    smiles: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Optimize molecular structure and return canonical SMILES
    """
    try:
        if not smiles or not smiles.strip():
            raise HTTPException(status_code=400, detail="SMILES string is required")
        
        clean_smiles = smiles.replace('\\', '').strip()
        
        # Optimize structure
        optimized_data = molecular_service.optimize_structure(clean_smiles)
        
        if not optimized_data:
            raise HTTPException(status_code=400, detail="Could not optimize structure")
        
        return {
            "status": "success",
            "original_smiles": clean_smiles,
            "optimized": optimized_data
        }
        
    except Exception as e:
        logger.error(f"Structure optimization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-structure")
async def validate_molecular_structure(
    smiles: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Validate molecular structure and return validation results
    """
    try:
        if not smiles or not smiles.strip():
            raise HTTPException(status_code=400, detail="SMILES string is required")
        
        clean_smiles = smiles.replace('\\', '').strip()
        
        # Validate structure
        validation_result = molecular_service.validate_structure(clean_smiles)
        
        return {
            "status": "success",
            "smiles": clean_smiles,
            "validation": validation_result
        }
        
    except Exception as e:
        logger.error(f"Structure validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/convert-format")
async def convert_molecular_format(
    input_data: str,
    input_format: str = "smiles",
    output_format: str = "inchi",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Convert between molecular formats (SMILES, InChI, InChIKey, MOL)
    """
    try:
        if not input_data or not input_data.strip():
            raise HTTPException(status_code=400, detail="Input data is required")
        
        clean_input = input_data.replace('\\', '').strip()
        
        # Convert format
        conversion_result = molecular_service.convert_format(
            clean_input, input_format, output_format
        )
        
        if not conversion_result:
            raise HTTPException(status_code=400, detail="Conversion failed")
        
        return {
            "status": "success",
            "input_format": input_format,
            "output_format": output_format,
            "input": clean_input,
            "output": conversion_result
        }
        
    except Exception as e:
        logger.error(f"Format conversion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/compound-summary")
async def get_compound_summary(
    smiles: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get comprehensive compound summary with all calculated properties
    """
    try:
        if not smiles or not smiles.strip():
            raise HTTPException(status_code=400, detail="SMILES string is required")
        
        clean_smiles = smiles.replace('\\', '').strip()
        
        # Get comprehensive summary
        summary = molecular_service.get_compound_summary(clean_smiles)
        
        return {
            "status": "success",
            "smiles": clean_smiles,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Compound summary generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))