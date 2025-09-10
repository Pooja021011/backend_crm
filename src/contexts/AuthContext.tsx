import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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

  const API_BASE = 'http://localhost:4000/api/v1';

  // Check if user is authenticated on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');
      
      if (accessToken) {
        // If we have saved user data, restore it immediately
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch (error) {
            console.error('Error parsing saved user data:', error);
            localStorage.removeItem('user');
          }
        }
        
        try {
          // Try to refresh token to validate session
          const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('accessToken', data.accessToken);
            if (data.user) {
              localStorage.setItem('user', JSON.stringify(data.user));
              setUser(data.user);
            }
          } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [API_BASE]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/auth/login`, {
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
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        // If user data is returned, update it and save to localStorage
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
        }
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate refresh token
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
