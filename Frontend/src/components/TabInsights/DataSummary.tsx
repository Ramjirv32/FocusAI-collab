
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabSummary } from '@/types';

interface DataSummaryProps {
  summary: TabSummary;
  timeFrame: string;
}

const DataSummary: React.FC<DataSummaryProps> = ({ summary, timeFrame }) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatTime(summary.totalTime)}</div>
          <p className="text-xs text-muted-foreground mt-1">{timeFrame} browsing</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Most Visited</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold truncate" title={summary.mostVisitedTab}>
            {summary.mostVisitedTab.length > 20 
              ? summary.mostVisitedTab.substring(0, 20) + '...' 
              : summary.mostVisitedTab}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Frequently accessed tab</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Longest Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold truncate" title={summary.mostTimeSpentTab}>
            {summary.mostTimeSpentTab.length > 20 
              ? summary.mostTimeSpentTab.substring(0, 20) + '...' 
              : summary.mostTimeSpentTab}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Tab with most time spent</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Unique Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalTabs}</div>
          <p className="text-xs text-muted-foreground mt-1">Different tabs opened</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataSummary;
