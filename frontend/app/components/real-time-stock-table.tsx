'use client';

import { useState, useEffect } from 'react';
import { ChemicalWithStock } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, Package } from 'lucide-react';

interface RealTimeStockTableProps {
  initialChemicals: ChemicalWithStock[];
  onChemicalUpdate?: (chemicals: ChemicalWithStock[]) => void;
}

export function RealTimeStockTable({ initialChemicals, onChemicalUpdate }: RealTimeStockTableProps) {
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>(initialChemicals);
  const { isConnected, latestChemical, latestStockAdjustment, connectionStatus, reconnect } = useWebSocket();

  // Update chemicals when new data arrives via WebSocket
  useEffect(() => {
    if (latestChemical) {
      setChemicals(prev => {
        const updated = prev.map(chem => 
          chem.id === latestChemical.id ? { ...chem, ...latestChemical } : chem
        );
        
        // If it's a new chemical, add it to the list
        if (!prev.find(chem => chem.id === latestChemical.id)) {
          updated.unshift(latestChemical);
        }
        
        onChemicalUpdate?.(updated);
        return updated;
      });
    }
  }, [latestChemical, onChemicalUpdate]);

  // Handle stock adjustments
  useEffect(() => {
    if (latestStockAdjustment) {
      setChemicals(prev => 
        prev.map(chem => 
          chem.id === latestStockAdjustment.chemical_id 
            ? { 
                ...chem, 
                stock: { 
                  ...chem.stock, 
                  current_quantity: latestStockAdjustment.after_quantity 
                } 
              } 
            : chem
        )
      );
    }
  }, [latestStockAdjustment]);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live Updates';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor()}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4" />
            ) : connectionStatus === 'error' ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
            {getConnectionStatusText()}
          </div>
          
          {latestChemical && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <Package className="h-4 w-4" />
              <span>Latest: {latestChemical.name}</span>
            </div>
          )}
        </div>

        {connectionStatus !== 'connected' && (
          <button
            onClick={reconnect}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect
          </button>
        )}
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Chemical
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                CAS Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Current Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Min Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {chemicals.map((chemical) => (
              <tr 
                key={chemical.id} 
                className={`
                  hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                  ${latestChemical?.id === chemical.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                `}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {chemical.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {chemical.molecular_formula}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {chemical.cas_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {chemical.location?.name || 'No Location'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {chemical.stock?.current_quantity || 0} {chemical.stock?.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {chemical.minimum_quantity || 10} {chemical.stock?.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {chemical.stock && chemical.stock.current_quantity <= (chemical.minimum_quantity || 10) ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      In Stock
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {chemicals.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No chemicals found</p>
          </div>
        )}
      </div>

      {/* Recent Activity Panel */}
      {(latestChemical || latestStockAdjustment) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
            Recent Activity
          </h3>
          <div className="space-y-2">
            {latestChemical && (
              <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="text-sm">
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {latestChemical.name}
                  </span>
                  <span className="text-blue-700 dark:text-blue-300 ml-2">
                    was {latestChemical.id === chemicals[0]?.id ? 'added' : 'updated'}
                  </span>
                </div>
              </div>
            )}
            {latestStockAdjustment && (
              <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div className="text-sm">
                  <span className="font-medium text-green-900 dark:text-green-100">
                    Stock adjusted
                  </span>
                  <span className="text-green-700 dark:text-green-300 ml-2">
                    {latestStockAdjustment.chemical_name}: {latestStockAdjustment.before_quantity} → {latestStockAdjustment.after_quantity}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}