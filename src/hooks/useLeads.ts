import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type LeadType = 'SELLER' | 'BUYER' | 'VENDOR';

export interface Address {
  address1: string;
  city: string;
  state: string;
  zip: string;
  countyId?: string;
}

export interface Seller {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  motivation?: string;
  notes?: string;
}

export interface Buyer {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  vip?: boolean;
  propertiesPurchased?: number;
  creditScore?: string;
  preApproved?: boolean;
  motivation?: string;
  timeline?: string;
}

export interface Vendor {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  industry: string;
  marketIds?: string[];
}

export interface BuyerCriteria {
  marketIds?: string[];
  assetClassIds?: string[];
  priceRangeIds?: string[];
}

export interface CreateSellerLeadData {
  type: 'SELLER';
  marketId?: string;
  address: Address;
  seller: Seller;
  assignedUserId?: string;
  pipelineStageId?: string;
}

export interface CreateBuyerLeadData {
  type: 'BUYER';
  marketId?: string;
  buyer: Buyer;
  criteria?: BuyerCriteria;
  assignedUserId?: string;
  pipelineStageId?: string;
}

export interface CreateVendorLeadData {
  type: 'VENDOR';
  marketId?: string;
  vendor: Vendor;
  assignedUserId?: string;
  pipelineStageId?: string;
}

export type CreateLeadData = CreateSellerLeadData | CreateBuyerLeadData | CreateVendorLeadData;

export interface Lead {
  id: string;
  leadType: LeadType; // API uses leadType, not type
  status?: string;
  leadStatusId?: string;
  leadStatus?: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    orderIndex: number;
    active: boolean;
    isDefault: boolean;
  };
  createdAt: string;
  updatedAt: string;
  assignedUserId?: string;
  pipelineStageId?: string;
  marketId?: string;
  // Type-specific data (these come from API includes)
  address?: Address;
  seller?: Seller;
  buyer?: Buyer;
  vendor?: Vendor;
  buyerCriteria?: BuyerCriteria; // API uses buyerCriteria, not criteria
}

export interface LeadsListParams {
  type?: LeadType;
  marketId?: string;
  marketIds?: string[]; // Multiple markets
  pipelineStageId?: string;
  pipelineStageIds?: string[]; // Multiple pipeline stages
  status?: string;
  leadStatusId?: string;
  leadStatusIds?: string[]; // Multiple lead statuses
  assignedUserId?: string;
  assignedUserIds?: string[]; // Multiple assigned users
  leadSourceId?: string;
  leadSourceIds?: string[]; // Multiple lead sources
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  skip?: number;
  take?: number;
  createdFrom?: string; // UTC ISO datetime string
  createdTo?: string; // UTC ISO datetime string
}

export interface LeadsHookReturn {
  leads: Lead[];
  isLoading: boolean;
  error: string | null;
  createLead: (data: CreateLeadData) => Promise<Lead>;
  updateLead: (id: string, data: Partial<CreateLeadData>) => Promise<Lead>;
  deleteLead: (id: string) => Promise<void>;
  getLead: (id: string) => Promise<Lead>;
  listLeads: (params?: LeadsListParams) => Promise<Lead[]>;
  refreshLeads: () => Promise<void>;
  fetchLeads: () => Promise<void>;
  getLeadsByType: (type: LeadType) => Lead[];
  searchLeads: (query: string) => Lead[];
  filterLeads: (filters: any) => Promise<void>;
  importLeadsFromCSV: (file: File, type: LeadType) => Promise<{ success: number; errors: string[] }>;
  exportLeadsToCSV: (leadsToExport: Lead[], type: LeadType) => void;
  sortLeads: (leadsToSort: Lead[], key: string, direction: 'asc' | 'desc') => Lead[];
}

import { API_BASE, httpFetch } from '@/config/api';

