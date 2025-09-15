import { useState, useEffect } from 'react';

export interface AgentRole {
  id: string;
  name: string;
}

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  roles: { role: AgentRole }[];
  _count: {
    assignedLeads: number;
  };
}

export interface CreateAgentData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  roles: string[];
  password?: string;
}

export interface UpdateAgentData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  roles?: string[];
  password?: string;
}

export interface AgentsHookReturn {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  createAgent: (data: CreateAgentData) => Promise<Agent & { generatedPassword?: string }>;
  updateAgent: (id: string, data: UpdateAgentData) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
  getAgent: (id: string) => Promise<Agent>;
  refreshAgents: () => Promise<void>;
  getActiveAgents: () => Agent[];
}

import { API_BASE, httpFetch } from '@/config/api';

export const useAgents = (): AgentsHookReturn => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    const accessToken = localStorage.getItem('accessToken');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const fetchAgents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/agents`);
      setAgents(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(errorMessage);
      console.error('Error fetching agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createAgent = async (data: CreateAgentData): Promise<Agent & { generatedPassword?: string }> => {
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/agents`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      const newAgent = response.data;
      setAgents(prevAgents => [...prevAgents, newAgent]);
      return newAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateAgent = async (id: string, data: UpdateAgentData): Promise<Agent> => {
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/agents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      
      const updatedAgent = response.data;
      setAgents(prevAgents => 
        prevAgents.map(agent => agent.id === id ? updatedAgent : agent)
      );
      return updatedAgent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteAgent = async (id: string): Promise<void> => {
    setError(null);
    try {
      await makeAuthenticatedRequest(`${API_BASE}/agents/${id}`, {
        method: 'DELETE',
      });
      
      setAgents(prevAgents => prevAgents.filter(agent => agent.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getAgent = async (id: string): Promise<Agent> => {
    setError(null);
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE}/agents/${id}`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get agent';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const refreshAgents = async (): Promise<void> => {
    await fetchAgents();
  };

  const getActiveAgents = (): Agent[] => {
    return agents.filter(agent => agent.status === 'active');
  };

  // Load agents on mount
  useEffect(() => {
    fetchAgents();
  }, []);

  return {
    agents,
    isLoading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent,
    refreshAgents,
    getActiveAgents,
  };
};
