import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, PieChart, LineChart, RefreshCw, TrendingUp, TrendingDown, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const Statistics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('weekly');
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [showFallbackData, setShowFallbackData] = useState(false);

  // Colors for charts
  const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

  // Get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token found in localStorage');
      return {};
    }
    console.log('Using token from localStorage:', token.substring(0, 10) + '...');
    return { Authorization: `Bearer ${token}` };
  };

  // Create fallback data for demo purposes
  const generateFallbackData = () => {
    const fallbackStats = {
      uniqueApps: 12,
      uniqueWebsites: 23,
      totalActiveTime: 480, // 8 hours in minutes
      focusTime: 320, // 5hr 20min
      distractionTime: 160, // 2hr 40min
      focusScore: 67,
      previousFocusScore: 62,
      previousActiveTime: 450,
      mostProductiveHour: '10:00 AM',
      averageSessionLength: 45,
      totalSessions: 18,
      longestFocusSession: 90,
      currentStreak: 5,
      topApps: [
        { _id: 'VS Code', totalTime: 180, visitCount: 12 },
        { _id: 'Chrome', totalTime: 120, visitCount: 15 },
        { _id: 'Terminal', totalTime: 60, visitCount: 8 },
        { _id: 'Slack', totalTime: 45, visitCount: 9 },
        { _id: 'Spotify', totalTime: 30, visitCount: 3 },
      ],
      topWebsites: [
        { _id: 'github.com', totalTime: 60, visitCount: 10 },
        { _id: 'stackoverflow.com', totalTime: 45, visitCount: 8 },
        { _id: 'google.com', totalTime: 30, visitCount: 12 },
        { _id: 'developer.mozilla.org', totalTime: 25, visitCount: 6 },
        { _id: 'youtube.com', totalTime: 20, visitCount: 5 },
      ],
      categoryBreakdown: [
        { category: 'productive', totalTime: 320 },
        { category: 'distraction', totalTime: 160 },
      ],
      dailyBreakdown: [
        { date: 'Mon', focusTime: 120, distractionTime: 45, focusScore: 73 },
        { date: 'Tue', focusTime: 145, distractionTime: 30, focusScore: 83 },
        { date: 'Wed', focusTime: 100, distractionTime: 60, focusScore: 62 },
        { date: 'Thu', focusTime: 180, distractionTime: 40, focusScore: 82 },
        { date: 'Fri', focusTime: 160, distractionTime: 35, focusScore: 82 },
        { date: 'Sat', focusTime: 60, distractionTime: 90, focusScore: 40 },
        { date: 'Sun', focusTime: 90, distractionTime: 50, focusScore: 64 },
      ]
    };

    setStatistics(fallbackStats);
    setTimelineData(fallbackStats.dailyBreakdown.map(day => ({
      name: day.date,
      focus: day.focusTime || 0,
      distraction: day.distractionTime || 0,
      score: day.focusScore || 0
    })));
    
    setCategoryData([
      { name: 'Productive', value: fallbackStats.focusTime, color: '#22c55e' },
      { name: 'Distraction', value: fallbackStats.distractionTime, color: '#ef4444' }
    ]);
    
    setShowFallbackData(true);
  };

  const fetchStatistics = async (timeFrame = selectedTimeFrame) => {
    try {
      setIsLoading(true);
      setError(null);
      setShowFallbackData(false);
      
      // First try the user-stats endpoint
      try {
        console.log('Fetching stats with timeframe:', timeFrame);
        console.log('Auth headers:', getAuthHeader());
        
        const response = await axios.get(
          `http://localhost:5001/api/user-stats`,
          { 
            headers: getAuthHeader(),
            params: { timeFrame }
          }
        );
        
        console.log('Statistics data:', response.data);
        
        if (response.data && Object.keys(response.data).length > 0) {
          setStatistics(response.data);
          
          // Generate timeline data if available
          if (response.data.dailyBreakdown && response.data.dailyBreakdown.length > 0) {
            setTimelineData(response.data.dailyBreakdown.map((day: any) => ({
              name: day.date,
              focus: day.focusTime || 0,
              distraction: day.distractionTime || 0,
              score: day.focusScore || 0
            })));
          } else {
            // Create empty timeline data with current week days
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            setTimelineData(days.map(day => ({
              name: day,
              focus: 0,
              distraction: 0,
              score: 0
            })));
          }
          
          // Generate category data if available
          if (response.data.categoryBreakdown && response.data.categoryBreakdown.length > 0) {
            setCategoryData(
              response.data.categoryBreakdown.map((category: any, index: number) => ({
                name: category.category || 'Uncategorized',
                value: category.totalTime || 0,
                color: category.category === 'productive' ? '#22c55e' : 
                       category.category === 'distraction' ? '#ef4444' : 
                       COLORS[index % COLORS.length]
              }))
            );
          } else {
            // Fallback category data
            setCategoryData([
              { name: 'Productive', value: response.data.focusTime || 0, color: '#22c55e' },
              { name: 'Distraction', value: response.data.distractionTime || 0, color: '#ef4444' }
            ]);
          }
        } else {
          throw new Error('Empty response data');
        }
      } catch (primaryError) {
        console.warn('Primary stats endpoint failed, trying secondary:', primaryError);
        
        // Try the secondary focus analytics endpoint
        try {
          const focusResponse = await axios.get(
            `http://localhost:5001/api/focus-analytics/stats`,
            { 
              headers: getAuthHeader(),
              params: { timeFrame }
            }
          );
          
          if (focusResponse.data && Object.keys(focusResponse.data).length > 0) {
            const focusData = focusResponse.data;
            
            // Map to our expected format
            const mappedData = {
              uniqueApps: focusData.uniqueApps || focusData.appCount || 0,
              uniqueWebsites: focusData.uniqueWebsites || focusData.websiteCount || 0,
              totalActiveTime: focusData.totalTime || 0,
              focusTime: focusData.focusTime || 0,
              distractionTime: focusData.distractionTime || 0,
              focusScore: focusData.focusScore || 0,
              mostProductiveHour: focusData.mostProductiveHour || 'N/A',
              averageSessionLength: focusData.averageSessionLength || 0,
              topApps: focusData.topApps || [],
              topWebsites: focusData.topWebsites || [],
              dailyBreakdown: focusData.dailyBreakdown || []
            };
            
            setStatistics(mappedData);
            
            // Generate timeline data
            if (focusData.dailyBreakdown && focusData.dailyBreakdown.length > 0) {
              setTimelineData(focusData.dailyBreakdown);
            } else {
              // Create empty timeline data with current week days
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              setTimelineData(days.map(day => ({
                name: day,
                focus: 0,
                distraction: 0,
                score: 0
              })));
            }
            
            // Set category data
            setCategoryData([
              { name: 'Productive', value: focusData.focusTime || 0, color: '#22c55e' },
              { name: 'Distraction', value: focusData.distractionTime || 0, color: '#ef4444' }
            ]);
          } else {
            throw new Error('Empty focus analytics response');
          }
        } catch (secondaryError) {
          console.error('All stats endpoints failed:', secondaryError);
          
          // Try to get raw usage data as a last resort
          try {
            const rawUsageResponse = await axios.get(
              `http://localhost:5001/raw-usage`,
              { 
                headers: getAuthHeader(),
                params: { timeFrame }
              }
            );
            
            if (rawUsageResponse.data) {
              const rawData = rawUsageResponse.data;
              
              // Calculate total app usage time
              const appTotal = Object.values(rawData.appUsage || {}).reduce((sum: number, time: any) => sum + Number(time), 0);
              
              // Calculate total web usage time
              const webTotal = Object.values(rawData.tabUsage || {}).reduce((sum: number, time: any) => sum + Number(time), 0);
              
              // Create basic statistics from raw data
              const basicStats = {
                uniqueApps: Object.keys(rawData.appUsage || {}).length,
                uniqueWebsites: Object.keys(rawData.tabUsage || {}).length,
                totalActiveTime: Math.round((appTotal + webTotal) / 60), // convert to minutes
                focusTime: Math.round(appTotal / 60 * 0.7), // assume 70% of app time is focus
                distractionTime: Math.round(webTotal / 60 * 0.7 + appTotal / 60 * 0.3), // rough estimate
                focusScore: Math.round((appTotal / (appTotal + webTotal || 1)) * 70), // rough score based on ratio
                
                // Create top apps from raw data
                topApps: Object.entries(rawData.appUsage || {})
                  .map(([appName, duration]) => ({
                    _id: appName,
                    totalTime: Math.round(Number(duration) / 60), // convert seconds to minutes
                    visitCount: 1
                  }))
                  .sort((a, b) => b.totalTime - a.totalTime)
                  .slice(0, 5),
                
                // Create top websites from raw data
                topWebsites: Object.entries(rawData.tabUsage || {})
                  .map(([domain, duration]) => ({
                    _id: domain,
                    totalTime: Math.round(Number(duration) / 60), // convert seconds to minutes
                    visitCount: 1
                  }))
                  .sort((a, b) => b.totalTime - a.totalTime)
                  .slice(0, 5),
              };
              
              setStatistics(basicStats);
              
              // Create simple timeline data (just for today)
              const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
              setTimelineData([{
                name: today,
                focus: basicStats.focusTime,
                distraction: basicStats.distractionTime,
                score: basicStats.focusScore
              }]);
              
              // Set category data
              setCategoryData([
                { name: 'Productive', value: basicStats.focusTime, color: '#22c55e' },
                { name: 'Distraction', value: basicStats.distractionTime, color: '#ef4444' }
              ]);
              
              toast({
                title: "Limited Data Available",
                description: "Using raw usage data. Some statistics may be estimates.",
                variant: "default"
              });
            } else {
              throw new Error('No usage data available');
            }
          } catch (tertiaryError) {
            console.error('All data retrieval attempts failed:', tertiaryError);
            generateFallbackData();
            setError('Could not retrieve your statistics. Showing sample data for demonstration.');
            
            toast({
              title: "Error Loading Statistics",
              description: "Failed to load your statistics. Showing sample data for demonstration.",
              variant: "destructive"
            });
          }
        }
      }
    } catch (err: any) {
      console.error('Error in statistics retrieval process:', err);
      generateFallbackData();
      setError('Failed to fetch statistics. Showing sample data.');
      
      toast({
        title: "Error Loading Statistics",
        description: "Failed to load your statistics. Showing sample data for demonstration.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('User detected, fetching statistics:', user);
      fetchStatistics(selectedTimeFrame);
    } else {
      console.log('No user detected, using fallback data');
      generateFallbackData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedTimeFrame]);

  const handleRefresh = () => {
    fetchStatistics(selectedTimeFrame);
  };

  const formatTime = (minutes: number) => {
    if (minutes === undefined || minutes === null) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTrendIndicator = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${
        isPositive ? 'text-green-600' : 'text-red-600'
      }`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(change).toFixed(1)}%
      </div>
    );
  };

  // Time series chart tooltip formatter
  const formatTimeTooltip = (value: number, name: string) => {
    const formattedValue = formatTime(value);
    const formattedName = name === 'focus' ? 'Focus Time' : 
                          name === 'distraction' ? 'Distraction Time' :
                          name === 'score' ? 'Focus Score' : name;
    
    return [formattedValue, formattedName];
  };

  // Render skeleton loader during loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-32 mt-2" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-32 rounded" />
              <Skeleton className="h-10 w-24 rounded" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    <Skeleton className="h-4 w-24" />
                  </CardTitle>
                  <Skeleton className="h-4 w-4 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-36" /></CardTitle>
              <CardDescription><Skeleton className="h-4 w-64" /></CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Usage Statistics</h2>
            <p className="text-muted-foreground">
              Detailed breakdown of your app and browsing usage patterns
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTimeFrame}
              onChange={(e) => setSelectedTimeFrame(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant={showFallbackData ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Notice</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {showFallbackData && !error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sample Data</AlertTitle>
            <AlertDescription>
              Showing sample data for demonstration. Connect to the backend to see your actual statistics.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Apps Used
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.uniqueApps || 0}</div>
              <p className="text-xs text-muted-foreground">
                {statistics?.appUsageGrowth ? 
                  `${statistics.appUsageGrowth > 0 ? '+' : ''}${statistics.appUsageGrowth} from last period` :
                  'No comparison data'
                }
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(statistics?.totalActiveTime)}</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Focus: {formatTime(statistics?.focusTime)}
                </p>
                {getTrendIndicator(statistics?.totalActiveTime, statistics?.previousActiveTime)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Productivity Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics?.focusScore || 0}%</div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Distraction: {formatTime(statistics?.distractionTime)}
                </p>
                {getTrendIndicator(statistics?.focusScore, statistics?.previousFocusScore)}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Productivity Timeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Productivity Timeline</CardTitle>
            <CardDescription>
              Your focus vs distraction time over {selectedTimeFrame === 'daily' ? 'today' : 
                                                  selectedTimeFrame === 'weekly' ? 'this week' : 
                                                  'this month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart
                  data={timelineData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={formatTimeTooltip} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="focus"
                    name="Focus Time"
                    stroke="#22c55e"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="distraction"
                    name="Distraction"
                    stroke="#ef4444"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="score"
                    name="Focus Score"
                    stroke="#3b82f6"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="apps" className="space-y-4">
          <TabsList>
            <TabsTrigger value="apps">App Usage</TabsTrigger>
            <TabsTrigger value="websites">Website Usage</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="apps" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Applications</CardTitle>
                  <CardDescription>Most used applications this {selectedTimeFrame.slice(0, -2)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics?.topApps?.length > 0 ? (
                      statistics.topApps.slice(0, 10).map((app: any, index: number) => (
                        <div key={`app-${index}-${app._id}`} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{app._id}</p>
                              <p className="text-xs text-muted-foreground">
                                {statistics.totalActiveTime ? 
                                  `${((app.totalTime / (statistics.totalActiveTime || 1)) * 100).toFixed(1)}% of total time` :
                                  `${app.visitCount || 1} sessions`
                                }
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{formatTime(app.totalTime)}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No app usage data available</p>
                      </div>
                    )}
                  </div>
                  
                  {/* App Usage Chart */}
                  {statistics?.topApps?.length > 0 && (
                    <div className="h-64 mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={statistics.topApps.slice(0, 5).map((app: any) => ({
                            name: app._id,
                            value: app.totalTime
                          }))}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={formatTime} />
                          <Tooltip formatter={(value) => [formatTime(Number(value)), 'Usage Time']} />
                          <Bar dataKey="value" name="Usage Time" fill="#3b82f6">
                            {statistics.topApps.slice(0, 5).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Usage Patterns</CardTitle>
                  <CardDescription>Your productivity insights</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Most Productive Hour</span>
                      <Badge>{statistics?.mostProductiveHour || 'N/A'}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Average Session Length</span>
                      <Badge variant="outline">{formatTime(statistics?.averageSessionLength)}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Sessions</span>
                      <Badge variant="outline">{statistics?.totalSessions || 0}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Longest Focus Session</span>
                      <Badge variant="outline">{formatTime(statistics?.longestFocusSession)}</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Current Streak</span>
                      <Badge>{statistics?.currentStreak || 0} days</Badge>
                    </div>
                  </div>
                  
                  {/* Focus vs Distraction Donut Chart */}
                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [formatTime(Number(value)), 'Time']} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="websites" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Websites</CardTitle>
                  <CardDescription>Most visited websites this {selectedTimeFrame.slice(0, -2)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statistics?.topWebsites?.length > 0 ? (
                      statistics.topWebsites.slice(0, 10).map((website: any, index: number) => (
                        <div key={`website-${index}-${website._id}`} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{website._id}</p>
                              <p className="text-xs text-muted-foreground">
                                {website.visitCount ? `${website.visitCount} visits` : ''} 
                                {website.visitCount && statistics.totalActiveTime ? ' • ' : ''}
                                {statistics.totalActiveTime ? 
                                  `${((website.totalTime / (statistics.totalActiveTime || 1)) * 100).toFixed(1)}% of total time` : 
                                  ''}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{formatTime(website.totalTime)}</Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No website usage data available</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Website Usage Chart */}
                  {statistics?.topWebsites?.length > 0 && (
                    <div className="h-64 mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={statistics.topWebsites.slice(0, 5).map((website: any) => ({
                            name: website._id,
                            value: website.totalTime
                          }))}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={formatTime} />
                          <Tooltip formatter={(value) => [formatTime(Number(value)), 'Usage Time']} />
                          <Bar dataKey="value" name="Usage Time" fill="#f59e0b">
                            {statistics.topWebsites.slice(0, 5).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Website Categories</CardTitle>
                  <CardDescription>Types of websites visited</CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics?.categoryBreakdown?.length > 0 ? (
                    <div className="space-y-4">
                      {statistics.categoryBreakdown.map((category: any, index: number) => (
                        <div key={`category-${index}`} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium capitalize">
                              {category.category || 'Uncategorized'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatTime(category.totalTime)}
                            </span>
                          </div>
                          <Progress 
                            value={
                              statistics.totalActiveTime ? 
                                (category.totalTime / statistics.totalActiveTime) * 100 : 
                                0
                            } 
                            className="h-2" 
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No website category data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Focus vs Distraction</CardTitle>
                  <CardDescription>Balance between productive and distracting activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Focus', value: statistics?.focusTime || 0, color: '#22c55e' },
                            { name: 'Distraction', value: statistics?.distractionTime || 0, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#22c55e" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip formatter={(value) => [formatTime(Number(value)), 'Time']} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        Focus Time
                      </span>
                      <span className="font-medium">{formatTime(statistics?.focusTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        Distraction Time
                      </span>
                      <span className="font-medium">{formatTime(statistics?.distractionTime)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm font-medium">Productivity Ratio</span>
                      <span className="font-medium">
                        {statistics?.totalActiveTime ? 
                          `${((statistics.focusTime / (statistics.totalActiveTime || 1)) * 100).toFixed(1)}%` : 
                          '0%'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Daily Activity Distribution</CardTitle>
                  <CardDescription>When you're most active during the day</CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics?.hourlyBreakdown ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={statistics.hourlyBreakdown.map((hour: any) => ({
                            name: `${hour.hour}:00`,
                            value: hour.totalTime
                          }))}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis tickFormatter={formatTime} />
                          <Tooltip formatter={(value) => [formatTime(Number(value)), 'Activity']} />
                          <Bar dataKey="value" name="Activity" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hourly activity data available</p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Activity Insights</h4>
                    <ul className="space-y-1 text-sm">
                      <li>Most productive hour: {statistics?.mostProductiveHour || 'N/A'}</li>
                      <li>Most distracted hour: {statistics?.mostDistractedHour || 'N/A'}</li>
                      <li>Average daily activity: {formatTime(statistics?.averageDailyActivity)}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Statistics;
