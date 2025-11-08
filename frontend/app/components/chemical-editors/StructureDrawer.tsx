'use client';

import { useState, useRef } from 'react';
import { Ketcher } from 'ketcher-core';
import { Editor } from 'ketcher-react';
import 'ketcher-react/dist/index.css';
import { Download, Upload, RotateCcw } from 'lucide-react';

interface StructureDrawerProps {
  onSmilesChange: (smiles: string) => void;
  initialSmiles?: string;
}

export function StructureDrawer({ onSmilesChange, initialSmiles = '' }: StructureDrawerProps) {
  const [ketcher, setKetcher] = useState<Ketcher | null>(null);
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEditorReady = (ketcherInstance: Ketcher) => {
    setKetcher(ketcherInstance);
    setIsLoading(false);
    
    // Load initial SMILES if provided
    if (initialSmiles) {
      ketcherInstance.setMolecule(initialSmiles);
    }
  };

  const handleStructureChange = async () => {
    if (!ketcher) return;
    
    try {
      const smiles = await ketcher.getSmiles();
      setCurrentSmiles(smiles);
      onSmilesChange(smiles);
    } catch (error) {
      console.error('Error getting SMILES:', error);
    }
  };

  const handleImportSMILES = async () => {
    if (!ketcher || !currentSmiles.trim()) return;
    
    try {
      await ketcher.setMolecule(currentSmiles);
      handleStructureChange();
    } catch (error) {
      console.error('Error importing SMILES:', error);
      alert('Invalid SMILES string. Please check the format.');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !ketcher) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await ketcher.setMolecule(content);
        handleStructureChange();
      } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading chemical file. Please try another format.');
      }
    };

    if (file.name.endsWith('.mol') || file.name.endsWith('.sdf')) {
      reader.readAsText(file);
    } else if (file.name.endsWith('.smiles') || file.name.endsWith('.smi')) {
      reader.readAsText(file);
    } else {
      alert('Please upload .mol, .sdf, .smiles, or .smi files only.');
    }
    
    event.target.value = '';
  };

  const handleClear = async () => {
    if (!ketcher) return;
    await ketcher.setMolecule('');
    setCurrentSmiles('');
    onSmilesChange('');
  };

  const handleExportSMILES = () => {
    if (!currentSmiles) return;
    
    // Copy to clipboard
    navigator.clipboard.writeText(currentSmiles)
      .then(() => alert('SMILES copied to clipboard!'))
      .catch(() => {
        // Fallback: show in alert
        alert(`SMILES: ${currentSmiles}`);
      });
  };

  return (
    <div className="space-y-4">
      {/* Structure Drawing Canvas */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Draw Chemical Structure
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Clear
            </button>
            
            <label className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1 cursor-pointer">
              <Upload className="h-4 w-4" />
              Import
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".mol,.sdf,.smiles,.smi"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading structure editor...</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <Editor 
                onInit={handleEditorReady}
                staticResourcesUrl={typeof window !== 'undefined' ? window.location.origin : ''}
                options={{
                  theme: 'dark',
                  buttons: ['layout', 'clean', 'arom', 'dearom', 'cip', 'check', 'analyse', 'recognize', 'miew', 'settings', 'help', 'about']
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* SMILES Input/Output Section */}
      <div className="card p-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">SMILES Notation</h4>
          <button
            onClick={handleExportSMILES}
            disabled={!currentSmiles}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Copy SMILES
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={currentSmiles}
              onChange={(e) => setCurrentSmiles(e.target.value)}
              placeholder="Enter or paste SMILES notation here..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleImportSMILES}
              disabled={!currentSmiles.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
          
          {currentSmiles && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Current SMILES:</p>
              <code className="text-xs font-mono break-all bg-white dark:bg-gray-700 p-2 rounded border">
                {currentSmiles}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How to use:</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Draw structures using the tools on the left</li>
          <li>• Import existing structures using the Import button</li>
          <li>• Paste SMILES notation and click Import to load</li>
          <li>• Copy SMILES to use in other applications</li>
        </ul>
      </div>
    </div>
  );
}