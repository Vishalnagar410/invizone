# backend/app/utils/chemical_utils.py
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors
from rdkit.Chem.inchi import MolToInchiKey
import logging
from typing import Optional, Tuple
import uuid

logger = logging.getLogger(__name__)

def canonicalize_smiles(smiles: str) -> Optional[str]:
    """
    Convert SMILES to canonical SMILES using RDKit
    """
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        return Chem.MolToSmiles(mol, canonical=True)
    except Exception as e:
        logger.error(f"Error canonicalizing SMILES {smiles}: {e}")
        return None

def generate_inchikey(smiles: str) -> Optional[str]:
    """
    Generate InChIKey from SMILES
    """
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        return MolToInchiKey(mol)
    except Exception as e:
        logger.error(f"Error generating InChIKey for {smiles}: {e}")
        return None

def calculate_molecular_properties(smiles: str) -> Tuple[Optional[str], Optional[float]]:
    """
    Calculate molecular formula and weight from SMILES
    """
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
    """
    Validate if SMILES represents a valid chemical structure
    """
    try:
        mol = Chem.MolFromSmiles(smiles)
        return mol is not None
    except:
        return False

def generate_unique_id() -> str:
    """
    Generate unique ID for chemical
    """
    return str(uuid.uuid4())

def generate_barcode(chemical_id: int, unique_id: str) -> Tuple[str, str]:
    """
    Generate barcode for chemical and return barcode data
    """
    try:
        # Use CODE128 format - create a simple barcode using the unique_id
        barcode_data = f"CHEM{chemical_id:06d}"  # CHEM000001, CHEM000002, etc.
        
        # For now, we'll just return the barcode data without actual image generation
        # You can integrate with a barcode library later if needed
        barcode_base64 = ""  # Placeholder for barcode image
        
        return barcode_data, barcode_base64
        
    except Exception as e:
        logger.error(f"Error generating barcode: {e}")
        # Fallback: use unique_id as barcode data
        return unique_id[:20], ""

def process_chemical_data(smiles: str, name: str, cas_number: str, initial_quantity: float = 0.0, initial_unit: str = "g") -> dict:
    """
    Process chemical data: canonicalize SMILES, generate InChIKey, calculate properties
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