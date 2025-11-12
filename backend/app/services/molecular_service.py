import logging
from typing import Dict, Any, Optional, Tuple
import hashlib

logger = logging.getLogger(__name__)

class MolecularService:
    """
    Molecular calculation service using RDKit for chemical structure operations
    """
    
    def __init__(self):
        self.rdkit_available = False
        self._initialize_rdkit()
    
    def _initialize_rdkit(self):
        """Initialize RDKit with proper error handling"""
        try:
            from rdkit import Chem
            from rdkit.Chem import AllChem, Descriptors, Draw
            from rdkit.Chem.inchi import MolToInchi, MolToInchiKey, InchiToMol
            from rdkit.Chem.rdMolDescriptors import CalcExactMolWt, CalcMolFormula
            
            self.Chem = Chem
            self.AllChem = AllChem
            self.Descriptors = Descriptors
            self.Draw = Draw
            self.MolToInchi = MolToInchi
            self.MolToInchiKey = MolToInchiKey
            self.InchiToMol = InchiToMol
            self.CalcExactMolWt = CalcExactMolWt
            self.CalcMolFormula = CalcMolFormula
            
            self.rdkit_available = True
            logger.info("✅ RDKit initialized successfully")
            
        except ImportError as e:
            logger.warning(f"❌ RDKit not available: {e}")
            self.rdkit_available = False
        except Exception as e:
            logger.error(f"❌ RDKit initialization failed: {e}")
            self.rdkit_available = False
    
