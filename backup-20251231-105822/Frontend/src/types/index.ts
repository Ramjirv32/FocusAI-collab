export interface TabLog {
  id: string;
  title: string;
  url: string;
  duration: number; 
  timestamp: string; 
  favicon?: string;
}

export type TimeFrame = 'daily' | 'weekly' | 'monthly';

export interface GroupedTabData {
  label: string;
  totalDuration: number;
  count: number;
}

export interface TabSummary {
  totalTime: number; 
  mostVisitedTab: string;
  mostTimeSpentTab: string;
  averageSessionDuration: number;
  totalTabs: number;
}

export interface AppUsageItem {
  app: string;
  title: string;
  duration: number;
  timestamp: number;
  url?: string | null;
}
