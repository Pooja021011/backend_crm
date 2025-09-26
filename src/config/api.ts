// API Configuration
export const getApiBaseUrl = (): string => {
  // Force HTTP protocol, never HTTPS
  // Use localhost for development, remote server for production
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
  const defaultUrl = isDev ? 'http://localhost:4000/api/v1' : 'http://20.200.122.55:4000/api/v1';
  const baseUrl = import.meta.env.VITE_API_BASE_URL || defaultUrl;
  
  // Ensure URL starts with http:// (not https://)
  if (baseUrl.startsWith('https://')) {
    return baseUrl.replace('https://', 'http://');
  }
  
  if (!baseUrl.startsWith('http://')) {
    return `http://${baseUrl}`;
  }
  
  return baseUrl;
};

export const API_BASE = getApiBaseUrl();

// HTTP fetch wrapper that forces HTTP
export const httpFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  // Ensure URL uses HTTP
  const httpUrl = url.startsWith('https://') ? url.replace('https://', 'http://') : url;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // Prevent HTTPS upgrade requests
      'Upgrade-Insecure-Requests': '0',
      ...options?.headers,
    },
    ...options,
  };

  return fetch(httpUrl, defaultOptions);
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
