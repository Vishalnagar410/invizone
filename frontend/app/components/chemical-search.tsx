'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { ChemicalWithStock } from '@/types';
import { chemicalsAPI } from '@/lib/api';
import { ChemicalCard } from './chemical-card';

interface ChemicalSearchProps {
  onChemicalSelect?: (chemical: ChemicalWithStock) => void;
  showActions?: boolean;
}

export function ChemicalSearch({ onChemicalSelect, showActions = true }: ChemicalSearchProps) {
  const [query, setQuery] = useState('');
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'text' | 'structure'>('text');
  const [filters, setFilters] = useState({
    lowStock: false,
    hasMSDS: false,
  });

  const searchChemicals = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setChemicals([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await chemicalsAPI.search(searchQuery);
      setChemicals(results);
    } catch (error) {
      console.error('Search failed:', error);
      setChemicals([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        searchChemicals(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchChemicals]);

  const clearSearch = () => {
    setQuery('');
    setChemicals([]);
  };

  const filteredChemicals = chemicals.filter(chemical => {
    if (filters.lowStock && chemical.stock) {
      if (chemical.stock.current_quantity > chemical.stock.trigger_level) {
        return false;
      }
    }
    if (filters.hasMSDS && !chemical.msds) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, CAS number, SMILES, or molecular formula..."
              className="input-field pl-10 pr-10"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSearchType('text')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                searchType === 'text'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setSearchType('structure')}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                searchType === 'structure'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Structure
            </button>
          </div>
        </div>

        {/* Structure Search (Placeholder) */}
        {searchType === 'structure' && (
          <div className="mt-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              Structure search coming soon...
            </p>
            <button className="btn-primary text-sm">
              Draw Structure
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">Filters:</span>
          </div>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Low Stock Only</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.hasMSDS}
              onChange={(e) => setFilters(prev => ({ ...prev, hasMSDS: e.target.checked }))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Has MSDS</span>
          </label>
        </div>
      </div>

      {/* Search Results */}
      <div>
        {isLoading && (
          <div className="card p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Searching chemicals...</p>
          </div>
        )}

        {!isLoading && query && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Search Results ({filteredChemicals.length})
              </h3>
              <button
                onClick={clearSearch}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear results
              </button>
            </div>

            {filteredChemicals.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No chemicals found matching your search criteria.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredChemicals.map((chemical) => (
                  <ChemicalCard
                    key={chemical.id}
                    chemical={chemical}
                    onSelect={onChemicalSelect}
                    showActions={showActions}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && !query && (
          <div className="card p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Search Chemicals
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Enter a search term above to find chemicals by name, CAS number, SMILES, or molecular formula.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}