'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Beaker, Search, BarChart3, Shield, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'features' | 'login' | 'register'>('features');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(loginEmail, loginPassword);
    } catch (error: any) {
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(registerEmail, registerPassword, registerName);
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    alert('Google OAuth integration is ready! Backend endpoints are set up.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2e0249] via-[#570a57] to-[#a91079]">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center mb-6">
            {/* Logo - Clean without borders/background */}
            <div className="mr-4">
              <Image 
                src="/logo_reychemiq.png" 
                alt="ReyChemIQ" 
                width={100}
                height={100}
                className="rounded-lg"
                priority
              />
            </div>
            <h1 className="text-6xl font-bold text-white font-poppins">
              ReyChem<span className="text-[#f806cc]">IQ</span>
            </h1>
          </div>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Advanced stock monitoring platform for modern laboratories and research facilities.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('features')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'features' 
                    ? 'bg-[#f806cc] text-white shadow-lg' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Features
              </button>
              <button
                onClick={() => setActiveTab('login')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'login' 
                    ? 'bg-[#f806cc] text-white shadow-lg' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'register' 
                    ? 'bg-[#f806cc] text-white shadow-lg' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'features' && (
            <div className="space-y-8">
              {/* Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6 text-center">
                  <Search className="h-12 w-12 text-[#f806cc] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                    Chemical Search
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Search by name, CAS number, SMILES, or molecular formula with structure-based queries.
                  </p>
                </div>

                <div className="card p-6 text-center">
                  <Beaker className="h-12 w-12 text-[#a91079] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                    Structure Editor
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Draw and edit chemical structures with visualization and validation for stock entry.
                  </p>
                </div>

                <div className="card p-6 text-center">
                  <BarChart3 className="h-12 w-12 text-[#570a57] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                    Stock Monitoring
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Track chemical inventory with automatic low-stock alerts and email notifications.
                  </p>
                </div>

                <div className="card p-6 text-center">
                  <Shield className="h-12 w-12 text-[#2e0249] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                    Safety Integration
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Access safety hazard information with Risk evaluation.
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
                    <button
                      onClick={() => setActiveTab('login')}
                      className="btn-primary"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setActiveTab('register')}
                      className="btn-secondary"
                    >
                      Get Started
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'login' && (
            <div className="max-w-md mx-auto">
              <div className="card p-8">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
                  Sign In to Your Account
                </h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="loginEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="loginEmail"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f806cc] focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="loginPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="loginPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f806cc] focus:border-transparent"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary py-3"
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={handleGoogleAuth}
                      className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="text-[#f806cc] hover:text-[#a91079] font-medium"
                  >
                    Don't have an account? Sign up
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <div className="max-w-md mx-auto">
              <div className="card p-8">
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
                  Create Your Account
                </h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="registerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="registerName"
                        type="text"
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f806cc] focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="registerEmail"
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f806cc] focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registerPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        id="registerPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f806cc] focus:border-transparent"
                        placeholder="Create a password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary py-3"
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={handleGoogleAuth}
                      className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </button>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setActiveTab('login')}
                    className="text-[#f806cc] hover:text-[#a91079] font-medium"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}