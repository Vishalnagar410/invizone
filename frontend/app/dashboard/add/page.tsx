'use client';

import { useState } from 'react';
import { DashboardNav } from '../../components/dashboard-nav';
import { AlertsPanel } from '../../components/alerts-panel';
import { DebugPanel } from '../../components/debug-panel';
import { CSVUpload } from '../../components/csv-upload';
import { ChemicalForm } from '../../components/chemical-form';
import { Upload, Beaker } from 'lucide-react';

export default function AddChemicalPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [uploadResults, setUploadResults] = useState<any[]>([]);

  const handleUploadComplete = (results: any[]) => {
    setUploadResults(results);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardNav />
      <AlertsPanel />
      <DebugPanel />
      
      <main className="lg:pl-64">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Add Chemicals
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Add new chemicals to your inventory individually or in bulk
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'single'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Beaker className="h-4 w-4" />
                  Single Chemical
                </button>
                <button
                  onClick={() => setActiveTab('bulk')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'bulk'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Bulk Upload
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl">
            {activeTab === 'single' ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Add Single Chemical
                  </h2>
                  <ChemicalForm 
                    onSuccess={() => {
                      // Handle success (show notification, reset form, etc.)
                      console.log('Chemical added successfully');
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Bulk Upload Chemicals
                  </h2>
                  <CSVUpload onUploadComplete={handleUploadComplete} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}