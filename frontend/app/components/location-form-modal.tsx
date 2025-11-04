'use client';

import { useState } from 'react';
import { Location, LocationFormData, STORAGE_CONDITIONS } from '@/types';
import { X, Save } from 'lucide-react';

interface LocationFormModalProps {
  location?: Location;
  onSave: (data: LocationFormData) => void;
  onClose: () => void;
}

export function LocationFormModal({ location, onSave, onClose }: LocationFormModalProps) {
  const [formData, setFormData] = useState<LocationFormData>({
    name: location?.name || '',
    department: location?.department || '',
    lab_name: location?.lab_name || '',
    room: location?.room || '',
    shelf: location?.shelf || '',
    rack: location?.rack || '',
    position: location?.position || '',
    storage_conditions: location?.storage_conditions || 'RT',
    custom_storage_condition: location?.custom_storage_condition || '',
    description: location?.description || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Location name is required');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof LocationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {location ? 'Edit Location' : 'Create New Location'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
            
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Main Storage, Freezer Room A"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional details about this location..."
              />
            </div>
          </div>

          {/* Hierarchical Location */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Hierarchical Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Chemistry, Biology"
                />
              </div>

              <div>
                <label htmlFor="lab_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lab Name
                </label>
                <input
                  type="text"
                  id="lab_name"
                  value={formData.lab_name}
                  onChange={(e) => handleChange('lab_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Organic Synthesis Lab"
                />
              </div>

              <div>
                <label htmlFor="room" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Room
                </label>
                <input
                  type="text"
                  id="room"
                  value={formData.room}
                  onChange={(e) => handleChange('room', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Room 101, Cold Room"
                />
              </div>

              <div>
                <label htmlFor="shelf" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Shelf
                </label>
                <input
                  type="text"
                  id="shelf"
                  value={formData.shelf}
                  onChange={(e) => handleChange('shelf', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Shelf 1, Top Shelf"
                />
              </div>

              <div>
                <label htmlFor="rack" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rack
                </label>
                <input
                  type="text"
                  id="rack"
                  value={formData.rack}
                  onChange={(e) => handleChange('rack', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Rack A, Blue Rack"
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position
                </label>
                <input
                  type="text"
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Position 1, Front Left"
                />
              </div>
            </div>
          </div>

          {/* Storage Conditions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Storage Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="storage_conditions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Storage Condition
                </label>
                <select
                  id="storage_conditions"
                  value={formData.storage_conditions}
                  onChange={(e) => handleChange('storage_conditions', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {STORAGE_CONDITIONS.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>

              {formData.storage_conditions === 'Custom' && (
                <div>
                  <label htmlFor="custom_storage_condition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Condition *
                  </label>
                  <input
                    type="text"
                    id="custom_storage_condition"
                    value={formData.custom_storage_condition}
                    onChange={(e) => handleChange('custom_storage_condition', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., -196°C (LN2), Desiccator"
                    required={formData.storage_conditions === 'Custom'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Location Preview</h4>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {[
                formData.department,
                formData.lab_name,
                formData.room,
                formData.shelf,
                formData.rack,
                formData.position
              ].filter(Boolean).join(' → ') || 'No hierarchy defined'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Storage: {formData.storage_conditions === 'Custom' 
                ? formData.custom_storage_condition 
                : formData.storage_conditions}
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
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              {location ? 'Update Location' : 'Create Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}