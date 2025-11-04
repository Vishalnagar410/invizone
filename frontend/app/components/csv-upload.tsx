// frontend/components/csv-upload.tsx
'use client';

import { useState } from 'react';
import { Upload, Download, FileText, Check, X, Loader2 } from 'lucide-react';
import { chemicalsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface UploadResults {
  message: string;
  created_chemicals: Array<{
    id: number;
    name: string;
    cas_number: string;
    unique_id: string;
    barcode: string;
  }>;
  errors: string[];
  total_processed: number;
}

interface CSVUploadProps {
  onUploadComplete?: (results: any[]) => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null);
  const { user } = useAuth();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      alert('You must be logged in to upload chemicals');
      return;
    }

    setIsUploading(true);
    setUploadResults(null);

    try {
      const results = await chemicalsAPI.bulkUpload(file);
      setUploadResults(results);
      onUploadComplete?.(results);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadResults({
        message: 'Upload failed',
        created_chemicals: [],
        errors: [error.response?.data?.detail || 'Upload failed'],
        total_processed: 0
      });
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const downloadTemplate = () => {
    const template = `name,cas_number,smiles,molecular_formula,initial_quantity,initial_unit
Acetone,67-64-1,CC(=O)C,C3H6O,100,g
Ethanol,64-17-5,CCO,C2H6O,500,mL
Sodium Chloride,7647-14-5,[Na+].[Cl-],NaCl,1000,g
Water,7732-18-5,O,H2O,2000,mL`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chemicals_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
        {isUploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">Uploading chemicals...</p>
            <p className="text-gray-500 dark:text-gray-400">Please wait while we process your file</p>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="flex flex-col items-center">
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Upload CSV File
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Upload a CSV file with chemical data. Required columns: name, cas_number, smiles
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Choose File
                </span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* Template Download */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">Need a template?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Download our CSV template with example data
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload Results</h3>
          
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {uploadResults.created_chemicals.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Success</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {uploadResults.errors.length}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">Errors</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {uploadResults.total_processed}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
            </div>
          </div>

          {/* Created Chemicals */}
          {uploadResults.created_chemicals.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Successfully Added Chemicals
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadResults.created_chemicals.map((chemical, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">{chemical.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        (CAS: {chemical.cas_number})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {chemical.unique_id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {uploadResults.errors.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <X className="h-4 w-4 text-red-600" />
                Errors ({uploadResults.errors.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {uploadResults.errors.map((error, index) => (
                  <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Format Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">CSV Format Requirements</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• <strong>Required columns:</strong> name, cas_number, smiles</li>
          <li>• <strong>Optional columns:</strong> molecular_formula, initial_quantity, initial_unit</li>
          <li>• <strong>Initial quantity:</strong> Defaults to 0 if not specified</li>
          <li>• <strong>Initial unit:</strong> Defaults to "g" if not specified</li>
          <li>• <strong>File encoding:</strong> UTF-8</li>
        </ul>
      </div>
    </div>
  );
}