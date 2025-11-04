'use client';

import { useState, useEffect } from 'react';
import { ChemicalWithStock } from '@/types';
import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ChemicalStockTable } from '../../components/chemical-stock-table';
import { RefreshCw, Bell, Wifi, WifiOff } from 'lucide-react';

export default function StockPage() {
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { user } = useAuth();
  
  // WebSocket for real-time updates
  const { isConnected, latestChemical, latestStockAdjustment } = useWebSocket();

  const loadChemicals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8000/chemicals/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const chemicalsData = await response.json();
      setChemicals(chemicalsData);
    } catch (err: any) {
      setError('Failed to load chemicals');
      console.error('Error loading chemicals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadChemicals();
    }
  }, [user]);

  // Handle real-time chemical updates
  useEffect(() => {
    if (latestChemical) {
      setChemicals(prevChemicals => {
        const existingIndex = prevChemicals.findIndex(c => c.id === latestChemical.id);
        
        if (existingIndex >= 0) {
          // Update existing chemical
          const updated = [...prevChemicals];
          updated[existingIndex] = latestChemical;
          return updated;
        } else {
          // Add new chemical
          return [latestChemical, ...prevChemicals];
        }
      });
    }
  }, [latestChemical]);

  // Handle real-time stock adjustments
  useEffect(() => {
    if (latestStockAdjustment) {
      setChemicals(prevChemicals => 
        prevChemicals.map(chemical => 
          chemical.id === latestStockAdjustment.chemical_id
            ? {
                ...chemical,
                stock: {
                  ...chemical.stock!,
                  current_quantity: latestStockAdjustment.after_quantity,
                  last_updated: new Date().toISOString()
                }
              }
            : chemical
        )
      );
    }
  }, [latestStockAdjustment]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please log in to view stock
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-poppins">
                Chemical Stock
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time inventory management with live updates
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* WebSocket Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                isConnected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {isConnected ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>

              <button
                onClick={loadChemicals}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Real-time Notification Banner */}
          {latestChemical && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Bell className="h-4 w-4" />
                <span className="text-sm">
                  <strong>{latestChemical.name}</strong> was added to inventory
                </span>
              </div>
            </div>
          )}

          {latestStockAdjustment && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Bell className="h-4 w-4" />
                <span className="text-sm">
                  Stock updated for <strong>{latestStockAdjustment.chemical_name}</strong>: 
                  {latestStockAdjustment.change_amount > 0 ? '+' : ''}{latestStockAdjustment.change_amount}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <ChemicalStockTable 
              chemicals={chemicals} 
              isLoading={isLoading}
              onStockUpdate={loadChemicals}
            />
          </div>
        </div>
      </main>
    </div>
  );
}