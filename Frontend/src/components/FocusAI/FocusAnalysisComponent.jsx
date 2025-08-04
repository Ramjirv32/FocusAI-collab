import React, { useState, useEffect } from 'react';
import { toast } from '../../components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { RefreshCw, ArrowUpRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { getConsolidatedFocusData } from '../../services/activityDataService';

const FocusAnalysisComponent = ({ date, onSyncComplete }) => {
  const [focusData, setFocusData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
 
  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };
  
 
  const loadFocusData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getConsolidatedFocusData(date);
      setFocusData(data);
      
      if (onSyncComplete) {
        onSyncComplete(data);
      }
      
    } catch (err) {
      console.error('Error loading focus data:', err);
      setError('Failed to load focus data. Please try again.');
      toast({
        title: 'Error',
        description: 'Could not load focus analysis data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleSync = async () => {
    await loadFocusData();
    toast({
      title: 'Focus Data Synced',
      description: 'Your productivity analysis has been updated.',
    });
  };
  

  useEffect(() => {
    loadFocusData();
  }, [date]);
  
  // If loading or error
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Analyzing your focus and productivity...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full border-destructive/50 bg-destructive/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Focus Data
          </CardTitle>
          <CardDescription>
            There was a problem retrieving your productivity analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={handleSync} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Extract data for display from the consolidated data structure
  const productivityScore = focusData?.quickStats?.quick_stats?.productivity_score || 0;
  const focusTime = focusData?.quickStats?.quick_stats?.focus_time_minutes || 0;
  const distractionTime = focusData?.quickStats?.quick_stats?.distraction_time_minutes || 0;
  const totalTime = focusData?.quickStats?.quick_stats?.total_time_minutes || 0;
  
  // Extract focus and distraction areas from the focusAnalysis data
  const focusAreas = focusData?.focusAnalysis?.productive_apps?.map(app => ({
    category: app.category || "Productive",
    total_duration: app.duration_minutes * 60, // convert to seconds for display
    apps: [app.app_name]
  })) || [];
  
  const distractionAreas = focusData?.focusAnalysis?.distraction_apps?.map(app => ({
    category: app.category || "Distraction",
    total_duration: app.duration_minutes * 60, // convert to seconds for display
    apps: [app.app_name]
  })) || [];
  
  return (
    <div className="space-y-6">
      <Card className="w-full bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">Focus Analysis</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 gap-1" 
              onClick={handleSync}
              disabled={isLoading}
            >
              <RefreshCw className="h-3 w-3" /> 
              {isLoading ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
          <CardDescription>
            Analysis for {new Date(date).toLocaleDateString(undefined, { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Productivity Score */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-medium">Productivity Score</h3>
              <span className="text-sm font-bold">{productivityScore}%</span>
            </div>
            <Progress value={productivityScore} className="h-2" />
          </div>
          
          {/* Time Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Total Time</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{formatTime(totalTime)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Focus Time</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{formatTime(focusTime)}</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Distraction Time</span>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-red-600">{formatTime(distractionTime)}</p>
            </div>
          </div>
          
          {/* Focus Areas */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Focus Areas ({focusAreas.length})</h3>
            <div className="space-y-2">
              {focusAreas.length > 0 ? (
                focusAreas.map((area, index) => (
                  <div key={index} className="bg-green-50 rounded-md p-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-green-800">
                        {area.category}
                      </span>
                      <span className="text-xs text-green-700">
                        {formatTime(Math.floor(area.total_duration / 60))}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {area.apps.map((app, idx) => (
                        <span key={idx} className="text-xs bg-green-100 px-2 py-0.5 rounded text-green-800">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">No focus areas detected</p>
              )}
            </div>
          </div>
          
          {/* Distraction Areas */}
          <div>
            <h3 className="text-sm font-medium mb-2">Distraction Areas ({distractionAreas.length})</h3>
            <div className="space-y-2">
              {distractionAreas.length > 0 ? (
                distractionAreas.map((area, index) => (
                  <div key={index} className="bg-red-50 rounded-md p-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-red-800">
                        {area.category}
                      </span>
                      <span className="text-xs text-red-700">
                        {formatTime(Math.floor(area.total_duration / 60))}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {area.apps.map((app, idx) => (
                        <span key={idx} className="text-xs bg-red-100 px-2 py-0.5 rounded text-red-800">
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">No distraction areas detected</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Most Used Apps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Used Applications</CardTitle>
          <CardDescription>Top applications by usage time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {focusData?.appUsage?.slice(0, 5).map((app, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2" 
                    style={{ backgroundColor: index % 2 === 0 ? '#4ade80' : '#f87171' }}></div>
                  <span className="font-medium">{app.appName || app.app_name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatTime(Math.floor(app.duration / 60))}
                </span>
              </div>
            ))}
            
            {(!focusData?.appUsage || focusData.appUsage.length === 0) && (
              <p className="text-sm text-muted-foreground py-2">No app usage data found</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Most Visited Sites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Visited Sites</CardTitle>
          <CardDescription>Top websites by visit frequency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {focusData?.tabUsage?.slice(0, 5).map((tab, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2" 
                    style={{ backgroundColor: index % 2 === 0 ? '#818cf8' : '#fbbf24' }}></div>
                  <span className="font-medium">{tab.domain || extractDomain(tab.url)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatTime(Math.floor(tab.duration / 60))}
                </span>
              </div>
            ))}
            
            {(!focusData?.tabUsage || focusData.tabUsage.length === 0) && (
              <p className="text-sm text-muted-foreground py-2">No tab usage data found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to extract domain from URL
function extractDomain(url) {
  if (!url) return 'unknown';
  
  try {
    const domain = new URL(url);
    return domain.hostname;
  } catch (e) {
    return url.split('/')[2] || 'unknown';
  }
}

export default FocusAnalysisComponent;