import dayjs from 'dayjs';
import { inboxRepository } from '../repositories/inboxRepository.js';

export const inboxService = {
  async getTasks(userId: string) {
    return inboxRepository.listAssignedTasks(userId);
  },

  async getCommunications(params: { userId?: string; timeframe?: 'This Month'|'Last Month'|'This Quarter'; type?: 'EMAIL'|'SMS'|'CALL' }) {
    const now = dayjs();
    let start: dayjs.Dayjs | undefined;
    let end: dayjs.Dayjs | undefined;
    if (params.timeframe === 'This Month') { start = now.startOf('month'); end = now.endOf('month'); }
    else if (params.timeframe === 'Last Month') { start = now.subtract(1,'month').startOf('month'); end = now.subtract(1,'month').endOf('month'); }
    else if (params.timeframe === 'This Quarter') { start = now.startOf('quarter'); end = now.endOf('quarter'); }
    return inboxRepository.listCommunications({ userId: params.userId, from: start?.toDate(), to: end?.toDate(), type: params.type });
  }
};


