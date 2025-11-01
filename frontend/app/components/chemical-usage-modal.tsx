'use client';

import { useState } from 'react';
import { ChemicalWithStock } from '@/types';
import { stockAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { X, MinusCircle, Save, AlertTriangle } from 'lucide-react';

interface ChemicalUsageModalProps {
  chemical: ChemicalWithStock;
  isOpen: boolean;
  onClose: () => void;
}

export function ChemicalUsageModal({ chemical, isOpen, onClose }: ChemicalUsageModalProps) {
  const { user } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(chemical.stock?.unit || 'g');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (chemical.stock && parseFloat(quantity) > chemical.stock.current_quantity) {
      setError(`Insufficient stock. Available: ${chemical.stock.current_quantity} ${chemical.stock.unit}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await stockAPI.recordUsage(chemical.id, {
        chemical_id: chemical.id,
        quantity_used: parseFloat(quantity),
        unit: unit,
        notes: notes
      });

      onClose();
      // Reset form
      setQuantity('');
      setNotes('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record usage');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MinusCircle className="h-5 w-5 text-red-500" />
            Record Chemical Usage
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chemical
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <div className="font-medium text-gray-900 dark:text-white">{chemical.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                CAS: {chemical.cas_number} | Current: {chemical.stock?.current_quantity} {chemical.stock?.unit}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity Used *
              </label>
              <input
                type="number"
                id="quantity"
                step="0.01"
                min="0.01"
                max={chemical.stock?.current_quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit
              </label>
              <select
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="g">g</option>
                <option value="mg">mg</option>
                <option value="kg">kg</option>
                <option value="mL">mL</option>
                <option value="L">L</option>
                <option value="mol">mol</option>
                <option value="pieces">pieces</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Purpose of usage, experiment details, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Record Usage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}