export const useLeads = (): LeadsHookReturn => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      // Check if request was aborted
      if ((options.signal as AbortSignal)?.aborted) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (err) {
      // Re-throw AbortError as-is
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Request aborted');
      }
      throw err;
    }
  };

  const createLead = async (data: CreateLeadData): Promise<Lead> => {
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/leads`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      const newLead = response.data;
      setLeads(prevLeads => [...prevLeads, newLead]);
      return newLead;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateLead = async (id: string, data: Partial<CreateLeadData>): Promise<Lead> => {
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      
      const updatedLead = response.data;
      setLeads(prevLeads => 
        prevLeads.map(lead => lead.id === id ? updatedLead : lead)
      );
      return updatedLead;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteLead = async (id: string): Promise<void> => {
    setError(null);
    try {
      await makeAuthenticatedRequest(`${API_BASE}/leads/${id}`, {
        method: 'DELETE',
      });
      
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getLead = async (id: string): Promise<Lead> => {
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/leads/${id}`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get lead';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const listLeads = useCallback(async (params?: LeadsListParams, signal?: AbortSignal): Promise<Lead[]> => {
    // Don't proceed if signal is already aborted
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }
    
    setError(null);
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Handle arrays by appending each value separately
            if (Array.isArray(value)) {
              value.forEach(item => {
                queryParams.append(key, item.toString());
              });
            } else {
              queryParams.append(key, value.toString());
            }
          }
        });
      }
      
      const url = `${API_BASE}/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await makeAuthenticatedRequest(url, { signal });
      
      // Check if request was aborted before updating state
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      
      setLeads(response.data);
      return response.data;
    } catch (err) {
      // Don't set error or throw if request was aborted
      if (err instanceof Error && err.message === 'Request aborted') {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to list leads';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      // Only set loading to false if request wasn't aborted
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []); // Empty deps - function doesn't depend on any props/state

  const refreshLeads = async (): Promise<void> => {
    await listLeads();
  };

  const fetchLeads = async (): Promise<void> => {
    await listLeads({ take: 10000 }); // Fetch up to 10000 leads to ensure all leads are loaded
  };

  const getLeadsByType = (type: LeadType): Lead[] => {
    return leads.filter(lead => lead.leadType === type);
  };

  const searchLeads = (query: string): Lead[] => {
    if (!query.trim()) return leads;
    
    const lowercaseQuery = query.toLowerCase();
    return leads.filter(lead => {
      // Search in different fields based on lead type
      const searchFields = [];
      
      if (lead.seller) {
        searchFields.push(
          lead.seller.firstName,
          lead.seller.lastName,
          lead.seller.email,
          lead.seller.phone
        );
      }
      
      if (lead.buyer) {
        searchFields.push(
          lead.buyer.firstName,
          lead.buyer.lastName,
          lead.buyer.email,
          lead.buyer.phone
        );
      }
      
      if (lead.vendor) {
        searchFields.push(
          lead.vendor.firstName,
          lead.vendor.lastName,
          lead.vendor.email,
          lead.vendor.phone,
          lead.vendor.company,
          lead.vendor.industry
        );
      }
      
      if (lead.address) {
        searchFields.push(
          lead.address.address1,
          lead.address.city,
          lead.address.state,
          lead.address.zip
        );
      }
      
      return searchFields.some(field => 
        field && field.toLowerCase().includes(lowercaseQuery)
      );
    });
  };

  const filterLeads = async (filters: any) => {
    setIsLoading(true);
    setError(null);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, String(value));
          }
        }
      });
      
      const response = await httpFetch(`/leads?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to filter leads');
      }
      
      setLeads(data.data || []);
    } catch (err) {
      console.error('Filter error:', err);
      setError(err instanceof Error ? err.message : 'Failed to filter leads');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const importLeadsFromCSV = async (file: File, type: LeadType): Promise<{ success: number; errors: string[] }> => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) {
        return { success: 0, errors: ['CSV file is empty or contains no data rows'] };
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').replace(/\*/g, ''));
      const dataRows = lines.slice(1);
      
      let successCount = 0;
      const errors: string[] = [];

      // Helper function to find header value case-insensitively
      const getFieldValue = (data: Record<string, string>, fieldName: string): string => {
        const key = Object.keys(data).find(k => k.toLowerCase().replace(/\s/g, '') === fieldName.toLowerCase().replace(/\s/g, ''));
        return key ? data[key] : '';
      };

      for (let i = 0; i < dataRows.length; i++) {
        try {
          const rowData = dataRows[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
          const rowIndex = i + 2; // +2 because we skip header and arrays are 0-indexed
          
          // Skip empty rows
          if (rowData.every(cell => !cell)) {
            continue;
          }
          
          // Create a data object from headers and row data
          const data: Record<string, string> = {};
          headers.forEach((header, index) => {
            data[header] = rowData[index] || '';
          });

          // Get required fields using flexible matching
          const firstName = getFieldValue(data, 'firstname') || getFieldValue(data, 'first name');
          const lastName = getFieldValue(data, 'lastname') || getFieldValue(data, 'last name');
          const email = getFieldValue(data, 'email');
          const phone = getFieldValue(data, 'phone');

          // Validate required fields
          if (!firstName || !lastName || !email || !phone) {
            const missing = [];
            if (!firstName) missing.push('First Name');
            if (!lastName) missing.push('Last Name');
            if (!email) missing.push('Email');
            if (!phone) missing.push('Phone');
            errors.push(`Row ${rowIndex}: Missing required fields (${missing.join(', ')})`);
            continue;
          }

          // Create lead data based on type
          let leadData: any;
          
          if (type === 'SELLER') {
            const address = getFieldValue(data, 'address');
            leadData = {
              type: 'SELLER',
              assignedUserId: user?.id, // Assign to the user who is importing
              seller: {
                firstName,
                lastName,
                phone,
                email,
                motivation: getFieldValue(data, 'motivation') || 'Medium'
              },
              address: address ? {
                address1: address,
                city: getFieldValue(data, 'city') || '',
                state: getFieldValue(data, 'state') || '',
                zip: getFieldValue(data, 'zip') || ''
              } : undefined,
              notes: getFieldValue(data, 'notes') || undefined,
              leadSource: getFieldValue(data, 'lead source') || getFieldValue(data, 'leadsource') || undefined
            };
          } else if (type === 'BUYER') {
            const vipValue = getFieldValue(data, 'vip');
            leadData = {
              type: 'BUYER',
              assignedUserId: user?.id, // Assign to the user who is importing
              buyer: {
                firstName,
                lastName,
                phone,
                email,
                vip: vipValue?.toLowerCase() === 'true' || vipValue?.toLowerCase() === 'yes'
              },
              notes: getFieldValue(data, 'notes') || undefined,
              leadSource: getFieldValue(data, 'lead source') || getFieldValue(data, 'leadsource') || undefined
            };
          } else if (type === 'VENDOR') {
            leadData = {
              type: 'VENDOR',
              assignedUserId: user?.id, // Assign to the user who is importing
              vendor: {
                firstName,
                lastName,
                phone,
                email,
                company: getFieldValue(data, 'company') || '',
                serviceType: getFieldValue(data, 'service type') || getFieldValue(data, 'servicetype') || getFieldValue(data, 'industry') || 'Other'
              },
              notes: getFieldValue(data, 'notes') || undefined
            };
          }

          // Create the lead
          await createLead(leadData);
          successCount++;
          
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Refresh leads list after import
      if (successCount > 0) {
        await listLeads();
      }

      return { success: successCount, errors };
      
    } catch (error) {
      return { 
        success: 0, 
        errors: [error instanceof Error ? error.message : 'Failed to process CSV file'] 
      };
    }
  };

  const exportLeadsToCSV = (leadsToExport: Lead[], type: LeadType): void => {
    // Basic CSV export implementation
    const headers = type === 'SELLER' 
      ? ['First Name', 'Last Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Motivation']
      : type === 'BUYER'
      ? ['First Name', 'Last Name', 'Email', 'Phone', 'VIP']
      : ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Industry'];
    
    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => {
        if (type === 'SELLER' && lead.leadType === 'SELLER' && lead.seller && lead.address) {
          return [
            lead.seller.firstName,
            lead.seller.lastName,
            lead.seller.email,
            lead.seller.phone,
            lead.address.address1,
            lead.address.city,
            lead.address.state,
            lead.address.zip,
            lead.seller.motivation || ''
          ].map(field => `"${field || ''}"`).join(',');
        } else if (type === 'BUYER' && lead.leadType === 'BUYER' && lead.buyer) {
          return [
            lead.buyer.firstName,
            lead.buyer.lastName,
            lead.buyer.email,
            lead.buyer.phone,
            lead.buyer.vip ? 'Yes' : 'No'
          ].map(field => `"${field || ''}"`).join(',');
        } else if (type === 'VENDOR' && lead.leadType === 'VENDOR' && lead.vendor) {
          return [
            lead.vendor.firstName,
            lead.vendor.lastName,
            lead.vendor.email,
            lead.vendor.phone,
            lead.vendor.company,
            lead.vendor.industry
          ].map(field => `"${field || ''}"`).join(',');
        }
        return '';
      }).filter(row => row)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${type.toLowerCase()}_leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortLeads = (leadsToSort: Lead[], key: string, direction: 'asc' | 'desc'): Lead[] => {
    return [...leadsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // Handle different sort keys
      switch (key) {
        case 'name':
          aValue = a.seller?.firstName || a.buyer?.firstName || a.vendor?.firstName || '';
          bValue = b.seller?.firstName || b.buyer?.firstName || b.vendor?.firstName || '';
          break;
        case 'email':
          aValue = a.seller?.email || a.buyer?.email || a.vendor?.email || '';
          bValue = b.seller?.email || b.buyer?.email || b.vendor?.email || '';
          break;
        case 'phone':
          aValue = a.seller?.phone || a.buyer?.phone || a.vendor?.phone || '';
          bValue = b.seller?.phone || b.buyer?.phone || b.vendor?.phone || '';
          break;
        case 'status':
          // Sort by leadStatus name, fallback to status field
          aValue = a.leadStatus?.name || a.status || '';
          bValue = b.leadStatus?.name || b.status || '';
          break;
        case 'address':
          aValue = a.address?.address1 || '';
          bValue = b.address?.address1 || '';
          break;
        case 'assignedUser':
          aValue = a.assignedUserId || '';
          bValue = b.assignedUserId || '';
          break;
        case 'lastContactAt':
          aValue = a.lastContactAt ? new Date(a.lastContactAt as string) : new Date(0);
          bValue = b.lastContactAt ? new Date(b.lastContactAt as string) : new Date(0);
          break;
        case 'createdAt':
        case 'updatedAt':
          aValue = new Date(a[key as keyof Lead] as string);
          bValue = new Date(b[key as keyof Lead] as string);
          break;
        default:
          aValue = a[key as keyof Lead] || '';
          bValue = b[key as keyof Lead] || '';
      }
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Load leads on mount
  useEffect(() => {
    if (user) {
      listLeads().catch(console.error);
    }
  }, [user]);

  return {
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    getLead,
    listLeads,
    refreshLeads,
    fetchLeads,
    getLeadsByType,
    searchLeads,
    filterLeads,
    importLeadsFromCSV,
    exportLeadsToCSV,
    sortLeads,
  };
};