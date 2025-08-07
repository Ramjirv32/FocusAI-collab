import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, PieChart, LineChart, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const Statistics = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('weekly');

  // Get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchStatistics = async (timeFrame = selectedTimeFrame) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get(
        `http://localhost:5001/api/user-stats?timeFrame=${timeFrame}`,
        { headers: getAuthHeader() }
      );
      
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError(error.response?.data?.message || 'Failed to fetch statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatistics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedTimeFrame]);

  const handleRefresh = () => {
    fetchStatistics();
  };

  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTrendIndicator = (current, previous) => {
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
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
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
              <LineChart className="h-4 w-4 text-muted-foreground" />
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
              <PieChart className="h-4 w-4 text-muted-foreground" />
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
                      statistics.topApps.slice(0, 10).map((app, index) => (
                        <div key={app._id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{app._id}</p>
                              <p className="text-xs text-muted-foreground">
                                {((app.totalTime / (statistics.totalActiveTime || 1)) * 100).toFixed(1)}% of total time
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
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="websites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Website Usage</CardTitle>
                <CardDescription>Most visited websites this {selectedTimeFrame.slice(0, -2)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics?.topWebsites?.length > 0 ? (
                    statistics.topWebsites.slice(0, 10).map((website, index) => (
                      <div key={website._id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{website._id}</p>
                            <p className="text-xs text-muted-foreground">
                              {website.visitCount} visits • {((website.totalTime / (statistics.totalActiveTime || 1)) * 100).toFixed(1)}% of total time
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
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activity Categories</CardTitle>
                <CardDescription>Time spent by activity category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics?.categoryBreakdown?.length > 0 ? (
                    statistics.categoryBreakdown.map((category, index) => (
                      <div key={category.category || index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium ${
                            category.category === 'productive' ? 'bg-green-100 text-green-800' :
                            category.category === 'distraction' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm capitalize">{category.category || 'Uncategorized'}</p>
                            <p className="text-xs text-muted-foreground">
                              {((category.totalTime / (statistics.totalActiveTime || 1)) * 100).toFixed(1)}% of total time
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={
                            category.category === 'productive' ? 'default' :
                            category.category === 'distraction' ? 'destructive' : 
                            'outline'
                          }
                        >
                          {formatTime(category.totalTime)}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No category data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Statistics;
