'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3,
  RefreshCw,
  Mail
} from 'lucide-react';
import { ChemicalWithStock, StockSummary } from '@/types';
import { stockAPI, chemicalsAPI } from '@/lib/api';
import { ChemicalCard } from '@/components/chemical-card';
import { useAuth } from '@/lib/auth';

export default function StockPage() {
  const [lowStockChemicals, setLowStockChemicals] = useState<ChemicalWithStock[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const { user } = useAuth();

  const loadStockData = async () => {
    setIsLoading(true);
    try {
      const [lowStockData, summaryData] = await Promise.all([
        stockAPI.getLowStockChemicals(),
        stockAPI.getStockSummary()
      ]);
      setLowStockChemicals(lowStockData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load stock data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendDailyReport = async () => {
    if (!user || user.role !== 'admin') return;
    
    setIsSendingReport(true);
    try {
      await stockAPI.triggerDailyReport();
      alert('Daily report sent successfully!');
    } catch (error) {
      console.error('Failed to send report:', error);
      alert('Failed to send daily report');
    } finally {
      setIsSendingReport(false);
    }
  };

  const handleResolveAlert = async (chemicalId: number) => {
    try {
      // Get active alerts for this chemical and resolve them
      const alerts = await stockAPI.getAlerts();
      const chemicalAlerts = alerts.filter(alert => 
        alert.chemical_id === chemicalId && !alert.is_resolved
      );
      
      for (const alert of chemicalAlerts) {
        await stockAPI.resolveAlert(alert.id);
      }
      
      // Reload data
      loadStockData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Monitor chemical stock levels and receive alerts
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadStockData}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          {user?.role === 'admin' && (
            <button
              onClick={handleSendDailyReport}
              disabled={isSendingReport}
              className="btn-primary"
            >
              {isSendingReport ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Daily Report
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Chemicals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_chemicals}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.low_stock_count}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(summary.total_quantity)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">units</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Low Stock %</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.low_stock_percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Low Stock Alerts
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Chemicals that need immediate attention
            </p>
          </div>
          
          <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm font-medium">
            {lowStockChemicals.length} alerts
          </span>
        </div>

        {lowStockChemicals.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Low Stock Alerts
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              All chemicals are sufficiently stocked.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lowStockChemicals.map((chemical) => (
              <div key={chemical.id} className="relative">
                <ChemicalCard 
                  chemical={chemical} 
                  showActions={false}
                />
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleResolveAlert(chemical.id)}
                    className="absolute top-2 right-2 p-1 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                    title="Mark as resolved"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Management Tips */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
          💡 Stock Management Tips
        </h3>
        <ul className="text-blue-800 dark:text-blue-200 space-y-2 text-sm">
          <li>• Set appropriate trigger levels based on usage patterns</li>
          <li>• Regularly review and update stock quantities</li>
          <li>• Consider lead times when reordering chemicals</li>
          <li>• Maintain safety stock for critical reagents</li>
          {user?.role === 'admin' && (
            <li>• Configure SMTP settings for email notifications</li>
          )}
        </ul>
      </div>
    </div>
  );
}