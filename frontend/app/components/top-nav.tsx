'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Search, 
  Package, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  User
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';
import { useState } from 'react';
import Image from 'next/image';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Package },
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'Add Chemical', href: '/dashboard/add', icon: Package },
  { name: 'Stock', href: '/dashboard/stock', icon: Package },
  { name: 'MSDS', href: '/dashboard/msds', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-midnight-blue border-b border-cyan-500/20 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-cyan-500 rounded-lg">
                  <Image 
                    src="/logo_reychemiq.svg" 
                    alt="ReyChemIQ" 
                    width={32} 
                    height={32}
                    className="text-white"
                  />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-white font-poppins">
                    ReyChem<span className="text-cyan-300">IQ</span>
                  </h1>
                  <p className="text-xs text-cyan-200/80">
                    Smart Chemistry. Intelligent Inventory.
                  </p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:ml-8 md:flex md:items-center md:space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                          : 'text-cyan-100/80 hover:bg-cyan-500/10 hover:text-cyan-200 border border-transparent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side - User menu and controls */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <div className="bg-cyan-500/10 rounded-lg p-1">
                <ThemeToggle />
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/20 rounded-lg transition-colors border border-cyan-500/20"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:block max-w-32 truncate">
                    {user?.full_name || user?.email}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-midnight-blue rounded-lg shadow-xl border border-cyan-500/20 py-2 z-50 backdrop-blur-sm">
                    <div className="px-4 py-3 border-b border-cyan-500/20">
                      <div className="text-xs text-cyan-200/60">Logged in as:</div>
                      <div className="font-medium text-cyan-100 truncate text-sm">
                        {user?.email}
                      </div>
                      <div className="text-xs text-cyan-300 mt-1">
                        Role: <span className="font-semibold capitalize">{user?.role}</span>
                      </div>
                    </div>
                    
                    <div className="px-4 py-2 text-xs text-cyan-200/60 border-b border-cyan-500/20">
                      Developed by Mann, Reyaan & Vishal
                    </div>
                    
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-cyan-100 hover:bg-cyan-500/20 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-cyan-100 hover:bg-cyan-500/20 border border-cyan-500/20"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-cyan-500/20 bg-midnight-blue/95 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-cyan-100/80 hover:bg-cyan-500/10 hover:text-cyan-200 border border-transparent'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}