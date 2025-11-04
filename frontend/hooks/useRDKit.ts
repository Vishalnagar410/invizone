import { useState, useEffect } from 'react';

interface RDKitModule {
  version: string;
  get_mol: (smiles: string) => any;
  get_inchikey_for_inchi: (inchi: string) => string;
  get_mol_wt: (mol: any) => number;
  get_formula: (mol: any) => string;
}

interface UseRDKitReturn {
  rdkit: RDKitModule | null;
  loading: boolean;
  error: string | null;
  loadRDKit: () => Promise<void>;
}

export const useRDKit = (): UseRDKitReturn => {
  const [rdkit, setRdkit] = useState<RDKitModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRDKit = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Check if already loaded
      if ((window as any).RDKit) {
        setRdkit((window as any).RDKit);
        return;
      }

      // Load RDKit from public directory
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/rdkit/RDKit_minimal.js';
        script.onload = () => {
          if ((window as any).RDKit && (window as any).RDKit.load) {
            (window as any).RDKit.load().then((rdkitModule: RDKitModule) => {
              setRdkit(rdkitModule);
              resolve();
            }).catch(reject);
          } else {
            // Fallback to mock if real RDKit not available
            console.warn('⚠️ Using RDKit mock - chemical structure features will be limited');
            setRdkit(createMockRDKit());
            resolve();
          }
        };
        script.onerror = () => {
          console.warn('⚠️ RDKit load failed, using mock implementation');
          setRdkit(createMockRDKit());
          resolve();
        };
        document.head.appendChild(script);
      });
    } catch (err) {
      console.error('Failed to load RDKit:', err);
      setError('Failed to load chemical structure renderer. Using limited functionality.');
      setRdkit(createMockRDKit());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRDKit();
  }, []);

  return { rdkit, loading, error, loadRDKit };
};

// Mock RDKit for development/fallback
const createMockRDKit = (): RDKitModule => {
  return {
    version: "2022.9.5-mock",
    get_mol: (smiles: string) => {
      console.log('🧪 Mock RDKit: Processing SMILES:', smiles);
      return {
        get_mol_wt: () => calculateMockMolecularWeight(smiles),
        get_formula: () => calculateMockFormula(smiles),
        is_valid: () => true,
        get_smiles: () => smiles,
        get_canonical_smiles: () => smiles,
        get_inchi: () => `InChI=1S/Mock/${smiles}`,
        get_inchikey: () => `MOCK${btoa(smiles).substring(0, 22)}`,
        get_svg: (width = 300, height = 300) => generateMockSVG(smiles, width, height),
        delete: () => {} // Cleanup method
      };
    },
    get_inchikey_for_inchi: (inchi: string) => `MOCK${btoa(inchi).substring(0, 22)}`,
    get_mol_wt: (mol: any) => mol.get_mol_wt(),
    get_formula: (mol: any) => mol.get_formula()
  };
};

// Helper functions for mock RDKit
const calculateMockMolecularWeight = (smiles: string): number => {
  // Simple mock calculation based on common elements
  const elements: Record<string, number> = {
    'C': 12.01, 'H': 1.008, 'O': 16.00, 'N': 14.01,
    'S': 32.06, 'P': 30.97, 'F': 19.00, 'Cl': 35.45,
    'Br': 79.90, 'I': 126.90
  };
  
  let weight = 0;
  for (const element in elements) {
    const regex = new RegExp(element, 'g');
    const count = (smiles.match(regex) || []).length;
    weight += count * elements[element];
  }
  
  return weight || 100.0; // Default if no recognizable elements
};

const calculateMockFormula = (smiles: string): string => {
  const elements: Record<string, number> = {};
  
  // Count common elements (simplified)
  const elementRegex = /(C|H|O|N|S|P|F|Cl|Br|I)/g;
  let match;
  while ((match = elementRegex.exec(smiles)) !== null) {
    const element = match[1];
    elements[element] = (elements[element] || 0) + 1;
  }
  
  // Format as molecular formula
  const formula = Object.entries(elements)
    .map(([element, count]) => `${element}${count > 1 ? count : ''}`)
    .join('');
  
  return formula || 'C?H?O?';
};

const generateMockSVG = (smiles: string, width: number, height: number): string => {
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="monospace" font-size="12" fill="#475569">
        ${smiles.substring(0, 30)}${smiles.length > 30 ? '...' : ''}
      </text>
      <text x="50%" y="65%" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">
        Mock Structure - Install RDKit for full features
      </text>
    </svg>
  `;
};

// Utility functions for chemical operations - EXPORTED CORRECTLY
export const useRDKitUtils = () => {
  const { rdkit } = useRDKit();

  const validateSmiles = (smiles: string): boolean => {
    if (!rdkit) return false;
    try {
      const mol = rdkit.get_mol(smiles);
      const isValid = mol?.is_valid?.() || false;
      mol?.delete?.();
      return isValid;
    } catch {
      return false;
    }
  };

  const getCanonicalSmiles = (smiles: string): string => {
    if (!rdkit) return smiles;
    try {
      const mol = rdkit.get_mol(smiles);
      const canonical = mol?.get_canonical_smiles?.() || smiles;
      mol?.delete?.();
      return canonical;
    } catch {
      return smiles;
    }
  };

  const getMolecularWeight = (smiles: string): number => {
    if (!rdkit) return calculateMockMolecularWeight(smiles);
    try {
      const mol = rdkit.get_mol(smiles);
      const weight = mol?.get_mol_wt?.() || 0;
      mol?.delete?.();
      return weight;
    } catch {
      return calculateMockMolecularWeight(smiles);
    }
  };

  const getMolecularFormula = (smiles: string): string => {
    if (!rdkit) return calculateMockFormula(smiles);
    try {
      const mol = rdkit.get_mol(smiles);
      const formula = mol?.get_formula?.() || '';
      mol?.delete?.();
      return formula;
    } catch {
      return calculateMockFormula(smiles);
    }
  };

  const generateStructureSVG = (smiles: string, width = 300, height = 300): string => {
    if (!rdkit) return generateMockSVG(smiles, width, height);
    try {
      const mol = rdkit.get_mol(smiles);
      const svg = mol?.get_svg?.(width, height) || generateMockSVG(smiles, width, height);
      mol?.delete?.();
      return svg;
    } catch {
      return generateMockSVG(smiles, width, height);
    }
  };

  return {
    validateSmiles,
    getCanonicalSmiles,
    getMolecularWeight,
    getMolecularFormula,
    generateStructureSVG
  };
};