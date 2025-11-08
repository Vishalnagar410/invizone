import Link from 'next/link';
import { Beaker, Search, BarChart3, Shield } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-chemical-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center mb-6">
            <Beaker className="h-12 w-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              SmartChem<span className="text-primary-600">View</span>
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Advanced chemical search, structure editing, and stock monitoring platform 
            for modern laboratories and research facilities.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="card p-6 text-center">
            <Search className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Chemical Search
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Search by name, CAS number, SMILES, or molecular formula with structure-based queries.
            </p>
          </div>

          <div className="card p-6 text-center">
            <Beaker className="h-12 w-12 text-chemical-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Structure Editor
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Draw and edit chemical structures with RDKit-powered visualization and validation.
            </p>
          </div>

          <div className="card p-6 text-center">
            <BarChart3 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Stock Monitoring
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Track chemical inventory with automatic low-stock alerts and email notifications.
            </p>
          </div>

          <div className="card p-6 text-center">
            <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              MSDS Integration
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Access safety data sheets with hazard information and handling guidelines.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="card p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Ready to streamline your chemical management?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Join thousands of researchers and laboratories using ReyChemIQ to manage their chemical inventory efficiently.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/login"
                className="btn-primary"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-secondary"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}