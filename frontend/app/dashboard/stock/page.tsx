'use client';

import { useState, useEffect } from 'react';
import { RealTimeStockTable } from '../../components/real-time-stock-table';
import { ChemicalWithStock } from '@/types';
import { Package, RefreshCw, Download, Filter } from 'lucide-react';

export default function StockPage() {
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'low-stock'>('all');

  const fetchChemicals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/chemicals/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chemicals');
      }
      
      const data = await response.json();
      setChemicals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chemicals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChemicals();
  }, []);

  const filteredChemicals = chemicals.filter(chemical => {
    if (filter === 'low-stock') {
      return chemical.stock && chemical.stock.current_quantity <= (chemical.minimum_quantity || 10);
    }
    return true;
  });

  const handleChemicalUpdate = (updatedChemicals: ChemicalWithStock[]) => {
    setChemicals(updatedChemicals);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'CAS Number', 'Location', 'Current Stock', 'Unit', 'Min Quantity', 'Status'];
    const csvData = filteredChemicals.map(chem => [
      chem.name,
      chem.cas_number,
      chem.location?.name || 'No Location',
      chem.stock?.current_quantity || 0,
      chem.stock?.unit || 'g',
      chem.minimum_quantity || 10,
      chem.stock && chem.stock.current_quantity <= (chem.minimum_quantity || 10) ? 'Low Stock' : 'In Stock'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reychemiq-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-poppins">
                    Chemical Stock
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Real-time inventory management with live updates
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={fetchChemicals}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
                </div>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  All Chemicals
                </button>
                <button
                  onClick={() => setFilter('low-stock')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter === 'low-stock'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  Low Stock
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {chemicals.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Chemicals</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {chemicals.filter(c => c.stock && c.stock.current_quantity > (c.minimum_quantity || 10)).length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">In Stock</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {chemicals.filter(c => c.stock && c.stock.current_quantity <= (c.minimum_quantity || 10)).length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Low Stock</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {new Set(chemicals.map(c => c.location?.name).filter(Boolean)).size}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Locations</div>
              </div>
            </div>

            {/* Real-time Stock Table */}
            <RealTimeStockTable 
              initialChemicals={filteredChemicals}
              onChemicalUpdate={handleChemicalUpdate}
            />
          </div>
        </div>
      </main>
    </div>
  );
}