// frontend/app/dashboard/stock/page.tsx - UPDATED VERSION
'use client';

import { useState, useEffect } from 'react';
import { EnhancedStockTable } from '../../components/enhanced-stock-table';
import { ChemicalWithStock } from '@/types';
import { Package, Download, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StockPage() {
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const router = useRouter();

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

  const handleChemicalUpdate = (updatedChemicals: ChemicalWithStock[]) => {
    setChemicals(updatedChemicals);
  };

  const handleEditChemical = (chemical: ChemicalWithStock) => {
    // Navigate to edit page or open edit modal
    console.log('Edit chemical:', chemical);
    // router.push(`/dashboard/chemicals/edit/${chemical.id}`);
  };

  const handleDeleteChemical = async (chemical: ChemicalWithStock) => {
    if (!confirm(`Are you sure you want to delete ${chemical.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/chemicals/${chemical.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        // Remove chemical from list
        setChemicals(prev => prev.filter(c => c.id !== chemical.id));
      } else {
        throw new Error('Failed to delete chemical');
      }
    } catch (err) {
      alert('Failed to delete chemical: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'CAS Number', 'Molecular Formula', 'Location', 'Current Stock', 'Unit', 'Min Quantity', 'Status'];
    const csvData = chemicals.map(chem => [
      chem.name,
      chem.cas_number,
      chem.molecular_formula || 'N/A',
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
                    Chemical Stock Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Real-time inventory with detailed chemical information and role-based access
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
                    onClick={() => router.push('/dashboard/add')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Chemical
                  </button>
                </div>
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
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {chemicals.filter(c => c.stock && c.stock.current_quantity <= (c.minimum_quantity || 10) && c.stock.current_quantity > 0).length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Low Stock</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {chemicals.filter(c => c.stock && c.stock.current_quantity <= 0).length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</div>
              </div>
            </div>

            {/* Enhanced Stock Table */}
            <EnhancedStockTable 
              initialChemicals={chemicals}
              onChemicalUpdate={handleChemicalUpdate}
              onEditChemical={handleEditChemical}
              onDeleteChemical={handleDeleteChemical}
            />
          </div>
        </div>
      </main>
    </div>
  );
}