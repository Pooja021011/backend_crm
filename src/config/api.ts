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
  // Don't override headers if they're already set (especially for FormData)
  const headers = options?.headers || {};
  
  const defaultOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, defaultOptions);
};

// Helper function for API calls with automatic token refresh
export const makeApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let accessToken = localStorage.getItem('accessToken');
  
  // Don't set Content-Type for FormData - browser will set it automatically with boundary
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers as Record<string, string>,
  };
  
  // Only add Content-Type for non-FormData requests
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await httpFetch(url, {
    ...options,
    headers,
  });
  
  // If token expired, try to refresh and retry
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    console.log('🔄 Token expired, attempting refresh. RefreshToken exists:', !!refreshToken);
    
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken }),
        });

        console.log('🔄 Refresh response status:', refreshResponse.status);

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          console.log('✅ Token refresh successful');
          const newAccessToken = data.accessToken || data.data?.accessToken;
          
          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            
            // Retry original request with new token
            const retryHeaders: Record<string, string> = {
              'Authorization': `Bearer ${newAccessToken}`,
              ...options.headers as Record<string, string>,
            };
            
            // Only add Content-Type for non-FormData requests
            if (!isFormData && !retryHeaders['Content-Type']) {
              retryHeaders['Content-Type'] = 'application/json';
            }
            
            return httpFetch(url, {
              ...options,
              headers: retryHeaders,
            });
          } else {
            console.error('❌ No access token in refresh response');
            localStorage.clear();
            window.location.href = '/login';
          }
        } else {
          console.error('❌ Token refresh failed with status:', refreshResponse.status);
          const errorData = await refreshResponse.json();
          console.error('Error details:', errorData);
          // Clear storage and redirect
          localStorage.clear();
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('❌ Token refresh error:', error);
        // Clear storage and redirect to login
        localStorage.clear();
        window.location.href = '/login';
      }
    } else {
      console.warn('⚠️ No refresh token available');
      // No refresh token available, clear storage and redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }
  }
  
  return response;
};