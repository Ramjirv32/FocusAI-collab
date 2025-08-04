import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart 
} from 'recharts';
import { 
  Brain, Clock, Target, TrendingUp, Monitor, Globe, 
  Activity, Calendar, RefreshCw, Award, AlertCircle,
  Eye, MousePointer, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';

const FocusAnalytics = () => {
  const { user } = useAuth();
  const [productivityData, setProductivityData] = useState(null);
  const [focusData, setFocusData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Chart colors
  const COLORS = {
    productive: '#22c55e',
    nonProductive: '#ef4444',
    neutral: '#f59e0b',
    focus: '#3b82f6',
    distraction: '#ec4899'
  };

  const pieColors = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

  const loadAnalyticsData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 Loading analytics for ${user.email} on ${selectedDate}`);
      
      // Fetch productivity summary
      const productivityResponse = await fetch(
        `http://localhost:8000/user/${user.id}/productivity-summary?date=${selectedDate}&email=${user.email}`
      );
      
      if (productivityResponse.ok) {
        const productivityResult = await productivityResponse.json();
        setProductivityData(productivityResult);
        console.log('✅ Productivity data loaded:', productivityResult);
      } else {
        console.warn('⚠️ Failed to load productivity data');
      }
      
      // Fetch focus analysis
      const focusResponse = await fetch(
        `http://localhost:8000/user/${user.id}/focus-analysis?date=${selectedDate}&email=${user.email}`
      );
      
      if (focusResponse.ok) {
        const focusResult = await focusResponse.json();
        setFocusData(focusResult);
        console.log('✅ Focus data loaded:', focusResult);
      } else {
        console.warn('⚠️ Failed to load focus data');
      }
      
    } catch (err) {
      console.error('❌ Error loading analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [user, selectedDate]);

  const formatTime = (seconds) => {
    if (!seconds || seconds < 60) return `${seconds || 0}s`;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const formatPercentage = (value, total) => {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  // Prepare chart data
  const prepareProductivityChartData = () => {
    if (!productivityData) return { apps: [], categories: [] };
    
    // App usage data
    const allApps = {
      ...productivityData.productive_content,
      ...productivityData.non_productive_content
    };
    
    const appsData = Object.entries(allApps)
      .map(([app, duration]) => ({
        name: app.length > 15 ? app.substring(0, 15) + '...' : app,
        fullName: app,
        duration,
        hours: (duration / 3600).toFixed(1),
        isProductive: productivityData.productive_content[app] ? true : false
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Category data for pie chart
    const categoriesData = [
      {
        name: 'Productive',
        value: productivityData.total_productive_time,
        color: COLORS.productive
      },
      {
        name: 'Non-Productive',
        value: productivityData.total_non_productive_time,
        color: COLORS.nonProductive
      }
    ];

    return { apps: appsData, categories: categoriesData };
  };

  const prepareFocusChartData = () => {
    if (!focusData) return { timeline: [], areas: [] };
    
    // Focus areas data
    const areasData = [
      ...focusData.focus_areas.map(area => ({
        name: area.category,
        duration: area.total_duration,
        count: area.activity_count,
        type: 'focus',
        color: COLORS.focus
      })),
      ...focusData.distraction_areas.map(area => ({
        name: area.category,
        duration: area.total_duration,
        count: area.activity_count,
        type: 'distraction',
        color: COLORS.distraction
      }))
    ];

    return { areas: areasData };
  };

  const chartData = prepareProductivityChartData();
  const focusChartData = prepareFocusChartData();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="w-full">
            <CardContent className="pt-6 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="text-lg font-medium">Loading Your Focus Analytics...</p>
                <p className="text-sm text-muted-foreground">Analyzing productivity patterns and insights</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="w-full border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Error Loading Analytics
              </CardTitle>
              <CardDescription>
                There was a problem retrieving your focus analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{error}</p>
              <Button onClick={loadAnalyticsData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Focus Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Deep insights into your productivity and focus patterns
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
            <Button onClick={loadAnalyticsData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Focus Score</p>
                  <p className="text-3xl font-bold text-primary">
                    {productivityData?.focus_score || 0}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
                  <p className="text-3xl font-bold">
                    {formatTime(productivityData?.overall_total_usage || 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Productive Time</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatTime(productivityData?.total_productive_time || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activities</p>
                  <p className="text-3xl font-bold">
                    {focusData?.total_activities || 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics */}
        <Tabs defaultValue="productivity" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
            <TabsTrigger value="focus">Focus Areas</TabsTrigger>
            <TabsTrigger value="apps">Applications</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="productivity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Productivity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Productivity Distribution</CardTitle>
                  <CardDescription>
                    How your time is distributed between productive and non-productive activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.categories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatTime(value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.categories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatTime(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Applications */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Applications</CardTitle>
                  <CardDescription>
                    Most used applications by time spent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.apps}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [formatTime(value), 'Duration']}
                        labelFormatter={(label) => chartData.apps.find(app => app.name === label)?.fullName || label}
                      />
                      <Bar 
                        dataKey="duration" 
                        fill={(entry) => entry.isProductive ? COLORS.productive : COLORS.nonProductive}
                      >
                        {chartData.apps.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.isProductive ? COLORS.productive : COLORS.nonProductive} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="focus" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Focus vs Distraction */}
              <Card>
                <CardHeader>
                  <CardTitle>Focus Areas Analysis</CardTitle>
                  <CardDescription>
                    Breakdown of your focus and distraction patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={focusChartData.areas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatTime(value), 'Duration']} />
                      <Bar dataKey="duration">
                        {focusChartData.areas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Focus Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Focus Summary</CardTitle>
                  <CardDescription>
                    Key focus metrics and performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Focused Duration</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {formatTime((focusData?.summary?.focused_duration_minutes || 0) * 60)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Distracted Duration</span>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {formatTime((focusData?.summary?.distracted_duration_minutes || 0) * 60)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Productivity Score</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {focusData?.summary?.productivity_score || 0}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="apps" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Productive Apps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-green-600" />
                    Most Productive Applications
                  </CardTitle>
                  <CardDescription>
                    Applications that boost your productivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(productivityData?.productive_content || {})
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([app, duration], index) => (
                        <div key={app} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="font-medium">{app}</span>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {formatTime(duration)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Distracting Apps */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-red-600" />
                    Most Distracting Applications
                  </CardTitle>
                  <CardDescription>
                    Applications that tend to distract you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(productivityData?.non_productive_content || {})
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([app, duration], index) => (
                        <div key={app} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="font-medium">{app}</span>
                          </div>
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {formatTime(duration)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    Key Insights
                  </CardTitle>
                  <CardDescription>
                    AI-powered insights about your productivity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Most Productive App</h4>
                    <p className="text-sm text-blue-800">
                      <strong>{productivityData?.max_productive_app || 'N/A'}</strong> is your most productive application
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2">Overall Usage</h4>
                    <p className="text-sm text-purple-800">
                      You spent <strong>{formatTime(productivityData?.overall_total_usage || 0)}</strong> on applications today
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Focus Performance</h4>
                    <p className="text-sm text-green-800">
                      Your focus score of <strong>{productivityData?.focus_score || 0}%</strong> shows 
                      {(productivityData?.focus_score || 0) >= 70 ? ' excellent' : 
                       (productivityData?.focus_score || 0) >= 50 ? ' good' : ' room for improvement'} productivity
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    Recommendations
                  </CardTitle>
                  <CardDescription>
                    Personalized suggestions to improve your focus
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {productivityData?.focus_score < 50 && (
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-semibold text-orange-900 mb-2">🎯 Improve Focus</h4>
                      <p className="text-sm text-orange-800">
                        Consider using time-blocking techniques and reducing distracting applications
                      </p>
                    </div>
                  )}

                  {(productivityData?.total_non_productive_time || 0) > (productivityData?.total_productive_time || 0) && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2">⚠️ Reduce Distractions</h4>
                      <p className="text-sm text-red-800">
                        Try to limit time spent on non-productive applications during work hours
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">✨ Keep It Up!</h4>
                    <p className="text-sm text-green-800">
                      Continue using {productivityData?.max_productive_app || 'productive tools'} to maintain your productivity streak
                    </p>
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

export default FocusAnalytics;

