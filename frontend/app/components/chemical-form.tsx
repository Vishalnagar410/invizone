// frontend/components/chemical-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChemicalFormData } from '@/types';
import { chemicalsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Save, Loader2, QrCode } from 'lucide-react';

interface ChemicalFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ChemicalFormData>;
}

// Available units of measurement
const UNITS = ['g', 'mg', 'kg', 'mL', 'L', 'mol', 'pieces'];

export function ChemicalForm({ onSuccess, initialData }: ChemicalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ChemicalFormData>({
    defaultValues: initialData || {
      name: '',
      cas_number: '',
      smiles: '',
      initial_quantity: 0,
      initial_unit: 'g',
    },
  });

  const watchedQuantity = watch('initial_quantity');
  const watchedUnit = watch('initial_unit');

  const onSubmit = async (data: ChemicalFormData) => {
    if (!user) {
      setError('You must be logged in to add chemicals');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await chemicalsAPI.create(data);
      reset();
      setSuccess(`Chemical "${data.name}" added successfully! Unique ID: ${result.unique_id}`);
      
      // Call success callback after a delay to show success message
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add chemical');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* Chemical Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chemical Name *
          </label>
          <input
            type="text"
            id="name"
            {...register('name', { required: 'Chemical name is required' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., Acetone"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>

        {/* CAS Number */}
        <div>
          <label htmlFor="cas_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CAS Number *
          </label>
          <input
            type="text"
            id="cas_number"
            {...register('cas_number', { required: 'CAS number is required' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., 67-64-1"
          />
          {errors.cas_number && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cas_number.message}</p>
          )}
        </div>

        {/* SMILES */}
        <div>
          <label htmlFor="smiles" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            SMILES Notation *
          </label>
          <input
            type="text"
            id="smiles"
            {...register('smiles', { required: 'SMILES notation is required' })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="e.g., CC(=O)C"
          />
          {errors.smiles && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.smiles.message}</p>
          )}
        </div>

        {/* Quantity and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="initial_quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Initial Quantity
            </label>
            <input
              type="number"
              id="initial_quantity"
              step="0.01"
              min="0"
              {...register('initial_quantity', { 
                required: 'Quantity is required',
                min: { value: 0, message: 'Quantity must be positive' }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0.00"
            />
            {errors.initial_quantity && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.initial_quantity.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="initial_unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unit
            </label>
            <select
              id="initial_unit"
              {...register('initial_unit')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {UNITS.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity Preview */}
        {(watchedQuantity > 0) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <QrCode className="h-4 w-4" />
              <span>
                Chemical will be added with <strong>{watchedQuantity} {watchedUnit}</strong> initial stock
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isLoading ? 'Adding...' : 'Add Chemical'}
        </button>
      </div>
    </form>
  );
}