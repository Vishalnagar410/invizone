// app/auth/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Beaker, Mail, Lock, User, Eye, EyeOff, Bug } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  // Debug: Log when component mounts and check environment
  useEffect(() => {
    console.log('🔧 Register page mounted');
    console.log('🌐 API URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('🔑 Auth context available:', !!register);
  }, [register]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    console.log('🔄 Starting registration process...');
    console.log('📝 Form data:', { name, email, password: '***' });

    try {
      await register(email, password, name);
      console.log('✅ Registration completed successfully in page component');
      // No need to push to dashboard here - it's handled in the auth context after auto-login
    } catch (error: any) {
      console.error('❌ Registration failed in page component:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Test direct API call for debugging
  const testDirectRegistration = async () => {
    console.log('🧪 Testing direct registration API call...');
    
    const testData = {
      email: `test${Date.now()}@example.com`,
      password: "testpassword123",
      full_name: "Test User",
      role: "viewer"
    };

    try {
      console.log('📤 Sending test data:', testData);
      
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      console.log('🧪 Direct test response status:', response.status);
      
      const responseText = await response.text();
      console.log('🧪 Direct test response body:', responseText);

      if (response.ok) {
        console.log('✅ Direct registration test SUCCESS');
        try {
          const data = JSON.parse(responseText);
          console.log('✅ Parsed response data:', data);
          
          // Test login with the newly created account
          console.log('🔄 Testing login with new account...');
          const loginFormData = new URLSearchParams();
          loginFormData.append('username', testData.email);
          loginFormData.append('password', testData.password);

          const loginResponse = await fetch('http://localhost:8000/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: loginFormData,
          });

          console.log('🧪 Login test response status:', loginResponse.status);
          const loginResponseText = await loginResponse.text();
          console.log('🧪 Login test response body:', loginResponseText);

          if (loginResponse.ok) {
            console.log('✅ Login test SUCCESS - Account works!');
            alert('✅ Registration and login test SUCCESSFUL! The account was created and can be used to login.');
          } else {
            console.log('❌ Login test FAILED');
            alert('❌ Registration worked but login failed. Check backend logs.');
          }

        } catch (e) {
          console.log('⚠️ Response is not JSON:', responseText);
        }
      } else {
        console.log('❌ Direct registration test FAILED');
        console.log('❌ Error details:', responseText);
        alert(`❌ Registration failed: ${response.status} - ${responseText}`);
      }
    } catch (error) {
      console.error('❌ Direct test error:', error);
      alert(`❌ Network error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-chemical-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center items-center mb-6">
            <Beaker className="h-12 w-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              SmartChem<span className="text-primary-600">View</span>
            </h1>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Or{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        {/* Debug Button - Remove in production */}
        <div className="text-center">
          <button
            onClick={testDirectRegistration}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm mb-4 flex items-center gap-2 mx-auto"
          >
            <Bug className="h-4 w-4" />
            Test Registration API
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <strong>Registration Error:</strong> {error}
          </div>
        )}

        {/* Registration Form */}
        <form className="mt-8 space-y-6 card p-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Create a password"
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            <Link
              href="/auth/login"
              className="block text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              Already have an account? Sign in
            </Link>
            <Link
              href="/"
              className="block text-sm text-gray-600 hover:text-gray-500 font-medium"
            >
              ← Back to home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}