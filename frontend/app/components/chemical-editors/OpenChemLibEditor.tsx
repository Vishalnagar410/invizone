'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Check, Beaker } from 'lucide-react';

interface OpenChemLibEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean) => void;
  height?: number;
}

declare global {
  interface Window {
    OCL?: any;
  }
}

export function OpenChemLibEditor({ 
  initialSmiles = '', 
  onSmilesChange,
  height = 400 
}: OpenChemLibEditorProps) {
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadOpenChemLib = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Check if already loaded
        if (window.OCL) {
          initializeEditor();
          return;
        }

        // Load OpenChemLib from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/openchemlib@8.4.0/full.js';
        script.async = true;

        script.onload = () => {
          console.log('✅ OpenChemLib loaded successfully');
          initializeEditor();
        };

        script.onerror = () => {
          setError('Failed to load OpenChemLib from CDN');
          setIsLoading(false);
        };

        document.head.appendChild(script);
      } catch (err) {
        setError('Error loading OpenChemLib');
        setIsLoading(false);
      }
    };

    const initializeEditor = () => {
      if (!canvasRef.current || !window.OCL) {
        setError('OpenChemLib not available after load');
        setIsLoading(false);
        return;
      }

      try {
        const OCL = window.OCL;
        
        // Create a structure viewer
        canvasRef.current.innerHTML = '';
        
        const container = document.createElement('div');
        container.style.height = `${height}px`;
        container.style.width = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.backgroundColor = '#ffffff';
        container.style.border = '1px solid #e5e7eb';
        container.style.borderRadius = '0.5rem';
        container.style.padding = '2rem';
        
        const icon = document.createElement('div');
        icon.style.fontSize = '48px';
        icon.style.marginBottom = '16px';
        
        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '8px';
        title.style.color = '#374151';
        title.style.fontSize = '18px';
        
        const description = document.createElement('div');
        description.style.color = '#6b7280';
        description.style.marginBottom = '16px';
        description.style.textAlign = 'center';
        
        const status = document.createElement('div');
        status.style.fontSize = '12px';
        status.style.fontWeight = 'bold';
        status.style.marginTop = '16px';
        status.style.padding = '8px 12px';
        status.style.borderRadius = '6px';

        // Load initial SMILES if provided
        if (initialSmiles && initialSmiles.trim()) {
          try {
            const molecule = OCL.Molecule.fromSmiles(initialSmiles);
            if (molecule && molecule.getAtoms() > 0) {
              // Valid structure loaded
              icon.textContent = '🔬';
              title.textContent = 'Structure Loaded';
              description.textContent = `SMILES: ${initialSmiles}`;
              description.innerHTML = `
                <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border: 1px solid #bbf7d0;">
                  <strong>Valid Chemical Structure</strong>
                  <div style="margin-top: 4px; font-size: 11px; color: #059669;">
                    Atoms: ${molecule.getAtoms()} | Molecular Formula: ${molecule.getMolecularFormula().formula}
                  </div>
                </div>
              `;
              status.textContent = '✓ Ready for calculations';
              status.style.backgroundColor = '#dcfce7';
              status.style.color = '#166534';
              
              setCurrentSmiles(initialSmiles);
              setIsValid(true);
            } else {
              throw new Error('Invalid molecule');
            }
          } catch (err) {
            // Invalid SMILES
            icon.textContent = '⚠️';
            title.textContent = 'Invalid Structure';
            description.textContent = `Could not parse: ${initialSmiles}`;
            status.textContent = '✗ Check SMILES format';
            status.style.backgroundColor = '#fef2f2';
            status.style.color = '#991b1b';
            
            setIsValid(false);
          }
        } else {
          // No initial SMILES
          icon.textContent = '⚗️';
          title.textContent = 'OpenChemLib Toolkit';
          description.innerHTML = `
            <div style="max-width: 400px; line-height: 1.5;">
              <p>Advanced chemical informatics toolkit</p>
              <p style="font-size: 14px; color: #9ca3af; margin-top: 8px;">
                • Structure validation and analysis<br/>
                • Molecular property calculations<br/>
                • SMILES/InChI conversion
              </p>
            </div>
          `;
          status.textContent = '✓ Enter SMILES to begin';
          status.style.backgroundColor = '#eff6ff';
          status.style.color = '#1e40af';
        }

        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(description);
        container.appendChild(status);
        canvasRef.current.appendChild(container);

        setIsLoading(false);
        console.log('✅ OpenChemLib editor initialized successfully');
      } catch (err) {
        console.error('Error initializing OpenChemLib:', err);
        setError('Failed to initialize OpenChemLib editor');
        setIsLoading(false);
      }
    };

    loadOpenChemLib();

    // Cleanup
    return () => {
      // No specific cleanup needed for OpenChemLib
    };
  }, [height, initialSmiles]);

  const handleImportSMILES = () => {
    if (!currentSmiles.trim() || !window.OCL) return;
    
    try {
      const OCL = window.OCL;
      const molecule = OCL.Molecule.fromSmiles(currentSmiles);
      const valid = molecule && molecule.getAtoms() > 0;
      
      setIsValid(valid);
      
      if (valid && canvasRef.current) {
        // Update display for valid structure
        canvasRef.current.innerHTML = '';
        
        const container = document.createElement('div');
        container.style.height = `${height}px`;
        container.style.width = '100%';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.backgroundColor = '#f0fdf4';
        container.style.border = '2px solid #bbf7d0';
        container.style.borderRadius = '0.5rem';
        container.style.padding = '2rem';
        
        const icon = document.createElement('div');
        icon.style.fontSize = '48px';
        icon.style.marginBottom = '16px';
        icon.textContent = '🔬';
        
        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '12px';
        title.style.color = '#065f46';
        title.style.fontSize = '18px';
        title.textContent = 'Structure Validated';
        
        const details = document.createElement('div');
        details.style.background = '#ffffff';
        details.style.padding = '16px';
        details.style.borderRadius = '8px';
        details.style.border = '1px solid #bbf7d0';
        details.style.maxWidth = '400px';
        details.style.width = '100%';
        details.innerHTML = `
          <div style="margin-bottom: 8px;"><strong>SMILES:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${currentSmiles}</code></div>
          <div style="margin-bottom: 8px;"><strong>Atoms:</strong> ${molecule.getAtoms()}</div>
          <div style="margin-bottom: 8px;"><strong>Molecular Formula:</strong> ${molecule.getMolecularFormula().formula}</div>
          <div><strong>Mass:</strong> ${molecule.getMolecularFormula().relativeWeight.toFixed(2)}</div>
        `;
        
        const status = document.createElement('div');
        status.style.marginTop = '16px';
        status.style.padding = '8px 16px';
        status.style.backgroundColor = '#dcfce7';
        status.style.color = '#166534';
        status.style.borderRadius = '6px';
        status.style.fontSize = '12px';
        status.style.fontWeight = 'bold';
        status.textContent = '✓ Ready for property calculations';
        
        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(details);
        container.appendChild(status);
        canvasRef.current.appendChild(container);
        
        const canonicalSmiles = molecule.toSmiles();
        setCurrentSmiles(canonicalSmiles);
        onSmilesChange(canonicalSmiles, true);
      } else {
        onSmilesChange(currentSmiles, false);
      }
    } catch (err) {
      setIsValid(false);
      onSmilesChange(currentSmiles, false);
      console.error('Error processing SMILES with OpenChemLib:', err);
    }
  };

  const handleClear = () => {
    if (canvasRef.current && window.OCL) {
      canvasRef.current.innerHTML = '';
      
      const container = document.createElement('div');
      container.style.height = `${height}px`;
      container.style.width = '100%';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.backgroundColor = '#ffffff';
      container.style.border = '1px solid #e5e7eb';
      container.style.borderRadius = '0.5rem';
      container.style.padding = '2rem';
      
      const icon = document.createElement('div');
      icon.style.fontSize = '48px';
      icon.style.marginBottom = '16px';
      icon.textContent = '⚗️';
      
      const title = document.createElement('div');
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '8px';
      title.style.color = '#374151';
      title.textContent = 'OpenChemLib Toolkit';
      
      const description = document.createElement('div');
      description.style.color = '#6b7280';
      description.style.marginBottom = '16px';
      description.style.textAlign = 'center';
      description.innerHTML = `
        <div style="max-width: 400px; line-height: 1.5;">
          <p>Advanced chemical informatics toolkit</p>
          <p style="font-size: 14px; color: #9ca3af; margin-top: 8px;">
            Enter SMILES to validate and analyze chemical structures
          </p>
        </div>
      `;
      
      const status = document.createElement('div');
      status.style.fontSize = '12px';
      status.style.color = '#10b981';
      status.style.fontWeight = 'bold';
      status.textContent = '✓ Ready to use';
      
      container.appendChild(icon);
      container.appendChild(title);
      container.appendChild(description);
      container.appendChild(status);
      canvasRef.current.appendChild(container);
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
            <h4 className="font-medium text-gray-900 dark:text-white">OpenChemLib - Chemical Toolkit</h4>
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
                  <p className="text-gray-600">Loading OpenChemLib Editor...</p>
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

              <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="font-medium mb-1 text-blue-800">OpenChemLib Features:</p>
                <p>• Advanced chemical structure validation</p>
                <p>• Molecular formula and mass calculation</p>
                <p>• Professional cheminformatics toolkit</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}