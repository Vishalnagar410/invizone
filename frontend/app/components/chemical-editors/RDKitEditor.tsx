'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Download, Upload } from 'lucide-react';

interface RDKitEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string) => void;
  readonly?: boolean;
}

declare global {
  interface Window {
    RDKit: any;
  }
}

export function RDKitEditor({ initialSmiles = '', onSmilesChange, readonly = false }: RDKitEditorProps) {
  const [rdkitLoaded, setRdkitLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load RDKit
    const loadRDKit = async () => {
      if (window.RDKit) {
        setRdkitLoaded(true);
        return;
      }

      try {
        // RDKit is typically loaded from a CDN or local build
        const script = document.createElement('script');
        script.src = '/rdkit/rdkit.js';
        script.onload = () => {
          window.RDKit.onModuleLoaded().then(() => {
            setRdkitLoaded(true);
          });
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load RDKit:', error);
      }
    };

    loadRDKit();
  }, []);

  useEffect(() => {
    if (rdkitLoaded && canvasRef.current && currentSmiles) {
      drawMolecule(currentSmiles);
    }
  }, [rdkitLoaded, currentSmiles]);

  const drawMolecule = (smiles: string) => {
    if (!window.RDKit || !canvasRef.current) return;

    try {
      const mol = window.RDKit.get_mol(smiles);
      const svg = mol.get_svg();
      mol.delete();
      
      canvasRef.current.innerHTML = svg;
      setIsLoading(false);
    } catch (error) {
      console.error('Error drawing molecule:', error);
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '<div class="text-red-500 text-sm">Invalid structure</div>';
      }
    }
  };

  const handleSmilesInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSmiles = event.target.value;
    setCurrentSmiles(newSmiles);
    onSmilesChange(newSmiles);
    
    if (rdkitLoaded && newSmiles) {
      drawMolecule(newSmiles);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement file parsing for chemical formats
    console.log('File upload:', file.name);
  };

  if (!rdkitLoaded) {
    return (
      <div className="card p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
        <p className="text-gray-600 dark:text-gray-300">Loading chemical editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SMILES Notation
          </label>
          <input
            type="text"
            value={currentSmiles}
            onChange={handleSmilesInput}
            placeholder="Enter SMILES notation (e.g., CCO for ethanol)"
            className="input-field"
            disabled={readonly}
          />
        </div>
        
        {!readonly && (
          <div className="flex items-end">
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
              <input
                type="file"
                className="hidden"
                accept=".mol,.sdf,.smiles,.txt"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}
      </div>

      <div className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Structure Preview
          </h3>
          {!readonly && (
            <button
              onClick={() => {
                // TODO: Implement structure editing modal
                console.log('Open structure editor');
              }}
              className="btn-primary text-sm"
            >
              Edit Structure
            </button>
          )}
        </div>
        
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : currentSmiles ? (
            <div 
              ref={canvasRef}
              className="chemical-structure text-gray-900 dark:text-white"
            />
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Enter a SMILES string to preview the chemical structure
            </p>
          )}
        </div>
      </div>

      {currentSmiles && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Input SMILES:</span>
            <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono break-all">
              {currentSmiles}
            </code>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <div className="mt-1 p-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
              {rdkitLoaded ? 'Structure valid' : 'Validating...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}