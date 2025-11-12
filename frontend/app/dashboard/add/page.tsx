'use client';

import { useState } from 'react';
import { CSVUpload } from '../../components/csv-upload';
import { EnhancedChemicalForm } from '../../components/enhanced-chemical-form';
import { Upload, Beaker, Database, Download } from 'lucide-react';

export default function AddChemicalPage() {
  const [uploadResults, setUploadResults] = useState<any[]>([]);

  const handleUploadComplete = (results: any[]) => {
    setUploadResults(results);
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Method 1: Direct download using fetch with proper headers
      const response = await fetch('http://localhost:8000/static/Template.csv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/csv',
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'Chemical_Inventory_Template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Template downloaded successfully');
      } else {
        console.error('❌ Download failed:', response.status);
        // Fallback: Open in new tab
        window.open('http://localhost:8000/static/Template.csv', '_blank');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      // Final fallback - direct link
      window.open('http://localhost:8000/static/Template.csv', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-poppins">
              Add Chemicals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Add new chemicals to your inventory using structure editors or bulk upload
            </p>
          </div>

          {/* Single Page Layout - No Tabs */}
          <div className="space-y-8">
            {/* Chemical Form Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Beaker className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-poppins">
                    Add Chemical
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Use the chemical structure editors below and fill in the details
                </p>
              </div>
              <div className="p-6">
                <EnhancedChemicalForm 
                  onSuccess={() => {
                    console.log('Chemical added successfully');
                  }}
                />
              </div>
            </div>

            {/* Bulk Upload Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Upload className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white font-poppins">
                    Bulk Upload
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Upload a CSV file with multiple chemicals to add them all at once
                </p>
              </div>
              <div className="p-6">
                {/* Template Download */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">
                        Download CSV Template
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Use our template to ensure proper formatting for bulk upload
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download Template
                    </button>
                  </div>
                </div>

                <CSVUpload onUploadComplete={handleUploadComplete} />
              </div>
            </div>
          </div>

          {/* Upload Results */}
          {uploadResults.length > 0 && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upload Results
                </h3>
              </div>
              <div className="space-y-3">
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-md ${
                      result.status === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {result.name || `Chemical ${index + 1}`}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          result.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }`}
                      >
                        {result.status === 'success' ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    {result.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {result.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}