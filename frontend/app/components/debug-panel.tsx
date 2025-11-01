'use client';

import { useState, useEffect } from 'react';
import { Bug, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { healthAPI, testAPI, authAPI } from '@/lib/api';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({});
  const [isTesting, setIsTesting] = useState(false);

  const runTests = async () => {
    setIsTesting(true);
    const results: { [key: string]: any } = {};

    try {
      // Test backend health using the new health API
      try {
        const apiHealth = await healthAPI.checkAPI();
        results.api_health = { status: 'success', data: apiHealth };
      } catch (error: any) {
        results.api_health = { status: 'error', error: error.message };
      }

      // Test database using the new health API
      try {
        const dbHealth = await healthAPI.checkDatabase();
        results.database_health = { status: 'success', data: dbHealth };
      } catch (error: any) {
        results.database_health = { status: 'error', error: error.message };
      }

      // Test auth using the new health API
      try {
        const authHealth = await healthAPI.checkAuth();
        results.auth_health = { status: 'success', data: authHealth };
      } catch (error: any) {
        results.auth_health = { status: 'error', error: error.message };
      }

      // Test legacy endpoints for compatibility
      try {
        const legacyHealth = await testAPI.health();
        results.legacy_health = { status: 'success', data: legacyHealth };
      } catch (error: any) {
        results.legacy_health = { status: 'error', error: error.message };
      }

      try {
        const legacyDB = await testAPI.testDB();
        results.legacy_db = { status: 'success', data: legacyDB };
      } catch (error: any) {
        results.legacy_db = { status: 'error', error: error.message };
      }

      try {
        const legacyAuth = await authAPI.test();
        results.legacy_auth = { status: 'success', data: legacyAuth };
      } catch (error: any) {
        results.legacy_auth = { status: 'error', error: error.message };
      }

    } catch (error) {
      console.error('Debug tests failed:', error);
    } finally {
      setIsTesting(false);
      setTestResults(results);
    }
  };

  useEffect(() => {
    if (isOpen && Object.keys(testResults).length === 0) {
      runTests();
    }
  }, [isOpen]);

  const getTestStatus = (testName: string) => {
    const test = testResults[testName];
    if (!test) return 'loading';
    return test.status;
  };

  return (
    <>
      {/* Debug button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 p-3 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg z-50"
        title="Debug Panel"
      >
        <Bug className="h-6 w-6" />
      </button>

      {/* Debug panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Debug Panel
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={runTests}
                    disabled={isTesting}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isTesting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {isTesting ? 'Testing...' : 'Run Tests'}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Health Check Results */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  Health Check Results
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* API Health */}
                  <div className={`p-4 rounded-lg border ${
                    getTestStatus('api_health') === 'success' 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : getTestStatus('api_health') === 'error'
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">API Health</span>
                      {getTestStatus('api_health') === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : getTestStatus('api_health') === 'error' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      /api/health endpoint
                    </div>
                  </div>

                  {/* Database Health */}
                  <div className={`p-4 rounded-lg border ${
                    getTestStatus('database_health') === 'success' 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : getTestStatus('database_health') === 'error'
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Database Health</span>
                      {getTestStatus('database_health') === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : getTestStatus('database_health') === 'error' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      /api/database/health endpoint
                    </div>
                  </div>

                  {/* Auth Health */}
                  <div className={`p-4 rounded-lg border ${
                    getTestStatus('auth_health') === 'success' 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                      : getTestStatus('auth_health') === 'error'
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Auth Health</span>
                      {getTestStatus('auth_health') === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : getTestStatus('auth_health') === 'error' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      /api/auth/health endpoint
                    </div>
                  </div>
                </div>
              </div>

              {/* Legacy Endpoints */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Legacy Endpoint Tests
                </h3>
                <div className="space-y-2">
                  {['legacy_health', 'legacy_db', 'legacy_auth'].map((test) => (
                    <div key={test} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="capitalize">{test.replace('_', ' ')}</span>
                      {testResults[test] ? (
                        testResults[test].status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )
                      ) : (
                        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Detailed Results
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto max-h-60">
                  {JSON.stringify(testResults, null, 2)}
                </pre>
              </div>

              {/* Environment Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Environment Info
                </h3>
                <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm space-y-2">
                  <div><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</div>
                  <div><strong>Frontend:</strong> {typeof window !== 'undefined' ? window.location.origin : 'Server'}</div>
                  <div><strong>Backend Status:</strong> {testResults.api_health?.status || 'Unknown'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}