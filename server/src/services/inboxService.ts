import dayjs from 'dayjs';
import { inboxRepository } from '../repositories/inboxRepository.js';

export const inboxService = {
  async getTasks(userId: string) {
    return inboxRepository.listAssignedTasks(userId);
  },

  async getCommunications(params: {
    userId?: string;
    viewerUserId?: string;
    timeframe?: 'This Month'|'Last Month'|'This Quarter';
    type?: 'EMAIL'|'SMS'|'CALL'|'NOTE';
    leadOnly?: boolean;
    internal?: boolean;
    scope?: { email?: string; phone?: string };
  }) {
    const now = dayjs();
    let start: dayjs.Dayjs | undefined;
    let end: dayjs.Dayjs | undefined;
    if (params.timeframe === 'This Month') { start = now.startOf('month'); end = now.endOf('month'); }
    else if (params.timeframe === 'Last Month') { start = now.subtract(1,'month').startOf('month'); end = now.subtract(1,'month').endOf('month'); }
    else if (params.timeframe === 'This Quarter') { start = now.startOf('quarter'); end = now.endOf('quarter'); }
    return inboxRepository.listCommunications({
      userId: params.userId,
      viewerUserId: params.viewerUserId,
      from: start?.toDate(),
      to: end?.toDate(),
      type: params.type,
      leadOnly: params.leadOnly,
      internal: params.internal,
      scope: params.scope,
    });
  }
};


