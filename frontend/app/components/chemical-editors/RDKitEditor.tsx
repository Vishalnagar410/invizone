'use client';

import { useState, useEffect, useRef } from 'react';
import { useRDKit } from '@/hooks/useRDKit';
import { Loader2, Download, Upload, CheckCircle, XCircle } from 'lucide-react';

interface RDKitEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean) => void;
  readonly?: boolean;
  showValidation?: boolean;
  width?: number;
  height?: number;
}

export function RDKitEditor({ 
  initialSmiles = '', 
  onSmilesChange, 
  readonly = false,
  showValidation = true,
  width = 300,
  height = 300
}: RDKitEditorProps) {
  const { rdkit, loading, error } = useRDKit();
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const structureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSmiles && initialSmiles !== currentSmiles) {
      setCurrentSmiles(initialSmiles);
      validateAndRender(initialSmiles);
    }
  }, [initialSmiles]);

  useEffect(() => {
    if (currentSmiles) {
      validateAndRender(currentSmiles);
    } else {
      clearStructure();
      setIsValid(null);
      setValidationMessage('');
    }
  }, [rdkit, currentSmiles]);

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

  const generateStructureSVG = (smiles: string, width: number = 300, height: number = 300): string => {
    if (!rdkit) {
      return `<div style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;color:#666;">RDKit not loaded</div>`;
    }
    try {
      const mol = rdkit.get_mol(smiles);
      const svg = mol?.get_svg?.(width, height) || `<div style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;color:#666;">Render failed</div>`;
      mol?.delete?.();
      return svg;
    } catch {
      return `<div style="width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;border:1px dashed #ccc;color:#666;">Render failed</div>`;
    }
  };

  const validateAndRender = async (smiles: string) => {
    if (!smiles.trim()) {
      clearStructure();
      setIsValid(null);
      setValidationMessage('');
      onSmilesChange(smiles, false);
      return;
    }

    try {
      const valid = validateSmiles(smiles);
      setIsValid(valid);
      
      if (valid) {
        setValidationMessage('Valid chemical structure');
        renderStructure(smiles);
        onSmilesChange(smiles, true);
      } else {
        setValidationMessage('Invalid chemical structure');
        clearStructure();
        onSmilesChange(smiles, false);
      }
    } catch (err) {
      console.error('Validation error:', err);
      setIsValid(false);
      setValidationMessage('Error validating structure');
      clearStructure();
      onSmilesChange(smiles, false);
    }
  };

  const renderStructure = (smiles: string) => {
    if (!structureRef.current) return;
    
    try {
      const svg = generateStructureSVG(smiles, width, height);
      structureRef.current.innerHTML = svg;
    } catch (err) {
      console.error('Rendering error:', err);
      if (structureRef.current) {
        structureRef.current.innerHTML = `
          <div class="text-center p-4 text-red-600 dark:text-red-400">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to render structure</p>
          </div>
        `;
      }
    }
  };

  const clearStructure = () => {
    if (structureRef.current) {
      structureRef.current.innerHTML = '';
    }
  };

  const handleSmilesInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSmiles = event.target.value;
    setCurrentSmiles(newSmiles);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simple file reading for SMILES files
    if (file.name.endsWith('.smiles') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const smiles = content.split('\n')[0].trim(); // Take first line
        setCurrentSmiles(smiles);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload .smiles or .txt files only');
    }
    event.target.value = ''; // Reset file input
  };

  const handleTryExample = () => {
    const examples = [
      'CCO', // Ethanol
      'CC(=O)O', // Acetic acid
      'C1=CC=CC=C1', // Benzene
      'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' // Caffeine
    ];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    setCurrentSmiles(randomExample);
  };

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600 dark:text-gray-300">Loading chemical editor...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          This may take a few moments
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Chemical Editor Unavailable
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {error}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You can still enter SMILES notation, but structure preview will be limited.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* SMILES Input Section */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SMILES Notation *
          </label>
          <input
            type="text"
            value={currentSmiles}
            onChange={handleSmilesInput}
            placeholder="Enter SMILES notation (e.g., CCO for ethanol)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            disabled={readonly}
          />
        </div>
        
        {!readonly && (
          <div className="flex items-end gap-2">
            <button
              onClick={handleTryExample}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              type="button"
            >
              Try Example
            </button>
            
            <label className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
              <Upload className="h-4 w-4 inline mr-1" />
              Import
              <input
                type="file"
                className="hidden"
                accept=".smiles,.txt"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}
      </div>

      {/* Validation Status */}
      {showValidation && currentSmiles && isValid !== null && (
        <div className={`p-3 rounded-md flex items-center gap-2 ${
          isValid 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }`}>
          {isValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span className="text-sm">{validationMessage}</span>
        </div>
      )}

      {/* Structure Preview */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Structure Preview
          </h3>
          {!readonly && currentSmiles && isValid && (
            <button
              onClick={() => {
                const canonical = getCanonicalSmiles(currentSmiles);
                setCurrentSmiles(canonical);
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Canonicalize
            </button>
          )}
        </div>
        
        <div 
          ref={structureRef}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-white dark:bg-gray-800"
        >
          {!currentSmiles ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>Enter a SMILES string to preview</p>
              <p className="text-sm mt-1">e.g., CCO for ethanol</p>
            </div>
          ) : isValid === false ? (
            <div className="text-center text-red-600 dark:text-red-400">
              <XCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Invalid structure</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* SMILES Details */}
      {currentSmiles && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Current SMILES:</span>
            <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono break-all">
              {currentSmiles}
            </code>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Editor Status:</span>
            <div className={`mt-1 p-2 rounded text-xs ${
              rdkit 
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            }`}>
              {rdkit ? 'Full features available' : 'Limited functionality - using mock'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}