'use client';

import { useState, useEffect } from 'react';
import { ChemicalWithStock } from '@/types';
import { chemicalsAPI, stockAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ChemicalStockTable } from '../../components/chemical-stock-table';
import { RefreshCw, Package, AlertTriangle, MapPin } from 'lucide-react';

export default function StockPage() {
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadChemicals = async () => {
    setIsLoading(true);
    try {
      // Use the new endpoint to get all chemicals with stock
      const chemicalsData = await chemicalsAPI.getAll();
      setChemicals(chemicalsData);
    } catch (error) {
      console.error('Failed to load chemicals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChemicals();
  }, []);

  const lowStockCount = chemicals.filter(chemical => 
    chemical.stock && chemical.stock.current_quantity <= chemical.stock.trigger_level
  ).length;

  const chemicalsWithLocation = chemicals.filter(chemical => chemical.location).length;

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Comprehensive view of all chemicals with stock information
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadChemicals}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Chemicals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemicals.length}
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {lowStockCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">With Location</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemicalsWithLocation}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Low Stock %</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemicals.length > 0 ? ((lowStockCount / chemicals.length) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chemical Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Chemical Inventory
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage chemical stock levels, locations, and low stock alerts
            </p>
          </div>
        </div>

        <ChemicalStockTable 
          chemicals={chemicals} 
          onUpdate={loadChemicals}
        />
      </div>

      {/* Admin Tips */}
      {user?.role === 'admin' && (
        <div className="rounded-lg shadow-md border border-blue-200 dark:border-blue-800 p-6 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
            💡 Admin Management Tips
          </h3>
          <ul className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
            <li>• Click the edit icon to update stock quantities and trigger levels</li>
            <li>• Set location information for easy chemical retrieval</li>
            <li>• Configure low stock alerts based on usage patterns</li>
            <li>• Regularly update quantities after chemical usage</li>
            <li>• Use barcodes for quick inventory management</li>
          </ul>
        </div>
      )}
    </div>
  );
}