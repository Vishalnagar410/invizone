from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors
from rdkit.Chem.inchi import MolToInchiKey
import logging
from typing import Optional, Tuple

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

def process_chemical_data(smiles: str, name: str, cas_number: str) -> dict:
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
        raise ValueError(f"Failed to generate InChIKey for: {canonical_smiles}")
    
    # Calculate molecular properties
    formula, molecular_weight = calculate_molecular_properties(canonical_smiles)
    
    return {
        "name": name,
        "cas_number": cas_number,
        "smiles": smiles,
        "canonical_smiles": canonical_smiles,
        "inchikey": inchikey,
        "molecular_formula": formula,
        "molecular_weight": molecular_weight
    }