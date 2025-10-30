'use client';

import { ChemicalSearch } from '../../components/chemical-search';
import { DashboardNav } from '../../components/dashboard-nav';
import { AlertsPanel } from '../../components/alerts-panel';
import { DebugPanel } from '../../components/debug-panel';

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardNav />
      <AlertsPanel />
      <DebugPanel />
      
      <main className="lg:pl-64">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Chemical Search
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Search and filter chemicals in your inventory
            </p>
          </div>
          
          <ChemicalSearch />
        </div>
      </main>
    </div>
  );
}