'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { chemicalsAPI } from '@/lib/api';

interface CSVUploadProps {
  onUploadComplete: (results: UploadResult[]) => void;
}

interface UploadResult {
  row: number;
  data: any;
  status: 'success' | 'error';
  message: string;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // TODO: Implement backend CSV processing endpoint
      // For now, we'll simulate processing
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const uploadResults: UploadResult[] = [];
      
      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        try {
          // Validate required fields
          if (!rowData.name || !rowData.cas_number || !rowData.smiles) {
            throw new Error('Missing required fields: name, cas_number, or smiles');
          }

          // Create chemical
          await chemicalsAPI.create({
            name: rowData.name,
            cas_number: rowData.cas_number,
            smiles: rowData.smiles,
          });

          uploadResults.push({
            row: i,
            data: rowData,
            status: 'success',
            message: 'Chemical added successfully'
          });
        } catch (error: any) {
          uploadResults.push({
            row: i,
            data: rowData,
            status: 'error',
            message: error.response?.data?.detail || error.message || 'Unknown error'
          });
        }
      }

      setResults(uploadResults);
      onUploadComplete(uploadResults);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to process CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`card p-8 text-center border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        
        <div className="space-y-2 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Upload Chemical Data
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Drag and drop a CSV file, or click to browse
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="btn-primary"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          Choose CSV File
        </button>

        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>Expected columns: name, cas_number, smiles</p>
          <p>Optional: molecular_formula, molecular_weight</p>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Upload Results
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-green-600">Success</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
          </div>

          {errorCount > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="font-medium text-gray-900 dark:text-white">Errors:</h4>
              {results.filter(r => r.status === 'error').map((result, index) => (
                <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                  <div className="font-medium">Row {result.row}: {result.data.name}</div>
                  <div className="text-red-600 dark:text-red-400">{result.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}