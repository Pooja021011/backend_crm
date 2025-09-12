import { agentRepository } from '../repositories/agentRepository.js';
import argon2 from 'argon2';

export interface CreateAgentData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  roles: string[]; // Role names like ['ACQ', 'DISP']
  password?: string; // Optional, will generate if not provided
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

export const agentService = {
  // List all agents with their roles
  listAgents: async () => {
    return agentRepository.listAgents();
  },

  // Get single agent by ID
  getAgent: async (id: string) => {
    return agentRepository.getAgent(id);
  },

  // Create new agent
  createAgent: async (data: CreateAgentData) => {
    // Check if email already exists
    const existingAgent = await agentRepository.findByEmail(data.email);
    if (existingAgent) {
      throw new Error('An agent with this email already exists');
    }

    // Generate password if not provided
    const password = data.password || generateRandomPassword();
    const passwordHash = await argon2.hash(password);

    // Create agent with roles
    const agent = await agentRepository.createAgent({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      status: data.status,
      passwordHash,
      roles: data.roles
    });

    // Return agent data (excluding password hash)
    const { passwordHash: _, ...agentData } = agent;
    return {
      ...agentData,
      generatedPassword: data.password ? undefined : password // Return generated password only if we created one
    };
  },

  // Update agent
  updateAgent: async (id: string, data: UpdateAgentData) => {
    // Check if email is being changed and already exists
    if (data.email) {
      const existingAgent = await agentRepository.findByEmail(data.email);
      if (existingAgent && existingAgent.id !== id) {
        throw new Error('An agent with this email already exists');
      }
    }

    let updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email?.toLowerCase(),
      phone: data.phone,
      status: data.status,
      roles: data.roles
    };

    // Hash password if provided
    if (data.password) {
      updateData.passwordHash = await argon2.hash(data.password);
    }

    // Remove undefined values
    updateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    const agent = await agentRepository.updateAgent(id, updateData);
    if (!agent) {
      return null;
    }

    // Return agent data (excluding password hash)
    const { passwordHash: _, ...agentData } = agent;
    return agentData;
  },

  // Delete agent
  deleteAgent: async (id: string) => {
    // Check if agent has assigned leads
    const hasAssignedLeads = await agentRepository.hasAssignedLeads(id);
    if (hasAssignedLeads) {
      throw new Error('Cannot delete agent who has assigned leads. Please reassign leads first.');
    }

    return agentRepository.deleteAgent(id);
  },
};

// Generate a random password for new agents
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
