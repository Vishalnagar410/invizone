'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ChemicalFormData, Location } from '@/types';
import { useAuth } from '@/lib/auth';
import { Save, Loader2, QrCode, Beaker, MapPin, Package, AlertTriangle, Database } from 'lucide-react';
import { StructureEditorToggle } from './chemical-editors/structure-editor-toggle';
import { LocationFormModal } from './location-form-modal';

interface EnhancedChemicalFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ChemicalFormData>;
}

const UNITS = ['g', 'mg', 'kg', 'mL', 'L', 'mol', 'pieces'];
const STORAGE_CONDITIONS = ['RT', '2-8°C', '-20°C', '-80°C', 'Custom'];

export function EnhancedChemicalForm({ onSuccess, initialData }: EnhancedChemicalFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [currentSmiles, setCurrentSmiles] = useState(initialData?.smiles || '');
  const [isSmilesValid, setIsSmilesValid] = useState(false);
  const [computedProperties, setComputedProperties] = useState<{
    molecularWeight?: number;
    molecularFormula?: string;
    canonicalSmiles?: string;
  }>({});
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [isFetchingPubChem, setIsFetchingPubChem] = useState(false);

  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ChemicalFormData>({
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

  // Safely watch form fields with proper null checks
  const watchedStorageCondition = watch('storage_condition') || 'RT';
  const watchedQuantity = watch('initial_quantity') || 0;
  const watchedLocationId = watch('location_id');
  const watchedUnit = watch('initial_unit') || 'g';
  const watchedName = watch('name') || '';
  const watchedCasNumber = watch('cas_number') || '';

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const response = await fetch('http://localhost:8000/locations/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        if (response.ok) {
          const locationsData = await response.json();
          setLocations(locationsData);
        }
      } catch (err) {
        console.error('Failed to load locations:', err);
      } finally {
        setIsLoadingLocations(false);
      }
    };
    loadLocations();
  }, []);

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

    // Update computed properties
    if (properties) {
      setComputedProperties({
        molecularWeight: properties.molecularWeight,
        molecularFormula: properties.molecularFormula,
        canonicalSmiles: properties.canonicalSmiles
      });
    }

    // Auto-fetch from PubChem if valid SMILES and no name/CAS provided
    if (isValid && smiles && (!watchedName || !watchedCasNumber)) {
      await fetchFromPubChem(smiles);
    }
  };

  const fetchFromPubChem = async (smiles: string) => {
    if (!smiles.trim()) return;
    
    setIsFetchingPubChem(true);
    try {
      const response = await fetch(
        `http://localhost:8000/chemicals/pubchem/search?query=${encodeURIComponent(smiles)}&search_type=smiles`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      
      if (response.ok) {
        const pubchemData = await response.json();
        
        // Auto-fill name if empty
        if (pubchemData.name && !watchedName) {
          setValue('name', pubchemData.name);
        }
        
        // Auto-fill CAS if empty
        if (pubchemData.cas_number && !watchedCasNumber) {
          setValue('cas_number', pubchemData.cas_number);
        } else if (!watchedCasNumber) {
          // If CAS not found, set placeholder
          setValue('cas_number', 'Not found - enter manually');
        }
        
        // Update molecular properties if RDKit didn't compute them
        if (pubchemData.molecular_formula && !computedProperties.molecularFormula) {
          setComputedProperties(prev => ({
            ...prev,
            molecularFormula: pubchemData.molecular_formula
          }));
        }
        
        if (pubchemData.molecular_weight && !computedProperties.molecularWeight) {
          setComputedProperties(prev => ({
            ...prev,
            molecularWeight: pubchemData.molecular_weight
          }));
        }
      } else {
        // If PubChem fails, try to use RDKit computed properties for name suggestion
        if (!watchedName && computedProperties.molecularFormula) {
          setValue('name', `Chemical (${computedProperties.molecularFormula})`);
        }
        if (!watchedCasNumber) {
          setValue('cas_number', 'Not found - enter manually');
        }
      }
    } catch (err) {
      console.log('PubChem fetch failed, using RDKit fallback');
      // Fallback to RDKit properties
      if (!watchedName && computedProperties.molecularFormula) {
        setValue('name', `Chemical (${computedProperties.molecularFormula})`);
      }
      if (!watchedCasNumber) {
        setValue('cas_number', 'Not found - enter manually');
      }
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
      const response = await fetch('http://localhost:8000/locations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
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

  const onSubmit = async (data: ChemicalFormData) => {
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
      canonical_smiles: computedProperties.canonicalSmiles || currentSmiles
    };

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('http://localhost:8000/chemicals/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
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
      
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add chemical');
    } finally {
      setIsLoading(false);
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
        {/* Structure Editor Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <StructureEditorToggle
            initialSmiles={currentSmiles}
            onSmilesChange={handleSmilesChange}
            showProperties={true}
          />

          {/* PubChem Fetch Status */}
          {isFetchingPubChem && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Database className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Fetching data from PubChem...</span>
              </div>
            </div>
          )}
        </div>

        {/* Basic Information Section */}
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
          </div>
        </div>

        {/* Location & Storage Section */}
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

        {/* Quantity & Stock Section */}
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
                  {watch('minimum_quantity') && watch('minimum_quantity') > 0 && (
                    <> and <strong>{watch('minimum_quantity')} {watchedUnit}</strong> minimum quantity</>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Additional Information Section */}
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