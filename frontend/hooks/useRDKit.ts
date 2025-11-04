// frontend/hooks/useRDKit.ts
import { useState, useEffect } from 'react';

interface RDKitModule {
  version: string;
  get_mol: (smiles: string) => any;
  get_inchikey_from_smiles: (smiles: string) => string;
  get_svg_from_smiles: (smiles: string, width?: number, height?: number) => string;
}

export const useRDKit = () => {
  const [rdkit, setRdkit] = useState<RDKitModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRDKit = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the RDKit loader
        const loadedRdkit = await (window as any).RDKitLoader.loadRDKit();
        setRdkit(loadedRdkit);
      } catch (err) {
        console.error('Failed to load RDKit:', err);
        setError('Failed to load chemical structure renderer');
      } finally {
        setLoading(false);
      }
    };

    loadRDKit();
  }, []);

  return { rdkit, loading, error };
};