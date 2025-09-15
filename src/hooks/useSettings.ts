import { useState, useEffect } from 'react';

export interface Market {
  id: string;
  name: string;
}

export interface County {
  id: string;
  name: string;
  marketId: string;
}

export interface LeadSource {
  id: string;
  name: string;
  active: boolean;
}

export interface AssetClass {
  id: string;
  name: string;
  active: boolean;
}

export interface PriceRange {
  id: string;
  label: string;
  min: number | null;
  max: number | null;
}

export interface DocCategory {
  id: string;
  name: string;
}

export interface SettingsHookReturn {
  markets: Market[];
  counties: County[];
  leadSources: LeadSource[];
  assetClasses: AssetClass[];
  priceRanges: PriceRange[];
  docCategories: DocCategory[];
  isLoading: boolean;
  error: string | null;
  getCountiesByMarket: (marketId: string) => County[];
  refreshSettings: () => Promise<void>;
}

import { API_BASE, httpFetch } from '@/config/api';

export const useSettings = (): SettingsHookReturn => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [counties, setCounties] = useState<County[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClass[]>([]);
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);
  const [docCategories, setDocCategories] = useState<DocCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const makeAuthenticatedRequest = async (url: string) => {
    const accessToken = localStorage.getItem('accessToken');
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const fetchAllSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [
        marketsResponse,
        countiesResponse,
        leadSourcesResponse,
        assetClassesResponse,
        priceRangesResponse,
        docCategoriesResponse
      ] = await Promise.all([
        makeAuthenticatedRequest(`${API_BASE}/settings/markets`),
        makeAuthenticatedRequest(`${API_BASE}/settings/counties`),
        makeAuthenticatedRequest(`${API_BASE}/settings/lead-sources`),
        makeAuthenticatedRequest(`${API_BASE}/settings/asset-classes`),
        makeAuthenticatedRequest(`${API_BASE}/settings/price-ranges`),
        makeAuthenticatedRequest(`${API_BASE}/settings/doc-categories`)
      ]);

      setMarkets(marketsResponse.data || []);
      setCounties(countiesResponse.data || []);
      setLeadSources(leadSourcesResponse.data?.filter((ls: LeadSource) => ls.active) || []);
      setAssetClasses(assetClassesResponse.data?.filter((ac: AssetClass) => ac.active) || []);
      setPriceRanges(priceRangesResponse.data || []);
      setDocCategories(docCategoriesResponse.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings';
      setError(errorMessage);
      console.error('Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCountiesByMarket = (marketId: string): County[] => {
    return counties.filter(county => county.marketId === marketId);
  };

  const refreshSettings = async (): Promise<void> => {
    await fetchAllSettings();
  };

  // Load settings on mount
  useEffect(() => {
    fetchAllSettings();
  }, []);

  return {
    markets,
    counties,
    leadSources,
    assetClasses,
    priceRanges,
    docCategories,
    isLoading,
    error,
    getCountiesByMarket,
    refreshSettings,
  };
};
