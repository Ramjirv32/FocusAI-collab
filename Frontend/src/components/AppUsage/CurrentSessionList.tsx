import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface SessionItem {
  app: string;
  title: string;
  duration: number;
  timestamp: number;
}

interface CurrentSessionListProps {
  data: SessionItem[];
}

const CurrentSessionList: React.FC<CurrentSessionListProps> = ({ data }) => {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recent App Activity</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[400px] overflow-y-auto">
        <ul className="space-y-3">
          {data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent activity recorded</p>
          ) : (
            data.slice().reverse().map((item, index) => (
              <li 
                key={index} 
                className="p-3 bg-muted/30 rounded-md flex justify-between"
              >
                <div>
                  <div className="font-medium">{item.app}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[250px]">{item.title}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{formatDuration(item.duration)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CurrentSessionList;