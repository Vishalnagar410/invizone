'use client';

import { useState, useEffect } from 'react';
import { ChemicalWithStock } from '@/types';
import { chemicalsAPI, stockAPI, locationsAPI, barcodesAPI, stockAdjustmentsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { 
  Search, Filter, Edit, Save, X, AlertTriangle, 
  Package, Beaker, MapPin, Barcode, Hash, Eye,
  MinusCircle, History, QrCode, Download, MoreVertical,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { ChemicalUsageModal } from './chemical-usage-modal';
import { ChemicalDetailsModal } from './chemical-details-modal';
import { StockAdjustmentModal } from './stock-adjustment-modal';

interface ChemicalStockTableProps {
  chemicals: ChemicalWithStock[];
  onUpdate: () => void;
}

export function ChemicalStockTable({ chemicals, onUpdate }: ChemicalStockTableProps) {
  const { user } = useAuth();
  const [filteredChemicals, setFilteredChemicals] = useState<ChemicalWithStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    lowStock: false,
    hasLocation: false,
    locationId: null as number | null,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<ChemicalWithStock>>({});
  const [selectedChemical, setSelectedChemical] = useState<ChemicalWithStock | null>(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [barcodeLoading, setBarcodeLoading] = useState<number | null>(null);

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locationsData = await locationsAPI.getAll(0, 100);
        setLocations(locationsData);
      } catch (error) {
        console.error('Failed to load locations:', error);
      }
    };
    loadLocations();
  }, []);

  // Filter chemicals based on search and filters
  useEffect(() => {
    let result = chemicals;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(chemical => 
        chemical.name.toLowerCase().includes(term) ||
        chemical.cas_number.toLowerCase().includes(term) ||
        chemical.location?.name?.toLowerCase().includes(term) ||
        chemical.molecular_formula?.toLowerCase().includes(term)
      );
    }
    
    // Apply low stock filter
    if (filters.lowStock) {
      result = result.filter(chemical => 
        chemical.stock && chemical.stock.current_quantity <= chemical.stock.trigger_level
      );
    }
    
    // Apply location filter
    if (filters.hasLocation) {
      result = result.filter(chemical => chemical.location);
    }
    
    // Apply specific location filter
    if (filters.locationId) {
      result = result.filter(chemical => chemical.location_id === filters.locationId);
    }
    
    setFilteredChemicals(result);
  }, [chemicals, searchTerm, filters]);

  const handleEdit = (chemical: ChemicalWithStock) => {
    setEditingId(chemical.id);
    setEditForm({
      ...chemical,
      stock: chemical.stock ? { ...chemical.stock } : undefined
    });
  };

  const handleSave = async (chemicalId: number) => {
  try {
    if (editForm.stock) {
      await stockAPI.update(chemicalId, {
        current_quantity: editForm.stock.current_quantity,
        unit: editForm.stock.unit,
        trigger_level: editForm.stock.trigger_level
      });
    }
    
    // Update location if changed - convert null to undefined
    if (editForm.location_id !== undefined) {
      await chemicalsAPI.update(chemicalId, {
        location_id: editForm.location_id || undefined // Convert null to undefined
      });
    }
    
    setEditingId(null);
    setEditForm({});
    onUpdate();
  } catch (error) {
    console.error('Failed to update:', error);
    alert('Failed to update chemical');
  }
};

  function handleCancel() {
    setEditingId(null);
    setEditForm({});
  }

  const handleRecordUsage = (chemical: ChemicalWithStock) => {
    setSelectedChemical(chemical);
    setShowUsageModal(true);
  };

  const handleViewDetails = (chemical: ChemicalWithStock) => {
    setSelectedChemical(chemical);
    setShowDetailsModal(true);
  };

  const handleAdjustStock = (chemical: ChemicalWithStock) => {
    setSelectedChemical(chemical);
    setShowAdjustmentModal(true);
  };

  const handleGenerateBarcode = async (chemicalId: number) => {
    setBarcodeLoading(chemicalId);
    try {
      await barcodesAPI.generateBarcodes(chemicalId);
      alert('Barcode generation started. Check back in a moment.');
      onUpdate(); // Refresh to show barcode status
    } catch (error) {
      console.error('Failed to generate barcode:', error);
      alert('Failed to generate barcode');
    } finally {
      setBarcodeLoading(null);
    }
  };

  const handleDownloadBarcode = async (chemicalId: number, barcodeType: string) => {
    try {
      const response = await barcodesAPI.downloadBarcode(chemicalId, barcodeType);
      
      // Create download link
      const link = document.createElement('a');
      link.href = `data:${response.content_type};base64,${response.content}`;
      link.download = response.filename;
      link.click();
    } catch (error) {
      console.error('Failed to download barcode:', error);
      alert('Failed to download barcode');
    }
  };

  const toggleRowExpansion = (chemicalId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(chemicalId)) {
      newExpanded.delete(chemicalId);
    } else {
      newExpanded.add(chemicalId);
    }
    setExpandedRows(newExpanded);
  };

  const isLowStock = (chemical: ChemicalWithStock) => {
    return chemical.stock && chemical.stock.current_quantity <= chemical.stock.trigger_level;
  };

  const getLocationString = (chemical: ChemicalWithStock) => {
    if (!chemical.location) return 'Not set';
    
    const { department, lab_name, room, shelf, rack, position } = chemical.location;
    const parts = [department, lab_name, room, shelf, rack, position].filter(Boolean);
    return parts.join(' → ') || chemical.location.name;
  };

  const getStorageCondition = (chemical: ChemicalWithStock) => {
    if (!chemical.location) return 'N/A';
    
    const { storage_conditions, custom_storage_condition } = chemical.location;
    return storage_conditions === 'Custom' ? custom_storage_condition : storage_conditions;
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, CAS, location, formula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Enhanced Filters */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Low Stock
              </span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.hasLocation}
                onChange={(e) => setFilters(prev => ({ ...prev, hasLocation: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Has Location
              </span>
            </label>

            {/* Location Filter Dropdown */}
            <div className="relative">
              <select
                value={filters.locationId || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  locationId: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Locations</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-8">
                  {/* Expand/collapse column */}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Chemical & Structure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <Barcode className="h-4 w-4 inline mr-1" />
                  Barcode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <Hash className="h-4 w-4 inline mr-1" />
                  CAS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <Package className="h-4 w-4 inline mr-1" />
                  Current Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Trigger Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredChemicals.map((chemical) => (
                <>
                  <tr 
                    key={chemical.id} 
                    className={`
                      hover:bg-gray-50 dark:hover:bg-gray-700 
                      ${isLowStock(chemical) ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500' : ''}
                    `}
                  >
                    {/* Expand/Collapse Button */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRowExpansion(chemical.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {expandedRows.has(chemical.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    {/* Chemical Name & Structure */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                          {chemical.smiles ? (
                            <div className="chemical-structure-preview">
                              {/* RDKit structure preview would go here */}
                              <Beaker className="h-6 w-6 text-blue-500" />
                            </div>
                          ) : (
                            <Beaker className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {chemical.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {chemical.molecular_formula}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            MW: {chemical.molecular_weight?.toFixed(2) || 'N/A'} g/mol
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4">
                      {editingId === chemical.id ? (
                        <select
                          value={editForm.location_id || ''}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            location_id: e.target.value ? parseInt(e.target.value) : null
                          }))}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                        >
                          <option value="">No Location</option>
                          {locations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {getLocationString(chemical)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {getStorageCondition(chemical)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Barcode */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900 dark:text-white font-mono">
                          {chemical.barcode}
                        </div>
                        <div className="flex gap-1">
                          {chemical.barcode_images && chemical.barcode_images.length > 0 ? (
                            <>
                              <button
                                onClick={() => handleDownloadBarcode(chemical.id, 'code128')}
                                className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                                title="Download Code128"
                              >
                                📄
                              </button>
                              <button
                                onClick={() => handleDownloadBarcode(chemical.id, 'qr')}
                                className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                                title="Download QR"
                              >
                                📱
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleGenerateBarcode(chemical.id)}
                              disabled={barcodeLoading === chemical.id}
                              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                              {barcodeLoading === chemical.id ? '...' : 'Generate'}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* CAS Number */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                      {chemical.cas_number}
                    </td>

                    {/* Current Quantity */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === chemical.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editForm.stock?.current_quantity || 0}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              stock: { ...prev.stock!, current_quantity: parseFloat(e.target.value) }
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {chemical.stock?.unit}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            isLowStock(chemical) 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {chemical.stock?.current_quantity || 0}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {chemical.stock?.unit}
                          </span>
                          {isLowStock(chemical) && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Trigger Level */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === chemical.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editForm.stock?.trigger_level || 0}
                            onChange={(e) => setEditForm(prev => ({
                              ...prev,
                              stock: { ...prev.stock!, trigger_level: parseFloat(e.target.value) }
                            }))}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {chemical.stock?.unit}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {chemical.stock?.trigger_level} {chemical.stock?.unit}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => handleViewDetails(chemical)}
                          className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Record Usage */}
                        <button
                          onClick={() => handleRecordUsage(chemical)}
                          className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                          title="Record usage"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>

                        {/* Stock Adjustment */}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleAdjustStock(chemical)}
                            className="text-orange-600 hover:text-orange-900 dark:hover:text-orange-400"
                            title="Adjust stock"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        )}

                        {/* Edit (Admin only) */}
                        {user?.role === 'admin' && (
                          editingId === chemical.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSave(chemical.id)}
                                className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="text-gray-600 hover:text-gray-900 dark:hover:text-gray-400"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(chemical)}
                              className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                              title="Edit stock"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row Content */}
                  {expandedRows.has(chemical.id) && (
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                          {/* Chemical Details */}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Chemical Details</h4>
                            <div className="space-y-1">
                              <div><span className="text-gray-500">SMILES:</span> {chemical.smiles}</div>
                              <div><span className="text-gray-500">InChIKey:</span> {chemical.inchikey}</div>
                              <div><span className="text-gray-500">Initial Quantity:</span> {chemical.initial_quantity} {chemical.initial_unit}</div>
                            </div>
                          </div>

                          {/* Recent Activity */}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Activity</h4>
                            {chemical.usage_history && chemical.usage_history.length > 0 ? (
                              <div className="space-y-1">
                                {chemical.usage_history.slice(0, 3).map(usage => (
                                  <div key={usage.id} className="flex justify-between text-xs">
                                    <span>-{usage.quantity_used} {usage.unit}</span>
                                    <span className="text-gray-500">
                                      {new Date(usage.used_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-xs">No recent usage</div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {filteredChemicals.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No chemicals found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || Object.values(filters).some(Boolean) 
                ? 'Try adjusting your search or filters'
                : 'No chemicals in inventory'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedChemical && (
        <>
          <ChemicalUsageModal
            chemical={selectedChemical}
            isOpen={showUsageModal}
            onClose={() => {
              setShowUsageModal(false);
              setSelectedChemical(null);
              onUpdate();
            }}
          />
          
          <ChemicalDetailsModal
            chemical={selectedChemical}
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedChemical(null);
            }}
          />

          <StockAdjustmentModal
            chemical={selectedChemical}
            isOpen={showAdjustmentModal}
            onClose={() => {
              setShowAdjustmentModal(false);
              setSelectedChemical(null);
              onUpdate();
            }}
          />
        </>
      )}
    </div>
  );
}