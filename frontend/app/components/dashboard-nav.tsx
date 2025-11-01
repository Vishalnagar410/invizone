'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Beaker, 
  Search, 
  Package, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X 
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Beaker },
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'Add Chemical', href: '/dashboard/add', icon: Package },
  { name: 'Stock', href: '/dashboard/stock', icon: Package },
  { name: 'MSDS', href: '/dashboard/msds', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
            <Beaker className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                SmartChem<span className="text-primary-600">View</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.role === 'admin' ? 'Administrator' : 'Viewer'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div>Logged in as: {user?.email}</div>
              <div>Role: {user?.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}