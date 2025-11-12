'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ChemicalFormData, Location, User } from '@/types';
import { useAuth } from '@/lib/auth';
import { 
  Save, Loader2, QrCode, Beaker, MapPin, Package, AlertTriangle, 
  Database, Atom, Container, ShoppingCart, User as UserIcon, FileText,
  Calendar, Barcode, Truck, ClipboardList
} from 'lucide-react';
import { StructureEditorToggle } from './chemical-editors/structure-editor-toggle';
import { LocationFormModal } from './location-form-modal';
import { GHSPictograms } from './ghs-pictograms';
import { useRDKitUtils } from '@/hooks/useRDKit';

interface EnhancedChemicalFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ChemicalFormData>;
}

// Extended form data interface
interface ExtendedChemicalFormData extends ChemicalFormData {
  // Container Information
  container_id?: string;
  container_type?: string;
  quantity?: number;
  quantity_unit?: string;
  no_of_containers?: number;
  total_weight_volume?: number;
  tare_weight?: number;
  supplier?: string;
  batch_no?: string;
  lot_no?: string;
  expiry_date?: string;
  
  // Procurement Details
  project_code?: string;
  requisitioner_id?: number;
  approved_by_id?: number;
  po_date?: string;
  invoice_no?: string;
  invoice_date?: string;
  date_received?: string;
  
  // Additional fields
  synonyms?: string;
}

const UNITS = ['g', 'mg', 'kg', 'mL', 'L', 'mol', 'pieces'];
const STORAGE_CONDITIONS = ['RT', '2-8°C', '-20°C', '-80°C', 'Custom'];
const CONTAINER_TYPES = ['Vial', 'Bottle', 'Ampoule', 'Syringe', 'Bag', 'Drum', 'Canister', 'Other'];

