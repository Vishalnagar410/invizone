from typing import Dict, Any, Optional, List, Tuple
import logging
import re
import hashlib
import uuid
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ==================== CORE CHEMICAL FUNCTIONS ====================

def generate_unique_id() -> str:
    """
    Generate a unique identifier for chemicals
    Format: CHEM-{timestamp}-{random}
    """
    import time
    timestamp = int(time.time())
    random_part = str(uuid.uuid4())[:8].upper()
    unique_id = f"CHEM-{timestamp}-{random_part}"
    return unique_id

def generate_barcode(chemical_id: int, chemical_name: str) -> str:
    """
    Generate barcode data for a chemical
    """
    # Simple barcode generation - you can enhance this with proper barcode formats
    barcode_data = f"CHEM{chemical_id:06d}"
    return barcode_data

def generate_chemical_qr_data(chemical_data: Dict[str, Any]) -> str:
    """
    Generate QR code data for a chemical
    """
    qr_data = {
        "id": chemical_data.get("id"),
        "name": chemical_data.get("name"),
        "cas_number": chemical_data.get("cas_number"),
        "smiles": chemical_data.get("smiles"),
        "molecular_formula": chemical_data.get("molecular_formula")
    }
    import json
    return json.dumps(qr_data)

def generate_location_string(location_data: Dict[str, Any]) -> str:
    """
    Generate a formatted location string from location data
    """
    parts = [
        location_data.get('department'),
        location_data.get('lab_name'),
        location_data.get('room'),
        location_data.get('shelf'),
        location_data.get('rack'),
        location_data.get('position')
    ]
    return ' → '.join(filter(None, parts))

def validate_storage_condition(condition: str) -> bool:
    """
    Validate storage condition
    """
    valid_conditions = ['RT', '2-8°C', '-20°C', '-80°C', 'Custom']
    return condition in valid_conditions

def calculate_stock_status(current_quantity: float, trigger_level: float) -> str:
    """
    Calculate stock status based on current quantity and trigger level
    """
    if current_quantity <= 0:
        return "out_of_stock"
    elif current_quantity <= trigger_level:
        return "low_stock"
    elif current_quantity <= trigger_level * 2:
        return "adequate"
    else:
        return "well_stocked"

def process_chemical_data(
    smiles: str, 
    name: str, 
    cas_number: str, 
    initial_quantity: float = 0.0, 
    initial_unit: str = "g"
) -> Dict[str, Any]:
    """
    Process chemical data and calculate additional properties
    """
    try:
        processed_data = {
            "unique_id": generate_unique_id(),
            "barcode": "",  # Will be generated after chemical creation
            "name": name,
            "cas_number": cas_number,
            "smiles": smiles,
            "canonical_smiles": canonicalize_smiles(smiles),
            "inchikey": generate_inchikey(smiles),
            "molecular_formula": "",
            "molecular_weight": 0.0,
            "initial_quantity": initial_quantity,
            "initial_unit": initial_unit
        }
        
        # Calculate molecular properties
        formula, weight = calculate_molecular_properties(smiles)
        if formula and weight:
            processed_data["molecular_formula"] = formula
            processed_data["molecular_weight"] = weight
        
        return processed_data
    except Exception as e:
        logger.error(f"Error processing chemical data: {e}")
        # Return basic data even if processing fails
        return {
            "unique_id": generate_unique_id(),
            "barcode": "",
            "name": name,
            "cas_number": cas_number,
            "smiles": smiles,
            "canonical_smiles": smiles,
            "inchikey": f"INCHIKEY_{hash(smiles)}",
            "molecular_formula": "",
            "molecular_weight": 0.0,
            "initial_quantity": initial_quantity,
            "initial_unit": initial_unit
        }

