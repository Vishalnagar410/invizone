'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { ChemicalWithStock, MSDS, HazardSummary } from '@/types';
import { chemicalsAPI, msdsAPI } from '@/lib/api';
import { ChemicalCard } from '../../components/chemical-card';
import { GHSPictograms } from '../../components/ghs-pictograms';

export default function MSDSPage() {
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>([]);
  const [selectedChemical, setSelectedChemical] = useState<ChemicalWithStock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMSDS, setIsFetchingMSDS] = useState<number | null>(null);

  const riskLevelColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
  };

  const loadChemicalsWithMSDS = async () => {
    setIsLoading(true);
    try {
      const chemicalsData = await chemicalsAPI.getAll();
      
      // Fetch MSDS data for each chemical
      const chemicalsWithMSDS = await Promise.all(
        chemicalsData.map(async (chemical) => {
          try {
            const msds = await msdsAPI.getByChemicalId(chemical.id);
            const hazardSummary = await msdsAPI.getHazardSummary(chemical.id);
            
            return {
              ...chemical,
              msds,
              hazardSummary
            };
          } catch (error) {
            // MSDS not available for this chemical - return with null msds
            return {
              ...chemical,
              msds: null,
              hazardSummary: undefined
            };
          }
        })
      );
      
      setChemicals(chemicalsWithMSDS);
    } catch (error) {
      console.error('Failed to load chemicals with MSDS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchMSDS = async (chemicalId: number) => {
    setIsFetchingMSDS(chemicalId);
    try {
      await msdsAPI.fetchMSDS(chemicalId);
      // Reload the data after fetching
      setTimeout(loadChemicalsWithMSDS, 2000); // Wait a bit for background processing
    } catch (error) {
      console.error('Failed to fetch MSDS:', error);
      alert('Failed to fetch MSDS data. Please try again.');
    } finally {
      setIsFetchingMSDS(null);
    }
  };

  // Filter chemicals based on whether they have MSDS data
  const chemicalsWithMSDS = chemicals.filter(c => c.msds !== null);
  const chemicalsWithoutMSDS = chemicals.filter(c => c.msds === null);

  useEffect(() => {
    loadChemicalsWithMSDS();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MSDS Library</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Material Safety Data Sheets and hazard information
          </p>
        </div>
        
        <button
          onClick={loadChemicalsWithMSDS}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total MSDS</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemicalsWithMSDS.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Safe Chemicals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemicalsWithMSDS.filter(c => c.hazardSummary?.risk_level === 'low').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">High Risk</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemicalsWithMSDS.filter(c => c.hazardSummary?.risk_level === 'high').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chemicals with MSDS */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Chemicals with Safety Data
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {chemicalsWithMSDS.length} chemicals with available MSDS information
            </p>
          </div>
        </div>

        {chemicalsWithMSDS.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No MSDS Data Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Fetch MSDS data for your chemicals using the buttons below.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {chemicalsWithMSDS.map((chemical) => (
              <div key={chemical.id} className="relative">
                <ChemicalCard 
                  chemical={chemical} 
                  onSelect={setSelectedChemical}
                  showActions={false}
                />
                
                {/* Hazard Summary Badge */}
                {chemical.hazardSummary && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskLevelColors[chemical.hazardSummary.risk_level]}`}>
                      {chemical.hazardSummary.risk_level.toUpperCase()}
                    </span>
                    {chemical.hazardSummary.hazard_count && chemical.hazardSummary.hazard_count > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-medium">
                        {chemical.hazardSummary.hazard_count} H
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chemicals without MSDS */}
      {chemicalsWithoutMSDS.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Chemicals Needing MSDS Data
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                {chemicalsWithoutMSDS.length} chemicals without safety data
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chemicalsWithoutMSDS.map((chemical) => (
              <div key={chemical.id} className="relative">
                <ChemicalCard 
                  chemical={chemical} 
                  showActions={false}
                />
                
                <button
                  onClick={() => handleFetchMSDS(chemical.id)}
                  disabled={isFetchingMSDS === chemical.id}
                  className="absolute top-2 right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50"
                  title="Fetch MSDS data"
                >
                  {isFetchingMSDS === chemical.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MSDS Detail Modal */}
      {selectedChemical && selectedChemical.msds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedChemical.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    CAS: {selectedChemical.cas_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedChemical(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Hazard Pictograms */}
              {selectedChemical.hazardSummary && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    GHS Hazard Pictograms
                  </h3>
                  <GHSPictograms 
                    pictograms={selectedChemical.hazardSummary.ghs_pictograms} 
                    size="lg" 
                  />
                </div>
              )}

              {/* Hazard Statements */}
              {selectedChemical.msds.hazard_statements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Hazard Statements
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(selectedChemical.msds.hazard_statements).map(([key, value]) => (
                      <div key={key} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="font-medium text-red-800 dark:text-red-200">{key}</div>
                        <div className="text-red-700 dark:text-red-300 text-sm mt-1">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precautionary Statements */}
              {selectedChemical.msds.precautionary_statements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Precautionary Statements
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(selectedChemical.msds.precautionary_statements).map(([key, value]) => (
                      <div key={key} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="font-medium text-blue-800 dark:text-blue-200">{key}</div>
                        <div className="text-blue-700 dark:text-blue-300 text-sm mt-1">{String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Handling Notes */}
              {selectedChemical.msds.handling_notes && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Handling & Storage
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedChemical.msds.handling_notes}
                    </p>
                  </div>
                </div>
              )}

              {/* Source Information */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Source: {selectedChemical.msds.source_url || 'PubChem'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {new Date(selectedChemical.msds.retrieved_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}