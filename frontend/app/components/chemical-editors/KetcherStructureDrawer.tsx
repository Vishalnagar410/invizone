'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw, Copy, Check, AlertTriangle, RefreshCw, Zap, ExternalLink, Beaker, Package } from 'lucide-react';

interface KetcherStructureDrawerProps {
  onSmilesChange: (smiles: string, isValid: boolean) => void;
  initialSmiles?: string;
  height?: number;
}

declare global {
  interface Window {
    ketcher?: any;
    Ketcher?: any;
    IndigoKetcher?: any;
  }
}

const KETCHER_SOURCES = [
  {
    name: 'indigo-ketcher',
    js: 'https://unpkg.com/indigo-ketcher@latest/dist/ketcher.js',
    css: 'https://unpkg.com/indigo-ketcher@latest/dist/ketcher.css',
    version: 'indigo-ketcher',
    type: 'indigo' as const,
    description: 'Ketcher with embedded Indigo toolkit'
  },
  {
    name: 'ketcher@latest',
    js: 'https://unpkg.com/ketcher@latest/dist/ketcher.js',
    css: 'https://unpkg.com/ketcher@latest/dist/ketcher.css',
    version: 'latest',
    type: 'standalone' as const,
    description: 'Standard Ketcher'
  }
];

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
  const [currentSource, setCurrentSource] = useState<string>('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const ketcherRef = useRef<HTMLDivElement>(null);
  const ketcherInstance = useRef<any>(null);

  useEffect(() => {
    const loadKetcher = async () => {
      try {
        setIsLoading(true);
        setError('');
        setCurrentSource('');

        if ((window.ketcher || window.Ketcher || window.IndigoKetcher) && loadAttempt === 0) {
          initializeKetcher();
          return;
        }

        for (const source of KETCHER_SOURCES) {
          setCurrentSource(source.name);

          try {
            await loadFromCDN(source);
            setError('');
            break;
          } catch (cdnError) {
            continue;
          }
        }

        if (!window.ketcher && !window.Ketcher && !window.IndigoKetcher) {
          throw new Error('Ketcher failed to load. Try switching to Kekule.js.');
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Ketcher');
      } finally {
        setIsLoading(false);
      }
    };

    const loadFromCDN = (source: typeof KETCHER_SOURCES[0]): Promise<void> => {
      return new Promise((resolve, reject) => {
        let cssLoaded = false;
        let jsLoaded = false;

        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = source.css;
        cssLink.onload = () => {
          cssLoaded = true;
          checkBothLoaded();
        };
        cssLink.onerror = () => {
          cssLoaded = true;
          checkBothLoaded();
        };
        document.head.appendChild(cssLink);

        const script = document.createElement('script');
        script.src = source.js;
        script.async = true;

        const timeout = setTimeout(() => {
          reject(new Error('Timeout'));
        }, 15000);

        script.onload = () => {
          clearTimeout(timeout);
          jsLoaded = true;
          checkBothLoaded();
        };

        script.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Script failed'));
        };

        document.head.appendChild(script);

        const checkBothLoaded = () => {
          if (cssLoaded && jsLoaded) {
            const checkKetcher = () => {
              if (window.ketcher || window.Ketcher || window.IndigoKetcher) {
                initializeKetcher();
                resolve();
              } else {
                setTimeout(checkKetcher, 100);
              }
            };
            setTimeout(checkKetcher, 500);
          }
        };
      });
    };

    const initializeKetcher = () => {
      if (!ketcherRef.current) return;

      try {
        ketcherRef.current.innerHTML = '';
        
        let ketcherGlobal = window.ketcher || window.Ketcher || window.IndigoKetcher;
        if (!ketcherGlobal) return;

        ketcherInstance.current = ketcherGlobal.create(ketcherRef.current, {
          height: height,
          width: '100%',
          theme: 'light'
        });

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
            console.error('Error in change handler:', err);
          }
        });

        if (initialSmiles) {
          setTimeout(() => {
            ketcherInstance.current.setMolecule(initialSmiles).catch(console.warn);
          }, 1000);
        }

      } catch (err) {
        setError('Failed to initialize Ketcher');
      }
    };

    loadKetcher();

    return () => {
      if (ketcherInstance.current) {
        try {
          ketcherInstance.current.destroy();
        } catch (err) {
          console.error('Error cleaning up Ketcher:', err);
        }
      }
    };
  }, [height, initialSmiles, onSmilesChange, loadAttempt]);

  const handleRetry = () => setLoadAttempt(prev => prev + 1);
  
  const handleImportSMILES = async () => {
    if (!currentSmiles.trim() || !ketcherInstance.current) return;
    try {
      await ketcherInstance.current.setMolecule(currentSmiles);
      setIsValid(true);
      onSmilesChange(currentSmiles, true);
    } catch (err) {
      setIsValid(false);
    }
  };

  const handleClear = async () => {
    if (ketcherInstance.current) await ketcherInstance.current.setMolecule('');
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
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">Ketcher Editor</span>
          </div>
          {currentSource && (
            <span className="text-sm text-blue-600">{currentSource}</span>
          )}
        </div>
        {error && (
          <button onClick={handleRetry} className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Ketcher Canvas</h4>
            <button onClick={handleClear} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
              <RotateCcw className="h-4 w-4" /> Clear
            </button>
          </div>

          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            {isLoading && !error && (
              <div style={{ height: `${height}px` }} className="flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading Ketcher...</p>
                </div>
              </div>
            )}
            
            {error && (
              <div style={{ height: `${height}px` }} className="flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-red-600 mb-2">Ketcher Unavailable</p>
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                  <p className="text-xs text-gray-500">Switch to Kekule.js using the toggle above</p>
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <div ref={ketcherRef} style={{ height: `${height}px` }} />
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
                    placeholder="Enter SMILES..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button onClick={handleImportSMILES} disabled={!currentSmiles.trim()} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm">
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
                  <code className="text-xs font-mono break-all bg-white p-2 rounded border block">{currentSmiles}</code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}