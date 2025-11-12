'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: 'admin' | 'viewer';
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        console.log('Token invalid, clearing storage');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('🔐 Attempting login for:', email);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      console.log('📤 Sending login request...');
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      console.log('📥 Login response status:', response.status);

      if (!response.ok) {
        let errorDetail = 'Login failed';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
          console.log('❌ Login error details:', errorData);
        } catch (e) {
          const responseText = await response.text();
          console.log('❌ Login response text:', responseText);
          errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();
      console.log('✅ Login successful, data received:', data);
      
      // Check if we have access_token (OAuth2) or just token
      const accessToken = data.access_token || data.token;
      if (!accessToken) {
        throw new Error('No access token received from server');
      }
      
      localStorage.setItem('access_token', accessToken);
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      
      // Get user info - try multiple endpoints
      console.log('🔍 Fetching user info...');
      let userData;
      
      try {
        // Try /auth/me first
        const userResponse = await fetch('http://localhost:8000/auth/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (userResponse.ok) {
          userData = await userResponse.json();
          console.log('✅ User info from /auth/me:', userData);
        } else {
          // Fallback to using data from login response
          console.log('⚠️ /auth/me failed, using login response data');
          userData = data.user || {
            id: data.user_id,
            email: email,
            full_name: data.full_name || email.split('@')[0],
            role: data.role || 'viewer',
            is_active: true,
            created_at: new Date().toISOString()
          };
        }
      } catch (userError) {
        console.log('⚠️ User info fetch failed, using fallback:', userError);
        userData = {
          id: Date.now(),
          email: email,
          full_name: email.split('@')[0],
          role: 'viewer',
          is_active: true,
          created_at: new Date().toISOString()
        };
      }
      
      console.log('✅ Setting user data:', userData);
      setUser(userData);
      console.log('🔄 Redirecting to dashboard...');
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      // Clear any potentially corrupted tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw new Error(error.message || 'Login failed. Please check your credentials and try again.');
    }
  };

  const register = async (email: string, password: string, full_name: string) => {
    console.log('👤 Attempting registration for:', email);
    
    try {
      const userData = {
        email,
        password,
        full_name,
        role: 'viewer' as const
      };

      console.log('📤 Sending registration data:', { ...userData, password: '***' });

      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('📥 Registration response status:', response.status);

      if (!response.ok) {
        let errorDetail = 'Registration failed';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
          console.log('❌ Registration error details:', errorData);
        } catch (e) {
          const responseText = await response.text();
          console.log('❌ Registration response text:', responseText);
          errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const responseData = await response.json();
      console.log('✅ Registration successful:', responseData);
      
      // Auto-login after successful registration
      console.log('🔄 Attempting auto-login after registration...');
      await login(email, password);
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  };

  const googleLogin = async (token: string) => {
    console.log('🔐 Attempting Google OAuth login');
    
    try {
      const response = await fetch('http://localhost:8000/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      console.log('Google OAuth response status:', response.status);

      if (!response.ok) {
        let errorDetail = 'Google authentication failed';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (e) {
          errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorDetail);
      }

      const authData = await response.json();
      console.log('✅ Google OAuth successful, tokens received');
      
      localStorage.setItem('access_token', authData.access_token);
      if (authData.refresh_token) {
        localStorage.setItem('refresh_token', authData.refresh_token);
      }
      
      if (authData.user) {
        console.log('✅ User info received from Google OAuth:', authData.user);
        setUser(authData.user);
        console.log('🔄 Redirecting to dashboard...');
        router.push('/dashboard');
      } else {
        throw new Error('Failed to get user information from Google OAuth');
      }
    } catch (error: any) {
      console.error('❌ Google OAuth failed:', error);
      throw new Error(error.message || 'Google authentication failed. Please try again.');
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    router.push('/'); // FIXED: Redirect to homepage instead of /auth/login
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    googleLogin,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}