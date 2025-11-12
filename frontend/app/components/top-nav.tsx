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

// Remove Settings from main navigation
const navigation = [
  { name: 'Search', href: '/dashboard/search', icon: Search },
  { name: 'Add Chemical', href: '/dashboard/add', icon: Package },
  { name: 'Stock', href: '/dashboard/stock', icon: Package },
  { name: 'MSDS', href: '/dashboard/msds', icon: FileText },
  // Settings removed from main nav - now in user dropdown
];

export function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-[#2e0249] border-b border-[#f806cc]/20 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Left side - Logo and Branding */}
            <div className="flex items-center gap-4">
              {/* Logo - Plain without background/border */}
              <Link href="/dashboard" className="flex items-center">
                <Image 
                  src="/logo_reychemiq.png" 
                  alt="ReyChemIQ" 
                  width={40} 
                  height={40}
                  className="text-white"
                />
              </Link>

              {/* Branding Section */}
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white font-poppins">
                  ReyChem<span className="text-cyan-300">IQ</span>
                </h1>
                <p className="text-xs text-cyan-200/80">
                  Smart Chemistry. Intelligent Inventory.
                </p>
              </div>
            </div>

            {/* Right side - Navigation and Controls */}
            <div className="flex items-center space-x-2">
              {/* Desktop Navigation */}
              <div className="hidden md:flex md:items-center md:space-x-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-[#f806cc]/20 text-[#f806cc] border border-[#f806cc]/30 shadow-lg shadow-[#f806cc]/10'
                          : 'text-white/80 hover:bg-[#f806cc]/10 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Theme Toggle */}
              <div className="bg-[#f806cc]/10 rounded-xl p-2">
                <ThemeToggle />
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white hover:bg-[#f806cc]/20 rounded-xl transition-colors border border-[#f806cc]/20"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:block max-w-32 truncate">
                    {user?.full_name || user?.email}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#2e0249] rounded-xl shadow-xl border border-[#f806cc]/20 py-2 z-50 backdrop-blur-sm">
                    <div className="px-4 py-3 border-b border-[#f806cc]/20">
                      <div className="text-xs text-white/60">Logged in as:</div>
                      <div className="font-medium text-white truncate text-sm">
                        {user?.email}
                      </div>
                      <div className="text-xs text-[#f806cc] mt-1">
                        Role: <span className="font-semibold capitalize">{user?.role}</span>
                      </div>
                    </div>
                    
                    {/* Settings Link in Dropdown */}
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-[#f806cc]/20 transition-colors border-b border-[#f806cc]/10"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    
                    <div className="px-4 py-2 text-xs text-white/60 border-b border-[#f806cc]/20">
                      Developed by Mann, Reyaan & Vishal
                    </div>
                    
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-[#f806cc]/20 transition-colors"
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
                className="md:hidden p-2 rounded-xl text-white hover:bg-[#f806cc]/20 border border-[#f806cc]/20"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#f806cc]/20 bg-[#2e0249]/95 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all ${
                      isActive
                        ? 'bg-[#f806cc]/20 text-[#f806cc] border border-[#f806cc]/30'
                        : 'text-white/80 hover:bg-[#f806cc]/10 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              {/* Settings in mobile menu */}
              <Link
                href="/dashboard/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium text-white/80 hover:bg-[#f806cc]/10 hover:text-white border border-transparent"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Link>
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