def validate_chemical_structure(smiles: str) -> bool:
    """
    Validate chemical structure using SMILES
    """
    try:
        if not smiles or not isinstance(smiles, str):
            return False
        # Basic validation - check if it contains common chemical symbols
        chemical_pattern = r'[CHONPSBIFClBr\[\]\(\)=#@\+\-\\\/]'
        return bool(re.search(chemical_pattern, smiles)) and len(smiles) > 2
    except Exception as e:
        logger.error(f"Error validating chemical structure: {e}")
        return False

def canonicalize_smiles(smiles: str) -> Optional[str]:
    """Canonicalize SMILES string"""
    try:
        # Placeholder - implement with actual chemistry library like RDKit
        # For now, return the original SMILES
        return smiles.strip()
    except Exception as e:
        logger.error(f"Error canonicalizing SMILES: {e}")
        return None

def generate_inchikey(smiles: str) -> Optional[str]:
    """Generate InChIKey from SMILES"""
    try:
        # Placeholder - implement with actual chemistry library
        # For now, generate a hash-based pseudo-InChIKey
        clean_smiles = smiles.strip()
        hash_obj = hashlib.md5(clean_smiles.encode())
        hash_hex = hash_obj.hexdigest()[:14].upper()
        return f"INCHIKEY-{hash_hex}"
    except Exception as e:
        logger.error(f"Error generating InChIKey: {e}")
        return None

def calculate_molecular_properties(smiles: str) -> Tuple[Optional[str], Optional[float]]:
    """Calculate molecular formula and weight"""
    try:
        # Placeholder - implement with actual chemistry library
        # For now, return placeholder values
        return "C?H?O?", 0.0
    except Exception as e:
        logger.error(f"Error calculating molecular properties: {e}")
        return None, None

# ==================== ENHANCED FUNCTIONS (From Your Previous Code) ====================

def calculate_properties_in_background(smiles: str) -> Dict[str, Any]:
    """
    Calculate chemical properties in background with real-time updates
    Returns incremental results for better UX
    """
    results = {
        'status': 'processing',
        'smiles': smiles,
        'steps_completed': [],
        'properties': {}
    }
    
    try:
        clean_smiles = smiles.replace('\\', '').strip()
        
        # Step 1: Validate structure
        results['steps_completed'].append('structure_validation')
        if not validate_chemical_structure(clean_smiles):
            results['status'] = 'error'
            results['error'] = 'Invalid chemical structure'
            return results
        
        # Step 2: Canonicalize SMILES
        results['steps_completed'].append('canonicalization')
        canonical_smiles = canonicalize_smiles(clean_smiles)
        if not canonical_smiles:
            results['status'] = 'error'
            results['error'] = 'Failed to canonicalize SMILES'
            return results
        
        results['properties']['canonical_smiles'] = canonical_smiles
        
        # Step 3: Calculate molecular properties
        results['steps_completed'].append('property_calculation')
        formula, molecular_weight = calculate_molecular_properties(canonical_smiles)
        
        if formula and molecular_weight:
            results['properties']['molecular_formula'] = formula
            results['properties']['molecular_weight'] = molecular_weight
        
        # Step 4: Generate InChIKey
        results['steps_completed'].append('inchikey_generation')
        inchikey = generate_inchikey(canonical_smiles)
        if inchikey:
            results['properties']['inchikey'] = inchikey
        
        results['status'] = 'completed'
        results['steps_completed'].append('completed')
        
    except Exception as e:
        results['status'] = 'error'
        results['error'] = str(e)
        logger.error(f"Background property calculation failed: {e}")
    
    return results

