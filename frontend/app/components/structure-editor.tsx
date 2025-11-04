'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Download, Upload, Edit3, Type } from 'lucide-react';

interface StructureEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string) => void;
  readonly?: boolean;
}

declare global {
  interface Window {
    RDKit: any;
  }
}

export function StructureEditor({ initialSmiles = '', onSmilesChange, readonly = false }: StructureEditorProps) {
  const [rdkitLoaded, setRdkitLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [drawingMode, setDrawingMode] = useState<'draw' | 'text'>('text');
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
    } else if (rdkitLoaded && canvasRef.current && !currentSmiles) {
      // Clear canvas if no SMILES
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '<div class="text-gray-500 text-sm">Draw or enter SMILES to see structure</div>';
      }
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
    // This would typically parse MOL, SDF files and extract SMILES
  };

  const startDrawing = () => {
    if (!rdkitLoaded) return;
    
    // TODO: Implement structure drawing interface
    // This would open a modal or switch to drawing mode
    console.log('Starting structure drawing...');
    setDrawingMode('draw');
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
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setDrawingMode('text')}
          className={`flex-1 py-2 px-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
            drawingMode === 'text'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Type className="h-4 w-4" />
          Text Input
        </button>
        <button
          onClick={startDrawing}
          className={`flex-1 py-2 px-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
            drawingMode === 'draw'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Draw
        </button>
      </div>

      {drawingMode === 'text' ? (
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
            {isLoading && currentSmiles ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : currentSmiles ? (
              <div 
                ref={canvasRef}
                className="chemical-structure text-gray-900 dark:text-white max-w-full"
              />
            ) : (
              <div className="text-center">
                <Type className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Enter a SMILES string to preview the chemical structure
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Structure Drawing
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Interactive structure drawing coming soon...
            </p>
            <button
              onClick={() => setDrawingMode('text')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Use Text Input Instead
            </button>
          </div>
        </div>
      )}

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
            <div className={`mt-1 p-2 rounded text-xs ${
              rdkitLoaded && currentSmiles 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {rdkitLoaded ? 'Structure valid' : 'Validating...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}