'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Beaker, 
  Search, 
  Package, 
  AlertTriangle, 
  FileText,
  ArrowRight,
  TrendingUp,
  Users,
  BarChart3,
  RefreshCw,
  Mail
} from 'lucide-react';
import { ChemicalWithStock, StockSummary } from '@/types';
import { chemicalsAPI, stockAPI } from '@/lib/api';
import { ChemicalCard } from '../components/chemical-card';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const [recentChemicals, setRecentChemicals] = useState<ChemicalWithStock[]>([]);
  const [lowStockChemicals, setLowStockChemicals] = useState<ChemicalWithStock[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingReport, setIsSendingReport] = useState(false);
  const { user } = useAuth();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [recentData, lowStockData, summaryData] = await Promise.all([
        chemicalsAPI.getAll(0, 6),
        stockAPI.getLowStockChemicals(0, 6),
        stockAPI.getStockSummary()
      ]);
      setRecentChemicals(recentData);
      setLowStockChemicals(lowStockData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
      const chemicalAlerts = alerts.filter((alert: any) => 
        alert.chemical_id === chemicalId && !alert.is_resolved
      );
      
      for (const alert of chemicalAlerts) {
        await stockAPI.resolveAlert(alert.id);
      }
      
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Search Chemicals',
      description: 'Find chemicals by name, CAS, or structure',
      icon: Search,
      href: '/dashboard/search',
      color: 'pink'
    },
    {
      title: 'Add Chemical',
      description: 'Add new chemical to inventory',
      icon: Package,
      href: '/dashboard/add',
      color: 'purple'
    },
    {
      title: 'Stock Overview',
      description: 'Monitor stock levels and alerts',
      icon: TrendingUp,
      href: '/dashboard/stock',
      color: 'deep-purple'
    },
    {
      title: 'MSDS Library',
      description: 'Access safety data sheets',
      icon: FileText,
      href: '/dashboard/msds',
      color: 'dark-purple'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f806cc]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Header with Actions - Updated Colors */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-r from-[#a91079] to-[#f806cc] text-white">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || user?.email}!
            </h1>
            <p className="text-white/80 mb-4">
              {summary ? `Managing ${summary.total_chemicals} chemicals in inventory` : 'Getting inventory data...'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              
              {user?.role === 'admin' && (
                <button
                  onClick={handleSendDailyReport}
                  disabled={isSendingReport}
                  className="px-4 py-2 bg-white hover:bg-gray-100 text-[#f806cc] rounded-lg font-medium transition-colors flex items-center disabled:opacity-50"
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
          <Beaker className="h-12 w-12 text-white/80" />
        </div>
      </div>

      {/* Enhanced Summary Cards - Updated Colors */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-[#f806cc]/10 rounded-lg">
                <Package className="h-6 w-6 text-[#f806cc]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Chemicals</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_chemicals}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-[#a91079]/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-[#a91079]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.low_stock_count}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-[#570a57]/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-[#570a57] dark:text-[#a91079]" />
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

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-[#2e0249]/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-[#2e0249] dark:text-[#570a57]" />
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

      {/* Quick Actions - Updated Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const colorClasses = {
            pink: 'bg-[#f806cc]/10 text-[#f806cc]',
            purple: 'bg-[#a91079]/10 text-[#a91079]',
            'deep-purple': 'bg-[#570a57]/10 text-[#570a57] dark:text-[#a91079]',
            'dark-purple': 'bg-[#2e0249]/10 text-[#2e0249] dark:text-[#570a57]'
          };
          
          return (
            <Link
              key={action.title}
              href={action.href}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow group"
            >
              <div className={`p-3 ${colorClasses[action.color as keyof typeof colorClasses]} rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {action.description}
              </p>
              <div className="flex items-center text-sm font-medium text-[#f806cc] dark:text-[#a91079]">
                Get started
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Chemicals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Chemicals
            </h2>
            <Link
              href="/dashboard/search"
              className="text-[#f806cc] hover:text-[#a91079] text-sm font-medium"
            >
              View all
            </Link>
          </div>

          {recentChemicals.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No chemicals added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentChemicals.slice(0, 5).map((chemical) => (
                <ChemicalCard
                  key={chemical.id}
                  chemical={chemical}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Low Stock Alerts - Updated Colors */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#a91079]" />
                Low Stock Alerts
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                Chemicals that need immediate attention
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-[#a91079]/10 text-[#a91079] dark:bg-[#a91079]/20 dark:text-[#f806cc] rounded-full text-sm font-medium">
                {lowStockChemicals.length} alerts
              </span>
              <Link
                href="/dashboard/stock"
                className="text-[#f806cc] hover:text-[#a91079] text-sm font-medium"
              >
                View all
              </Link>
            </div>
          </div>

          {lowStockChemicals.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>All chemicals are sufficiently stocked</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lowStockChemicals.slice(0, 3).map((chemical) => (
                <div key={chemical.id} className="relative">
                  <ChemicalCard
                    chemical={chemical}
                    showActions={false}
                  />
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleResolveAlert(chemical.id)}
                      className="absolute top-2 right-2 p-1 bg-[#570a57] hover:bg-[#a91079] text-white rounded-full transition-colors"
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
      </div>

      {/* Stock Management Tips - Updated Colors */}
      <div className="rounded-lg shadow-md border border-[#a91079]/20 p-6 bg-[#a91079]/5 dark:bg-[#570a57]/20">
        <h3 className="text-lg font-medium text-[#570a57] dark:text-[#f806cc] mb-3">
          💡 Stock Management Tips
        </h3>
        <ul className="text-[#570a57] dark:text-[#a91079] space-y-2 text-sm">
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