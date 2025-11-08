'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Check, Box } from 'lucide-react';

interface ThreeDMolEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string) => void;
  height?: number;
}

declare global {
  interface Window {
    $3Dmol: any;
  }
}

export function ThreeDMolEditor({ 
  initialSmiles = '', 
  onSmilesChange,
  height = 400 
}: ThreeDMolEditorProps) {
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load3DMol = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Check if already loaded
        if (window.$3Dmol) {
          initializeViewer();
          return;
        }

        // Load 3Dmol.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.1.0/3Dmol-min.js';
        script.async = true;

        script.onload = () => {
          console.log('✅ 3Dmol.js loaded successfully');
          initializeViewer();
        };

        script.onerror = () => {
          setError('Failed to load 3Dmol.js from CDN');
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError('Error loading 3Dmol.js');
        setIsLoading(false);
      }
    };

    const initializeViewer = () => {
      if (!viewerRef.current || !window.$3Dmol) {
        setError('3Dmol.js not available');
        setIsLoading(false);
        return;
      }

      try {
        // Clear container
        viewerRef.current.innerHTML = '';
        
        // Create viewer
        const viewer = window.$3Dmol.createViewer(viewerRef.current, {
          backgroundColor: 'white'
        });

        // Load initial structure if provided
        if (initialSmiles) {
          loadStructure(viewer, initialSmiles);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing 3Dmol:', err);
        setError('Failed to initialize 3D viewer');
        setIsLoading(false);
      }
    };

    load3DMol();
  }, [initialSmiles]);

  const loadStructure = (viewer: any, smiles: string) => {
    try {
      viewer.clear();
      const mol = window.$3Dmol.getMolFromSmiles(smiles);
      viewer.addModel(mol);
      viewer.setStyle({}, { stick: { colorscheme: 'grayCarbon' } });
      viewer.zoomTo();
      viewer.render();
      
      setCurrentSmiles(smiles);
      onSmilesChange(smiles);
    } catch (err) {
      console.error('Error loading structure:', err);
      setError('Failed to load chemical structure');
    }
  };

  const handleImportSMILES = () => {
    if (!currentSmiles.trim() || !window.$3Dmol || !viewerRef.current) return;
    
    try {
      const viewer = window.$3Dmol.createViewer(viewerRef.current, {
        backgroundColor: 'white'
      });
      loadStructure(viewer, currentSmiles);
    } catch (err) {
      setError('Failed to load structure');
    }
  };

  const handleClear = () => {
    if (viewerRef.current && window.$3Dmol) {
      const viewer = window.$3Dmol.createViewer(viewerRef.current, {
        backgroundColor: 'white'
      });
      viewer.clear();
      viewer.render();
    }
    setCurrentSmiles('');
    onSmilesChange('');
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
        {/* Viewer Area - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">3D Molecular Viewer</h4>
            <div className="flex gap-2">
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
                  <p className="text-gray-600">Loading 3D Molecular Viewer...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div style={{ height: `${height}px` }} className="flex items-center justify-center bg-gray-50">
                <div className="text-center text-red-600">
                  <p className="text-lg font-medium mb-2">3D Viewer Unavailable</p>
                  <p className="text-sm">Please check your internet connection</p>
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <div ref={viewerRef} style={{ height: `${height}px`, width: '100%' }} />
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
                <div className="p-3 rounded border bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Current Structure:</span>
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                      Loaded
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