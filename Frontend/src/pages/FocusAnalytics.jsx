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
  Eye, MousePointer, Zap, X, Shield, Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/Layout/DashboardLayout';
import AIRecommendations from '../components/FocusAnalysis/AIRecommendations';
import FocusDistractionsChart from '../components/FocusAnalysis/FocusDistractionsChart';

// Define API base URL
const API_BASE_URL = 'http://localhost:5001';

const FocusAnalytics = () => {
  const { user } = useAuth();
  const [productivityData, setProductivityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Enhanced alert states
  const [alertMessage, setAlertMessage] = useState('');
  const [isBlockingAlert, setIsBlockingAlert] = useState(false);
  const [alertType, setAlertType] = useState(''); // 'is50', 'is20', 'warning'
  const [alertSeverity, setAlertSeverity] = useState('medium'); // 'low', 'medium', 'high', 'critical'
  const [alertTimer, setAlertTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Chart colors
  const COLORS = {
    productive: '#22c55e',
    nonProductive: '#ef4444',
    neutral: '#f59e0b',
  };

  const pieColors = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

  const loadAnalyticsData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 Loading analytics for ${user.email} on ${selectedDate}`);
      
      // Fetch productivity summary from correct port (5001)
      const productivityResponse = await fetch(
        `${API_BASE_URL}/api/productivity-summary?date=${selectedDate}`
      , {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (productivityResponse.ok) {
        const productivityResult = await productivityResponse.json();
        
        // Extract the first summary if we got an array of summaries
        const summary = productivityResult.summaries && productivityResult.summaries.length > 0 
          ? productivityResult.summaries[0] 
          : productivityResult;
          
        // Process the data to ensure it has the right format
        const processedData = {
          focus_score: summary.focusScore || 0,
          total_productive_time: summary.totalProductiveTime || 0,
          total_non_productive_time: summary.totalNonProductiveTime || 0,
          overall_total_usage: summary.overallTotalUsage || 0,
          max_productive_app: summary.maxProductiveApp || 'None',
          most_used_app: summary.mostUsedApp || 'None',
          most_visited_tab: summary.mostVisitedTab || 'None',
          total_activities: Object.keys(summary.productiveContent || {}).length + 
                           Object.keys(summary.nonProductiveContent || {}).length,
          // Convert Maps to objects if needed
          productive_content: summary.productiveContent || {},
          non_productive_content: summary.nonProductiveContent || {}
        };
        
        setProductivityData(processedData);
        
        // Check for productivity alerts based on focus score
        await checkProductivityAlerts(processedData.focus_score);
        
        console.log('✅ Productivity data loaded:', processedData);
      } else {
        console.warn('⚠️ Failed to load productivity data');
        setError('Failed to load productivity data');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load data. Please try again.');
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

  // Clear any existing timers on component unmount
  useEffect(() => {
    return () => {
      if (alertTimer) {
        clearInterval(alertTimer);
      }
    };
  }, [alertTimer]);

  const formatPercentage = (value, total) => {
    if (!total) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  // Enhanced function to show blocking alerts with timer
  const showBlockingAlert = (message, type, severity = 'medium', suggestions = null) => {
    console.log(`🚨 Showing ${type} alert:`, message);
    
    setAlertMessage(message);
    setAlertType(type);
    setAlertSeverity(severity);
    
    const isBlocking = type === 'is50' || type === 'is20';
    setIsBlockingAlert(isBlocking);
    
    // Set timer duration (10 seconds for blocking alerts, 5 seconds for others)
    const timerDuration = isBlocking ? 10 : 5;
    setTimeRemaining(timerDuration);
    
    // Clear any existing timer
    if (alertTimer) {
      clearInterval(alertTimer);
    }
    
    // Start countdown timer
    const newTimer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer finished - hide alert
          clearInterval(newTimer);
          setAlertMessage('');
          setIsBlockingAlert(false);
          setAlertType('');
          setAlertSeverity('medium');
          setTimeRemaining(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setAlertTimer(newTimer);
  };

  // Manual close alert function
  const closeAlert = () => {
    if (alertTimer) {
      clearInterval(alertTimer);
      setAlertTimer(null);
    }
    
    setAlertMessage('');
    setIsBlockingAlert(false);
    setAlertType('');
    setAlertSeverity('medium');
    setTimeRemaining(0);
  };

  // Fallback client-side alert check
  const fallbackAlertCheck = (focusScore) => {
    console.log('🔄 Using fallback alert check');
    
    if (focusScore <= 20) {
      showBlockingAlert(
        `🚨 CRITICAL: Your focus score is ${focusScore}%. Immediate action required to improve productivity!`,
        'is20',
        'critical'
      );
    } else if (focusScore <= 50) {
      showBlockingAlert(
        `⚠️ WARNING: Your focus score is ${focusScore}%. Consider taking steps to improve your concentration.`,
        'is50',
        'high'
      );
    }
  };

  // Enhanced productivity alerts check
  const checkProductivityAlerts = async (focusScore) => {
    if (!user) return;

    try {
      console.log(`🔍 Checking productivity alerts for focus score: ${focusScore}`);
      
      // Check server-side alerts with the current focus score
      const response = await fetch(`${API_BASE_URL}/api/alerts/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ focusScore })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Alert check response:', data);
        
        // Only show alert if server indicates we should
        if (data.showAlert && data.alert) {
          const severity = data.alertType === 'is20' ? 'critical' : 'high';
          showBlockingAlert(data.alert, data.alertType, severity, data.suggestions);
        } else {
          console.log('ℹ️ No alert needed or already shown today');
        }
      } else {
        console.warn('⚠️ Server alert check failed, using fallback');
        const errorData = await response.json().catch(() => ({}));
        console.error('Server error:', errorData);
        
        // Fallback to client-side check if server fails
        fallbackAlertCheck(focusScore);
      }
    } catch (error) {
      console.error('❌ Error checking productivity alerts:', error);
      
      // Fallback to client-side check on network error
      fallbackAlertCheck(focusScore);
    }
  };

  // Function to get alert styling based on severity
  const getAlertStyling = (severity, type) => {
    const baseClasses = "fixed top-0 left-0 right-0 z-50 w-full p-4 font-bold text-center flex justify-between items-center";
    
    switch (severity) {
      case 'critical':
        return `${baseClasses} bg-red-600 text-white border-b-4 border-red-800 shadow-lg animate-pulse`;
      case 'high':
        return `${baseClasses} bg-orange-500 text-white border-b-4 border-orange-700 shadow-lg`;
      case 'medium':
        return `${baseClasses} bg-yellow-500 text-white border-b-4 border-yellow-600`;
      default:
        return `${baseClasses} bg-blue-500 text-white border-b-4 border-blue-600`;
    }
  };

  // Function to get alert icon based on type and severity
  const getAlertIcon = (severity, type) => {
    if (type === 'is20') return <Ban className="inline-block mr-2" size={24} />;
    if (type === 'is50') return <Shield className="inline-block mr-2" size={24} />;
    return <AlertCircle className="inline-block mr-2" size={20} />;
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

  const chartData = prepareProductivityChartData();

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
      {/* Full Screen Alert Modal with Timer */}
      {isBlockingAlert && alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-75"
            onClick={closeAlert}
          />
          
          {/* Alert Content */}
          <div className={`relative w-full max-w-2xl p-8 rounded-xl shadow-2xl ${
            alertType === 'is20' ? 'bg-red-600' : 'bg-orange-500'
          } text-white transform transition-all duration-300 scale-100`}>
            
            {/* Timer Display */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black bg-opacity-30 rounded-full px-3 py-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-bold">{timeRemaining}s</span>
            </div>
            
            <div className="text-center">
              <div className="mb-6 text-6xl">
                {alertType === 'is20' ? (
                  <Ban className="mx-auto h-20 w-20 text-white" />
                ) : (
                  <Shield className="mx-auto h-20 w-20 text-white" />
                )}
              </div>
              
              <h2 className="text-3xl font-bold mb-4">
                {alertType === 'is20' 
                  ? 'Critical Alert!'
                  : 'Attention Needed!'}
              </h2>
              
              <p className="text-xl mb-8">{alertMessage}</p>
              
              <div className="flex flex-col space-y-4">
                {alertType === 'is20' ? (
                  <>
                    <p className="text-lg">Immediate actions to take:</p>
                    <ul className="text-left max-w-md mx-auto space-y-2">
                      <li>• Close all distracting applications</li>
                      <li>• Take a 5-minute break to reset</li>
                      <li>• Turn on focus mode</li>
                      <li>• Review your goals for the day</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-lg">Suggestions to improve focus:</p>
                    <ul className="text-left max-w-md mx-auto space-y-2">
                      <li>• Try the Pomodoro technique (25 min work, 5 min break)</li>
                      <li>• Close unnecessary browser tabs</li>
                      <li>• Put your phone in another room</li>
                      <li>• Listen to focus music</li>
                    </ul>
                  </>
                )}
              </div>
              
              <button
                onClick={() => {
                  setAlertMessage('');
                  setIsBlockingAlert(false);
                  setAlertType('');
                }}
                className={`mt-8 px-8 py-3 rounded-lg font-bold ${
                  alertType === 'is20' 
                    ? 'bg-white text-red-600 hover:bg-red-100' 
                    : 'bg-white text-orange-600 hover:bg-orange-100'
                } transition-colors duration-200`}
              >
                {alertType === 'is20' ? 'I understand, I will improve' : 'Got it, I will focus'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Bar Alert (for non-blocking alerts) */}
      {alertMessage && !isBlockingAlert && (
        <div className={`fixed top-0 left-0 right-0 z-50 w-full p-4 text-center font-bold ${
          alertSeverity === 'critical' ? 'bg-red-600 text-white' :
          alertSeverity === 'high' ? 'bg-orange-500 text-white' :
          'bg-yellow-500 text-white'
        }`}>
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center justify-center flex-1">
              {alertType === 'is20' && <Ban className="inline-block mr-2" size={24} />}
              {alertType === 'is50' && <Shield className="inline-block mr-2" size={24} />}
              {!alertType && <AlertCircle className="inline-block mr-2" size={20} />}
              <span>{alertMessage}</span>
              {timeRemaining > 0 && (
                <span className="ml-4 text-sm opacity-80">({timeRemaining}s)</span>
              )}
            </div>
            <button 
              onClick={closeAlert}
              className="p-1 rounded-full hover:bg-white hover:bg-opacity-20"
              aria-label="Close alert"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className={`p-6 space-y-6 ${isBlockingAlert ? 'pointer-events-none opacity-50' : ''}`}>
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
              disabled={isBlockingAlert}
            />
            <Button onClick={loadAnalyticsData} variant="outline" size="sm" disabled={isBlockingAlert}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={productivityData?.focus_score <= 20 ? 'border-red-500 bg-red-50' : 
                          productivityData?.focus_score <= 50 ? 'border-orange-500 bg-orange-50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Focus Score</p>
                  <p className={`text-3xl font-bold ${
                    (productivityData?.focus_score || 0) <= 20 ? 'text-red-600' :
                    (productivityData?.focus_score || 0) <= 50 ? 'text-orange-600' :
                    'text-primary'
                  }`}>
                    {productivityData?.focus_score || 0}%
                  </p>
                </div>
                <Target className={`h-8 w-8 ${
                  (productivityData?.focus_score || 0) <= 20 ? 'text-red-600' :
                  (productivityData?.focus_score || 0) <= 50 ? 'text-orange-600' :
                  'text-primary'
                }`} />
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
                    {productivityData?.total_activities || 0}
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
            <TabsTrigger value="productivity" disabled={isBlockingAlert}>Productivity</TabsTrigger>
            <TabsTrigger value="focus" disabled={isBlockingAlert}>Focus Areas</TabsTrigger>
            <TabsTrigger value="apps" disabled={isBlockingAlert}>Applications</TabsTrigger>
            <TabsTrigger value="insights" disabled={isBlockingAlert}>Insights</TabsTrigger>
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
                  {/* Debug information */}
                  <div className="mt-4 text-xs text-muted-foreground">
                    <div>Productive time: {formatTime(productivityData?.total_productive_time || 0)}</div>
                    <div>Non-productive time: {formatTime(productivityData?.total_non_productive_time || 0)}</div>
                  </div>
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
                        name="Duration"
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
                  {productivityData ? (
                    <FocusDistractionsChart 
                      data={{
                        productiveContent: productivityData.productive_content || {},
                        nonProductiveContent: productivityData.non_productive_content || {}
                      }}
                      isDemo={false}
                    />
                  ) : (
                    <FocusDistractionsChart isDemo={true} />
                  )}
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
                      {formatTime(productivityData?.total_productive_time || 0)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium">Distracted Duration</span>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {formatTime(productivityData?.total_non_productive_time || 0)}
                    </Badge>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-lg ${
                    (productivityData?.focus_score || 0) <= 20 ? 'bg-red-50' :
                    (productivityData?.focus_score || 0) <= 50 ? 'bg-orange-50' :
                    'bg-blue-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Award className={`h-5 w-5 ${
                        (productivityData?.focus_score || 0) <= 20 ? 'text-red-600' :
                        (productivityData?.focus_score || 0) <= 50 ? 'text-orange-600' :
                        'text-blue-600'
                      }`} />
                      <span className="font-medium">Productivity Score</span>
                    </div>
                    <Badge variant="secondary" className={
                      (productivityData?.focus_score || 0) <= 20 ? 'bg-red-100 text-red-800' :
                      (productivityData?.focus_score || 0) <= 50 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {productivityData?.focus_score || 0}%
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

                  <div className={`p-4 rounded-lg ${
                    (productivityData?.focus_score || 0) <= 20 ? 'bg-red-50' :
                    (productivityData?.focus_score || 0) <= 50 ? 'bg-orange-50' :
                    'bg-green-50'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      (productivityData?.focus_score || 0) <= 20 ? 'text-red-900' :
                      (productivityData?.focus_score || 0) <= 50 ? 'text-orange-900' :
                      'text-green-900'
                    }`}>Focus Performance</h4>
                    <p className={`text-sm ${
                      (productivityData?.focus_score || 0) <= 20 ? 'text-red-800' :
                      (productivityData?.focus_score || 0) <= 50 ? 'text-orange-800' :
                      'text-green-800'
                    }`}>
                      Your focus score of <strong>{productivityData?.focus_score || 0}%</strong> shows 
                      {(productivityData?.focus_score || 0) <= 20 ? ' critical need for improvement - immediate action required!' : 
                       (productivityData?.focus_score || 0) <= 50 ? ' room for improvement - consider focusing strategies.' : 
                       (productivityData?.focus_score || 0) >= 70 ? ' excellent productivity!' : ' good productivity'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    AI Recommendations
                  </CardTitle>
                  <CardDescription>
                    Personalized suggestions to improve your focus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AIRecommendations 
                    focusPercentage={productivityData?.focus_score || 0}
                    productiveApps={
                      productivityData?.productive_content 
                        ? Object.keys(productivityData.productive_content) 
                        : []
                    }
                    distractingApps={
                      productivityData?.non_productive_content 
                        ? Object.keys(productivityData.non_productive_content) 
                        : []
                    }
                    hasData={!!productivityData}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Emergency Focus Action Panel - Only show for critical scores */}
        {(productivityData?.focus_score || 0) <= 20 && (
          <Card className="border-red-500 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Ban className="h-6 w-6" />
                Emergency Focus Action Required
              </CardTitle>
              <CardDescription className="text-red-700">
                Your productivity is critically low. Take immediate action to improve your focus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">🚨 Immediate Actions</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Take a 5-minute break from all devices</li>
                    <li>• Close all non-essential applications</li>
                    <li>• Set a 25-minute focused work timer</li>
                    <li>• Turn off all notifications</li>
                  </ul>
                </div>
                <div className="p-4 bg-white rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">📱 App Recommendations</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Use focus/productivity apps only</li>
                    <li>• Block social media and entertainment</li>
                    <li>• Enable website blockers</li>
                    <li>• Switch to airplane mode if possible</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning Focus Panel - For moderate scores */}
        {(productivityData?.focus_score || 0) > 20 && (productivityData?.focus_score || 0) <= 50 && (
          <Card className="border-orange-500 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Shield className="h-6 w-6" />
                Focus Improvement Needed
              </CardTitle>
              <CardDescription className="text-orange-700">
                Your productivity could be better. Consider implementing these strategies.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">⏰ Time Management</h4>
                  <p className="text-sm text-orange-700">
                    Try the Pomodoro technique: 25 minutes focused work, 5 minutes break.
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">🎯 Environment</h4>
                  <p className="text-sm text-orange-700">
                    Minimize distractions by closing unnecessary apps and websites.
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800 mb-2">📊 Tracking</h4>
                  <p className="text-sm text-orange-700">
                    Monitor your progress throughout the day and adjust as needed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FocusAnalytics;