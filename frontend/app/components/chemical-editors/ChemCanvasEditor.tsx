'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Check, Download } from 'lucide-react';

interface ChemCanvasEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean) => void;
  height?: number;
}

export function ChemCanvasEditor({ 
  initialSmiles = '', 
  onSmilesChange,
  height = 400 
}: ChemCanvasEditorProps) {
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeEditor = () => {
      if (!canvasRef.current) {
        setError('Canvas not available');
        return;
      }

      try {
        // Create a simple chemical structure display using SVG
        // This is a placeholder - in production you'd use a proper chemical library
        canvasRef.current.innerHTML = `
          <div style="height: ${height}px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
            <div style="text-align: center; padding: 2rem;">
              <div style="font-size: 48px; margin-bottom: 16px;">⚗️</div>
              <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">ChemCanvas Editor</div>
              <div style="color: #6b7280; margin-bottom: 16px;">Simple Chemical Structure Editor</div>
              <div style="font-size: 14px; color: #9ca3af; max-width: 400px; line-height: 1.5;">
                <p>Draw chemical structures using SMILES notation.</p>
                <p>For advanced drawing, switch to Ketcher or Kekule.js editors.</p>
              </div>
              <div style="margin-top: 20px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 12px;">
                <strong>SMILES Input Ready</strong>
                <p style="margin-top: 4px; color: #6b7280;">Enter SMILES in the panel to visualize structures</p>
              </div>
            </div>
          </div>
        `;

        // Initialize with provided SMILES
        if (initialSmiles) {
          setCurrentSmiles(initialSmiles);
          setIsValid(true);
        }

      } catch (err) {
        console.error('Error initializing ChemCanvas:', err);
        setError('Failed to initialize chemical editor');
      }
    };

    setIsLoading(true);
    initializeEditor();
    setIsLoading(false);
  }, [height, initialSmiles]);

  const handleImportSMILES = () => {
    if (!currentSmiles.trim()) return;
    
    // Enhanced SMILES validation
    const valid = validateSMILES(currentSmiles);
    setIsValid(valid);
    
    if (valid) {
      // Visual feedback for valid SMILES
      if (canvasRef.current) {
        canvasRef.current.innerHTML = `
          <div style="height: ${height}px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 0.5rem;">
            <div style="text-align: center; padding: 2rem;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔬</div>
              <div style="font-weight: bold; margin-bottom: 8px; color: #065f46;">Structure Loaded</div>
              <div style="color: #059669; margin-bottom: 16px;">Valid chemical structure</div>
              <div style="font-size: 14px; color: #047857; max-width: 400px; line-height: 1.5;">
                <p><strong>SMILES:</strong> ${currentSmiles}</p>
                <p style="margin-top: 8px;">Structure visualization available in advanced editors.</p>
              </div>
              <div style="margin-top: 20px; padding: 8px 12px; background: #dcfce7; border-radius: 6px; font-size: 12px; color: #166534;">
                ✓ Ready for property calculations
              </div>
            </div>
          </div>
        `;
      }
      onSmilesChange(currentSmiles, true);
    } else {
      // Visual feedback for invalid SMILES
      if (canvasRef.current) {
        canvasRef.current.innerHTML = `
          <div style="height: ${height}px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fef2f2; border: 2px solid #fecaca; border-radius: 0.5rem;">
            <div style="text-align: center; padding: 2rem;">
              <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
              <div style="font-weight: bold; margin-bottom: 8px; color: #991b1b;">Invalid Structure</div>
              <div style="color: #dc2626; margin-bottom: 16px;">Please check SMILES format</div>
              <div style="font-size: 14px; color: #b91c1c; max-width: 400px; line-height: 1.5;">
                <p><strong>Entered:</strong> ${currentSmiles}</p>
                <p style="margin-top: 8px;">Ensure SMILES contains valid chemical symbols and proper syntax.</p>
              </div>
            </div>
          </div>
        `;
      }
      onSmilesChange(currentSmiles, false);
    }
  };

  const validateSMILES = (smiles: string): boolean => {
    if (!smiles || typeof smiles !== 'string') return false;
    
    const cleanSmiles = smiles.trim();
    if (cleanSmiles.length < 2) return false;
    
    // Basic chemical symbol validation
    const chemicalPattern = /[CHONPSBIFClBr\[\]\(\)=#@\+\-\\\/]/;
    if (!chemicalPattern.test(cleanSmiles)) return false;
    
    // Basic structure validation
    const hasAtoms = /[CHON]/.test(cleanSmiles);
    const hasBonds = /[=\-#]/.test(cleanSmiles) || /\(.*\)/.test(cleanSmiles) || /\[.*\]/.test(cleanSmiles);
    
    return hasAtoms && (hasBonds || cleanSmiles.length <= 10); // Allow simple molecules without explicit bonds
  };

  const handleClear = () => {
    // Reset to initial state
    if (canvasRef.current) {
      canvasRef.current.innerHTML = `
        <div style="height: ${height}px; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
          <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚗️</div>
            <div style="font-weight: bold; margin-bottom: 8px; color: #374151;">ChemCanvas Editor</div>
            <div style="color: #6b7280; margin-bottom: 16px;">Enter SMILES to visualize chemical structures</div>
            <div style="font-size: 14px; color: #9ca3af; max-width: 400px; line-height: 1.5;">
              <p>Draw chemical structures using SMILES notation.</p>
              <p>For advanced drawing, switch to Ketcher or Kekule.js editors.</p>
            </div>
          </div>
        </div>
      `;
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
        {/* Editor Area - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">ChemCanvas - Structure Editor</h4>
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
                  <p className="text-gray-600">Loading ChemCanvas Editor...</p>
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
              <div ref={canvasRef} style={{ height: `${height}px` }} />
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
                <label className="block text-sm text-gray-600 mb-2">Enter SMILES:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentSmiles}
                    onChange={(e) => setCurrentSmiles(e.target.value)}
                    placeholder="e.g., CCO for ethanol..."
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

              <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded border">
                <p className="font-medium mb-1">About ChemCanvas:</p>
                <p>• Basic SMILES-based structure visualization</p>
                <p>• Switch to Ketcher or Kekule for interactive drawing</p>
                <p>• All editors share the same SMILES data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}