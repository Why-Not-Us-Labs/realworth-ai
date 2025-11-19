
import { AppraisalResult } from '@/lib/types';

class DBService {
  private getHistoryKey(userId: string): string {
    return `appraisalHistory_${userId}`;
  }

  public async getHistory(userId: string): Promise<AppraisalResult[]> {
    const historyJson = localStorage.getItem(this.getHistoryKey(userId));
    return historyJson ? JSON.parse(historyJson) : [];
  }

  public async saveHistory(userId: string, history: AppraisalResult[]): Promise<void> {
    localStorage.setItem(this.getHistoryKey(userId), JSON.stringify(history));
  }
}

export const dbService = new DBService();
