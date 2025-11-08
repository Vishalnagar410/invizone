'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Check, Download } from 'lucide-react';

interface KetcherStructureDrawerProps {
  onSmilesChange: (smiles: string, isValid: boolean) => void;
  initialSmiles?: string;
  height?: number;
}

declare global {
  interface Window {
    ketcher?: any;
  }
}

export function KetcherStructureDrawer({ 
  onSmilesChange, 
  initialSmiles = '',
  height = 400 
}: KetcherStructureDrawerProps) {
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const ketcherRef = useRef<HTMLDivElement>(null);
  const ketcherInstance = useRef<any>(null);

  useEffect(() => {
    const loadKetcher = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Check if already loaded
        if (window.ketcher) {
          initializeKetcher();
          return;
        }

        // Load Ketcher from official CDN with correct version
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/ketcher@2.9.0/dist/ketcher.min.js';
        script.async = true;

        script.onload = () => {
          console.log('✅ Ketcher loaded successfully');
          setTimeout(() => initializeKetcher(), 100);
        };

        script.onerror = () => {
          setError('Failed to load Ketcher from CDN. Please check your internet connection.');
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError('Error loading Ketcher');
        setIsLoading(false);
      }
    };

    const initializeKetcher = () => {
      if (!ketcherRef.current || !window.ketcher) {
        setError('Ketcher not available after load');
        setIsLoading(false);
        return;
      }

      try {
        // Clear container
        ketcherRef.current.innerHTML = '';
        
        // Create Ketcher instance with proper configuration
        ketcherInstance.current = window.ketcher.create(ketcherRef.current, {
          height: height,
          width: '100%',
          theme: 'light'
        });

        // Set up event listeners for structure changes
        ketcherInstance.current.editor.subscribe('change', () => {
          try {
            ketcherInstance.current.getSmiles().then((smiles: string) => {
              const cleanSmiles = smiles || '';
              setCurrentSmiles(cleanSmiles);
              const valid = cleanSmiles.length > 0;
              setIsValid(valid);
              onSmilesChange(cleanSmiles, valid);
            });
          } catch (err) {
            console.error('Error getting SMILES from Ketcher:', err);
          }
        });

        // Load initial SMILES if provided
        if (initialSmiles) {
          setTimeout(() => {
            ketcherInstance.current.setMolecule(initialSmiles).catch((err: any) => {
              console.warn('Could not set initial SMILES:', err);
            });
          }, 500);
        }

        setIsLoading(false);
        console.log('✅ Ketcher editor initialized successfully');
      } catch (err) {
        console.error('Error initializing Ketcher:', err);
        setError('Failed to initialize Ketcher editor');
        setIsLoading(false);
      }
    };

    loadKetcher();

    // Cleanup
    return () => {
      if (ketcherInstance.current) {
        try {
          ketcherInstance.current.destroy();
        } catch (err) {
          console.error('Error cleaning up Ketcher:', err);
        }
      }
    };
  }, [height, initialSmiles, onSmilesChange]);

  const handleImportSMILES = async () => {
    if (!currentSmiles.trim() || !ketcherInstance.current) return;
    
    try {
      await ketcherInstance.current.setMolecule(currentSmiles);
      setIsValid(true);
      onSmilesChange(currentSmiles, true);
    } catch (err) {
      setIsValid(false);
      console.error('Error importing SMILES to Ketcher:', err);
    }
  };

  const handleClear = async () => {
    if (ketcherInstance.current) {
      await ketcherInstance.current.setMolecule('');
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

  const handleExportMol = async () => {
    if (!ketcherInstance.current) return;
    try {
      const molfile = await ketcherInstance.current.getMolfile();
      const blob = new Blob([molfile], { type: 'chemical/x-mdl-molfile' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'structure.mol';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting MOL file:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Editor Area - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Ketcher - 2D Structure Editor</h4>
            <div className="flex gap-2">
              <button
                onClick={handleExportMol}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                title="Export as MOL file"
              >
                <Download className="h-4 w-4" />
                Export MOL
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            {isLoading && !error && (
              <div style={{ height: `${height}px` }} className="flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading Ketcher Editor...</p>
                  <p className="text-sm text-gray-500 mt-1">Interactive 2D molecular drawing</p>
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
              <div 
                ref={ketcherRef} 
                style={{ height: `${height}px` }}
                className="ketcher-container"
              />
            )}
          </div>
        </div>

        {/* SMILES Panel - 1/3 width */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">SMILES Notation</h4>
              {currentSmiles && (
                <button
                  onClick={handleCopySMILES}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
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
                    placeholder="Enter SMILES or draw structure..."
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
                <div className={`p-3 rounded border ${
                  isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Current Structure:</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  <code className="text-xs font-mono break-all bg-white p-2 rounded border block">
                    {currentSmiles}
                  </code>
                </div>
              )}

              <div className="text-xs text-gray-500">
                <p><strong>Tip:</strong> Draw structures using the tools on the left</p>
                <p>• Click atoms and bonds to build molecules</p>
                <p>• Use templates for common structures</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}