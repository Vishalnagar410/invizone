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
  Users
} from 'lucide-react';
import { ChemicalWithStock, StockSummary } from '@/types';
import { chemicalsAPI, stockAPI } from '@/lib/api';
import { ChemicalCard } from '@/components/chemical-card';
import { AlertsPanel } from '@/components/alerts-panel';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const [recentChemicals, setRecentChemicals] = useState<ChemicalWithStock[]>([]);
  const [lowStockChemicals, setLowStockChemicals] = useState<ChemicalWithStock[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [recentData, lowStockData, summaryData] = await Promise.all([
        chemicalsAPI.getAll(0, 6),
        stockAPI.getLowStockChemicals(0, 3),
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Search Chemicals',
      description: 'Find chemicals by name, CAS, or structure',
      icon: Search,
      href: '/dashboard/search',
      color: 'blue'
    },
    {
      title: 'Add Chemical',
      description: 'Add new chemical to inventory',
      icon: Package,
      href: '/dashboard/add',
      color: 'green'
    },
    {
      title: 'Stock Overview',
      description: 'Monitor stock levels and alerts',
      icon: TrendingUp,
      href: '/dashboard/stock',
      color: 'orange'
    },
    {
      title: 'MSDS Library',
      description: 'Access safety data sheets',
      icon: FileText,
      href: '/dashboard/msds',
      color: 'purple'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlertsPanel />

      {/* Welcome Header */}
      <div className="card p-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || user?.email}!
            </h1>
            <p className="text-primary-100">
              {summary ? `Managing ${summary.total_chemicals} chemicals in inventory` : 'Loading inventory...'}
            </p>
          </div>
          <Beaker className="h-12 w-12 text-primary-200" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="card p-6 hover:shadow-lg transition-shadow group"
            >
              <div className={`p-3 bg-${action.color}-100 dark:bg-${action.color}-900 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`h-6 w-6 text-${action.color}-600 dark:text-${action.color}-400`} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {action.description}
              </p>
              <div className="flex items-center text-sm font-medium text-primary-600 dark:text-primary-400">
                Get started
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Chemicals */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Chemicals
            </h2>
            <Link
              href="/dashboard/search"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
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

        {/* Low Stock Alerts */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Low Stock Alerts
            </h2>
            <Link
              href="/dashboard/stock"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all
            </Link>
          </div>

          {lowStockChemicals.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>All chemicals are sufficiently stocked</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lowStockChemicals.map((chemical) => (
                <ChemicalCard
                  key={chemical.id}
                  chemical={chemical}
                  showActions={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summary?.total_chemicals || 0}</div>
            <div className="text-green-600">Total Chemicals</div>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{summary?.low_stock_count || 0}</div>
            <div className="text-red-600">Low Stock</div>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{Math.round(summary?.total_quantity || 0)}</div>
            <div className="text-blue-600">Total Quantity</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {summary ? `${summary.low_stock_percentage.toFixed(1)}%` : '0%'}
            </div>
            <div className="text-purple-600">Low Stock %</div>
          </div>
        </div>
      </div>
    </div>
  );
}