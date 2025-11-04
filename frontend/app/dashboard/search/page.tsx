'use client';

import { ChemicalSearch } from '../../components/chemical-search';

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-poppins">
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