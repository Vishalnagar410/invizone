'use client';

import { useState } from 'react';
import { KetcherStructureDrawer } from './KetcherStructureDrawer';
import { ThreeDMolEditor } from './ThreeDMolEditor';
import { KekuleEditor } from './KekuleEditor';
import { RDKitEditor } from './RDKitEditor';
import { ChemCanvasEditor } from './ChemCanvasEditor';
import { OpenChemLibEditor } from './OpenChemLibEditor';
import { Palette, Box, Atom, Beaker, FlaskRound, TestTubes } from "lucide-react";

interface StructureEditorToggleProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean, properties?: any) => void;
  readonly?: boolean;
  showProperties?: boolean;
}

type EditorType = 'chemcanvas' | 'openchemlib' | 'kekule' | 'ketcher' | 'threedmol' | 'rdkit';

export function StructureEditorToggle({ 
  initialSmiles = '', 
  onSmilesChange, 
  readonly = false,
  showProperties = true
}: StructureEditorToggleProps) {
  const [activeEditor, setActiveEditor] = useState<EditorType>('chemcanvas');
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);

  const handleSmilesChange = (smiles: string, isValid: boolean = true, properties?: any) => {
    setCurrentSmiles(smiles);
    onSmilesChange(smiles, isValid, properties);
  };

  const editors = [
    {
      id: 'chemcanvas' as EditorType,
      name: 'ChemCanvas',
      icon: Palette,
      description: '2D Structure Drawing',
      component: ChemCanvasEditor
    },
    {
      id: 'openchemlib' as EditorType,
      name: 'OpenChemLib',
      icon: FlaskRound,
      description: 'Chemical Toolkit',
      component: OpenChemLibEditor
    },
    {
      id: 'kekule' as EditorType,
      name: 'Kekule.js',
      icon: Atom,
      description: '2D Structure Editor',
      component: KekuleEditor
    },
    {
      id: 'ketcher' as EditorType,
      name: 'Ketcher',
      icon: TestTubes,
      description: '2D Structure Editor',
      component: KetcherStructureDrawer
    },
    {
      id: 'threedmol' as EditorType,
      name: '3D Viewer',
      icon: Box,
      description: '3D Molecular Viewer',
      component: ThreeDMolEditor
    },
    {
      id: 'rdkit' as EditorType,
      name: 'Properties',
      icon: Beaker,
      description: 'Properties Calculator',
      component: RDKitEditor
    }
  ] as const;

  const ActiveEditorComponent = editors.find(editor => editor.id === activeEditor)?.component;

  return (
    <div className="space-y-6">
      {/* Compact Editor Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Chemical Structure Tools</h3>
          
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
            {editors.map((editor) => {
              const Icon = editor.icon;
              const isActive = activeEditor === editor.id;
              
              return (
                <button
                  key={editor.id}
                  onClick={() => setActiveEditor(editor.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  title={editor.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{editor.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Status */}
        <div className="p-3 bg-gray-50 rounded text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Active Tool:</span>
              <span className="font-medium text-gray-900">
                {editors.find(e => e.id === activeEditor)?.name}
              </span>
              <span className="text-gray-500">
                {editors.find(e => e.id === activeEditor)?.description}
              </span>
            </div>
            {currentSmiles && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">SMILES:</span>
                <code className="text-xs bg-white px-2 py-1 rounded border max-w-[200px] truncate">
                  {currentSmiles.length > 30 ? `${currentSmiles.substring(0, 30)}...` : currentSmiles}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Editor */}
      <div>
        {ActiveEditorComponent && (
          <ActiveEditorComponent
            initialSmiles={currentSmiles}
            onSmilesChange={handleSmilesChange}
            readonly={readonly}
            showProperties={showProperties && activeEditor === 'rdkit'}
          />
        )}
      </div>
    </div>
  );
}