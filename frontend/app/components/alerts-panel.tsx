'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X, Bell } from 'lucide-react';
import { Alert as AlertType } from '@/types';
import { stockAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const loadAlerts = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const activeAlerts = await stockAPI.getAlerts();
      setAlerts(activeAlerts.filter(alert => !alert.is_resolved));
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await stockAPI.resolveAlert(alertId);
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  useEffect(() => {
    loadAlerts();
    
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = alerts.length;

  if (!user || unreadCount === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Alert Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
      >
        <Bell className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Alerts Panel */}
      {isOpen && (
        <div className="absolute top-16 right-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Active Alerts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white mb-1">
                          {alert.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                      {user.role === 'admin' && (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="p-1 text-green-600 hover:text-green-700 transition-colors flex-shrink-0"
                          title="Mark as resolved"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {user.role === 'admin' && alerts.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => alerts.forEach(alert => handleResolveAlert(alert.id))}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
              >
                Resolve All Alerts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}