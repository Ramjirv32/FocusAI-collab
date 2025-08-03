import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowRight, Activity, AlertCircle, CheckCircle } from 'lucide-react';

const FocusStatusCard = ({ stats, isLoading, error, onSync }) => {
  // Format minutes as hours and minutes
  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };
  
  const productivityScore = stats?.quick_stats?.productivity_score || 0;
  const focusTime = stats?.quick_stats?.focus_time_minutes || 0;
  const distractionTime = stats?.quick_stats?.distraction_time_minutes || 0;
  
  return (
    <Card className={`bg-gradient-to-r from-indigo-50 to-blue-50 shadow-lg hover:shadow-xl transition-shadow ${isLoading ? 'opacity-70' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          AI Focus Analysis
          {isLoading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent ml-2"></div>
          )}
        </CardTitle>
        <CardDescription>
          Your productivity insights for {stats?.date ? new Date(stats.date).toLocaleDateString() : 'today'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : null}
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-sm text-muted-foreground mb-1">Productivity Score</p>
            <div className="flex items-end gap-1">
              <p className="text-2xl font-bold text-blue-600">{productivityScore}%</p>
              <div 
                className={`text-xs font-medium mb-1 px-1.5 py-0.5 rounded ${
                  productivityScore >= 70 ? 'bg-green-100 text-green-800' : 
                  productivityScore >= 40 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                {productivityScore >= 70 ? 'Good' : 
                 productivityScore >= 40 ? 'Average' : 'Low'}
              </div>
            </div>
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
          <Button variant="outline" className="text-sm" onClick={onSync} disabled={isLoading}>
            {isLoading ? 'Syncing...' : 'Refresh Stats'}
          </Button>
          
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

export default FocusStatusCard;