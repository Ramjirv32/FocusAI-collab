import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

interface AppCategoryItem {
  category: string;
  total_duration: number;
  activity_count: number;
  apps: string[];
  avg_confidence: number;
}

interface FocusAppsProps {
  focusAreas: AppCategoryItem[];
  distractionAreas: AppCategoryItem[];
  timeFrame?: string;
}

const FocusApps: React.FC<FocusAppsProps> = ({ 
  focusAreas, 
  distractionAreas,
  timeFrame = 'Today'
}) => {
  // Format minutes to hours and minutes
  const formatDuration = (seconds: number) => {
    const minutes = seconds / 60;
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Focused Apps */}
      <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Focused Apps
          </CardTitle>
          <CardDescription>
            Applications where you maintained focus {timeFrame.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {focusAreas.length > 0 ? (
            <div className="space-y-4">
              {focusAreas.map((area, index) => (
                <div key={index} className="border-b pb-2 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium">{area.apps[0]}</p>
                    <p className="text-sm text-green-600 font-medium">
                      {formatDuration(area.total_duration)}
                    </p>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{area.activity_count} sessions</span>
                    <span>{Math.round(area.avg_confidence * 100)}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No focus sessions detected</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Distracted Apps */}
      <Card className="shadow-md hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            Distraction Apps
          </CardTitle>
          <CardDescription>
            Applications that reduced your focus {timeFrame.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {distractionAreas.length > 0 ? (
            <div className="space-y-4">
              {distractionAreas.map((area, index) => (
                <div key={index} className="border-b pb-2 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-medium">{area.apps[0]}</p>
                    <p className="text-sm text-red-600 font-medium">
                      {formatDuration(area.total_duration)}
                    </p>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{area.activity_count} sessions</span>
                    <span>{Math.round(area.avg_confidence * 100)}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No distractions detected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FocusApps;