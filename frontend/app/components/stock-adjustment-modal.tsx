'use client';

import { useState } from 'react';
import { ChemicalWithStock, StockAdjustmentFormData, ADJUSTMENT_REASONS } from '@/types';
import { stockAdjustmentsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { X, Save, Calculator, AlertTriangle } from 'lucide-react';

interface StockAdjustmentModalProps {
  chemical: ChemicalWithStock;
  isOpen: boolean;
  onClose: () => void;
}

export function StockAdjustmentModal({ chemical, isOpen, onClose }: StockAdjustmentModalProps) {
  const { user } = useAuth();
  const [adjustmentType, setAdjustmentType] = useState<'increment' | 'decrement' | 'set'>('increment');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<typeof ADJUSTMENT_REASONS[number]>('Correction');
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const calculateNewQuantity = (): number => {
    const currentQty = chemical.stock?.current_quantity || 0;
    const adjustmentAmount = parseFloat(amount) || 0;

    switch (adjustmentType) {
      case 'increment':
        return currentQty + adjustmentAmount;
      case 'decrement':
        return currentQty - adjustmentAmount;
      case 'set':
        return adjustmentAmount;
      default:
        return currentQty;
    }
  };

  const getChangeAmount = (): number => {
    const currentQty = chemical.stock?.current_quantity || 0;
    const newQty = calculateNewQuantity();
    return newQty - currentQty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const newQuantity = calculateNewQuantity();
    if (newQuantity < 0) {
      setError('Quantity cannot be negative');
      return;
    }

    const changeAmount = getChangeAmount();

    setIsLoading(true);
    setError('');

    try {
      const adjustmentData: StockAdjustmentFormData = {
        chemical_id: chemical.id,
        after_quantity: newQuantity,
        change_amount: changeAmount,
        reason: reason,
        note: note || undefined
      };

      await stockAdjustmentsAPI.create(adjustmentData);
      onClose();
      
      // Reset form
      setAmount('');
      setNote('');
      setReason('Correction');
      setAdjustmentType('increment');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record adjustment');
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuantity = chemical.stock?.current_quantity || 0;
  const newQuantity = calculateNewQuantity();
  const changeAmount = getChangeAmount();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="h-5 w-5 text-orange-500" />
            Adjust Stock
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

          {/* Chemical Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Chemical
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
              <div className="font-medium text-gray-900 dark:text-white">{chemical.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                CAS: {chemical.cas_number} | Current: {currentQuantity} {chemical.stock?.unit}
              </div>
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('increment')}
                className={`p-2 rounded border text-sm font-medium ${
                  adjustmentType === 'increment'
                    ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200'
                    : 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Add Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('decrement')}
                className={`p-2 rounded border text-sm font-medium ${
                  adjustmentType === 'decrement'
                    ? 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200'
                    : 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Remove Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('set')}
                className={`p-2 rounded border text-sm font-medium ${
                  adjustmentType === 'set'
                    ? 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
                    : 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
                }`}
              >
                Set Quantity
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {adjustmentType === 'set' ? 'New Quantity' : 'Amount'} *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
                required
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {chemical.stock?.unit}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason *
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof ADJUSTMENT_REASONS[number])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              {ADJUSTMENT_REASONS.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note (Optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Reason for adjustment, details, etc."
            />
          </div>

          {/* Preview */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Adjustment Preview</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-700 dark:text-blue-300">Current Quantity</div>
                <div className="font-medium">{currentQuantity} {chemical.stock?.unit}</div>
              </div>
              <div>
                <div className="text-blue-700 dark:text-blue-300">New Quantity</div>
                <div className="font-medium">{newQuantity} {chemical.stock?.unit}</div>
              </div>
              <div>
                <div className="text-blue-700 dark:text-blue-300">Change</div>
                <div className={`font-medium ${
                  changeAmount > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : changeAmount < 0 
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {changeAmount > 0 ? '+' : ''}{changeAmount} {chemical.stock?.unit}
                </div>
              </div>
              <div>
                <div className="text-blue-700 dark:text-blue-300">Type</div>
                <div className="font-medium capitalize">{adjustmentType}</div>
              </div>
            </div>
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
              className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              Record Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}