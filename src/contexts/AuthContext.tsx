import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { API_BASE, httpFetch } from '@/config/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: string[];
  status: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshToken: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // API_BASE is now imported from config

  // Check if user is authenticated on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshTokenStored = localStorage.getItem('refreshToken');
      const savedUser = localStorage.getItem('user');
      
      console.log('🔐 Auth initialization:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshTokenStored, hasSavedUser: !!savedUser });
      
      if (accessToken && savedUser) {
        // If we have saved user data, restore it immediately
        try {
          setUser(JSON.parse(savedUser));
          setIsLoading(false);
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
          setIsLoading(false);
        }
      } else if (refreshTokenStored) {
        // Try to refresh token if we don't have access token but have refresh token
        console.log('🔄 Attempting token refresh...');
        try {
          const response = await httpFetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: refreshTokenStored }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Token refresh successful');
            localStorage.setItem('accessToken', data.accessToken);
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
              setUser(data.user);
            }
          } else {
            console.warn('❌ Token refresh failed');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Auth initialization error:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          setUser(null);
        }
        setIsLoading(false);
      } else {
        console.log('⚠️ No auth tokens found');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-refresh token every 6 days (before 7-day expiration)
  useEffect(() => {
    if (!user) return;

    // Refresh token every 6 days (518400000 ms)
    const refreshInterval = setInterval(async () => {
      console.log('🔄 Proactive token refresh (scheduled)');
      const success = await refreshToken();
      if (!success) {
        console.warn('⚠️ Scheduled token refresh failed, logging out');
        logout();
      }
    }, 6 * 24 * 60 * 60 * 1000); // 6 days

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await httpFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.firstName}!`,
        });
        return true;
      } else {
        toast({
          title: "Login Failed", 
          description: data.error || "Invalid email or password. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed", 
        description: "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshTokenStored = localStorage.getItem('refreshToken');
      
      if (!refreshTokenStored) {
        console.warn('⚠️ No refresh token available');
        return false;
      }

      console.log('🔄 Refreshing token...');
      const response = await httpFetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenStored }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Token refreshed successfully');
        localStorage.setItem('accessToken', data.accessToken);
        // If user data is returned, update it and save to localStorage
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
        return true;
      } else {
        console.error('❌ Token refresh failed:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.warn('⚠️ No access token available');
        return;
      }

      console.log('🔄 Refreshing user data...');
      const response = await httpFetch(`${API_BASE}/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log('✅ User data refreshed successfully');
          localStorage.setItem('user', JSON.stringify(data.data));
          setUser(data.data);
        }
      } else {
        console.error('❌ User refresh failed');
      }
    } catch (error) {
      console.error('❌ User refresh error:', error);
    }
  };

  const logout = async () => {
    try {
      const refreshTokenStored = localStorage.getItem('refreshToken');
      const accessToken = localStorage.getItem('accessToken');

      // Mark voice presence offline BEFORE clearing tokens (best-effort)
      if (accessToken) {
        try {
          await httpFetch(`${API_BASE}/calls/presence`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ online: false }),
          });
        } catch {
          // ignore
        }
      }

      // Call logout endpoint to invalidate refresh token
      await httpFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenStored }),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    }
  };

  // Set up axios interceptor or fetch wrapper for automatic token refresh
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshSuccess = await refreshToken();
      if (refreshSuccess) {
        // Retry the request with new token
        const newAccessToken = localStorage.getItem('accessToken');
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newAccessToken}`,
          },
        });
      } else {
        // Refresh failed, redirect to login
        logout();
        throw new Error('Authentication failed');
      }
    }

    return response;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
    refreshToken,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
