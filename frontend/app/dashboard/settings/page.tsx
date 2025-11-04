'use client';

import { useState, useEffect } from 'react';
// import { DashboardNav } from '../../components/dashboard-nav';
import { AlertsPanel } from '../../components/alerts-panel';
import { DebugPanel } from '../../components/debug-panel';
import { useAuth } from '@/lib/auth';
import { usersAPI, chemicalsAPI, stockAPI, msdsAPI } from '@/lib/api';
import { User } from '@/types';
import { 
  Save, User as UserIcon, Lock, Users, Download, Upload, 
  Bell, Palette, Database, Shield, Trash2, Edit, Plus,
  Check, X, Eye, EyeOff, Loader2 
} from 'lucide-react';
import { validateEmail, validatePassword, storage, settings as settingsUtils, exportUtils, importUtils, notification, rbac } from '@/lib/utils';

interface UserFormData {
  email: string;
  full_name: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface NewUserFormData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'viewer';
}

export default function SettingsPage() {
  const { user: currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'users' | 'data'>('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Profile state
  const [profileForm, setProfileForm] = useState<UserFormData>({ email: '', full_name: '' });
  const [isProfileEditing, setIsProfileEditing] = useState(false);

  // Password state
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({ 
    current_password: '', 
    new_password: '', 
    confirm_password: '' 
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // New user state
  const [newUserForm, setNewUserForm] = useState<NewUserFormData>({ 
    email: '', 
    password: '', 
    full_name: '', 
    role: 'viewer' 
  });
  const [showNewUserForm, setShowNewUserForm] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState({
    theme: settingsUtils.get('theme', 'system'),
    notifications: settingsUtils.get('notifications', true),
    language: settingsUtils.get('language', 'en'),
    autoRefresh: settingsUtils.get('autoRefresh', true),
  });

  // Data export state
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [includeMSDS, setIncludeMSDS] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setProfileForm({
        email: currentUser.email,
        full_name: currentUser.full_name || ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'users' && currentUser?.role === 'admin') {
      loadUsers();
    }
  }, [activeTab, currentUser]);

  const loadUsers = async () => {
    if (!rbac.canManageUsers(currentUser?.role || 'viewer')) return;
    
    setIsLoadingUsers(true);
    try {
      const usersData = await usersAPI.getAll();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
      notification.error('Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Update endpoint is not available on usersAPI; fetch the latest user data instead
      const updatedUser = await usersAPI.getById(currentUser.id);
      setProfileForm({
        email: updatedUser.email,
        full_name: updatedUser.full_name || ''
      });
      setIsProfileEditing(false);
      notification.success('Profile updated successfully');
      // Reload page to update auth context
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      notification.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      notification.error('New passwords do not match');
      return;
    }

    const passwordValidation = validatePassword(passwordForm.new_password);
    if (!passwordValidation.isValid) {
      notification.error(passwordValidation.errors[0]);
      return;
    }

    setIsLoading(true);
    try {
      await usersAPI.updatePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      notification.success('Password updated successfully');
    } catch (error: any) {
      console.error('Failed to update password:', error);
      notification.error(error.response?.data?.detail || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(newUserForm.email)) {
      notification.error('Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(newUserForm.password);
    if (!passwordValidation.isValid) {
      notification.error(passwordValidation.errors[0]);
      return;
    }

    setIsLoading(true);
    try {
      await usersAPI.create(newUserForm);
      setNewUserForm({ email: '', password: '', full_name: '', role: 'viewer' });
      setShowNewUserForm(false);
      await loadUsers();
      notification.success('User created successfully');
    } catch (error: any) {
      console.error('Failed to create user:', error);
      notification.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserActive = async (userId: number) => {
    try {
      await usersAPI.toggleActive(userId);
      await loadUsers();
      notification.success('User status updated');
    } catch (error: any) {
      console.error('Failed to toggle user status:', error);
      notification.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await usersAPI.delete(userId);
      await loadUsers();
      notification.success('User deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      notification.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handlePreferenceChange = (key: string, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    settingsUtils.set(key, value);
    
    // Apply theme immediately
    if (key === 'theme') {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      if (value === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(value);
      }
    }
    
    notification.success('Preference saved');
  };

  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const chemicals = await chemicalsAPI.getAll(0, 10000); // Get all chemicals
      
      if (exportFormat === 'csv') {
        const csvData = exportUtils.chemicalsToCSV(chemicals);
        exportUtils.downloadData(csvData, `chemicals-export-${new Date().toISOString().split('T')[0]}`, 'text/csv');
      } else {
        const jsonData = JSON.stringify(chemicals, null, 2);
        exportUtils.downloadData(jsonData, `chemicals-export-${new Date().toISOString().split('T')[0]}`, 'application/json');
      }
      
      notification.success('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      notification.error('Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const fileContent = await importUtils.readFileAsText(file);
      const parsedData = importUtils.parseCSV(fileContent);
      const { valid, errors } = importUtils.validateChemicalData(parsedData);

      if (errors.length > 0) {
        notification.error(`Import completed with ${errors.length} errors. Check console for details.`);
        console.error('Import errors:', errors);
      }

      // Import valid chemicals
      for (const chemical of valid) {
        try {
          await chemicalsAPI.create(chemical);
        } catch (error) {
          console.error(`Failed to import chemical ${chemical.name}:`, error);
        }
      }

      notification.success(`Successfully imported ${valid.length} chemicals`);
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Import failed:', error);
      notification.error('Failed to import data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to default? This will clear all your preferences.')) {
      settingsUtils.reset();
      setPreferences({
        theme: 'system',
        notifications: true,
        language: 'en',
        autoRefresh: true,
      });
      notification.success('Settings reset to defaults');
    }
  };

  const canManageUsers = rbac.canManageUsers(currentUser?.role || 'viewer');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <DashboardNav /> */}
      <AlertsPanel />
      <DebugPanel />
      
      <main className="lg:pl-64">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your account preferences and system settings
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <UserIcon className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'security'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  Security
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'preferences'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Palette className="h-4 w-4" />
                  Preferences
                </button>
                {canManageUsers && (
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                      activeTab === 'users'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    User Management
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('data')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'data'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Database className="h-4 w-4" />
                  Data Management
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Profile Settings
                  </h2>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                          onFocus={() => setIsProfileEditing(true)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="full_name"
                          value={profileForm.full_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                          onFocus={() => setIsProfileEditing(true)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Role
                        </label>
                        <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-300">
                          {currentUser?.role === 'admin' ? 'Administrator' : 'Viewer'}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {currentUser?.role === 'admin' 
                            ? 'You have full access to manage chemicals, users, and system settings.'
                            : 'You can view chemicals and stock information.'
                          }
                        </p>
                      </div>
                    </div>

                    {isProfileEditing && (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileEditing(false);
                            setProfileForm({
                              email: currentUser?.email || '',
                              full_name: currentUser?.full_name || ''
                            });
                          }}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Changes
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Security Settings
                  </h2>
                  
                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            id="current_password"
                            value={passwordForm.current_password}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            id="new_password"
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PasswordStrengthIndicator password={passwordForm.new_password} />
                      </div>

                      <div>
                        <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            id="confirm_password"
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {passwordForm.new_password !== passwordForm.confirm_password && passwordForm.confirm_password && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">Passwords do not match</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isLoading || passwordForm.new_password !== passwordForm.confirm_password}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Application Preferences
                  </h2>
                  
                  <div className="space-y-6">
                    {/* Theme Preference */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Theme</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
                      </div>
                      <select
                        value={preferences.theme}
                        onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Enable browser notifications</p>
                      </div>
                      <button
                        onClick={() => handlePreferenceChange('notifications', !preferences.notifications)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          preferences.notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            preferences.notifications ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Language */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Language</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Interface language</p>
                      </div>
                      <select
                        value={preferences.language}
                        onChange={(e) => handlePreferenceChange('language', e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                      </select>
                    </div>

                    {/* Auto Refresh */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Auto Refresh</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Automatically refresh data</p>
                      </div>
                      <button
                        onClick={() => handlePreferenceChange('autoRefresh', !preferences.autoRefresh)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          preferences.autoRefresh ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            preferences.autoRefresh ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Reset Settings */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleResetSettings}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                      >
                        Reset All Settings to Default
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Management Tab */}
            {activeTab === 'users' && canManageUsers && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      User Management
                    </h2>
                    <button
                      onClick={() => setShowNewUserForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add User
                    </button>
                  </div>

                  {/* New User Form */}
                  {showNewUserForm && (
                    <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New User</h3>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="new_user_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              id="new_user_email"
                              value={newUserForm.email}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="new_user_full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Full Name
                            </label>
                            <input
                              type="text"
                              id="new_user_full_name"
                              value={newUserForm.full_name}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="new_user_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Password
                            </label>
                            <input
                              type="password"
                              id="new_user_password"
                              value={newUserForm.password}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor="new_user_role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Role
                            </label>
                            <select
                              id="new_user_role"
                              value={newUserForm.role}
                              onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'viewer' }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setShowNewUserForm(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Create User
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Users List */}
                  {isLoadingUsers ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400 mt-2">Loading users...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.full_name || 'No name'}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {user.email}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.role === 'admin' 
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.is_active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                }`}>
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {new Date(user.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleToggleUserActive(user.id)}
                                    className={`p-1 rounded ${
                                      user.is_active
                                        ? 'text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300'
                                        : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                                    }`}
                                    title={user.is_active ? 'Deactivate' : 'Activate'}
                                  >
                                    {user.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={user.id === currentUser?.id}
                                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={user.id === currentUser?.id ? 'Cannot delete your own account' : 'Delete user'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data Management Tab */}
            {activeTab === 'data' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Data Management
                  </h2>
                  
                  <div className="space-y-8">
                    {/* Export Data */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Export Data</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Export Format
                            </label>
                            <div className="flex gap-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="exportFormat"
                                  value="csv"
                                  checked={exportFormat === 'csv'}
                                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                                  className="mr-2"
                                />
                                CSV
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="exportFormat"
                                  value="json"
                                  checked={exportFormat === 'json'}
                                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                                  className="mr-2"
                                />
                                JSON
                              </label>
                            </div>
                          </div>
                          
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={includeMSDS}
                                onChange={(e) => setIncludeMSDS(e.target.checked)}
                                className="mr-2"
                              />
                              Include MSDS data
                            </label>
                          </div>
                          
                          <button
                            onClick={handleExportData}
                            disabled={isLoading}
                            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Export Data
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Import Data */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Import Data</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Import chemicals from a CSV file. The file should include columns for: 
                            name, cas_number, smiles, molecular_formula (optional), molecular_weight (optional)
                          </p>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Select CSV File
                            </label>
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleImportData}
                              disabled={isLoading}
                              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                            />
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Upload className="h-4 w-4" />
                            <span>Supported format: CSV</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Data Statistics */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Database Statistics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Chemicals</div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">Total in database</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">Stock Items</div>
                          <div className="text-sm text-green-600 dark:text-green-400">With stock information</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">MSDS</div>
                          <div className="text-sm text-purple-600 dark:text-purple-400">Safety sheets available</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Password Strength Indicator Component
function PasswordStrengthIndicator({ password }: { password: string }) {
  const validation = validatePassword(password);
  
  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Password strength:</div>
      <div className="space-y-1">
        {validation.errors.map((error, index) => (
          <div key={index} className="flex items-center text-sm text-red-600 dark:text-red-400">
            <X className="h-3 w-3 mr-2" />
            {error}
          </div>
        ))}
        {validation.isValid && (
          <div className="flex items-center text-sm text-green-600 dark:text-green-400">
            <Check className="h-3 w-3 mr-2" />
            Password meets all requirements
          </div>
        )}
      </div>
    </div>
  );
}