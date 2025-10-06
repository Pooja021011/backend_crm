import { leadDistributionRepository, type LeadDistributionData } from '../repositories/leadDistributionRepository.js';

export interface UpdateDistributionRequest {
  agents: Array<{
    userId: string;
    receiveLeads: boolean;
    distributionPercentage: number;
  }>;
  useEqualDistribution: boolean;
}

export const leadDistributionService = {
  // Get all ACQ agents with their distribution settings
  async getAcquisitionsAgentsWithSettings() {
    const agents = await leadDistributionRepository.getAcquisitionsAgents();

    // Map agents and ensure they have distribution settings (create default if missing)
    return agents.map((agent) => ({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      status: agent.status,
      roles: agent.roles.map((r) => r.role.name),
      distributionSettings: agent.leadDistributionSettings || {
        receiveLeads: true,
        distributionPercentage: 0,
        isActive: true,
      },
    }));
  },

  // Update distribution settings for multiple agents
  async updateDistributionSettings(request: UpdateDistributionRequest) {
    const { agents, useEqualDistribution } = request;

    // Calculate distribution percentages
    let distributionData: LeadDistributionData[];

    if (useEqualDistribution) {
      // Equal distribution among agents who receive leads
      const activeAgents = agents.filter((a) => a.receiveLeads);
      const equalPercentage = activeAgents.length > 0 ? Math.floor(100 / activeAgents.length) : 0;

      // Handle rounding - give remaining percentage to first agent
      const remainder = activeAgents.length > 0 ? 100 - (equalPercentage * activeAgents.length) : 0;

      distributionData = agents.map((agent, index) => ({
        userId: agent.userId,
        receiveLeads: agent.receiveLeads,
        distributionPercentage: agent.receiveLeads
          ? index === 0
            ? equalPercentage + remainder
            : equalPercentage
          : 0,
        isActive: true,
      }));
    } else {
      // Custom distribution percentages
      // Validate that percentages add up to 100 (within a small tolerance)
      const totalPercentage = agents
        .filter((a) => a.receiveLeads)
        .reduce((sum, a) => sum + a.distributionPercentage, 0);

      if (Math.abs(totalPercentage - 100) > 1) {
        throw new Error(
          `Distribution percentages must add up to 100% (current total: ${totalPercentage}%)`
        );
      }

      distributionData = agents.map((agent) => ({
        userId: agent.userId,
        receiveLeads: agent.receiveLeads,
        distributionPercentage: agent.receiveLeads ? agent.distributionPercentage : 0,
        isActive: true,
      }));
    }

    // Batch update all settings
    await leadDistributionRepository.batchUpdateDistributionSettings(distributionData);

    // Return updated settings
    return this.getAcquisitionsAgentsWithSettings();
  },

  // Get distribution settings for a specific user
  async getUserDistributionSettings(userId: string) {
    return leadDistributionRepository.getDistributionSettingsByUserId(userId);
  },

  // Initialize default settings for a new ACQ agent
  async initializeDefaultSettings(userId: string) {
    const defaultData: LeadDistributionData = {
      userId,
      receiveLeads: true,
      distributionPercentage: 0, // Will be calculated when settings are updated
      isActive: true,
    };

    return leadDistributionRepository.upsertDistributionSettings(defaultData);
  },
};
