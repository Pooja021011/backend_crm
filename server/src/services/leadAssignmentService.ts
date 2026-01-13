import { leadDistributionRepository } from '../repositories/leadDistributionRepository.js';
import { prisma } from '../config/db.js';
import { logger } from '../config/logger.js';

interface AssignmentStats {
  userId: string;
  assignedCount: number;
  targetPercentage: number;
}

export const leadAssignmentService = {
  // Get next agent to assign lead based on distribution settings
  async getNextAgentForAssignment(): Promise<string | null> {
    // Get all ACQ agents with distribution settings
    const agents = await leadDistributionRepository.getAcquisitionsAgents();

    // Filter active agents who receive leads
    const activeAgents = agents.filter(
      (agent) =>
        agent.status === 'active' &&
        agent.leadDistributionSettings?.receiveLeads &&
        agent.leadDistributionSettings?.isActive
    );

    // DEBUG LOG: Active agents count and details (H6)
    logger.info({
      event: 'LEAD_ASSIGNMENT_AGENTS_CHECK',
      totalAgents: agents.length,
      activeAgentsCount: activeAgents.length,
      activeAgents: activeAgents.map(a => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        status: a.status,
        receiveLeads: a.leadDistributionSettings?.receiveLeads,
        isActive: a.leadDistributionSettings?.isActive,
        distributionPercentage: a.leadDistributionSettings?.distributionPercentage
      }))
    }, `Found ${activeAgents.length} active agents for lead assignment`);

    if (activeAgents.length === 0) {
      // DEBUG LOG: Warning when no agents available (H6)
      logger.warn({
        event: 'LEAD_ASSIGNMENT_NO_AGENTS',
        totalAgents: agents.length,
        inactiveAgents: agents.filter(a => a.status !== 'active').length,
        notReceivingLeads: agents.filter(a => !a.leadDistributionSettings?.receiveLeads).length
      }, 'No active agents available for lead assignment');
      
      console.warn('No active agents available for lead assignment');
      return null;
    }

    // Get current assignment counts for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayAssignments = await prisma.lead.groupBy({
      by: ['assignedUserId'],
      where: {
        assignedUserId: {
          in: activeAgents.map((a) => a.id),
        },
        createdAt: {
          gte: startOfDay,
        },
      },
      _count: {
        id: true,
      },
    });

    // Create assignment stats map
    const assignmentCounts: Record<string, number> = {};
    todayAssignments.forEach((assignment) => {
      if (assignment.assignedUserId) {
        assignmentCounts[assignment.assignedUserId] = assignment._count.id;
      }
    });

    // Calculate which agent should get the next lead based on distribution percentage
    const stats: AssignmentStats[] = activeAgents.map((agent) => ({
      userId: agent.id,
      assignedCount: assignmentCounts[agent.id] || 0,
      targetPercentage: agent.leadDistributionSettings?.distributionPercentage || 0,
    }));

    // Calculate total leads assigned today
    const totalAssigned = stats.reduce((sum, s) => sum + s.assignedCount, 0);

    // DEBUG LOG: Assignment calculation stats (H9)
    logger.info({
      event: 'LEAD_ASSIGNMENT_CALCULATION',
      totalAssignedToday: totalAssigned,
      stats: stats.map(s => ({
        userId: s.userId,
        assignedCount: s.assignedCount,
        targetPercentage: s.targetPercentage,
        targetCount: (totalAssigned + 1) * (s.targetPercentage / 100),
        deficit: (totalAssigned + 1) * (s.targetPercentage / 100) - s.assignedCount
      }))
    }, 'Calculating lead assignment distribution');

    // Find agent most behind their target percentage
    let selectedAgent: AssignmentStats | null = null;
    let maxDeficit = -Infinity;

    for (const stat of stats) {
      const targetCount = (totalAssigned + 1) * (stat.targetPercentage / 100);
      const deficit = targetCount - stat.assignedCount;

      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        selectedAgent = stat;
      }
    }

    if (!selectedAgent) {
      // Fallback: return first active agent
      logger.warn({
        event: 'LEAD_ASSIGNMENT_FALLBACK',
        fallbackAgentId: activeAgents[0].id
      }, 'No agent selected by distribution logic, using fallback (first active agent)');
      return activeAgents[0].id;
    }

    // DEBUG LOG: Selected agent and distribution (H9)
    logger.info({
      event: 'LEAD_ASSIGNMENT_SELECTED',
      selectedAgentId: selectedAgent.userId,
      selectedAgentCount: selectedAgent.assignedCount,
      selectedAgentTarget: selectedAgent.targetPercentage,
      maxDeficit,
      totalAssignedAfter: totalAssigned + 1
    }, `Lead assigned to agent ${selectedAgent.userId}`);

    console.log('Lead assignment:', {
      selectedAgent: selectedAgent.userId,
      stats,
      totalAssigned: totalAssigned + 1,
    });

    return selectedAgent.userId;
  },

  // Get distribution statistics
  async getDistributionStats(startDate?: Date, endDate?: Date) {
    const start = startDate || (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const end = endDate || new Date();

    const agents = await leadDistributionRepository.getAcquisitionsAgents();
    const activeAgents = agents.filter(
      (agent) =>
        agent.status === 'active' &&
        agent.leadDistributionSettings?.receiveLeads
    );

    const assignments = await prisma.lead.groupBy({
      by: ['assignedUserId'],
      where: {
        assignedUserId: {
          in: activeAgents.map((a) => a.id),
        },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    const assignmentMap: Record<string, number> = {};
    assignments.forEach((a) => {
      if (a.assignedUserId) {
        assignmentMap[a.assignedUserId] = a._count.id;
      }
    });

    const totalLeads = assignments.reduce((sum, a) => sum + a._count.id, 0);

    return activeAgents.map((agent) => {
      const assigned = assignmentMap[agent.id] || 0;
      const actualPercentage = totalLeads > 0 ? (assigned / totalLeads) * 100 : 0;
      const targetPercentage = agent.leadDistributionSettings?.distributionPercentage || 0;

      return {
        agentId: agent.id,
        agentName: `${agent.firstName} ${agent.lastName}`,
        targetPercentage,
        actualPercentage: Math.round(actualPercentage * 100) / 100,
        assignedCount: assigned,
        difference: Math.round((actualPercentage - targetPercentage) * 100) / 100,
      };
    });
  },
};
