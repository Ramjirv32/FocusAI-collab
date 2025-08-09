import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { ArrowLeft, Calendar, Download, Filter } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFF', '#FF66B3', '#71DFE7'];

const ApplicationAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeFrame, setTimeFrame] = useState('daily');
  const [appUsageData, setAppUsageData] = useState(null);
  const [appVsWebData, setAppVsWebData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useDemoData, setUseDemoData] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date()
  });
  
  // Demo data for testing when no real data is available
  const demoData = {
    data: {
      trends: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          totalDuration: Math.floor(Math.random() * 10000) + 5000,
          apps: {
            'Visual Studio Code': Math.floor(Math.random() * 5000) + 2000,
            'Google Chrome': Math.floor(Math.random() * 3000) + 1000,
            'Terminal': Math.floor(Math.random() * 2000) + 500,
            'Slack': Math.floor(Math.random() * 1500) + 500,
            'Spotify': Math.floor(Math.random() * 1000) + 300
          }
        };
      }),
      topApps: ['Visual Studio Code', 'Google Chrome', 'Terminal', 'Slack', 'Spotify']
    }
  };
  
  const demoAppUsageData = {
    data: Array.from({ length: 5 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        appUsage: {
          'Visual Studio Code': 7200,
          'Google Chrome': 5400,
          'Terminal': 1800,
          'Slack': 1200,
          'Spotify': 2400
        }
      };
    })
  };
  
  const demoAppVsWebData = {
    data: {
      comparison: {
        appUsage: { percentage: 65, totalDuration: 25200 },
        webUsage: { percentage: 35, totalDuration: 13500 }
      },
      topApps: [
        { name: 'Visual Studio Code', duration: 7200 },
        { name: 'Terminal', duration: 1800 },
        { name: 'Slack', duration: 1200 },
        { name: 'Spotify', duration: 2400 },
        { name: 'Postman', duration: 900 }
      ],
      topWebsites: [
        { domain: 'github.com', duration: 3600 },
        { domain: 'stackoverflow.com', duration: 2700 },
        { domain: 'google.com', duration: 1800 },
        { domain: 'youtube.com', duration: 1500 },
        { domain: 'docs.microsoft.com', duration: 900 }
      ]
    }
  };

  useEffect(() => {
    if (useDemoData) {
      setAppUsageData(demoAppUsageData);
      setAppVsWebData(demoAppVsWebData);
      setTrendData(demoData);
      setLoading(false);
    } else {
      fetchAllData();
    }
  }, [timeFrame, dateRange, useDemoData]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAppUsageData(),
        fetchAppVsWebData(),
        fetchTrendData()
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      
      // If we failed to load data, offer to use demo data
      toast({
        title: 'Connection Error',
        description: 'Failed to load analytics data. Would you like to use demo data instead?',
        variant: 'destructive',
        action: (
          <Button size="sm" onClick={() => setUseDemoData(true)}>
            Use Demo Data
          </Button>
        ),
      });
      
      setLoading(false);
    }
  };

  const fetchAppUsageData = async () => {
    try {
      const token = localStorage.getItem('token');
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      
      console.log(`Fetching app usage data with timeFrame=${timeFrame}, startDate=${startDate}, endDate=${endDate}`);
      
      const response = await axios.get(
        `http://localhost:5001/api/app-usage/app-analytics?timeFrame=${timeFrame}&startDate=${startDate}&endDate=${endDate}`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('App usage data response:', response.data);
      setAppUsageData(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching app usage data:', error);
      console.log('Falling back to demo data for app usage');
      setAppUsageData(demoAppUsageData);
      throw error;
    }
  };

  const fetchAppVsWebData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      console.log(`Fetching app vs web data with timeFrame=${timeFrame}`);
      
      const response = await axios.get(
        `http://localhost:5001/api/app-usage/app-vs-web?timeFrame=${timeFrame}`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('App vs web data response:', response.data);
      setAppVsWebData(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching app vs web data:', error);
      console.log('Falling back to demo data for app vs web');
      setAppVsWebData(demoAppVsWebData);
      throw error;
    }
  };

  const fetchTrendData = async () => {
    try {
      const token = localStorage.getItem('token');
      const period = timeFrame === 'monthly' ? '90days' : timeFrame === 'weekly' ? '30days' : '7days';
      
      console.log(`Fetching trend data with timeFrame=${timeFrame}, period=${period}`);
      
      const response = await axios.get(
        `http://localhost:5001/api/app-usage/app-trends?timeFrame=${timeFrame}&period=${period}`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      console.log('Trend data response:', response.data);
      setTrendData(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching trend data:', error);
      console.log('Falling back to demo data for trends');
      setTrendData(demoData);
      throw error;
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

  const formatAppUsageForChart = () => {
    if (!appUsageData || !appUsageData.data) return [];
    
    return appUsageData.data.slice(0, 10).map(item => {
      const appUsage = Object.entries(item.appUsage).map(([name, duration]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        duration: Math.floor(duration / 60), // Convert to minutes
        fullName: name
      }));
      
      return {
        date: timeFrame === 'monthly' ? item.month : 
              timeFrame === 'weekly' ? item.weekStart : 
              item.date,
        apps: appUsage
      };
    });
  };

  const formatAppVsWebForChart = () => {
    if (!appVsWebData || !appVsWebData.data) return [];
    
    const { comparison } = appVsWebData.data;
    return [
      { name: 'Applications', value: comparison.appUsage.percentage },
      { name: 'Web Browsing', value: comparison.webUsage.percentage }
    ];
  };

  const formatTrendDataForChart = () => {
    if (!trendData || !trendData.data) return [];
    
    return trendData.data.trends.map(day => {
      const formattedDay = {
        date: day.date,
        totalDuration: Math.floor(day.totalDuration / 60) // Convert to minutes
      };
      
      // Add each top app as a data point
      Object.entries(day.apps).forEach(([appName, duration]) => {
        formattedDay[appName] = Math.floor(duration / 60); // Convert to minutes
      });
      
      return formattedDay;
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Application Analytics</h1>
        </div>
        
        <div className="grid gap-6">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Application Analytics</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 mr-4">
            <Label htmlFor="demo-mode-detail" className="text-sm">Demo Mode</Label>
            <Switch 
              id="demo-mode-detail" 
              checked={useDemoData} 
              onCheckedChange={setUseDemoData} 
            />
          </div>
          <DatePickerWithRange 
            date={dateRange} 
            setDate={setDateRange} 
          />
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={timeFrame} onValueChange={setTimeFrame} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-6">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
        
        <TabsContent value={timeFrame} className="space-y-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Application Usage Overview</CardTitle>
              <CardDescription>
                Analyze your application usage patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {appUsageData && appUsageData.data && appUsageData.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart 
                    data={formatAppUsageForChart()[0]?.apps || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value, name, props) => [`${value} minutes`, props.payload.fullName]}
                      labelFormatter={() => 'Duration'}
                    />
                    <Legend />
                    <Bar dataKey="duration" fill="#8884d8" name="Duration (minutes)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="bg-muted rounded-full p-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                      <rect width="18" height="14" x="3" y="5" rx="2" />
                      <path d="M7 15h0M21 19H3M17 7l-10 8" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No application data available</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    We haven't collected any application usage data for the selected time period yet. 
                    Make sure the FocusAI extension is installed and active, or toggle Demo Mode to see sample data.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!useDemoData && (
                      <Button onClick={() => setUseDemoData(true)} variant="default">
                        Enable Demo Mode
                      </Button>
                    )}
                    <Button onClick={fetchAllData} variant="outline">
                      Retry Loading Data
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* App vs Web Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Apps vs Web Browsing</CardTitle>
                <CardDescription>
                  Comparison between application usage and web browsing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appVsWebData && appVsWebData.data ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={formatAppVsWebForChart()}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {formatAppVsWebForChart().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value}%`} />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                      <div className="bg-muted p-3 rounded-md text-center">
                        <p className="text-xs text-muted-foreground">App Usage</p>
                        <p className="text-lg font-bold">
                          {formatTime(appVsWebData.data.comparison.appUsage.totalDuration)}
                        </p>
                      </div>
                      <div className="bg-muted p-3 rounded-md text-center">
                        <p className="text-xs text-muted-foreground">Web Usage</p>
                        <p className="text-lg font-bold">
                          {formatTime(appVsWebData.data.comparison.webUsage.totalDuration)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No comparison data available.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Apps Card */}
            <Card>
              <CardHeader>
                <CardTitle>Top Applications</CardTitle>
                <CardDescription>
                  Your most used applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appVsWebData && appVsWebData.data && appVsWebData.data.topApps ? (
                  <div className="space-y-3">
                    {appVsWebData.data.topApps.map((app, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-sm">{app.name}</span>
                        </div>
                        <span className="text-sm font-medium">{formatTime(app.duration)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No top applications data available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trends Card */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <CardDescription>
                Application usage trends over time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {trendData && trendData.data && trendData.data.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart 
                    data={formatTrendDataForChart()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="totalDuration" fill="#8884d8" stroke="#8884d8" name="Total Usage" />
                    {trendData.data.topApps.slice(0, 3).map((app, index) => (
                      <Area 
                        key={app}
                        type="monotone" 
                        dataKey={app} 
                        fill={COLORS[index + 1]} 
                        stroke={COLORS[index + 1]} 
                        name={app} 
                        stackId="1"
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No trend data found for this time period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ApplicationAnalytics;