def estimate_cas_from_smiles(smiles: str) -> Optional[str]:
    """
    Attempt to estimate CAS number from SMILES pattern
    This is a fallback when external services fail
    """
    try:
        clean_smiles = smiles.replace('\\', '').strip()
        
        # Known compounds CAS mapping
        known_cas_mapping = {
            'CC(=O)Oc1ccccc1C(=O)O': '50-78-2',  # Aspirin
            'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': '58-08-2',  # Caffeine
            'CCO': '64-17-5',  # Ethanol
            'CC(=O)O': '64-19-7',  # Acetic Acid
            'c1ccccc1': '71-43-2',  # Benzene
            'C1CCCCC1': '110-82-7',  # Cyclohexane
            'O=C=O': '124-38-9',  # Carbon Dioxide
            'C#N': '74-90-8',  # Hydrogen Cyanide
            'CCCCCC': '110-54-3',  # Hexane
            'CCOC(=O)C': '141-78-6',  # Ethyl Acetate,
        }
        
        # Exact match
        if clean_smiles in known_cas_mapping:
            return known_cas_mapping[clean_smiles]
        
        # Try canonical SMILES match
        canonical = canonicalize_smiles(clean_smiles)
        if canonical and canonical in known_cas_mapping:
            return known_cas_mapping[canonical]
        
        # Generate systematic CAS-like number based on structure
        if len(clean_smiles) > 5:
            hash_obj = hashlib.md5(clean_smiles.encode())
            hash_hex = hash_obj.hexdigest()[:6]
            pseudo_cas = f"{int(hash_hex[:2], 16):02d}-{int(hash_hex[2:4], 16):02d}-{int(hash_hex[4:6], 16)}"
            return pseudo_cas
        
    except Exception as e:
        logger.warning(f"CAS estimation failed for {smiles}: {e}")
    
    return None

