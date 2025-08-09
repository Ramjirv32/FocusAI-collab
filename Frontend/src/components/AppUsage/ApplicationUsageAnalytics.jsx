import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import AppUsageInfoAlert from './AppUsageInfoAlert';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', '#FF66B3', '#71DFE7'];

const ApplicationUsageAnalytics = ({ limit = 5, initialData = null, timeFrame: externalTimeFrame = 'daily', onTimeFrameChange = null }) => {
  const [timeFrame, setTimeFrame] = useState(externalTimeFrame);
  const [appUsageData, setAppUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const { toast } = useToast();
  
  // Handle external time frame changes
  const handleTimeFrameChange = (newTimeFrame) => {
    setTimeFrame(newTimeFrame);
    if (onTimeFrameChange) {
      onTimeFrameChange(newTimeFrame);
    }
  };
  
  // Demo data for testing when no real data is available
  const demoData = {
    timeFrame: 'daily',
    dateRange: { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
    totalTime: 18000, // 5 hours in seconds
    totalApps: 5,
    mostUsedApp: 'Visual Studio Code',
    appUsage: [
      { name: 'Visual Studio Code', totalDuration: 7200, sessions: 4, lastUsed: new Date().toISOString(), category: 'productive' },
      { name: 'Google Chrome', totalDuration: 5400, sessions: 10, lastUsed: new Date().toISOString(), category: 'neutral' },
      { name: 'Terminal', totalDuration: 1800, sessions: 6, lastUsed: new Date().toISOString(), category: 'productive' },
      { name: 'Slack', totalDuration: 1200, sessions: 5, lastUsed: new Date().toISOString(), category: 'neutral' },
      { name: 'Spotify', totalDuration: 2400, sessions: 2, lastUsed: new Date().toISOString(), category: 'distraction' }
    ],
    productiveTime: 9000,
    distractionTime: 2400,
    productivityRatio: 50,
    appVsWebComparison: { applications: 65, web: 35 }
  };

  // Use initialData if provided
  useEffect(() => {
    if (initialData && !useDemoData) {
      console.log('Using provided initialData:', initialData);
      setAppUsageData(initialData);
      setLoading(false);
      setError(null);
    } else if (useDemoData) {
      setAppUsageData(demoData);
      setLoading(false);
      setError(null);
    } else {
      fetchAppUsageData();
    }
  }, [initialData, timeFrame, useDemoData]);

  const fetchAppUsageData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching app usage data for timeframe:', timeFrame);
      
      const response = await axios.get(`http://localhost:5001/api/app-usage/app-analytics?timeFrame=${timeFrame}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('App usage data response:', response.data);
      
      // Check if response is properly formatted
      if (response.data && response.data.success) {
        setAppUsageData(response.data);
        console.log('Data successfully loaded');
      } else {
        console.log('Response format unexpected:', response.data);
        setError('Data format is unexpected. Server may be misconfigured.');
        toast({
          title: 'Data Format Error',
          description: 'Unexpected data format received from server',
          variant: 'destructive',
        });
      }
      
      // Check if we received data but it's empty
      if (!response.data.appUsage || response.data.appUsage.length === 0) {
        console.log('No app usage data found');
        // Still set the data to show empty state UI
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching app usage data:', err);
      setError('Failed to load application usage data. Please check the server connection.');
      setLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to load application usage data. Is the backend running?',
        variant: 'destructive',
      });
    }
  };

  // Format time from seconds to hours/minutes
  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDataForBarChart = () => {
    if (!appUsageData || !appUsageData.appUsage) return [];
    
    return appUsageData.appUsage
      .slice(0, limit)
      .map(app => ({
        name: app.name.length > 15 ? app.name.substring(0, 15) + '...' : app.name,
        duration: Math.floor(app.totalDuration / 60), // Convert seconds to minutes for display
        fullName: app.name
      }));
  };

  const formatDataForPieChart = () => {
    if (!appUsageData || !appUsageData.appUsage) return [];
    
    // Take top 5 apps
    const topApps = appUsageData.appUsage
      .slice(0, limit)
      .map(app => ({
        name: app.name,
        value: app.totalDuration
      }));
    
    // Add an "Others" segment if there are more than 5 apps
    if (appUsageData.appUsage.length > limit) {
      const othersValue = appUsageData.appUsage
        .slice(limit)
        .reduce((sum, app) => sum + app.totalDuration, 0);
      
      if (othersValue > 0) {
        topApps.push({
          name: 'Others',
          value: othersValue
        });
      }
    }
    
    return topApps;
  };

  const renderAppVsWebComparison = () => {
    if (!appUsageData || !appUsageData.appVsWebComparison) return null;
    
    const { applications, web } = appUsageData.appVsWebComparison;
    const data = [
      { name: 'Applications', value: applications },
      { name: 'Web Browsing', value: web }
    ];
    
    return (
      <div className="mt-4">
        <CardTitle className="text-sm mb-2">Applications vs Web Browsing</CardTitle>
        <div className="flex items-center justify-between">
          <ResponsiveContainer width="60%" height={100}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={40}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="w-1/3">
            <div className="text-sm mb-1">
              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[0] }}></span>
              Applications: {applications}%
            </div>
            <div className="text-sm">
              <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[1] }}></span>
              Web Browsing: {web}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Usage</CardTitle>
          <CardDescription>Loading your application usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Application Usage</CardTitle>
          <CardDescription>Could not load application data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4">
            <p className="text-muted-foreground mb-2">{error}</p>
            <Button onClick={fetchAppUsageData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Application Usage</CardTitle>
            <CardDescription>
              Track which applications you use the most
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="demo-mode" className="text-xs">Demo Mode</Label>
            <Switch 
              id="demo-mode" 
              checked={useDemoData} 
              onCheckedChange={setUseDemoData} 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!useDemoData && !appUsageData?.appUsage?.length && <AppUsageInfoAlert />}
        
        <Tabs defaultValue={timeFrame} onValueChange={handleTimeFrameChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value={timeFrame} className="w-full">
            {appUsageData && appUsageData.appUsage && appUsageData.appUsage.length > 0 ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="text-sm font-medium">Top Applications</h4>
                      <p className="text-xs text-muted-foreground">
                        Based on usage time in the {timeFrame} period
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Total Time: {formatTime(appUsageData.totalTime)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Apps Used: {appUsageData.totalApps}
                      </p>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={formatDataForBarChart()} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12 }} 
                        width={100}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} min`, props.payload.fullName]}
                        labelFormatter={() => 'Duration'}
                      />
                      <Bar dataKey="duration" fill="#8884d8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {renderAppVsWebComparison()}

                {appUsageData.productivityRatio !== undefined && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium">Productivity Score</h4>
                        <p className="text-xs text-muted-foreground">
                          Based on application categories
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold">
                          {appUsageData.productivityRatio}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-muted rounded-full p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <rect width="18" height="14" x="3" y="5" rx="2" />
                      <path d="M7 15h0M21 19H3M17 7l-10 8" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">No application data available</h3>
                  <p className="text-muted-foreground text-center max-w-xs">
                    We haven't collected any application usage data for the selected time period yet.
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <Button onClick={() => setUseDemoData(true)} variant="default">
                      Use Demo Data
                    </Button>
                    <Button onClick={fetchAppUsageData} variant="outline">
                      Refresh Data
                    </Button>
                  </div>
                  <div className="bg-muted p-4 rounded-md text-xs text-left mt-4 max-w-sm">
                    <h4 className="font-medium mb-2">How to get application data:</h4>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Make sure the browser extension is installed and active</li>
                      <li>Use your computer normally for some time</li>
                      <li>Data will be collected in the background</li>
                      <li>Or toggle "Demo Mode" above to see sample data</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ApplicationUsageAnalytics;
