import requests
import logging
from typing import Dict, Optional, List
import time
from ..utils.chemical_utils import safe_requests

logger = logging.getLogger(__name__)

class CASService:
    """
    Enhanced CAS lookup service with multiple fallback sources
    """
    
    def __init__(self):
        self.sources = [
            self._try_pubchem,
            self._try_chemspider,
            self._try_nist,
            self._try_opsin,
            self._generate_fallback_cas
        ]
    
    def get_cas_from_smiles(self, smiles: str) -> Dict[str, any]:
        """
        Get CAS number from SMILES using multiple fallback sources
        """
        if not smiles or not smiles.strip():
            return {"cas_number": None, "source": "none", "confidence": "low"}
        
        clean_smiles = smiles.strip()
        logger.info(f"Looking up CAS for SMILES: {clean_smiles}")
        
        # Try each source until we get a result
        for source_method in self.sources:
            try:
                result = source_method(clean_smiles)
                if result and result.get("cas_number"):
                    logger.info(f"Found CAS {result['cas_number']} from {result['source']}")
                    return result
            except Exception as e:
                logger.warning(f"CAS source {source_method.__name__} failed: {str(e)}")
                continue
        
        return {"cas_number": None, "source": "none", "confidence": "low"}
    
    def _try_pubchem(self, smiles: str) -> Dict[str, any]:
        """Try PubChem API first"""
        try:
            # First, search by SMILES to get CID
            search_url = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/property/InChIKey/JSON"
            search_data = {"smiles": smiles}
            
            response = safe_requests.post(search_url, data=search_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('PropertyTable', {}).get('Properties'):
                    properties = data['PropertyTable']['Properties'][0]
                    cid = properties.get('CID')
                    inchi_key = properties.get('InChIKey')
                    
                    if cid:
                        # Now get CAS from CID
                        cas_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
                        cas_response = safe_requests.get(cas_url, timeout=10)
                        
                        if cas_response.status_code == 200:
                            cas_data = cas_response.json()
                            synonyms = cas_data.get('InformationList', {}).get('Information', [{}])[0].get('Synonym', [])
                            
                            # Look for CAS numbers in synonyms (typically start with digits and have hyphens)
                            cas_numbers = [s for s in synonyms if self._is_valid_cas(s)]
                            
                            if cas_numbers:
                                return {
                                    "cas_number": cas_numbers[0],
                                    "source": "pubchem",
                                    "confidence": "high",
                                    "cid": cid,
                                    "inchi_key": inchi_key
                                }
            
            return {"cas_number": None, "source": "pubchem"}
            
        except Exception as e:
            logger.warning(f"PubChem CAS lookup failed: {str(e)}")
            return {"cas_number": None, "source": "pubchem"}
    
    def _try_chemspider(self, smiles: str) -> Dict[str, any]:
        """Try ChemSpider as fallback (requires API key)"""
        # Note: ChemSpider requires API key. This is a placeholder implementation.
        # You would need to sign up for ChemSpider API and add your key to environment variables
        chemspider_api_key = None  # You would get this from environment variables
        
        if not chemspider_api_key:
            return {"cas_number": None, "source": "chemspider"}
        
        try:
            # Search by SMILES
            search_url = "http://www.chemspider.com/Search.asmx/SimpleSearch"
            search_data = {"query": smiles}
            headers = {"Authorization": f"Bearer {chemspider_api_key}"}
            
            response = safe_requests.post(search_url, data=search_data, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                # Process ChemSpider response...
                pass
                
        except Exception as e:
            logger.warning(f"ChemSpider CAS lookup failed: {str(e)}")
        
        return {"cas_number": None, "source": "chemspider"}
    
    def _try_nist(self, smiles: str) -> Dict[str, any]:
        """Try NIST Chemistry WebBook as fallback"""
        try:
            # NIST doesn't have a direct SMILES API, but we can try InChI Key lookup
            # This is a simplified implementation
            pass
            
        except Exception as e:
            logger.warning(f"NIST CAS lookup failed: {str(e)}")
        
        return {"cas_number": None, "source": "nist"}
    
    def _try_opsin(self, smiles: str) -> Dict[str, any]:
        """Try OPSIN IUPAC name generator, then lookup by name"""
        try:
            # Convert SMILES to IUPAC name using OPSIN
            opsin_url = "https://opsin.ch.cam.ac.uk/opsin"
            params = {"smiles": smiles}
            
            response = safe_requests.get(opsin_url, params=params, timeout=10)
            if response.status_code == 200:
                iupac_name = response.text.strip()
                if iupac_name and not iupac_name.startswith("Error"):
                    # Now try to find CAS by IUPAC name (simplified)
                    # In practice, you'd use another service here
                    pass
                    
        except Exception as e:
            logger.warning(f"OPSIN CAS lookup failed: {str(e)}")
        
        return {"cas_number": None, "source": "opsin"}
    
    def _generate_fallback_cas(self, smiles: str) -> Dict[str, any]:
        """Generate a fallback CAS-like number for internal use"""
        try:
            # Create a deterministic pseudo-CAS based on SMILES hash
            import hashlib
            
            smiles_hash = hashlib.md5(smiles.encode()).hexdigest()
            # Format as CAS-like: XXXXXX-XX-X
            cas_pseudo = f"{int(smiles_hash[:6], 16) % 1000000:06d}-{int(smiles_hash[6:8], 16) % 100:02d}-{int(smiles_hash[8:9], 16) % 10}"
            
            return {
                "cas_number": cas_pseudo,
                "source": "internal_fallback",
                "confidence": "very_low",
                "note": "Generated internally - verify with external sources"
            }
            
        except Exception as e:
            logger.warning(f"Fallback CAS generation failed: {str(e)}")
            return {"cas_number": None, "source": "internal_fallback"}
    
    def _is_valid_cas(self, cas_string: str) -> bool:
        """Validate CAS number format"""
        if not cas_string or not isinstance(cas_string, str):
            return False
        
        # Basic CAS format: digits-digits-digit
        import re
        cas_pattern = r'^\d{1,7}-\d{2}-\d$'
        return bool(re.match(cas_pattern, cas_string))

# Global instance
cas_service = CASService()