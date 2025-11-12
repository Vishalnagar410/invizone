'use client';

import { useState } from 'react';
import { KekuleWrapper } from './KekuleWrapper';
import {
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  Package,
  Beaker,
  Eye,
  EyeOff,
  Download,
  Atom,
  Calculator
} from 'lucide-react';

interface KekuleEditorProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean, properties?: any) => void;
  height?: number;
  readonly?: boolean;
  showProperties?: boolean;
}

export function KekuleEditor({
  initialSmiles = '',
  onSmilesChange,
  height = 500,
  readonly = false,
  showProperties = true
}: KekuleEditorProps) {
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);
  const [isValid, setIsValid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [computedProperties, setComputedProperties] = useState<{
    molecularWeight?: number;
    molecularFormula?: string;
    canonicalSmiles?: string;
    name?: string;
  }>({});

  const handleSmilesChange = (smiles: string, isValid: boolean) => {
    setCurrentSmiles(smiles);
    setIsValid(isValid);
    
    // Compute basic properties immediately
    const properties = computeProperties(smiles);
    setComputedProperties(properties);
    onSmilesChange(smiles, isValid, properties);
  };

  const computeProperties = (smiles: string) => {
    if (!smiles.trim()) return {};
    
    // Enhanced property computation
    let molecularFormula = 'Unknown';
    let molecularWeight = 0;
    let name = 'Unknown Compound';
    
    // Common compounds database
    const knownCompounds: { [key: string]: { formula: string, weight: number, name: string } } = {
      'c1ccccc1': { formula: 'C6H6', weight: 78.11, name: 'Benzene' },
      'CCO': { formula: 'C2H6O', weight: 46.07, name: 'Ethanol' },
      'CC(=O)O': { formula: 'C2H4O2', weight: 60.05, name: 'Acetic Acid' },
      'CC(=O)OC1=CC=CC=C1C(=O)O': { formula: 'C9H8O4', weight: 180.16, name: 'Aspirin' },
      'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': { formula: 'C8H10N4O2', weight: 194.19, name: 'Caffeine' },
      'C1CCCCC1': { formula: 'C6H12', weight: 84.16, name: 'Cyclohexane' },
      'O': { formula: 'H2O', weight: 18.02, name: 'Water' },
      'C#N': { formula: 'CHN', weight: 27.03, name: 'Hydrogen Cyanide' },
      'O=C=O': { formula: 'CO2', weight: 44.01, name: 'Carbon Dioxide' },
      'N': { formula: 'NH3', weight: 17.03, name: 'Ammonia' }
    };

    if (knownCompounds[smiles]) {
      molecularFormula = knownCompounds[smiles].formula;
      molecularWeight = knownCompounds[smiles].weight;
      name = knownCompounds[smiles].name;
    } else {
      // Advanced formula calculation
      const elements: Record<string, number> = {};
      let i = 0;
      
      while (i < smiles.length) {
        if (smiles[i] === '[') {
          const end = smiles.indexOf(']', i);
          if (end === -1) break;
          const atomContent = smiles.substring(i + 1, end);
          const elementMatch = atomContent.match(/^[A-Z][a-z]?/);
          if (elementMatch) {
            const element = elementMatch[0];
            elements[element] = (elements[element] || 0) + 1;
          }
          i = end + 1;
        } else if (/[A-Z]/.test(smiles[i])) {
          let element = smiles[i];
          if (i + 1 < smiles.length && /[a-z]/.test(smiles[i + 1])) {
            element += smiles[i + 1];
            i++;
          }
          elements[element] = (elements[element] || 0) + 1;
          i++;
        } else {
          i++;
        }
      }

      // Calculate molecular weight
      const weights: Record<string, number> = {
        'C': 12.01, 'H': 1.008, 'O': 16.00, 'N': 14.01,
        'S': 32.06, 'P': 30.97, 'F': 19.00, 'Cl': 35.45,
        'Br': 79.90
      };

      let weight = 0;
      for (const element in elements) {
        weight += elements[element] * (weights[element] || 12.01);
      }

      // Format formula
      const elementOrder = ['C', 'H', 'O', 'N', 'S', 'P', 'F', 'Cl', 'Br'];
      molecularFormula = elementOrder
        .filter(element => elements[element])
        .map(element => {
          const count = elements[element];
          return count > 1 ? `${element}${count}` : element;
        })
        .join('');

      molecularWeight = Math.round(weight * 100) / 100;
      
      // Generate name based on composition
      if (elements['C'] && elements['H'] && !elements['O'] && !elements['N']) {
        name = `Hydrocarbon (${molecularFormula})`;
      } else if (elements['C'] && elements['H'] && elements['O']) {
        name = `Organic Compound (${molecularFormula})`;
      } else {
        name = `Chemical (${molecularFormula})`;
      }
    }

    return {
      molecularWeight,
      molecularFormula,
      canonicalSmiles: smiles,
      name
    };
  };

  const handleImportSMILES = () => {
    if (!currentSmiles.trim()) return;

    console.log('🔄 Importing SMILES:', currentSmiles);
    
    // Validate SMILES format
    const isValidSmiles = /^([^J][a-zA-Z0-9@+\-\[\]\(\)\\\/%=#$,.~&!|:;<>*{}]*)$/.test(currentSmiles);
    setIsValid(isValidSmiles);
    
    if (isValidSmiles) {
      const properties = computeProperties(currentSmiles);
      setComputedProperties(properties);
      onSmilesChange(currentSmiles, true, properties);
      console.log('✅ SMILES imported successfully');
    } else {
      console.error('❌ Invalid SMILES format');
    }
  };

  const handleClear = () => {
    setCurrentSmiles('');
    setIsValid(true);
    setComputedProperties({});
    onSmilesChange('', true, {});
    console.log('🧹 Editor cleared');
  };

  const handleCopySMILES = async () => {
    if (!currentSmiles) return;
    try {
      await navigator.clipboard.writeText(currentSmiles);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log('📋 SMILES copied to clipboard');
    } catch (e) {
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

  const handleGenerateProperties = () => {
    if (!currentSmiles) return;
    
    console.log('🧪 Generating properties for:', currentSmiles);
    const properties = computeProperties(currentSmiles);
    setComputedProperties(properties);
    onSmilesChange(currentSmiles, true, properties);
  };

  const handleToggle3D = () => {
    setShow3D(!show3D);
  };

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Beaker className="w-5 h-5 text-blue-500" />
          Kekule Chemical Editor
          {readonly && <span className="text-sm text-gray-500">(Read-only)</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle3D}
            className={`flex items-center gap-1 px-3 py-1 text-sm rounded border transition-colors ${
              show3D 
                ? 'bg-blue-100 border-blue-300 text-blue-700' 
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {show3D ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {show3D ? '2D Mode' : '3D Mode'}
          </button>
          
          <button
            type="button"
            onClick={handleGenerateProperties}
            disabled={!currentSmiles}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator className="h-4 w-4" />
            Generate Properties
          </button>
          
          <button
            type="button"
            onClick={handleClear}
            disabled={readonly}
            className="flex items-center gap-1 border px-3 py-1 text-sm rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      {/* Main Editor Area - Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Area - 2/3 width */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg bg-white overflow-hidden">
            <KekuleWrapper
              initialSmiles={currentSmiles}
              onSmilesChange={handleSmilesChange}
              height={height}
              readonly={readonly}
            />
          </div>
          
          {/* 3D Mode Notice */}
          {show3D && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm">
                  <strong>3D Mode:</strong> 3D visualization will be implemented in the next update. 
                  Currently in 2D editing mode.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls Area - 1/3 width */}
        <div className="space-y-4">
          {/* SMILES Input/Output */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              SMILES Notation
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Import SMILES:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentSmiles}
                    onChange={(e) => setCurrentSmiles(e.target.value)}
                    placeholder="Enter SMILES notation..."
                    disabled={readonly}
                    className={`flex-1 px-3 py-2 border rounded text-sm focus:ring-blue-500 focus:border-blue-500 ${
                      isValid ? 'border-gray-300' : 'border-red-400'
                    } disabled:opacity-50`}
                  />
                  <button
                    type="button"
                    onClick={handleImportSMILES}
                    disabled={!currentSmiles.trim() || readonly}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" />
                    Load
                  </button>
                </div>
              </div>

              {currentSmiles && (
                <div className="p-3 rounded border bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Current Structure:</span>
                    <button
                      type="button"
                      onClick={handleCopySMILES}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-xs font-mono break-all bg-white p-2 rounded border block text-gray-800">
                    {currentSmiles}
                  </code>
                </div>
              )}

              {!isValid && currentSmiles && (
                <div className="p-3 rounded border bg-red-50 border-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">Invalid SMILES format</span>
                </div>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {showProperties && (computedProperties.molecularFormula || computedProperties.molecularWeight) && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Atom className="h-4 w-4 text-green-500" />
                Computed Properties
              </h3>
              
              <div className="space-y-2 text-sm">
                {computedProperties.name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-right">{computedProperties.name}</span>
                  </div>
                )}
                {computedProperties.molecularFormula && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Formula:</span>
                    <span className="font-mono font-medium">{computedProperties.molecularFormula}</span>
                  </div>
                )}
                {computedProperties.molecularWeight && computedProperties.molecularWeight > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Molecular Weight:</span>
                    <span className="font-mono font-medium">{computedProperties.molecularWeight.toFixed(2)} g/mol</span>
                  </div>
                )}
                {computedProperties.canonicalSmiles && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Canonical SMILES:</span>
                    <span className="font-mono text-xs break-all text-right">
                      {computedProperties.canonicalSmiles.length > 20 
                        ? `${computedProperties.canonicalSmiles.substring(0, 20)}...` 
                        : computedProperties.canonicalSmiles}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Mode Info */}
          <div className={`p-3 rounded-lg border ${
            show3D 
              ? 'bg-blue-50 border-blue-200 text-blue-800' 
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              {show3D ? <Eye className="h-4 w-4" /> : <Beaker className="h-4 w-4" />}
              <span>
                <strong>{show3D ? '3D View Mode' : '2D Edit Mode'}</strong> - 
                {show3D ? ' Visualize molecular structure in 3D' : ' Draw and edit chemical structures'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}