// API Configuration - Environment variable first, then fallback to server URL
export const getApiBaseUrl = (): string => {
  // First, try to read from environment variable (only VITE_API_URL)
  const envApiUrl = import.meta.env.VITE_API_URL;
  
  if (envApiUrl) {
    // If environment variable exists, use it
    const apiUrl = envApiUrl.replace(/\/$/, ''); // Remove trailing slash if any
    
    // Check if /api/v1 is already included, if not add it
    if (apiUrl.endsWith('/api/v1')) {
      return apiUrl;
    }
    return `${apiUrl}/api/v1`;
  }
  
  // Fallback to hardcoded server URL if env variable not found
  return 'https://realestate.withai.agency/api/v1';
};

export const API_BASE = getApiBaseUrl();

// Fetch wrapper for API calls
export const httpFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  };

  return fetch(url, defaultOptions);
};

// Helper function for API calls with automatic token refresh
export const makeApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let accessToken = localStorage.getItem('accessToken');
  
  const response = await httpFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  
  // If token expired, try to refresh and retry
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshResponse = await httpFetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const { accessToken: newAccessToken } = await refreshResponse.json();
          localStorage.setItem('accessToken', newAccessToken);
          
          // Retry original request with new token
          return httpFetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newAccessToken}`,
              ...options.headers,
            },
          });
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Redirect to login or handle auth failure
        window.location.href = '/admin-login';
      }
    } else {
      // No refresh token available, redirect to login
      window.location.href = '/admin-login';
    }
  }
  
  return response;
};