def calculate_molecular_properties(self, smiles: str) -> Optional[Dict[str, Any]]:
    """
    Calculate comprehensive molecular properties using RDKit with enhanced accuracy
    """
    if not self.rdkit_available:
        return self._calculate_properties_fallback(smiles)
    
    try:
        # Clean SMILES first
        clean_smiles = smiles.strip()
        mol = self.Chem.MolFromSmiles(clean_smiles)
        if not mol:
            logger.warning(f"❌ RDKit could not parse SMILES: {clean_smiles}")
            return self._calculate_properties_fallback(clean_smiles)
        
        # Calculate basic properties
        molecular_weight = self.CalcExactMolWt(mol)
        molecular_formula = self.CalcMolFormula(mol)
        
        # Generate canonical SMILES (this fixes structure representation)
        canonical_smiles = self.Chem.MolToSmiles(mol, canonical=True)
        
        # Generate InChI and InChIKey
        inchi = self.MolToInchi(mol)
        inchikey = self.MolToInchiKey(mol)
        
        # Calculate additional descriptors
        logp = self.Descriptors.MolLogP(mol)
        tpsa = self.Descriptors.TPSA(mol)
        hbd = self.Descriptors.NumHDonors(mol)
        hba = self.Descriptors.NumHAcceptors(mol)
        rotatable_bonds = self.Descriptors.NumRotatableBonds(mol)
        heavy_atom_count = self.Descriptors.HeavyAtomCount(mol)
        formal_charge = self.Chem.GetFormalCharge(mol)
        
        # Generate 2D coordinates
        self.AllChem.Compute2DCoords(mol)
        
        # Enhanced property calculation
        properties = {
            "canonical_smiles": canonical_smiles,
            "molecular_formula": molecular_formula,
            "molecular_weight": round(molecular_weight, 4),
            "inchi": inchi,
            "inchikey": inchikey,
            "logp": round(logp, 2),
            "tpsa": round(tpsa, 2),
            "hydrogen_bond_donors": hbd,
            "hydrogen_bond_acceptors": hba,
            "rotatable_bonds": rotatable_bonds,
            "heavy_atom_count": heavy_atom_count,
            "formal_charge": formal_charge,
            "atom_count": mol.GetNumAtoms(),
            "ring_count": self.Chem.rdMolDescriptors.CalcNumRings(mol),
            "aromatic_rings": self.Chem.rdMolDescriptors.CalcNumAromaticRings(mol),
            "calculation_source": "rdkit",
            "is_valid": True,
            "mol_object": None  # Don't return the actual mol object
        }
        
        logger.info(f"✅ RDKit calculated properties for: {canonical_smiles}")
        logger.info(f"📊 Formula: {molecular_formula}, Weight: {molecular_weight:.2f}")
        
        return properties
        
    except Exception as e:
        logger.error(f"❌ RDKit property calculation failed: {e}")
        return self._calculate_properties_fallback(smiles)
    
    def _calculate_properties_fallback(self, smiles: str) -> Dict[str, Any]:
        """
        Fallback property calculation when RDKit is not available
        """
        logger.info(f"Using fallback property calculation for: {smiles}")
        
        # Generate pseudo-InChIKey from hash
        hash_obj = hashlib.md5(smiles.encode())
        hash_hex = hash_obj.hexdigest()[:14].upper()
        pseudo_inchikey = f"FAKE-{hash_hex}"
        
        # Basic pattern-based formula estimation
        formula_parts = []
        carbon_count = smiles.count('C') - smiles.count('Cl')
        hydrogen_count = smiles.count('H')
        oxygen_count = smiles.count('O')
        nitrogen_count = smiles.count('N')
        
        if carbon_count > 0:
            formula_parts.append(f"C{carbon_count}" if carbon_count > 1 else "C")
        if hydrogen_count > 0:
            formula_parts.append(f"H{hydrogen_count}" if hydrogen_count > 1 else "H")
        if oxygen_count > 0:
            formula_parts.append(f"O{oxygen_count}" if oxygen_count > 1 else "O")
        if nitrogen_count > 0:
            formula_parts.append(f"N{nitrogen_count}" if nitrogen_count > 1 else "N")
        
        molecular_formula = "".join(formula_parts) if formula_parts else "Unknown"
        
        # Very rough molecular weight estimation
        base_weight = (
            carbon_count * 12 +
            hydrogen_count * 1 +
            oxygen_count * 16 +
            nitrogen_count * 14
        )
        
        return {
            "canonical_smiles": smiles,
            "molecular_formula": molecular_formula,
            "molecular_weight": round(base_weight, 2),
            "inchi": f"InChI=1S/{molecular_formula}",
            "inchikey": pseudo_inchikey,
            "logp": 0.0,
            "tpsa": 0.0,
            "hydrogen_bond_donors": 0,
            "hydrogen_bond_acceptors": 0,
            "rotatable_bonds": 0,
            "heavy_atom_count": carbon_count + oxygen_count + nitrogen_count,
            "formal_charge": 0,
            "atom_count": carbon_count + hydrogen_count + oxygen_count + nitrogen_count,
            "ring_count": 0,
            "aromatic_rings": 1 if 'c' in smiles else 0,
            "calculation_source": "fallback",
            "note": "Properties estimated - RDKit not available"
        }
    
    def optimize_structure(self, smiles: str) -> Optional[Dict[str, Any]]:
        """
        Optimize molecular structure and return canonical representation
        """
        if not self.rdkit_available:
            return {
                "canonical_smiles": smiles,
                "optimized_smiles": smiles,
                "note": "RDKit not available - using original SMILES"
            }
        
        try:
            mol = self.Chem.MolFromSmiles(smiles)
            if not mol:
                return None
            
            # Generate canonical SMILES
            canonical_smiles = self.Chem.MolToSmiles(mol, canonical=True)
            
            # Generate 2D coordinates
            self.AllChem.Compute2DCoords(mol)
            
            # Calculate simple 3D coordinates (rough)
            mol_3d = self.Chem.AddHs(mol)
            self.AllChem.EmbedMolecule(mol_3d)
            self.AllChem.UFFOptimizeMolecule(mol_3d)
            
            return {
                "original_smiles": smiles,
                "canonical_smiles": canonical_smiles,
                "has_3d_coordinates": True,
                "optimization_method": "UFF",
                "note": "Structure optimized with RDKit"
            }
            
        except Exception as e:
            logger.error(f"Structure optimization failed: {e}")
            return None
    
    def validate_structure(self, smiles: str) -> Dict[str, Any]:
        """
        Validate molecular structure and return validation results
        """
        validation_result = {
            "is_valid": False,
            "errors": [],
            "warnings": [],
            "smiles": smiles
        }
        
        # Basic validation
        if not smiles or not isinstance(smiles, str):
            validation_result["errors"].append("SMILES must be a non-empty string")
            return validation_result
        
        clean_smiles = smiles.strip()
        if len(clean_smiles) < 2:
            validation_result["errors"].append("SMILES too short")
            return validation_result
        
        # Check for basic chemical symbols
        chemical_pattern = r'[CHONPSBIFClBr\[\]\(\)=#@\+\-\\\/]'
        import re
        if not re.search(chemical_pattern, clean_smiles):
            validation_result["errors"].append("SMILES does not contain valid chemical symbols")
            return validation_result
        
        # RDKit validation if available
        if self.rdkit_available:
            try:
                mol = self.Chem.MolFromSmiles(clean_smiles)
                if mol:
                    validation_result["is_valid"] = True
                    validation_result["atom_count"] = mol.GetNumAtoms()
                    validation_result["heavy_atom_count"] = self.Descriptors.HeavyAtomCount(mol)
                    
                    # Check for common issues
                    if self.Chem.DetectChemistryProblems(mol):
                        validation_result["warnings"].append("Structure may have chemistry issues")
                    
                else:
                    validation_result["errors"].append("RDKit could not parse SMILES")
                    
            except Exception as e:
                validation_result["errors"].append(f"RDKit validation error: {str(e)}")
        else:
            # Fallback validation
            validation_result["is_valid"] = True
            validation_result["warnings"].append("Using basic validation - RDKit not available")
        
        return validation_result
    
    def convert_format(self, input_data: str, input_format: str, output_format: str) -> Optional[str]:
        """
        Convert between molecular formats
        """
        if not self.rdkit_available:
            return None
        
        try:
            mol = None
            
            # Parse input
            if input_format.lower() == "smiles":
                mol = self.Chem.MolFromSmiles(input_data)
            elif input_format.lower() == "inchi":
                mol = self.InchiToMol(input_data)
            # Add more formats as needed
            
            if not mol:
                return None
            
            # Generate output
            if output_format.lower() == "smiles":
                return self.Chem.MolToSmiles(mol, canonical=True)
            elif output_format.lower() == "inchi":
                return self.MolToInchi(mol)
            elif output_format.lower() == "inchikey":
                return self.MolToInchiKey(mol)
            elif output_format.lower() == "mol":
                return self.Chem.MolToMolBlock(mol)
            # Add more formats as needed
            
        except Exception as e:
            logger.error(f"Format conversion failed: {e}")
        
        return None
    
    def get_compound_summary(self, smiles: str) -> Dict[str, Any]:
        """
        Get comprehensive compound summary
        """
        properties = self.calculate_molecular_properties(smiles)
        validation = self.validate_structure(smiles)
        
        summary = {
            "smiles": smiles,
            "validation": validation,
            "properties": properties,
            "summary": {
                "is_valid": validation["is_valid"],
                "has_properties": bool(properties),
                "data_quality": "high" if properties and properties.get("calculation_source") == "rdkit" else "medium"
            }
        }
        
        return summary

# Global service instance
molecular_service = MolecularService()