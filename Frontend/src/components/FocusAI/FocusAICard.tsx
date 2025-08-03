import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface FocusAICardProps {
  focusStats: any;
  isSyncing: boolean;
  date?: string;
}

const FocusAICard: React.FC<FocusAICardProps> = ({ focusStats, isSyncing, date }) => {
  return (
    <Card className={`bg-gradient-to-r from-indigo-50 to-blue-50 shadow-lg hover:shadow-xl transition-shadow ${isSyncing ? 'opacity-70' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          AI Focus Analysis
          {isSyncing && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent ml-2"></div>
          )}
        </CardTitle>
        <CardDescription>
          Your productivity insights for {focusStats?.date || date || 'today'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Productivity Score</p>
            <p className="text-2xl font-bold text-blue-600">{focusStats?.quick_stats?.productivity_score || 0}%</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Focus Time</p>
            <p className="text-2xl font-bold text-green-600">
              {focusStats?.quick_stats?.focus_time_minutes 
                ? `${Math.floor(focusStats.quick_stats.focus_time_minutes / 60)}h ${focusStats.quick_stats.focus_time_minutes % 60}m`
                : '0m'}
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Distraction Time</p>
            <p className="text-2xl font-bold text-red-600">
              {focusStats?.quick_stats?.distraction_time_minutes
                ? `${Math.floor(focusStats.quick_stats.distraction_time_minutes / 60)}h ${focusStats.quick_stats.distraction_time_minutes % 60}m`
                : '0m'}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Link to="/focus-analytics">
            <Button variant="outline" className="gap-2">
              View detailed analysis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default FocusAICard;