export function EnhancedChemicalForm({ onSuccess, initialData }: EnhancedChemicalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentSmiles, setCurrentSmiles] = useState(initialData?.smiles || '');
  const [isSmilesValid, setIsSmilesValid] = useState(false);
  const [computedProperties, setComputedProperties] = useState<{
    molecularWeight?: number;
    molecularFormula?: string;
    canonicalSmiles?: string;
    name?: string;
    casNumber?: string;
    ghsPictograms?: string[];
  }>({});
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [isFetchingPubChem, setIsFetchingPubChem] = useState(false);
  const [pubChemError, setPubChemError] = useState<string>('');
  const [customContainerType, setCustomContainerType] = useState('');

  const { user } = useAuth();
  const { computeChemicalProperties, validateSmiles } = useRDKitUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ExtendedChemicalFormData>({
    defaultValues: initialData || {
      name: '',
      cas_number: '',
      smiles: '',
      initial_quantity: 0,
      initial_unit: 'g',
      minimum_quantity: 10,
      storage_condition: 'RT',
    },
  });

  // Safely watch form fields
  const watchedStorageCondition = watch('storage_condition') || 'RT';
  const watchedQuantity = watch('initial_quantity') || 0;
  const watchedLocationId = watch('location_id');
  const watchedUnit = watch('initial_unit') || 'g';
  const watchedName = watch('name') || '';
  const watchedCasNumber = watch('cas_number') || '';
  const watchedContainerType = watch('container_type');
  const watchedNoOfContainers = watch('no_of_containers') || 0;
  const watchedQuantityPerContainer = watch('quantity') || 0;

  // Load locations and users
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.error('No access token found');
          return;
        }

        // Load locations
        const locationsResponse = await fetch('http://localhost:8000/locations/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          setLocations(locationsData);
        }

        // Load users for dropdown
        const usersResponse = await fetch('http://localhost:8000/users/dropdown', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoadingLocations(false);
        setIsLoadingUsers(false);
      }
    };
    loadData();
  }, []);

  // Auto-calculate total weight/volume
  useEffect(() => {
    if (watchedNoOfContainers > 0 && watchedQuantityPerContainer > 0) {
      const total = watchedNoOfContainers * watchedQuantityPerContainer;
      setValue('total_weight_volume', total);
    }
  }, [watchedNoOfContainers, watchedQuantityPerContainer, setValue]);

  // Handle custom container type
  useEffect(() => {
    if (watchedContainerType === 'Other' && customContainerType) {
      setValue('container_type', customContainerType);
    }
  }, [customContainerType, watchedContainerType, setValue]);

  // Update selected location when location_id changes
  useEffect(() => {
    if (watchedLocationId && locations.length > 0) {
      const location = locations.find(loc => loc.id === watchedLocationId);
      setSelectedLocation(location || null);
    } else {
      setSelectedLocation(null);
    }
  }, [watchedLocationId, locations]);

  // Enhanced SMILES change handler with auto-fetch
  const handleSmilesChange = async (smiles: string, isValid: boolean, properties?: any) => {
    setCurrentSmiles(smiles);
    setIsSmilesValid(isValid);
    setValue('smiles', smiles, { shouldValidate: true });

    // Update computed properties from editor
    if (properties) {
      setComputedProperties(prev => ({
        ...prev,
        molecularWeight: properties.molecularWeight,
        molecularFormula: properties.molecularFormula,
        canonicalSmiles: properties.canonicalSmiles,
        name: properties.name
      }));
    }

    // Auto-fetch from PubChem if valid SMILES and no name/CAS provided
    if (isValid && smiles && (!watchedName || !watchedCasNumber)) {
      await fetchChemicalData(smiles);
    } else if (isValid && smiles) {
      // Still compute local properties even if we have name/CAS
      computeLocalProperties(smiles);
    }
  };

  const computeLocalProperties = (smiles: string) => {
    try {
      const properties = computeChemicalProperties(smiles);
      setComputedProperties(prev => ({
        ...prev,
        molecularWeight: properties.molecularWeight,
        molecularFormula: properties.molecularFormula,
        canonicalSmiles: properties.canonicalSmiles,
        name: properties.name !== 'Unknown Compound' ? properties.name : prev.name,
        ghsPictograms: detectGHSPictograms(properties)
      }));

      // Auto-fill name if empty and we have a good name from RDKit
      if (!watchedName && properties.name && properties.name !== 'Unknown Compound') {
        setValue('name', properties.name);
      }

      // Auto-fill formula and weight
      if (properties.molecularFormula) {
        setComputedProperties(prev => ({
          ...prev,
          molecularFormula: properties.molecularFormula,
          molecularWeight: properties.molecularWeight
        }));
      }
    } catch (error) {
      console.error('Error computing local properties:', error);
    }
  };

  const detectGHSPictograms = (properties: any): string[] => {
    const pictograms: string[] = [];
    
    // Basic hazard detection based on compound type and properties
    if (properties.type === 'Toxic' || properties.name?.toLowerCase().includes('cyanide')) {
      pictograms.push('GHS06');
    }
    if (properties.type === 'Acid' || properties.name?.toLowerCase().includes('acid')) {
      pictograms.push('GHS05');
    }
    if (properties.type === 'Flammable' || properties.name?.toLowerCase().includes('ethanol') || properties.name?.toLowerCase().includes('methanol')) {
      pictograms.push('GHS02');
    }
    if (properties.name?.toLowerCase().includes('oxidiz') || properties.name?.toLowerCase().includes('peroxide')) {
      pictograms.push('GHS03');
    }
    
    return pictograms;
  };

  const fetchChemicalData = async (smiles: string) => {
    if (!smiles.trim()) return;
    
    setIsFetchingPubChem(true);
    setPubChemError('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      console.log('🔍 Fetching chemical data for SMILES:', smiles);

      // Call backend PubChem endpoint
      const response = await fetch(
        `http://localhost:8000/chemicals/pubchem/search?query=${encodeURIComponent(smiles)}&search_type=smiles`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const chemicalData = await response.json();
        console.log('✅ Chemical data received:', chemicalData);
        
        // Auto-fill name if empty and we have a good name
        if (chemicalData.name && chemicalData.name !== 'Unknown Compound' && !watchedName) {
          setValue('name', chemicalData.name);
          console.log('✅ Auto-filled name:', chemicalData.name);
        }
        
        // Auto-fill CAS if available
        if (chemicalData.cas_number && chemicalData.cas_number !== 'Not found - enter manually' && !watchedCasNumber) {
          setValue('cas_number', chemicalData.cas_number);
          console.log('✅ Auto-filled CAS:', chemicalData.cas_number);
        }
        
        // Update molecular properties
        if (chemicalData.molecular_formula) {
          setComputedProperties(prev => ({
            ...prev,
            molecularFormula: chemicalData.molecular_formula
          }));
          console.log('✅ Molecular formula:', chemicalData.molecular_formula);
        }
        
        if (chemicalData.molecular_weight) {
          setComputedProperties(prev => ({
            ...prev,
            molecularWeight: chemicalData.molecular_weight
          }));
          console.log('✅ Molecular weight:', chemicalData.molecular_weight);
        }

        // Update canonical SMILES
        if (chemicalData.canonical_smiles) {
          setComputedProperties(prev => ({
            ...prev,
            canonicalSmiles: chemicalData.canonical_smiles
          }));
        }

        // Update GHS pictograms from PubChem if available
        if (chemicalData.ghs_pictograms) {
          setComputedProperties(prev => ({
            ...prev,
            ghsPictograms: chemicalData.ghs_pictograms
          }));
        }

        console.log('🎉 Auto-fill completed successfully');

      } else if (response.status === 401) {
        setPubChemError('Authentication failed. Please log in again.');
        computeLocalProperties(smiles);
      } else if (response.status === 404) {
        setPubChemError('Chemical not found in databases. Using local computation.');
        computeLocalProperties(smiles);
      } else {
        setPubChemError('Failed to fetch data from server. Using local computation.');
        computeLocalProperties(smiles);
      }
    } catch (err: any) {
      console.error('❌ Chemical data fetch failed:', err);
      setPubChemError('Network error. Using local chemical analysis.');
      computeLocalProperties(smiles);
    } finally {
      setIsFetchingPubChem(false);
    }
  };

  const getLocationHierarchy = (location: Location) => {
    const parts = [
      location.department,
      location.lab_name,
      location.room,
      location.shelf,
      location.rack,
      location.position
    ].filter(Boolean);
    
    return parts.join(' → ') || location.name;
  };

  const handleCreateLocation = async (locationData: any) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('http://localhost:8000/locations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(locationData)
      });

      if (response.ok) {
        const newLocation = await response.json();
        setLocations(prev => [...prev, newLocation]);
        setValue('location_id', newLocation.id);
        setShowLocationForm(false);
      } else {
        alert('Failed to create location');
      }
    } catch (error) {
      console.error('Error creating location:', error);
      alert('Failed to create location');
    }
  };

  const onSubmit = async (data: ExtendedChemicalFormData) => {
    if (!user) {
      setError('You must be logged in to add chemicals');
      return;
    }

    if (!isSmilesValid) {
      setError('Please provide a valid chemical structure');
      return;
    }

    // Include computed properties in submission
    const submissionData = {
      ...data,
      molecular_weight: computedProperties.molecularWeight,
      molecular_formula: computedProperties.molecularFormula,
      canonical_smiles: computedProperties.canonicalSmiles || currentSmiles,
      ghs_pictograms: computedProperties.ghsPictograms || []
    };

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:8000/chemicals/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      reset();
      setSuccess(`Chemical "${data.name}" added successfully!`);
      setCurrentSmiles('');
      setComputedProperties({});
      setPubChemError('');
      
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add chemical');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualPropertyGeneration = () => {
    if (currentSmiles && isSmilesValid) {
      console.log('🧪 Manually generating properties for:', currentSmiles);
      computeLocalProperties(currentSmiles);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <strong>Success:</strong> {success}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Structure Editor Section - FULLY VISIBLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Chemical Structure Editor
            </h3>
            <button
              type="button"
              onClick={handleManualPropertyGeneration}
              disabled={!currentSmiles || !isSmilesValid}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
            >
              <Atom className="h-4 w-4" />
              Generate Properties
            </button>
          </div>

          {/* Structure Editor Toggle - FULLY VISIBLE */}
          <StructureEditorToggle
            initialSmiles={currentSmiles}
            onSmilesChange={handleSmilesChange}
            showProperties={true}
          />

          {/* PubChem Fetch Status */}
          <div className="mt-4 space-y-2">
            {isFetchingPubChem && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Database className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Fetching data from PubChem...</span>
                </div>
              </div>
            )}

            {pubChemError && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{pubChemError}</span>
                </div>
              </div>
            )}

            {computedProperties.ghsPictograms && computedProperties.ghsPictograms.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">GHS Pictograms:</span>
                  <GHSPictograms pictograms={computedProperties.ghsPictograms} size="md" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Basic Information Section - FULLY VISIBLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            Chemical Identification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div>
              <label htmlFor="cas_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CAS Number *
              </label>
              <input
                type="text"
                id="cas_number"
                {...register('cas_number', { required: 'CAS number is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 67-64-1 or 'Not found - enter manually'"
              />
              {errors.cas_number && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.cas_number.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="synonyms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Synonyms (Optional)
              </label>
              <input
                type="text"
                id="synonyms"
                {...register('synonyms')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Paracetamol, Acetaminophen"
              />
            </div>
          </div>

          {/* Computed Properties Display */}
          {(computedProperties.molecularFormula || computedProperties.molecularWeight) && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Atom className="h-4 w-4 text-green-500" />
                Computed Properties
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {computedProperties.molecularFormula && (
                  <div>
                    <span className="text-gray-500">Molecular Formula:</span>
                    <div className="text-gray-900 dark:text-white font-mono font-medium">
                      {computedProperties.molecularFormula}
                    </div>
                  </div>
                )}
                {computedProperties.molecularWeight && computedProperties.molecularWeight > 0 && (
                  <div>
                    <span className="text-gray-500">Molecular Weight:</span>
                    <div className="text-gray-900 dark:text-white font-mono font-medium">
                      {computedProperties.molecularWeight.toFixed(2)} g/mol
                    </div>
                  </div>
                )}
                {computedProperties.canonicalSmiles && (
                  <div className="md:col-span-2">
                    <span className="text-gray-500">Canonical SMILES:</span>
                    <div className="text-gray-900 dark:text-white font-mono text-xs break-all">
                      {computedProperties.canonicalSmiles}
                    </div>
                  </div>
                )}
                {computedProperties.name && computedProperties.name !== 'Unknown Compound' && (
                  <div className="md:col-span-2">
                    <span className="text-gray-500">Suggested Name:</span>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {computedProperties.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Container Information Section - FULLY VISIBLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Container className="h-5 w-5" />
            Container Information (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label htmlFor="container_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Container ID
              </label>
              <input
                type="text"
                id="container_id"
                {...register('container_id')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., 240001"
              />
            </div>

            <div>
              <label htmlFor="container_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Container Type
              </label>
              <select
                id="container_type"
                {...register('container_type')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select container type</option>
                {CONTAINER_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {watchedContainerType === 'Other' && (
                <input
                  type="text"
                  value={customContainerType}
                  onChange={(e) => setCustomContainerType(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter custom container type"
                />
              )}
            </div>

            <div>
              <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier
              </label>
              <input
                type="text"
                id="supplier"
                {...register('supplier')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Sigma Aldrich"
              />
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity per Container
              </label>
              <input
                type="number"
                id="quantity"
                step="0.01"
                {...register('quantity', { min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="50"
              />
            </div>

            <div>
              <label htmlFor="quantity_unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity Unit
              </label>
              <select
                id="quantity_unit"
                {...register('quantity_unit')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select unit</option>
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="no_of_containers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Containers
              </label>
              <input
                type="number"
                id="no_of_containers"
                min="0"
                {...register('no_of_containers', { min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="5"
              />
            </div>

            <div>
              <label htmlFor="total_weight_volume" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Weight/Volume
              </label>
              <input
                type="number"
                id="total_weight_volume"
                step="0.01"
                {...register('total_weight_volume', { min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="250"
                readOnly
              />
            </div>

            <div>
              <label htmlFor="tare_weight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tare Weight
              </label>
              <input
                type="number"
                id="tare_weight"
                step="0.01"
                {...register('tare_weight', { min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="250"
              />
            </div>

            <div>
              <label htmlFor="batch_no" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch No
              </label>
              <input
                type="text"
                id="batch_no"
                {...register('batch_no')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="B12345"
              />
            </div>

            <div>
              <label htmlFor="lot_no" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lot No
              </label>
              <input
                type="text"
                id="lot_no"
                {...register('lot_no')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="L98765"
              />
            </div>

            <div>
              <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                id="expiry_date"
                {...register('expiry_date')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Procurement Details Section - FULLY VISIBLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Procurement Details (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label htmlFor="project_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Code
              </label>
              <input
                type="text"
                id="project_code"
                {...register('project_code')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="INVZ2024-05"
              />
            </div>

            <div>
              <label htmlFor="requisitioner_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Requisitioner
              </label>
              <select
                id="requisitioner_id"
                {...register('requisitioner_id', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoadingUsers}
              >
                <option value="">Select requisitioner</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
              {isLoadingUsers && (
                <p className="mt-1 text-sm text-gray-500">Loading users...</p>
              )}
            </div>

            <div>
              <label htmlFor="approved_by_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Approved By
              </label>
              <select
                id="approved_by_id"
                {...register('approved_by_id', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isLoadingUsers}
              >
                <option value="">Select approver</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="po_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PO Date
              </label>
              <input
                type="date"
                id="po_date"
                {...register('po_date')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="invoice_no" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice No
              </label>
              <input
                type="text"
                id="invoice_no"
                {...register('invoice_no')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="IN-1234-24-25"
              />
            </div>

            <div>
              <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                id="invoice_date"
                {...register('invoice_date')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="date_received" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Received
              </label>
              <input
                type="date"
                id="date_received"
                {...register('date_received')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Location & Storage Section - FULLY VISIBLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location & Storage
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="location_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Storage Location
              </label>
              <div className="flex gap-2">
                <select
                  id="location_id"
                  {...register('location_id', { valueAsNumber: true })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={isLoadingLocations}
                >
                  <option value="">Select a location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowLocationForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  New
                </button>
              </div>
              {isLoadingLocations && (
                <p className="mt-1 text-sm text-gray-500">Loading locations...</p>
              )}
            </div>

            <div>
              <label htmlFor="storage_condition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Storage Condition
              </label>
              <select
                id="storage_condition"
                {...register('storage_condition')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {STORAGE_CONDITIONS.map(condition => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Details Preview */}
          {selectedLocation && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Selected Location Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Hierarchy:</span>
                  <div className="text-gray-900 dark:text-white font-medium">
                    {getLocationHierarchy(selectedLocation)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Storage:</span>
                  <div className="text-gray-900 dark:text-white font-medium">
                    {selectedLocation.storage_conditions === 'Custom' 
                      ? selectedLocation.custom_storage_condition 
                      : selectedLocation.storage_conditions}
                  </div>
                </div>
                {selectedLocation.description && (
                  <div className="md:col-span-3">
                    <span className="text-gray-500">Description:</span>
                    <div className="text-gray-900 dark:text-white">
                      {selectedLocation.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {watchedStorageCondition === 'Custom' && (
            <div className="mt-4">
              <label htmlFor="custom_storage_condition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Storage Condition
              </label>
              <input
                type="text"
                id="custom_storage_condition"
                {...register('custom_storage_condition')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Under nitrogen atmosphere, Desiccator"
              />
            </div>
          )}
        </div>

        {/* Quantity & Stock Section - FULLY VISIBLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Quantity & Stock Management
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="initial_quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Initial Quantity *
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
                Unit *
              </label>
              <select
                id="initial_unit"
                {...register('initial_unit', { required: 'Unit is required' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="minimum_quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Quantity
              </label>
              <input
                type="number"
                id="minimum_quantity"
                step="0.01"
                min="0"
                {...register('minimum_quantity', { 
                  min: { value: 0, message: 'Minimum quantity must be positive' }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="10.00"
              />
              {errors.minimum_quantity && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.minimum_quantity.message}</p>
              )}
            </div>
          </div>

          {/* Quantity Preview */}
          {(watchedQuantity > 0) && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <QrCode className="h-4 w-4" />
                <span>
                  Chemical will be added with <strong>{watchedQuantity} {watchedUnit}</strong> initial stock
                  {watch('minimum_quantity') && Number(watch('minimum_quantity')) > 0 && (
                    <> and <strong>{watch('minimum_quantity')} {watchedUnit}</strong> minimum quantity</>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Additional Information Section - FULLY VISIBLE */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Additional Information
          </h3>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description & Notes
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional notes about this chemical, handling instructions, special requirements..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6">
          <button
            type="button"
            onClick={() => {
              reset();
              setCurrentSmiles('');
              setComputedProperties({});
              setPubChemError('');
              setCustomContainerType('');
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={isLoading || !isSmilesValid}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading ? 'Adding Chemical...' : 'Add Chemical'}
          </button>
        </div>
      </form>

      {/* Location Creation Modal */}
      {showLocationForm && (
        <LocationFormModal
          onSave={handleCreateLocation}
          onClose={() => setShowLocationForm(false)}
        />
      )}
    </div>
  );
}