'use client';

import { useState, useEffect } from 'react';
import { Location, LocationFormData, STORAGE_CONDITIONS } from '@/types';
import { locationsAPI, chemicalsAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { 
  Plus, Search, Filter, Edit, Trash2, MapPin, 
  Building, Flask, DoorOpen, Layers, Package, AlertTriangle 
} from 'lucide-react';

export default function LocationsPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    storageCondition: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chemicalCounts, setChemicalCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [locations, searchTerm, filters]);

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const locationsData = await locationsAPI.getAll(0, 1000);
      setLocations(locationsData);
      
      // Load chemical counts for each location
      const counts: Record<number, number> = {};
      for (const location of locationsData) {
        const chemicals = await locationsAPI.getChemicalsAtLocation(location.id, 0, 1);
        counts[location.id] = chemicals.length;
      }
      setChemicalCounts(counts);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLocations = () => {
    let result = locations;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(location => 
        location.name.toLowerCase().includes(term) ||
        location.department?.toLowerCase().includes(term) ||
        location.lab_name?.toLowerCase().includes(term) ||
        location.room?.toLowerCase().includes(term)
      );
    }

    if (filters.department) {
      result = result.filter(location => location.department === filters.department);
    }

    if (filters.storageCondition) {
      result = result.filter(location => location.storage_conditions === filters.storageCondition);
    }

    setFilteredLocations(result);
  };

  const handleCreateLocation = async (locationData: LocationFormData) => {
    try {
      await locationsAPI.create(locationData);
      setShowCreateModal(false);
      loadLocations();
    } catch (error) {
      console.error('Failed to create location:', error);
      alert('Failed to create location');
    }
  };

  const handleUpdateLocation = async (locationId: number, locationData: Partial<LocationFormData>) => {
    try {
      await locationsAPI.update(locationId, locationData);
      setEditingLocation(null);
      loadLocations();
    } catch (error) {
      console.error('Failed to update location:', error);
      alert('Failed to update location');
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await locationsAPI.delete(locationId);
      loadLocations();
    } catch (error: any) {
      console.error('Failed to delete location:', error);
      alert(error.response?.data?.detail || 'Failed to delete location');
    }
  };

  const getUniqueDepartments = () => {
    const departments = locations.map(loc => loc.department).filter(Boolean) as string[];
    return [...new Set(departments)];
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
    
    return parts.join(' → ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Location Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage hierarchical storage locations for chemicals
          </p>
        </div>
        
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{locations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <Building className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Departments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getUniqueDepartments().length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Occupied Locations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.values(chemicalCounts).filter(count => count > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Layers className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Storage Types</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {[...new Set(locations.map(loc => loc.storage_conditions))].length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search locations by name, department, lab, room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-4">
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Departments</option>
              {getUniqueDepartments().map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              value={filters.storageCondition}
              onChange={(e) => setFilters(prev => ({ ...prev, storageCondition: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">All Storage Types</option>
              {STORAGE_CONDITIONS.map(condition => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLocations.map(location => (
          <div key={location.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {location.name}
              </h3>
              {user?.role === 'admin' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingLocation(location)}
                    className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                    title="Edit location"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(location.id)}
                    className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                    title="Delete location"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Location Hierarchy */}
            <div className="mb-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location Path</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {getLocationHierarchy(location) || 'No hierarchy defined'}
              </div>
            </div>

            {/* Storage Condition */}
            <div className="mb-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Storage Condition</div>
              <div className="text-sm text-gray-900 dark:text-white font-medium">
                {location.storage_conditions === 'Custom' 
                  ? location.custom_storage_condition 
                  : location.storage_conditions}
              </div>
            </div>

            {/* Chemical Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Package className="h-4 w-4" />
                {chemicalCounts[location.id] || 0} chemicals
              </div>
              
              {chemicalCounts[location.id] > 0 && (
                <button
                  onClick={() => {
                    // Navigate to chemicals page filtered by this location
                    window.location.href = `/dashboard/stock?location=${location.id}`;
                  }}
                  className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 text-sm font-medium"
                >
                  View Chemicals
                </button>
              )}
            </div>

            {/* Description */}
            {location.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {location.description}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredLocations.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No locations found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || filters.department || filters.storageCondition
              ? 'Try adjusting your search or filters'
              : 'No locations defined yet'
            }
          </p>
          {user?.role === 'admin' && !searchTerm && !filters.department && !filters.storageCondition && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              Create First Location
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLocation) && (
        <LocationFormModal
          location={editingLocation || undefined}
          onSave={editingLocation ? 
            (data) => handleUpdateLocation(editingLocation.id, data) : 
            handleCreateLocation
          }
          onClose={() => {
            setShowCreateModal(false);
            setEditingLocation(null);
          }}
        />
      )}
    </div>
  );
}