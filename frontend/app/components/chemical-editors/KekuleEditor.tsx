'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Check, Download } from 'lucide-react';

interface KekuleEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean) => void;
  height?: number;
}

declare global {
  interface Window {
    Kekule?: any;
  }
}

export function KekuleEditor({ 
  initialSmiles = '', 
  onSmilesChange,
  height = 400 
}: KekuleEditorProps) {
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<any>(null);

  useEffect(() => {
    const loadKekule = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Check if already loaded
        if (window.Kekule) {
          initializeEditor();
          return;
        }

        // Load Kekule.js CSS first
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/kekule@1.0.0/themes/default/kekule.css';
        cssLink.onerror = () => console.warn('Kekule CSS failed to load');
        document.head.appendChild(cssLink);

        // Load Kekule.js script
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/kekule@1.0.0/kekule.js';
        script.async = true;

        script.onload = () => {
          console.log('✅ Kekule.js loaded successfully');
          setTimeout(() => initializeEditor(), 100);
        };

        script.onerror = () => {
          setError('Failed to load Kekule.js from CDN');
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError('Error loading Kekule.js');
        setIsLoading(false);
      }
    };

    const initializeEditor = () => {
      if (!editorRef.current || !window.Kekule) {
        setError('Kekule.js not available after load');
        setIsLoading(false);
        return;
      }

      try {
        // Clear container
        editorRef.current.innerHTML = '';
        
        // Create composer using Kekule API
        const Kekule = window.Kekule;
        composerRef.current = new Kekule.Editor.Composer(editorRef.current);
        composerRef.current.setPreferRichContent(false);
        composerRef.current.setDimension('100%', height);

        // Set up change listener
        composerRef.current.setApplyChangeCallback(() => {
          try {
            const mol = composerRef.current.getChemObject();
            if (mol) {
              const smiles = mol.toFormat('smiles');
              setCurrentSmiles(smiles);
              setIsValid(true);
              onSmilesChange(smiles, true);
            }
          } catch (err) {
            console.error('Error getting SMILES from Kekule:', err);
            setIsValid(false);
          }
        });

        // Load initial SMILES if provided
        if (initialSmiles) {
          try {
            const mol = Kekule.Molecule.readFromFormat(initialSmiles, 'smiles');
            if (mol) {
              composerRef.current.setChemObject(mol);
            }
          } catch (err) {
            console.warn('Could not load initial SMILES in Kekule:', err);
          }
        }

        setIsLoading(false);
        console.log('✅ Kekule.js editor initialized successfully');
      } catch (err) {
        console.error('Error initializing Kekule editor:', err);
        setError('Failed to initialize Kekule editor');
        setIsLoading(false);
      }
    };

    loadKekule();

    // Cleanup
    return () => {
      if (composerRef.current) {
        try {
          composerRef.current.destroy();
        } catch (err) {
          console.error('Error cleaning up Kekule editor:', err);
        }
      }
    };
  }, [height, initialSmiles, onSmilesChange]);

  const handleImportSMILES = () => {
    if (!currentSmiles.trim() || !window.Kekule) return;
    
    try {
      const Kekule = window.Kekule;
      const mol = Kekule.Molecule.readFromFormat(currentSmiles, 'smiles');
      if (mol && composerRef.current) {
        composerRef.current.setChemObject(mol);
        setIsValid(true);
        onSmilesChange(currentSmiles, true);
      } else {
        setIsValid(false);
      }
    } catch (err) {
      setIsValid(false);
      console.error('Error importing SMILES to Kekule:', err);
    }
  };

  const handleClear = () => {
    if (composerRef.current) {
      composerRef.current.setChemObject(null);
    }
    setCurrentSmiles('');
    setIsValid(true);
    onSmilesChange('', true);
  };

  const handleCopySMILES = async () => {
    if (!currentSmiles) return;
    try {
      await navigator.clipboard.writeText(currentSmiles);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = currentSmiles;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Kekule.js - 2D Structure Editor</h4>
            <div className="flex gap-2">
              <button onClick={handleClear} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
                <RotateCcw className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>

          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            {isLoading && !error && (
              <div style={{ height: `${height}px` }} className="flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading Kekule.js Editor...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div style={{ height: `${height}px` }} className="flex items-center justify-center bg-gray-50">
                <div className="text-center text-red-600">
                  <p className="text-lg font-medium mb-2">Editor Unavailable</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <div ref={editorRef} style={{ height: `${height}px` }} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">SMILES Notation</h4>
              {currentSmiles && (
                <button onClick={handleCopySMILES} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Import SMILES:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentSmiles}
                    onChange={(e) => setCurrentSmiles(e.target.value)}
                    placeholder="Enter SMILES notation..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleImportSMILES}
                    disabled={!currentSmiles.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    Load
                  </button>
                </div>
              </div>
              
              {currentSmiles && (
                <div className={`p-3 rounded border ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Current Structure:</span>
                    <span className={`px-2 py-1 text-xs rounded ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  <code className="text-xs font-mono break-all bg-white p-2 rounded border block">
                    {currentSmiles}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}