import { useState } from 'react';
// import { KetcherStructureDrawer } from './KetcherStructureDrawer'; // Commented out for now
import { KekuleEditor } from './KekuleEditor'; // Make sure this imports from './KekuleEditor'
import { Atom, Beaker, FlaskRound } from "lucide-react";

interface StructureEditorToggleProps {
  initialSmiles?: string;
  onSmilesChange: (smiles: string, isValid: boolean, properties?: any) => void;
  readonly?: boolean;
  showProperties?: boolean;
}

// type EditorType = 'ketcher' | 'kekule'; // Commented out for now
type EditorType = 'kekule'; // Only Kekule for now

export function StructureEditorToggle({
  initialSmiles = '',
  onSmilesChange,
  readonly = false,
  showProperties = true
}: StructureEditorToggleProps) {
  const [activeEditor, setActiveEditor] = useState<EditorType>('kekule'); // Default to Kekule
  const [currentSmiles, setCurrentSmiles] = useState(initialSmiles);

  const handleSmilesChange = (smiles: string, isValid: boolean = true, properties?: any) => {
    setCurrentSmiles(smiles);
    onSmilesChange(smiles, isValid, properties);
  };

  const editors = [
    // Commented out Ketcher for now
    /*
    {
      id: 'ketcher' as EditorType,
      name: 'Ketcher',
      icon: TestTubes,
      description: 'Professional chemical editor',
      component: KetcherStructureDrawer,
      recommended: false
    },
    */
    {
      id: 'kekule' as EditorType,
      name: 'Kekule.js',
      icon: Atom,
      description: 'Reliable structure editor with 2D/3D view',
      component: KekuleEditor,
      recommended: true
    }
  ] as const;

  const ActiveEditorComponent = editors.find(editor => editor.id === activeEditor)?.component;

  return (
    <div className="space-y-4">
      {/* Editor Selector - Simplified since only one editor */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Chemical Structure Editor</h3>
            <p className="text-sm text-gray-600">Draw or import chemical structures with 2D/3D visualization</p>
          </div>
          
          {/* Single Editor Badge */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200">
              Kekule.js Editor
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              Active
            </span>
          </div>
        </div>

        {/* Editor Status */}
        <div className="p-3 bg-gray-50 rounded text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Active Editor:</span>
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

        {/* Single Editor Card */}
        <div className="mt-4">
          {editors.map((editor) => {
            const Icon = editor.icon;
            const isActive = activeEditor === editor.id;
            
            return (
              <div
                key={editor.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isActive
                    ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setActiveEditor(editor.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{editor.name}</span>
                      {editor.recommended && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{editor.description}</p>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Editor */}
      <div>
        {ActiveEditorComponent && (
          <ActiveEditorComponent
            initialSmiles={currentSmiles}
            onSmilesChange={handleSmilesChange}
            readonly={readonly}
            height={500}
            showProperties={showProperties}
          />
        )}
      </div>

      {/* Debug Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FlaskRound className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-blue-800">Editor Status</h4>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p><strong>Current Editor:</strong> {editors.find(e => e.id === activeEditor)?.name}</p>
              <p><strong>SMILES:</strong> {currentSmiles || 'No structure drawn'}</p>
              <p><strong>Features:</strong> 2D drawing, SMILES import/export, property computation</p>
              <p><strong>Note:</strong> Ketcher editor temporarily disabled. Kekule.js provides full functionality.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}