// API Configuration
export const getApiBaseUrl = (): string => {
  // Force HTTP protocol, never HTTPS
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://20.200.122.55:4000/api/v1';
  
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
