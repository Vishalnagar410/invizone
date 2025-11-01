'use client';

import { ChemicalWithStock } from '@/types';
import { Beaker, AlertTriangle, FileText, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { GHSPictograms } from './ghs-pictograms';

interface ChemicalCardProps {
  chemical: ChemicalWithStock;
  onSelect?: (chemical: ChemicalWithStock) => void;
  showActions?: boolean;
  onEdit?: (chemical: ChemicalWithStock) => void;
  onDelete?: (chemical: ChemicalWithStock) => void;
}

export function ChemicalCard({ 
  chemical, 
  onSelect, 
  showActions = true,
  onEdit,
  onDelete 
}: ChemicalCardProps) {
  const { user } = useAuth();
  const isLowStock = chemical.stock && chemical.stock.current_quantity <= chemical.stock.trigger_level;

  const handleCardClick = () => {
    onSelect?.(chemical);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(chemical);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(chemical);
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 cursor-pointer transition-all hover:shadow-lg ${
        isLowStock ? 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900/10' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <Beaker className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-1">
            {chemical.name}
          </h3>
        </div>
        
        {isLowStock && (
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
        )}
      </div>

      {/* Chemical Info */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">CAS:</span>
          <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono">
            {chemical.cas_number || 'N/A'}
          </span>
        </div>
        
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">Formula:</span>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            {chemical.molecular_formula || 'N/A'}
          </span>
        </div>
        
        <div>
          <span className="font-medium text-gray-700 dark:text-gray-300">MW:</span>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            {chemical.molecular_weight ? `${chemical.molecular_weight.toFixed(2)} g/mol` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Stock Info */}
      {chemical.stock && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Stock:
            </span>
            <span className={`text-sm font-mono ${
              isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {chemical.stock.current_quantity} {chemical.stock.unit}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Trigger:
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {chemical.stock.trigger_level} {chemical.stock.unit}
            </span>
          </div>
          
          {/* Stock Progress Bar */}
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Stock Level</span>
              <span>
                {((chemical.stock.current_quantity / chemical.stock.trigger_level) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-600">
              <div 
                className={`h-2 rounded-full ${
                  isLowStock ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{
                  width: `${Math.min(100, (chemical.stock.current_quantity / chemical.stock.trigger_level) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hazard Indicators */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GHSPictograms 
            pictograms={chemical.hazardSummary?.ghs_pictograms || []} 
            size="sm" 
          />
          {chemical.hazardSummary && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              chemical.hazardSummary.risk_level === 'high' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : chemical.hazardSummary.risk_level === 'medium'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {chemical.hazardSummary.risk_level}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-2">
          {chemical.msds && (
            <FileText className="h-4 w-4 text-green-600" />
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(chemical.created_at).toLocaleDateString()}
          </span>
        </div>

        {showActions && user?.role === 'admin' && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit chemical"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete chemical"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Low Stock Warning */}
      {isLowStock && (
        <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Low stock - reorder needed</span>
        </div>
      )}
    </div>
  );
}