// frontend/app/components/enhanced-stock-table.tsx - FIXED VERSION
'use client';

import { useState, useEffect } from 'react';
import { ChemicalWithStock, User, StockAdjustment, UsageHistory } from '@/types';
import { useAuth } from '@/lib/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  RefreshCw, Wifi, WifiOff, AlertTriangle, Package, Eye, 
  Edit, Trash2, Download, Filter, Search, User as UserIcon,
  Beaker, MapPin, Calendar, BarChart3, FileText, Shield,
  Plus, Minus, History, QrCode
} from 'lucide-react';
import { chemicalsAPI, stockAdjustmentsAPI, usersAPI, msdsAPI, barcodesAPI } from '@/lib/api';

interface EnhancedStockTableProps {
  initialChemicals: ChemicalWithStock[];
  onChemicalUpdate?: (chemicals: ChemicalWithStock[]) => void;
  onEditChemical?: (chemical: ChemicalWithStock) => void;
  onDeleteChemical?: (chemical: ChemicalWithStock) => void;
}

export function EnhancedStockTable({ 
  initialChemicals, 
  onChemicalUpdate,
  onEditChemical,
  onDeleteChemical 
}: EnhancedStockTableProps) {
  const [chemicals, setChemicals] = useState<ChemicalWithStock[]>(initialChemicals);
  const [filteredChemicals, setFilteredChemicals] = useState<ChemicalWithStock[]>(initialChemicals);
  const [selectedChemical, setSelectedChemical] = useState<ChemicalWithStock | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low-stock' | 'out-of-stock'>('all');
  const [sortField, setSortField] = useState<'name' | 'current_quantity' | 'location'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'stock-history' | 'usage-history' | 'safety'>('details');

  const { user } = useAuth();
  const { isConnected, latestChemical, latestStockAdjustment, connectionStatus, reconnect } = useWebSocket();

  // Update chemicals when new data arrives via WebSocket
  useEffect(() => {
    if (latestChemical) {
      setChemicals(prev => {
        const updated = prev.map(chem => 
          chem.id === latestChemical.id ? { ...chem, ...latestChemical } : chem
        );
        
        if (!prev.find(chem => chem.id === latestChemical.id)) {
          updated.unshift(latestChemical);
        }
        
        onChemicalUpdate?.(updated);
        return updated;
      });
    }
  }, [latestChemical, onChemicalUpdate]);

  // Handle stock adjustments
  useEffect(() => {
    if (latestStockAdjustment) {
      setChemicals(prev => 
        prev.map(chem => {
          if (chem.id === latestStockAdjustment.chemical_id) {
            return {
              ...chem,
              stock: chem.stock ? {
                ...chem.stock,
                current_quantity: latestStockAdjustment.after_quantity
              } : {
                current_quantity: latestStockAdjustment.after_quantity,
                unit: 'g',
                trigger_level: 10,
                last_updated: new Date().toISOString()
              }
            };
          }
          return chem;
        })
      );
    }
  }, [latestStockAdjustment]);

  // Filter and sort chemicals
  useEffect(() => {
    let filtered = chemicals;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(chem =>
        chem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chem.cas_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chem.molecular_formula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chem.location?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply stock filter
    if (filter === 'low-stock') {
      filtered = filtered.filter(chem => 
        chem.stock && chem.stock.current_quantity <= (chem.minimum_quantity || 10)
      );
    } else if (filter === 'out-of-stock') {
      filtered = filtered.filter(chem => 
        chem.stock && chem.stock.current_quantity <= 0
      );
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'current_quantity':
          aValue = a.stock?.current_quantity || 0;
          bValue = b.stock?.current_quantity || 0;
          break;
        case 'location':
          aValue = a.location?.name || '';
          bValue = b.location?.name || '';
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredChemicals(filtered);
  }, [chemicals, searchTerm, filter, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'current_quantity' | 'location') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewDetails = async (chemical: ChemicalWithStock) => {
    setSelectedChemical(chemical);
    setIsDetailsModalOpen(true);
    setActiveTab('details');
    
    // Load additional data for the modal
    try {
      const adjustments = await stockAdjustmentsAPI.getChemicalAdjustments(chemical.id);
      setStockAdjustments(adjustments);
      
      // For now, set empty usage history since the API method might not exist
      setUsageHistory([]);
      
      // If you want to implement usage history later, you can add:
      // try {
      //   const usage = await stockAPI.getUsageHistory(chemical.id);
      //   setUsageHistory(usage);
      // } catch (error) {
      //   console.warn('Usage history API not available');
      //   setUsageHistory([]);
      // }
    } catch (error) {
      console.error('Error loading additional data:', error);
      setStockAdjustments([]);
      setUsageHistory([]);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const updatedChemicals = await chemicalsAPI.getAll();
      setChemicals(updatedChemicals);
      onChemicalUpdate?.(updatedChemicals);
    } catch (error) {
      console.error('Error refreshing chemicals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (chemicalId: number, adjustment: number) => {
    if (!user || user.role !== 'admin') return;

    try {
      const chemical = chemicals.find(c => c.id === chemicalId);
      if (!chemical || !chemical.stock) return;

      const newQuantity = Math.max(0, chemical.stock.current_quantity + adjustment);
      
      await stockAdjustmentsAPI.create({
        chemical_id: chemicalId,
        after_quantity: newQuantity,
        change_amount: adjustment,
        reason: adjustment > 0 ? 'Received' : 'Usage',
        note: `Quick adjustment: ${adjustment > 0 ? '+' : ''}${adjustment}`
      });

      // Refresh data
      handleRefresh();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  const getStockStatus = (chemical: ChemicalWithStock) => {
    if (!chemical.stock) return 'unknown';
    if (chemical.stock.current_quantity <= 0) return 'out-of-stock';
    if (chemical.stock.current_quantity <= (chemical.minimum_quantity || 10)) return 'low-stock';
    return 'in-stock';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out-of-stock': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'low-stock': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'in-stock': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out-of-stock': return <AlertTriangle className="h-4 w-4" />;
      case 'low-stock': return <AlertTriangle className="h-4 w-4" />;
      case 'in-stock': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Live Updates';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status & Controls */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor()}`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4" />
            ) : connectionStatus === 'error' ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
            {getConnectionStatusText()}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {connectionStatus !== 'connected' && (
            <button
              onClick={reconnect}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search chemicals by name, CAS, formula, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('low-stock')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'low-stock'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilter('out-of-stock')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'out-of-stock'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Chemical
                    {sortField === 'name' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  CAS Number
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center gap-1">
                    Location
                    {sortField === 'location' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('current_quantity')}
                >
                  <div className="flex items-center gap-1">
                    Current Stock
                    {sortField === 'current_quantity' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Min Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredChemicals.map((chemical) => {
                const status = getStockStatus(chemical);
                return (
                  <tr 
                    key={chemical.id} 
                    className={`
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${latestChemical?.id === chemical.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <Beaker className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {chemical.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {chemical.molecular_formula || 'No formula'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                      {chemical.cas_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {chemical.location?.name || 'No Location'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {chemical.stock?.current_quantity || 0} {chemical.stock?.unit || 'g'}
                        </div>
                        {user?.role === 'admin' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAdjustStock(chemical.id, 1)}
                              className="p-1 text-green-600 hover:text-green-700 transition-colors"
                              title="Add 1 unit"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleAdjustStock(chemical.id, -1)}
                              className="p-1 text-red-600 hover:text-red-700 transition-colors"
                              title="Remove 1 unit"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {chemical.minimum_quantity || 10} {chemical.stock?.unit || 'g'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-1">
                          {status === 'out-of-stock' ? 'Out of Stock' : 
                           status === 'low-stock' ? 'Low Stock' : 'In Stock'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(chemical)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => onEditChemical?.(chemical)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              title="Edit Chemical"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteChemical?.(chemical)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete Chemical"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredChemicals.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No chemicals match your search' : 'No chemicals found'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chemical Details Modal */}
      {isDetailsModalOpen && selectedChemical && (
        <ChemicalDetailsModal
          chemical={selectedChemical}
          stockAdjustments={stockAdjustments}
          usageHistory={usageHistory}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setIsDetailsModalOpen(false)}
          userRole={user?.role}
        />
      )}
    </div>
  );
}

// Chemical Details Modal Component
interface ChemicalDetailsModalProps {
  chemical: ChemicalWithStock;
  stockAdjustments: StockAdjustment[];
  usageHistory: UsageHistory[];
  activeTab: string;
  onTabChange: (tab: 'details' | 'stock-history' | 'usage-history' | 'safety') => void;
  onClose: () => void;
  userRole?: string;
}

function ChemicalDetailsModal({
  chemical,
  stockAdjustments,
  usageHistory,
  activeTab,
  onTabChange,
  onClose,
  userRole
}: ChemicalDetailsModalProps) {
  const [hazardSummary, setHazardSummary] = useState<any>(null);

  useEffect(() => {
    const loadHazardSummary = async () => {
      try {
        const summary = await msdsAPI.getHazardSummary(chemical.id);
        setHazardSummary(summary);
      } catch (error) {
        console.error('Error loading hazard summary:', error);
      }
    };

    loadHazardSummary();
  }, [chemical.id]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {chemical.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              CAS: {chemical.cas_number} | {chemical.molecular_formula}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Details', icon: Beaker },
              { id: 'stock-history', label: 'Stock History', icon: History },
              { id: 'usage-history', label: 'Usage History', icon: BarChart3 },
              { id: 'safety', label: 'Safety', icon: Shield }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <DetailsTab chemical={chemical} userRole={userRole} />
          )}

          {activeTab === 'stock-history' && (
            <StockHistoryTab adjustments={stockAdjustments} />
          )}

          {activeTab === 'usage-history' && (
            <UsageHistoryTab usageHistory={usageHistory} />
          )}

          {activeTab === 'safety' && (
            <SafetyTab chemical={chemical} hazardSummary={hazardSummary} />
          )}
        </div>
      </div>
    </div>
  );
}

// Tab Components
function DetailsTab({ chemical, userRole }: { chemical: ChemicalWithStock; userRole?: string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
          <div className="space-y-2">
            <InfoRow label="Chemical Name" value={chemical.name} />
            <InfoRow label="CAS Number" value={chemical.cas_number} />
            <InfoRow label="Molecular Formula" value={chemical.molecular_formula} />
            <InfoRow label="Molecular Weight" value={chemical.molecular_weight ? `${chemical.molecular_weight} g/mol` : 'N/A'} />
            <InfoRow label="SMILES" value={chemical.smiles} />
            <InfoRow label="Canonical SMILES" value={chemical.canonical_smiles} />
            <InfoRow label="InChIKey" value={chemical.inchikey} />
          </div>
        </div>

        {/* Stock Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stock Information</h3>
          <div className="space-y-2">
            <InfoRow label="Current Quantity" value={`${chemical.stock?.current_quantity || 0} ${chemical.stock?.unit || 'g'}`} />
            <InfoRow label="Minimum Quantity" value={`${chemical.minimum_quantity || 10} ${chemical.stock?.unit || 'g'}`} />
            <InfoRow label="Last Updated" value={chemical.stock?.last_updated ? new Date(chemical.stock.last_updated).toLocaleString() : 'N/A'} />
            <InfoRow label="Storage Condition" value={chemical.storage_condition || 'RT'} />
            <InfoRow label="Location" value={chemical.location?.name || 'No Location'} />
            {chemical.location && (
              <InfoRow label="Location Hierarchy" value={[
                chemical.location.department,
                chemical.location.lab_name,
                chemical.location.room,
                chemical.location.shelf,
                chemical.location.rack,
                chemical.location.position
              ].filter(Boolean).join(' → ')} />
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      {chemical.description && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description & Notes</h3>
          <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            {chemical.description}
          </p>
        </div>
      )}

      {/* Quick Actions for Admin */}
      {userRole === 'admin' && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Edit className="h-4 w-4" />
              Edit Chemical
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <QrCode className="h-4 w-4" />
              Generate Barcode
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <Trash2 className="h-4 w-4" />
              Delete Chemical
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StockHistoryTab({ adjustments }: { adjustments: StockAdjustment[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock Adjustment History</h3>
      {adjustments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No stock adjustments recorded</p>
      ) : (
        <div className="space-y-3">
          {adjustments.map((adjustment) => (
            <div key={adjustment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {adjustment.reason}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {adjustment.note || 'No note provided'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(adjustment.timestamp).toLocaleString()}
                </div>
              </div>
              <div className={`text-lg font-mono ${
                adjustment.change_amount > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {adjustment.change_amount > 0 ? '+' : ''}{adjustment.change_amount}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsageHistoryTab({ usageHistory }: { usageHistory: UsageHistory[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage History</h3>
      {usageHistory.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No usage history recorded</p>
      ) : (
        <div className="space-y-3">
          {usageHistory.map((usage) => (
            <div key={usage.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Used {usage.quantity_used} {usage.unit}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {usage.notes || 'No notes provided'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    By {usage.user?.full_name || 'Unknown'} • {new Date(usage.used_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SafetyTab({ chemical, hazardSummary }: { chemical: ChemicalWithStock; hazardSummary: any }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Safety Information</h3>
      
      {hazardSummary ? (
        <div className="space-y-4">
          {/* Risk Level */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Level:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(hazardSummary.risk_level)}`}>
              {hazardSummary.risk_level?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          {/* Hazard Counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 text-center">
                {hazardSummary.hazard_count || 0}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 text-center">Hazards</div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 text-center">
                {hazardSummary.precaution_count || 0}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300 text-center">Precautions</div>
            </div>
          </div>

          {/* GHS Pictograms */}
          {hazardSummary.ghs_pictograms && hazardSummary.ghs_pictograms.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">GHS Pictograms</h4>
              <div className="flex gap-2 flex-wrap">
                {hazardSummary.ghs_pictograms.map((pictogram: string) => (
                  <div
                    key={pictogram}
                    className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium"
                  >
                    {pictogram}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No safety data available</p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Fetch MSDS Data
          </button>
        </div>
      )}

      {/* MSDS Link */}
      {chemical.msds && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Material Safety Data Sheet</h4>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              MSDS available - {chemical.msds.source_url ? (
                <a href={chemical.msds.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                  View source
                </a>
              ) : 'Source not specified'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="text-sm text-gray-900 dark:text-white text-right">{value || 'N/A'}</span>
    </div>
  );
}

function getRiskLevelColor(level: string) {
  switch (level) {
    case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}