import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  leadType: 'SELLER' | 'BUYER' | 'VENDOR';
  status?: string;
  marketId?: string;
  market?: { id: string; name: string };
  assignedUserId?: string;
  assignedUser?: { id: string; firstName: string; lastName: string };
  pipelineStageId?: string;
  pipelineStage?: { id: string; name: string; color?: string };
  createdById?: string;
  createdBy?: { id: string; firstName: string; lastName: string };
  customFields?: any;
  createdAt: string;
  updatedAt: string;
  
  // Address (for seller leads)
  address?: {
    address1: string;
    city: string;
    state: string;
    zip: string;
    countyId?: string;
    county?: { id: string; name: string };
  };
  
  // Seller details
  seller?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    motivation?: string;
    notes?: string;
  };
  
  // Buyer details
  buyer?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    vip: boolean;
    blacklisted: boolean;
    blacklistReason?: string;
    propertiesPurchased: number;
  };
  
  // Buyer criteria
  buyerCriteria?: {
    marketIds: string[];
    assetClassIds: string[];
    priceRangeIds: string[];
  };
  
  // Vendor details
  vendor?: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    company: string;
    industry: string;
    marketIds: string[];
  };
}

interface LeadFilters {
  type?: 'SELLER' | 'BUYER' | 'VENDOR';
  marketId?: string;
  pipelineStageId?: string;
  status?: string;
  q?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

interface CreateLeadData {
  type: 'SELLER' | 'BUYER' | 'VENDOR';
  [key: string]: any;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const API_BASE = 'http://localhost:4000/api/v1';

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  };

  const fetchLeads = async (filters: LeadFilters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const url = `${API_BASE}/leads?${queryParams.toString()}`;
      const response = await makeAuthenticatedRequest(url);
      
      setLeads(response.data || []);
      return response.data || [];
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to fetch leads. Please try again.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const createLead = async (leadData: CreateLeadData): Promise<Lead | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/leads`, {
        method: 'POST',
        body: JSON.stringify(leadData),
      });

      const newLead = response.data;
      setLeads(prev => [newLead, ...prev]);
      
      toast({
        title: "Success!",
        description: `${leadData.type.toLowerCase()} lead created successfully.`,
      });
      
      return newLead;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to create lead. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateLead = async (leadId: string, updateData: Partial<CreateLeadData>): Promise<Lead | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      const updatedLead = response.data;
      setLeads(prev => prev.map(lead => lead.id === leadId ? updatedLead : lead));
      
      toast({
        title: "Success!",
        description: "Lead updated successfully.",
      });
      
      return updatedLead;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to update lead. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLead = async (leadId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await makeAuthenticatedRequest(`${API_BASE}/leads/${leadId}`, {
        method: 'DELETE',
      });

      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      
      toast({
        title: "Success!",
        description: "Lead deleted successfully.",
      });
      
      return true;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const changeLeadStage = async (leadId: string, toStageId: string): Promise<Lead | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/leads/${leadId}/stage`, {
        method: 'POST',
        body: JSON.stringify({ toStageId }),
      });

      const updatedLead = response.data;
      setLeads(prev => prev.map(lead => lead.id === leadId ? updatedLead : lead));
      
      toast({
        title: "Success!",
        description: "Lead stage updated successfully.",
      });
      
      return updatedLead;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to update lead stage. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Filter leads by type
  const getLeadsByType = (type: 'SELLER' | 'BUYER' | 'VENDOR') => {
    return leads.filter(lead => lead.leadType === type);
  };

  // Search leads
  const searchLeads = (query: string) => {
    if (!query.trim()) return leads;
    
    const searchTerm = query.toLowerCase();
    return leads.filter(lead => {
      // Search in seller details
      if (lead.seller) {
        return (
          lead.seller.firstName.toLowerCase().includes(searchTerm) ||
          lead.seller.lastName.toLowerCase().includes(searchTerm) ||
          lead.seller.phone.includes(searchTerm) ||
          lead.seller.email.toLowerCase().includes(searchTerm) ||
          (lead.address?.address1.toLowerCase().includes(searchTerm))
        );
      }
      
      // Search in buyer details
      if (lead.buyer) {
        return (
          lead.buyer.firstName.toLowerCase().includes(searchTerm) ||
          lead.buyer.lastName.toLowerCase().includes(searchTerm) ||
          lead.buyer.phone.includes(searchTerm) ||
          lead.buyer.email.toLowerCase().includes(searchTerm)
        );
      }
      
      // Search in vendor details
      if (lead.vendor) {
        return (
          lead.vendor.firstName.toLowerCase().includes(searchTerm) ||
          lead.vendor.lastName.toLowerCase().includes(searchTerm) ||
          lead.vendor.phone.includes(searchTerm) ||
          lead.vendor.email.toLowerCase().includes(searchTerm) ||
          lead.vendor.company.toLowerCase().includes(searchTerm)
        );
      }
      
      return false;
    });
  };

  // Refresh leads (useful for after creating/updating leads)
  const refreshLeads = () => {
    return fetchLeads();
  };

  return {
    leads,
    isLoading,
    error,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    changeLeadStage,
    getLeadsByType,
    searchLeads,
    refreshLeads,
  };
};
