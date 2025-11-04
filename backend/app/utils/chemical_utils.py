# backend/app/utils/chemical_utils.py - ENHANCED VERSION
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors
from rdkit.Chem.inchi import MolToInchiKey
import logging
from typing import Optional, Tuple, Dict, Any
import uuid
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# KEEP ALL YOUR EXISTING FUNCTIONS - they remain unchanged
def canonicalize_smiles(smiles: str) -> Optional[str]:
    """Convert SMILES to canonical SMILES using RDKit"""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        return Chem.MolToSmiles(mol, canonical=True)
    except Exception as e:
        logger.error(f"Error canonicalizing SMILES {smiles}: {e}")
        return None

def generate_inchikey(smiles: str) -> Optional[str]:
    """Generate InChIKey from SMILES"""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        return MolToInchiKey(mol)
    except Exception as e:
        logger.error(f"Error generating InChIKey for {smiles}: {e}")
        return None

def calculate_molecular_properties(smiles: str) -> Tuple[Optional[str], Optional[float]]:
    """Calculate molecular formula and weight from SMILES"""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None, None
        
        formula = Chem.rdMolDescriptors.CalcMolFormula(mol)
        molecular_weight = Descriptors.MolWt(mol)
        
        return formula, round(molecular_weight, 2)
    except Exception as e:
        logger.error(f"Error calculating properties for {smiles}: {e}")
        return None, None

def validate_chemical_structure(smiles: str) -> bool:
    """Validate if SMILES represents a valid chemical structure"""
    try:
        mol = Chem.MolFromSmiles(smiles)
        return mol is not None
    except:
        return False

def generate_unique_id() -> str:
    """Generate unique ID for chemical"""
    return str(uuid.uuid4())

def generate_barcode(chemical_id: int, unique_id: str) -> Tuple[str, str]:
    """
    Generate barcode for chemical and return barcode data
    Enhanced to include timestamp for uniqueness
    """
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M")
        barcode_data = f"CHEM{chemical_id:06d}_{timestamp}"
        
        # For now, we'll just return the barcode data without actual image generation
        barcode_base64 = ""  # Placeholder for barcode image
        
        return barcode_data, barcode_base64
        
    except Exception as e:
        logger.error(f"Error generating barcode: {e}")
        # Fallback: use unique_id as barcode data
        return unique_id[:20], ""

def process_chemical_data(smiles: str, name: str, cas_number: str, initial_quantity: float = 0.0, initial_unit: str = "g") -> dict:
    """
    Process chemical data: canonicalize SMILES, generate InChIKey, calculate properties
    Enhanced to include QR code data preparation
    """
    # Validate structure first
    if not validate_chemical_structure(smiles):
        raise ValueError(f"Invalid chemical structure: {smiles}")
    
    # Canonicalize SMILES
    canonical_smiles = canonicalize_smiles(smiles)
    if not canonical_smiles:
        raise ValueError(f"Failed to canonicalize SMILES: {smiles}")
    
    # Generate InChIKey
    inchikey = generate_inchikey(canonical_smiles)
    if not inchikey:
        # If InChIKey generation fails, create a placeholder
        inchikey = f"PLACEHOLDER_{name.upper().replace(' ', '_')}"
    
    # Calculate molecular properties
    formula, molecular_weight = calculate_molecular_properties(canonical_smiles)
    
    # Generate unique ID
    unique_id = generate_unique_id()
    
    # Generate initial barcode data
    barcode_data = f"CHEM_{cas_number.replace('-', '')}"
    
    return {
        "name": name,
        "cas_number": cas_number,
        "smiles": smiles,
        "canonical_smiles": canonical_smiles,
        "inchikey": inchikey,
        "molecular_formula": formula,
        "molecular_weight": molecular_weight,
        "initial_quantity": initial_quantity,
        "initial_unit": initial_unit,
        "unique_id": unique_id,
        "barcode": barcode_data
    }

# NEW FUNCTIONS FOR ENHANCED FEATURES

def generate_chemical_qr_data(chemical_data: Dict[str, Any]) -> str:
    """
    Generate QR code data with full chemical information
    Compatible with your existing chemical data structure
    """
    qr_data = {
        "id": chemical_data.get("id"),
        "unique_id": chemical_data.get("unique_id"),
        "name": chemical_data.get("name"),
        "cas_number": chemical_data.get("cas_number"),
        "molecular_formula": chemical_data.get("molecular_formula"),
        "molecular_weight": chemical_data.get("molecular_weight"),
        "smiles": chemical_data.get("smiles"),
        "barcode": chemical_data.get("barcode"),
        "timestamp": datetime.now().isoformat()
    }
    return json.dumps(qr_data, indent=2)

def generate_location_string(location_data: Dict[str, Any]) -> str:
    """
    Generate human-readable location string from hierarchical data
    """
    if not location_data:
        return "Not set"
    
    parts = [
        location_data.get('department'),
        location_data.get('lab_name'), 
        location_data.get('room'),
        location_data.get('shelf'),
        location_data.get('rack'),
        location_data.get('position')
    ]
    
    # Filter out None/empty values and join with arrows
    location_parts = [part for part in parts if part]
    return " → ".join(location_parts) if location_parts else location_data.get('name', 'Not set')

def validate_storage_condition(condition: str, custom_condition: str = None) -> bool:
    """
    Validate storage condition
    """
    valid_conditions = ['RT', '2-8°C', '-20°C', '-80°C', 'Custom']
    
    if condition == 'Custom' and not custom_condition:
        return False
    
    return condition in valid_conditions

def calculate_stock_status(current_quantity: float, trigger_level: float) -> Dict[str, Any]:
    """
    Calculate stock status with enhanced information
    """
    if current_quantity <= 0:
        return {"status": "out_of_stock", "level": "critical", "message": "Out of stock"}
    elif current_quantity <= trigger_level:
        return {"status": "low_stock", "level": "warning", "message": "Low stock"}
    elif current_quantity <= trigger_level * 2:
        return {"status": "adequate", "level": "info", "message": "Stock adequate"}
    else:
        return {"status": "sufficient", "level": "success", "message": "Stock sufficient"}