def validate_and_suggest_name(smiles: str, current_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate chemical name and suggest alternatives based on structure
    """
    suggestions = {
        'is_valid': True,
        'suggestions': [],
        'warnings': []
    }
    
    try:
        clean_smiles = smiles.replace('\\', '').strip()
        
        if not current_name or current_name.strip() == '':
            suggestions['suggestions'].append('Chemical name is required')
            suggestions['is_valid'] = False
            return suggestions
        
        current_name = current_name.strip()
        
        # Check if name is just a placeholder
        placeholder_indicators = ['unknown', 'not found', 'enter manually', 'chemical', 'compound']
        if any(indicator in current_name.lower() for indicator in placeholder_indicators):
            guessed_name = _guess_compound_name_from_smiles(clean_smiles)
            if guessed_name:
                suggestions['suggestions'].append(f"Suggested name: {guessed_name}")
        
        # Validate name format
        if len(current_name) < 2:
            suggestions['warnings'].append('Chemical name seems too short')
        
        if current_name.isnumeric():
            suggestions['warnings'].append('Chemical name should not be just numbers')
        
        # Check for common naming patterns
        if _looks_like_systematic_name(current_name):
            suggestions['suggestions'].append('Name appears to be systematic IUPAC name')
        
    except Exception as e:
        logger.error(f"Name validation failed: {e}")
    
    return suggestions

def _guess_compound_name_from_smiles(smiles: str) -> Optional[str]:
    """Guess compound name from SMILES pattern"""
    patterns = {
        r'CCO$': 'Ethanol',
        r'CC(=O)O$': 'Acetic Acid',
        r'CC(=O)Oc1ccccc1C(=O)O$': 'Aspirin',
        r'CN1C=NC2=C1C(=O)N(C(=O)N2C)C$': 'Caffeine',
        r'c1ccccc1$': 'Benzene',
        r'C1CCCCC1$': 'Cyclohexane',
        r'O=C=O$': 'Carbon Dioxide',
        r'C#N$': 'Hydrogen Cyanide',
        r'CCCCCC$': 'Hexane',
        r'CCOC(=O)C$': 'Ethyl Acetate',
        r'CC(N)C$': 'Isopropylamine',
        r'C(=O)OC': 'Ester',
        r'C(=O)N': 'Amide',
        r'C(=O)O': 'Carboxylic Acid',
        r'NC(=O)': 'Amide',
        r'Oc1ccccc1': 'Phenol',
        r'Cc1ccccc1': 'Toluene Derivative',
    }
    
    for pattern, name in patterns.items():
        if re.search(pattern, smiles):
            return name
    
    return None

def _looks_like_systematic_name(name: str) -> bool:
    """Check if name looks like a systematic IUPAC name"""
    systematic_indicators = [
        'acid', 'amide', 'amine', 'ane', 'ene', 'yne', 'ol', 'al', 'one',
        'oic', 'carboxylic', 'hydroxy', 'methoxy', 'ethoxy', 'phenyl',
        'benz', 'cyclo', 'methyl', 'ethyl', 'propyl', 'butyl'
    ]
    
    name_lower = name.lower()
    return any(indicator in name_lower for indicator in systematic_indicators)

def generate_compound_summary(smiles: str, name: str, cas_number: str) -> Dict[str, Any]:
    """
    Generate a comprehensive compound summary with validation results
    """
    summary = {
        'smiles': smiles,
        'name': name,
        'cas_number': cas_number,
        'validation': {
            'structure_valid': False,
            'name_valid': False,
            'cas_valid': False
        },
        'suggestions': [],
        'calculated_properties': {},
        'data_quality': 'unknown'
    }
    
    try:
        clean_smiles = smiles.replace('\\', '').strip()
        
        # Structure validation
        summary['validation']['structure_valid'] = validate_chemical_structure(clean_smiles)
        
        if summary['validation']['structure_valid']:
            # Calculate properties
            formula, weight = calculate_molecular_properties(clean_smiles)
            if formula and weight:
                summary['calculated_properties']['molecular_formula'] = formula
                summary['calculated_properties']['molecular_weight'] = weight
            
            # Generate InChIKey
            inchikey = generate_inchikey(clean_smiles)
            if inchikey:
                summary['calculated_properties']['inchikey'] = inchikey
        
        # Name validation
        name_validation = validate_and_suggest_name(clean_smiles, name)
        summary['validation']['name_valid'] = name_validation['is_valid']
        summary['suggestions'].extend(name_validation['suggestions'])
        
        # CAS validation
        if cas_number and cas_number != 'Not found - enter manually':
            summary['validation']['cas_valid'] = _validate_cas_format(cas_number)
            if not summary['validation']['cas_valid']:
                summary['suggestions'].append('CAS number format appears invalid')
        
        # Data quality assessment
        quality_score = 0
        if summary['validation']['structure_valid']:
            quality_score += 1
        if summary['validation']['name_valid']:
            quality_score += 1
        if summary['validation']['cas_valid']:
            quality_score += 1
        
        if quality_score == 3:
            summary['data_quality'] = 'high'
        elif quality_score == 2:
            summary['data_quality'] = 'medium'
        else:
            summary['data_quality'] = 'low'
            
    except Exception as e:
        logger.error(f"Compound summary generation failed: {e}")
        summary['error'] = str(e)
    
    return summary

def _validate_cas_format(cas_number: str) -> bool:
    """Validate CAS number format (basic check)"""
    try:
        parts = cas_number.split('-')
        if len(parts) != 3:
            return False
        
        if not (parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit()):
            return False
        
        if len(parts[0]) < 2 or len(parts[1]) < 2 or len(parts[2]) != 1:
            return False
            
        return True
        
    except:
        return False

def get_calculation_progress(smiles: str, step: int) -> Dict[str, Any]:
    """
    Simulate real-time calculation progress
    In production, this would track actual background jobs
    """
    steps = [
        "Validating structure...",
        "Canonicalizing SMILES...", 
        "Calculating molecular formula...",
        "Computing molecular weight...",
        "Generating InChIKey...",
        "Finalizing results..."
    ]
    
    progress = {
        'smiles': smiles,
        'current_step': step,
        'total_steps': len(steps),
        'message': steps[step] if step < len(steps) else 'Completed',
        'progress_percent': int((step / len(steps)) * 100),
        'is_complete': step >= len(steps)
    }
    
    return progress