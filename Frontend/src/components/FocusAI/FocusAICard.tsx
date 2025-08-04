import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, ArrowRight, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FocusAICardProps {
  focusStats: any;
  isSyncing: boolean;
  date?: string;
  error?: string | null;
  onSync?: () => void;
}

const FocusAICard: React.FC<FocusAICardProps> = ({ focusStats, isSyncing, date, error, onSync }) => {
  // Format minutes as hours and minutes
  const formatTime = (minutes: number | undefined): string => {
    if (!minutes) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const productivityScore = focusStats?.quick_stats?.productivity_score || 0;
  const focusTime = focusStats?.quick_stats?.focus_time_minutes || 0;
  const distractionTime = focusStats?.quick_stats?.distraction_time_minutes || 0;
  const displayDate = focusStats?.date ? new Date(focusStats.date).toLocaleDateString() : date || 'today';

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
          Your productivity insights for {displayDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Productivity Score</p>
              <div 
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  productivityScore >= 70 ? 'bg-green-100 text-green-800' : 
                  productivityScore >= 40 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                {productivityScore >= 70 ? 'Good' : 
                 productivityScore >= 40 ? 'Average' : 'Low'}
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">{productivityScore}%</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Focus Time</p>
              <CheckCircle className="h-3 w-3 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatTime(focusTime)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Distraction Time</p>
              <AlertCircle className="h-3 w-3 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{formatTime(distractionTime)}</p>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          {onSync && (
            <Button variant="outline" className="text-sm gap-2" onClick={onSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Refresh Stats'}
            </Button>
          )}
          
          <Link to="/focus-analytics" className={onSync ? '' : 'ml-auto'}>
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
