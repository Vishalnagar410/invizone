'use client';

import { ChemicalWithStock } from '@/types';
import { X, Beaker, MapPin, Barcode, Hash, Package, Calendar, User } from 'lucide-react';
import { RDKitEditor } from './RDKitEditor';
import { GHSPictograms } from './ghs-pictograms';

interface ChemicalDetailsModalProps {
  chemical: ChemicalWithStock;
  isOpen: boolean;
  onClose: () => void;
}

export function ChemicalDetailsModal({ chemical, isOpen, onClose }: ChemicalDetailsModalProps) {
  if (!isOpen) return null;

  const getLocationString = (chemical: ChemicalWithStock) => {
    if (!chemical.location) return 'Not set';
    
    const { room, rack, shelf, position } = chemical.location;
    const parts = [room, rack, shelf, position].filter(Boolean);
    return parts.join(' - ') || chemical.location.name;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Beaker className="h-5 w-5 text-blue-500" />
            Chemical Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Beaker className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Name</div>
                    <div className="font-medium text-gray-900 dark:text-white">{chemical.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">CAS Number</div>
                    <div className="font-mono text-gray-900 dark:text-white">{chemical.cas_number}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Barcode className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Barcode</div>
                    <div className="font-mono text-gray-900 dark:text-white">{chemical.barcode}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Location</div>
                    <div className="text-gray-900 dark:text-white">{getLocationString(chemical)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chemical Properties</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Molecular Formula</div>
                  <div className="font-medium text-gray-900 dark:text-white">{chemical.molecular_formula || 'N/A'}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Molecular Weight</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {chemical.molecular_weight ? `${chemical.molecular_weight.toFixed(2)} g/mol` : 'N/A'}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">InChIKey</div>
                  <div className="font-mono text-sm text-gray-900 dark:text-white break-all">{chemical.inchikey}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">SMILES</div>
                  <div className="font-mono text-sm text-gray-900 dark:text-white break-all">{chemical.smiles}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Structure Preview */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Chemical Structure</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <RDKitEditor
                initialSmiles={chemical.smiles}
                onSmilesChange={() => {}}
                readonly={true}
              />
            </div>
          </div>

          {/* Stock Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Stock Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Initial Quantity</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {chemical.initial_quantity} {chemical.initial_unit}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Quantity</div>
                <div className={`text-xl font-semibold ${
                  chemical.stock && chemical.stock.current_quantity <= chemical.stock.trigger_level
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {chemical.stock?.current_quantity || 0} {chemical.stock?.unit}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">Trigger Level</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {chemical.stock?.trigger_level || 0} {chemical.stock?.unit}
                </div>
              </div>
            </div>
          </div>

          {/* Hazard Information */}
          {chemical.hazardSummary && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Safety Information</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-4">
                  <GHSPictograms pictograms={chemical.hazardSummary.ghs_pictograms || []} size="md" />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    chemical.hazardSummary.risk_level === 'high' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : chemical.hazardSummary.risk_level === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {chemical.hazardSummary.risk_level} Risk
                  </span>
                </div>
                
                {chemical.hazardSummary.hazard_statements && chemical.hazardSummary.hazard_statements.length > 0 && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hazard Statements</div>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                      {chemical.hazardSummary.hazard_statements.map((stmt, index) => (
                        <li key={index}>{stmt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usage History */}
          {chemical.usage_history && chemical.usage_history.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Usage History</h3>
              <div className="space-y-2">
                {chemical.usage_history.slice(0, 5).map((usage) => (
                  <div key={usage.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        -{usage.quantity_used} {usage.unit}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(usage.used_at).toLocaleDateString()} • {usage.notes}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <User className="h-3 w-3 inline mr-1" />
                      User {usage.used_by}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}