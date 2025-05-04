
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabLog } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface RecentTabsListProps {
  tabs: TabLog[];
}

const RecentTabsList: React.FC<RecentTabsListProps> = ({ tabs }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Tab Activity</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[500px] overflow-y-auto">
        <ul className="space-y-4">
          {tabs.map((tab) => (
            <li key={tab.id} className="flex items-start space-x-3 p-3 rounded-md bg-secondary/30">
              <div className="flex-shrink-0 w-6 h-6 rounded bg-background mt-1 flex items-center justify-center overflow-hidden">
                {tab.favicon ? (
                  <img 
                    src={tab.favicon} 
                    alt="Tab icon" 
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      // Replace with a placeholder if favicon fails to load
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path></svg>';
                    }}
                  />
                ) : (
                  <span className="text-xs">•</span>
                )}
              </div>
              
              <div className="flex-1 overflow-hidden">
                <h4 className="font-medium truncate" title={tab.title}>
                  {tab.title}
                </h4>
                <p className="text-sm text-muted-foreground truncate" title={tab.url}>
                  {tab.url}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Duration: {(tab.duration / 60).toFixed(1)} min</span>
                  <span>{formatDistanceToNow(new Date(tab.timestamp))} ago</span>
                </div>
              </div>
            </li>
          ))}
          
          {tabs.length === 0 && (
            <li className="text-center py-8 text-muted-foreground">
              No recent activity found
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RecentTabsList;
