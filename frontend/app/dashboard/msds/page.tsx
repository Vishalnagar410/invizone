// frontend/app/dashboard/msds/page.tsx - COMPLETE FIXED VERSION
'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, Download, RefreshCw, AlertTriangle, Shield, 
  Upload, Search, Filter, BarChart3, CheckCircle, XCircle,
  Users, Calendar, Eye
} from 'lucide-react';
import { ChemicalWithStock, MSDS, HazardSummary, User } from '@/types';
import { chemicalsAPI, msdsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ChemicalCard } from '../../components/chemical-card';
import { GHSPictograms } from '../../components/ghs-pictograms';

interface ChemicalWithMSDS extends ChemicalWithStock {
  msds: MSDS | null;
  hazardSummary?: HazardSummary;
  uploadedFiles?: any[];
}

export default function MSDSPage() {
  const [chemicals, setChemicals] = useState<ChemicalWithMSDS[]>([]);
  const [filteredChemicals, setFilteredChemicals] = useState<ChemicalWithMSDS[]>([]);
  const [selectedChemical, setSelectedChemical] = useState<ChemicalWithMSDS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMSDS, setIsFetchingMSDS] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [msdsFilter, setMsdsFilter] = useState<'all' | 'with-msds' | 'without-msds'>('all');
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chemicals'>('overview');

  const { user } = useAuth();

  const riskLevelColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  };

  const riskLevelIcons = {
    high: AlertTriangle,
    medium: AlertTriangle,
    low: Shield,
    unknown: FileText
  };

  const loadChemicalsWithMSDS = async () => {
    setIsLoading(true);
    try {
      // Load chemicals
      const chemicalsData = await chemicalsAPI.getAll();
      
      // Load MSDS stats
      const statsData = await msdsAPI.getMSDSStats();
      setStats(statsData);

      // Load MSDS data for each chemical
      const chemicalsWithMSDS = await Promise.all(
        chemicalsData.map(async (chemical) => {
          try {
            const msds = await msdsAPI.getByChemicalId(chemical.id);
            const hazardSummary = await msdsAPI.getHazardSummary(chemical.id);
            const uploadedFiles = await msdsAPI.getMSDSFiles(chemical.id);
            
            return {
              ...chemical,
              msds,
              hazardSummary,
              uploadedFiles
            };
          } catch (error) {
            // MSDS not available for this chemical
            return {
              ...chemical,
              msds: null,
              hazardSummary: undefined,
              uploadedFiles: []
            };
          }
        })
      );
      
      setChemicals(chemicalsWithMSDS);
    } catch (error) {
      console.error('Failed to load chemicals with MSDS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter chemicals based on search and filters
  useEffect(() => {
    let filtered = chemicals;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(chem =>
        chem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chem.cas_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chem.molecular_formula?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(chem => 
        chem.hazardSummary?.risk_level === riskFilter
      );
    }

    // Apply MSDS filter
    if (msdsFilter === 'with-msds') {
      filtered = filtered.filter(chem => chem.msds !== null);
    } else if (msdsFilter === 'without-msds') {
      filtered = filtered.filter(chem => chem.msds === null);
    }

    setFilteredChemicals(filtered);
  }, [chemicals, searchTerm, riskFilter, msdsFilter]);

  const handleFetchMSDS = async (chemicalId: number) => {
    setIsFetchingMSDS(chemicalId);
    try {
      await msdsAPI.fetchMSDS(chemicalId);
      // Reload the data after fetching
      setTimeout(() => {
        loadChemicalsWithMSDS();
        setIsFetchingMSDS(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to fetch MSDS:', error);
      alert('Failed to fetch MSDS data. Please try again.');
      setIsFetchingMSDS(null);
    }
  };

  const handleUploadMSDS = async (chemicalId: number, file: File) => {
    if (!file) return;

    setUploadingFile(chemicalId);
    try {
      await msdsAPI.uploadMSDS(chemicalId, file);
      alert('MSDS file uploaded successfully!');
      loadChemicalsWithMSDS();
    } catch (error) {
      console.error('Failed to upload MSDS:', error);
      alert('Failed to upload MSDS file. Please try again.');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleRefreshMSDS = async (chemicalId: number) => {
    try {
      await msdsAPI.refreshMSDS(chemicalId);
      alert('MSDS refresh initiated. Data will be updated shortly.');
      setTimeout(loadChemicalsWithMSDS, 2000);
    } catch (error) {
      console.error('Failed to refresh MSDS:', error);
      alert('Failed to refresh MSDS data.');
    }
  };

  const handleFileUpload = (chemicalId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadMSDS(chemicalId, file);
    }
    // Reset input
    event.target.value = '';
  };

  useEffect(() => {
    loadChemicalsWithMSDS();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">MSDS Library</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Material Safety Data Sheets and hazard information management
          </p>
        </div>
        
        <button
          onClick={loadChemicalsWithMSDS}
          className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'chemicals', label: 'Chemicals', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
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

      {activeTab === 'overview' && (
        <OverviewTab 
          stats={stats} 
          chemicals={chemicals}
          riskLevelColors={riskLevelColors}
          riskLevelIcons={riskLevelIcons}
        />
      )}

      {activeTab === 'chemicals' && (
        <ChemicalsTab
          chemicals={filteredChemicals}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          msdsFilter={msdsFilter}
          setMsdsFilter={setMsdsFilter}
          selectedChemical={selectedChemical}
          setSelectedChemical={setSelectedChemical}
          isFetchingMSDS={isFetchingMSDS}
          uploadingFile={uploadingFile}
          handleFetchMSDS={handleFetchMSDS}
          handleFileUpload={handleFileUpload}
          handleRefreshMSDS={handleRefreshMSDS}
          user={user}
          riskLevelColors={riskLevelColors}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ stats, chemicals, riskLevelColors, riskLevelIcons }: any) {
  if (!stats) return null;

  const RiskLevelCard = ({ level, count, description }: any) => {
    const Icon = riskLevelIcons[level];
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-lg ${riskLevelColors[level]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {count}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">
              {level} Risk
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.chemicals_with_msds}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">With MSDS</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.risk_distribution?.low || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Safe Chemicals</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.risk_distribution?.high || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">High Risk</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.coverage_percentage?.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Coverage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Risk Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <RiskLevelCard
            level="high"
            count={stats.risk_distribution?.high || 0}
            description="Requires special handling and precautions"
          />
          <RiskLevelCard
            level="medium"
            count={stats.risk_distribution?.medium || 0}
            description="Moderate risk, standard precautions"
          />
          <RiskLevelCard
            level="low"
            count={stats.risk_distribution?.low || 0}
            description="Low risk, minimal precautions"
          />
          <RiskLevelCard
            level="unknown"
            count={stats.chemicals_without_msds || 0}
            description="No safety data available"
          />
        </div>
      </div>

      {/* Coverage Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          MSDS Coverage
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">
              {stats.chemicals_with_msds} of {stats.total_chemicals} chemicals have MSDS data
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {stats.coverage_percentage?.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${stats.coverage_percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chemicals Tab Component
function ChemicalsTab({
  chemicals,
  searchTerm,
  setSearchTerm,
  riskFilter,
  setRiskFilter,
  msdsFilter,
  setMsdsFilter,
  selectedChemical,
  setSelectedChemical,
  isFetchingMSDS,
  uploadingFile,
  handleFetchMSDS,
  handleFileUpload,
  handleRefreshMSDS,
  user,
  riskLevelColors
}: any) {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search chemicals by name, CAS, or formula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>

            <select
              value={msdsFilter}
              onChange={(e) => setMsdsFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="all">All Chemicals</option>
              <option value="with-msds">With MSDS</option>
              <option value="without-msds">Without MSDS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chemicals Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {chemicals.map((chemical: ChemicalWithMSDS) => (
          <div key={chemical.id} className="relative">
            <ChemicalCard 
              chemical={chemical} 
              onSelect={setSelectedChemical}
              showActions={false}
            />
            
            {/* MSDS Status Badge */}
            <div className="absolute top-2 left-2 flex gap-1">
              {chemical.hazardSummary && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskLevelColors[chemical.hazardSummary.risk_level]}`}>
                  {chemical.hazardSummary.risk_level.toUpperCase()}
                </span>
              )}
              {chemical.msds ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  MSDS
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-medium flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  No MSDS
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 flex gap-1">
              {!chemical.msds && (
                <button
                  onClick={() => handleFetchMSDS(chemical.id)}
                  disabled={isFetchingMSDS === chemical.id}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50"
                  title="Fetch MSDS from PubChem"
                >
                  {isFetchingMSDS === chemical.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </button>
              )}

              {user?.role === 'admin' && (
                <>
                  <label className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileUpload(chemical.id, e)}
                    />
                  </label>

                  {chemical.msds && (
                    <button
                      onClick={() => handleRefreshMSDS(chemical.id)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors"
                      title="Refresh MSDS data"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => setSelectedChemical(chemical)}
                className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-colors"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {chemicals.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Chemicals Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search terms or filters' : 'No chemicals match the current filters'}
          </p>
        </div>
      )}

      {/* MSDS Detail Modal */}
      {selectedChemical && (
        <MSDSDetailModal
          chemical={selectedChemical}
          onClose={() => setSelectedChemical(null)}
          onRefresh={() => handleRefreshMSDS(selectedChemical.id)}
          user={user}
        />
      )}
    </div>
  );
}

// MSDS Detail Modal Component
function MSDSDetailModal({ chemical, onClose, onRefresh, user }: any) {
  const [activeSection, setActiveSection] = useState<'overview' | 'hazards' | 'precautions' | 'files'>('overview');

  if (!chemical) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {chemical.name} - MSDS
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              CAS: {chemical.cas_number} | {chemical.molecular_formula}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'hazards', label: 'Hazards', icon: AlertTriangle },
              { id: 'precautions', label: 'Precautions', icon: Shield },
              { id: 'files', label: 'Files', icon: FileText }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === id
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
          {activeSection === 'overview' && (
            <MSDSOverview chemical={chemical} />
          )}

          {activeSection === 'hazards' && (
            <MSDSHazards chemical={chemical} />
          )}

          {activeSection === 'precautions' && (
            <MSDSPrecautions chemical={chemical} />
          )}

          {activeSection === 'files' && (
            <MSDSFiles chemical={chemical} user={user} onRefresh={onRefresh} />
          )}
        </div>
      </div>
    </div>
  );
}

// MSDS Section Components
function MSDSOverview({ chemical }: any) {
  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      {chemical.hazardSummary && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemical.hazardSummary.hazard_count || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Hazards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {chemical.hazardSummary.precaution_count || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Precautions</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold capitalize ${
                chemical.hazardSummary.risk_level === 'high' ? 'text-red-600' :
                chemical.hazardSummary.risk_level === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {chemical.hazardSummary.risk_level}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Risk Level</div>
            </div>
          </div>
        </div>
      )}

      {/* GHS Pictograms */}
      {chemical.hazardSummary?.ghs_pictograms && chemical.hazardSummary.ghs_pictograms.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">GHS Hazard Pictograms</h3>
          <GHSPictograms pictograms={chemical.hazardSummary.ghs_pictograms} size="lg" />
        </div>
      )}

      {/* Source Information */}
      {chemical.msds && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Source Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Source:</span>
              <span className="text-gray-900 dark:text-white">
                {chemical.msds.source_url ? (
                  <a href={chemical.msds.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                    {chemical.msds.source_url}
                  </a>
                ) : 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Last Updated:</span>
              <span className="text-gray-900 dark:text-white">
                {chemical.msds.retrieved_at ? new Date(chemical.msds.retrieved_at).toLocaleString() : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MSDSHazards({ chemical }: any) {
  if (!chemical.msds?.hazard_statements) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No hazard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hazard Statements</h3>
      <div className="space-y-3">
        {Object.entries(chemical.msds.hazard_statements).map(([code, description]) => (
          <div key={code} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="font-medium text-red-800 dark:text-red-200 text-sm mb-1">
              {code}
            </div>
            <div className="text-red-700 dark:text-red-300">
              {String(description)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MSDSPrecautions({ chemical }: any) {
  if (!chemical.msds?.precautionary_statements) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No precautionary data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Precautionary Statements</h3>
      <div className="space-y-3">
        {Object.entries(chemical.msds.precautionary_statements).map(([code, description]) => (
          <div key={code} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="font-medium text-blue-800 dark:text-blue-200 text-sm mb-1">
              {code}
            </div>
            <div className="text-blue-700 dark:text-blue-300">
              {String(description)}
            </div>
          </div>
        ))}
      </div>

      {/* Handling Notes */}
      {chemical.msds.handling_notes && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Handling & Storage Notes</h4>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {chemical.msds.handling_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MSDSFiles({ chemical, user, onRefresh }: any) {
  return (
    <div className="space-y-6">
      {/* Uploaded Files */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">MSDS Files</h3>
        {chemical.uploadedFiles && chemical.uploadedFiles.length > 0 ? (
          <div className="space-y-3">
            {chemical.uploadedFiles.map((file: any) => (
              <div key={file.filename} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {file.filename}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Uploaded {file.uploaded_at ? new Date(file.uploaded_at).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Download
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No MSDS files uploaded</p>
          </div>
        )}
      </div>

      {/* Admin Actions */}
      {user?.role === 'admin' && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin Actions</h3>
          <div className="flex gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
              <Upload className="h-4 w-4" />
              Upload MSDS File
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Handle file upload
                    console.log('Upload file:', file);
                  }
                }}
              />
            </label>
            <button
              onClick={onRefresh}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}