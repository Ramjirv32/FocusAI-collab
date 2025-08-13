import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  ArrowRight, Activity, AlertCircle, CheckCircle, RefreshCw, Calendar, 
  TrendingUp, TrendingDown, Clock, X, Clock3, Timer 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

const FocusStatusCard = ({ stats, isLoading, error, onSync }) => {
  const { user } = useAuth();
  const [timeFrameData, setTimeFrameData] = useState({
    daily: null,
    weekly: null,
    monthly: null
  });
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('daily');
  const [isLoadingTimeFrame, setIsLoadingTimeFrame] = useState(false);
  const [timeFrameError, setTimeFrameError] = useState(null);
  
  // Dialog state for detailed app/tab usage
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('productive'); // 'productive' or 'distraction'
  const [detailedUsageData, setDetailedUsageData] = useState([]);
  const [dialogTitle, setDialogTitle] = useState('');
  
  // Get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  
  // Format minutes as hours and minutes
  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    
    // Ensure minutes is a reasonable value (max 24 hours)
    const sanitizedMinutes = Math.min(minutes, 24 * 60);
    
    // Round to nearest integer
    const roundedMinutes = Math.round(sanitizedMinutes);
    
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // Calculate percentage change between two values
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Fetch detailed app/tab usage data for the dialog
  const fetchDetailedUsageData = async (type, timeFrame) => {
    try {
      setIsLoadingTimeFrame(true);
      const headers = getAuthHeader();
      
      // Calculate date range based on timeFrame
      const endDate = new Date();
      let startDate = new Date();
      
      if (timeFrame === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeFrame === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        // Daily - today only
        startDate.setHours(0, 0, 0, 0);
      }
      
      const startDateStr = startDate.toISOString().slice(0, 10);
      const endDateStr = endDate.toISOString().slice(0, 10);
      
      // Get productivity summary data
      const summaryResponse = await axios.get('http://localhost:5001/api/productivity-summary', {
        headers,
        params: { timeFrame }
      });
      
      if (!summaryResponse.data || !summaryResponse.data.success) {
        throw new Error('Failed to fetch productivity data');
      }
      
      const summaries = summaryResponse.data.summaries || [];
      
      // Process the data based on type (productive or distraction)
      let detailedData = [];
      
      summaries.forEach(summary => {
        const date = summary.date;
        
        if (type === 'productive' && summary.productiveContent) {
          // For productive content
          Object.entries(summary.productiveContent).forEach(([app, duration]) => {
            // Skip entries with very small duration
            if (duration < 60) return; // Skip items less than 1 minute
            
            const existingIndex = detailedData.findIndex(item => item.name === app);
            
            if (existingIndex >= 0) {
              detailedData[existingIndex].duration += duration;
              if (!detailedData[existingIndex].dates[date]) {
                detailedData[existingIndex].dates[date] = 0;
              }
              detailedData[existingIndex].dates[date] += duration;
            } else {
              detailedData.push({
                name: app,
                duration: duration,
                type: app.toLowerCase().includes('browser') ? 'tab' : 'app',
                dates: { [date]: duration }
              });
            }
          });
        } else if (type === 'distraction' && summary.nonProductiveContent) {
          // For distraction content
          Object.entries(summary.nonProductiveContent).forEach(([app, duration]) => {
            // Skip entries with very small duration
            if (duration < 60) return; // Skip items less than 1 minute
            
            const existingIndex = detailedData.findIndex(item => item.name === app);
            
            if (existingIndex >= 0) {
              detailedData[existingIndex].duration += duration;
              if (!detailedData[existingIndex].dates[date]) {
                detailedData[existingIndex].dates[date] = 0;
              }
              detailedData[existingIndex].dates[date] += duration;
            } else {
              detailedData.push({
                name: app,
                duration: duration,
                type: app.toLowerCase().includes('browser') ? 'tab' : 'app',
                dates: { [date]: duration }
              });
            }
          });
        }
      });
      
      // Sort by duration (highest first)
      detailedData.sort((a, b) => b.duration - a.duration);
      
      setDetailedUsageData(detailedData);
      
      // Set dialog title based on type and timeframe
      setDialogTitle(
        `${type === 'productive' ? 'Productive' : 'Distraction'} Time - ` +
        `${timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)}`
      );
      
    } catch (error) {
      console.error(`Error fetching detailed ${type} data:`, error);
      setDetailedUsageData([]);
      setDialogTitle(`${type === 'productive' ? 'Productive' : 'Distraction'} Time`);
    } finally {
      setIsLoadingTimeFrame(false);
    }
  };
  
  // Handle showing detailed usage dialog
  const showDetailedUsage = async (type) => {
    setDialogType(type);
    await fetchDetailedUsageData(type, selectedTimeFrame);
    setDialogOpen(true);
  };

  // Fetch data for different time frames
  const fetchTimeFrameData = async (timeFrame) => {
    if (!user) return;
    
    try {
      setIsLoadingTimeFrame(true);
      setTimeFrameError(null);
      
      const headers = getAuthHeader();
      
      // Calculate date range based on timeFrame
      const endDate = new Date();
      let startDate = new Date();
      
      if (timeFrame === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (timeFrame === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        // Daily - today only
        startDate.setHours(0, 0, 0, 0);
      }
      
      // Fetch app usage data
      const appResponse = await axios.get('http://localhost:5001/usage', {
        headers,
        params: { timeFrame }
      });
      
      // Fetch tab usage data
      const tabResponse = await axios.get('http://localhost:5001/tabs', {
        headers,
        params: { timeFrame }
      });
      
      // Try to get productivity summary from API
      let productivityData = null;
      try {
        const productivityResponse = await axios.get('http://localhost:5001/api/productivity-summary', {
          headers,
          params: { timeFrame }
        });
        
        if (productivityResponse.data && productivityResponse.data.success) {
          productivityData = productivityResponse.data;
        }
      } catch (apiError) {
        console.warn('Productivity API unavailable:', apiError.message);
      }
      
      // Process the data
      const appUsage = appResponse.data || {};
      const tabUsage = tabResponse.data || [];
      
      // Calculate aggregated statistics
      let totalAppTime = 0;
      let appCount = 0;
      const appStats = {};
      
      // Process app usage data
      Object.entries(appUsage).forEach(([date, apps]) => {
        Object.entries(apps).forEach(([appName, duration]) => {
          totalAppTime += duration;
          appCount++;
          if (!appStats[appName]) {
            appStats[appName] = 0;
          }
          appStats[appName] += duration;
        });
      });
      
      // Get top apps
      const topApps = Object.entries(appStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      // Calculate tab statistics
      const tabStats = {};
      let totalTabTime = 0;
      
      tabUsage.forEach(tab => {
        totalTabTime += tab.duration || 0;
        const domain = tab.domain || (tab.url ? new URL(tab.url).hostname : 'Unknown');
        if (!tabStats[domain]) {
          tabStats[domain] = { count: 0, duration: 0 };
        }
        tabStats[domain].count++;
        tabStats[domain].duration += tab.duration || 0;
      });
      
      // Get top websites
      const topWebsites = Object.entries(tabStats)
        .sort(([,a], [,b]) => b.duration - a.duration)
        .slice(0, 5);
      
      // Calculate focus metrics from productivity data if available
      let focusScore = 0;
      let focusTime = 0;
      let distractionTime = 0;
      
      if (productivityData && productivityData.summaries && productivityData.summaries.length > 0) {
        // Calculate averages from all summaries
        const summaries = productivityData.summaries;
        
        let totalFocusScore = 0;
        let totalFocusTimeMinutes = 0;
        let totalDistractionTimeMinutes = 0;
        
        summaries.forEach(summary => {
          totalFocusScore += summary.focusScore || 0;
          totalFocusTimeMinutes += (summary.totalProductiveTime || 0) / 60; // Convert to minutes
          totalDistractionTimeMinutes += (summary.totalNonProductiveTime || 0) / 60; // Convert to minutes
        });
        
        focusScore = summaries.length > 0 ? totalFocusScore / summaries.length : 0;
        focusTime = Math.round(totalFocusTimeMinutes);
        distractionTime = Math.round(totalDistractionTimeMinutes);
      } else {
        // Calculate from raw app/tab data as fallback
        const totalTime = Math.max(totalAppTime / 60, totalTabTime / 60); // Convert to minutes
        focusScore = totalTime > 0 ? Math.min(85, Math.max(15, 50 + (appCount * 2))) : 0;
        focusTime = Math.round(totalTime * 0.7);
        distractionTime = Math.round(totalTime * 0.3);
      }
      
      const timeFrameStats = {
        focusScore,
        totalTime: focusTime + distractionTime,
        focusTime,
        distractionTime,
        totalActivities: appCount + tabUsage.length,
        topApps: topApps.map(([name, duration]) => ({
          name,
          duration: Math.round(duration / 60) // Convert to minutes
        })),
        topWebsites: topWebsites.map(([domain, data]) => ({
          domain,
          duration: Math.round(data.duration / 60), // Convert to minutes
          visits: data.count
        })),
        appCount,
        tabCount: tabUsage.length,
        uniqueDomains: Object.keys(tabStats).length
      };
      
      setTimeFrameData(prev => ({
        ...prev,
        [timeFrame]: timeFrameStats
      }));
      
    } catch (error) {
      console.error(`Error fetching ${timeFrame} data:`, error);
      setTimeFrameError(`Failed to load ${timeFrame} data: ${error.message}`);
    } finally {
      setIsLoadingTimeFrame(false);
    }
  };

  // Load data for all time frames when component mounts
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchTimeFrameData('daily'),
        fetchTimeFrameData('weekly'),
        fetchTimeFrameData('monthly')
      ]);
    }
  }, [user]);

  // Get current timeframe data
  const currentData = timeFrameData[selectedTimeFrame] || {};
  const dailyData = timeFrameData.daily || {};
  const weeklyData = timeFrameData.weekly || {};
  const monthlyData = timeFrameData.monthly || {};

  // Handle sync
  const handleSync = async () => {
    if (onSync) {
      await onSync();
    }
    // Refresh time frame data after sync
    await fetchTimeFrameData(selectedTimeFrame);
  };

  // Check if user is logged in
  if (!user) {
    return (
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            AI Focus Analysis
          </CardTitle>
          <CardDescription>Please log in to view your focus insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              You need to be logged in to access your focus data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Use stats prop if available, otherwise use fetched timeframe data
  const focusScore = stats?.focus_score || stats?.productivity_score || currentData.focusScore || 0;
  const focusTime = stats?.focus_time_minutes || currentData.focusTime || 0;
  const distractionTime = stats?.distraction_time_minutes || currentData.distractionTime || 0;
  const totalTime = (stats ? focusTime + distractionTime : currentData.totalTime) || 0;
  
  // Calculate total activities from available data
  let totalActivities = stats?.total_activities || currentData.totalActivities || 0;
  
  // If total_activities is not available, try to calculate from other sources
  if (totalActivities === 0 && stats) {
    // Try to get from quick_stats if available
    if (stats.quick_stats) {
      totalActivities = stats.quick_stats.total_activities || 0;
    }
    
    // If still 0, try to estimate from available time data
    if (totalActivities === 0 && totalTime > 0) {
      // Rough estimate: assume average session is 5 minutes
      totalActivities = Math.max(1, Math.floor(totalTime / 5));
    }
  }

  return (
    <>
      <Card className={`bg-gradient-to-r from-indigo-50 to-blue-50 shadow-lg hover:shadow-xl transition-shadow ${isLoading || isLoadingTimeFrame ? 'opacity-70' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-500" />
            AI Focus Analysis
            {(isLoading || isLoadingTimeFrame) && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent ml-2"></div>
            )}
          </CardTitle>
          <CardDescription>
            Your comprehensive focus insights with daily, weekly & monthly trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(error || timeFrameError) && (
            <div className="bg-red-50 p-4 rounded-md mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                <div>
                  <p className="text-sm font-medium text-red-800">Connection Error</p>
                  <p className="text-xs text-red-700 mt-1">{error || timeFrameError}</p>
                </div>
              </div>
            </div>
          )}

          <Tabs value={selectedTimeFrame} onValueChange={setSelectedTimeFrame} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="daily" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Weekly
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Monthly
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTimeFrame} className="mt-0">
              {/* Main Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-muted-foreground mb-1">Focus Score</p>
                  <div className="flex items-end gap-1">
                    <p className="text-2xl font-bold text-blue-600">{Math.round(currentData.focusScore || focusScore)}%</p>
                    <div 
                      className={`text-xs font-medium mb-1 px-1.5 py-0.5 rounded ${
                        (currentData.focusScore || focusScore) >= 70 ? 'bg-green-100 text-green-800' : 
                        (currentData.focusScore || focusScore) >= 40 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                      {(currentData.focusScore || focusScore) >= 70 ? 'Excellent' : 
                       (currentData.focusScore || focusScore) >= 40 ? 'Good' : 'Needs Work'}
                    </div>
                  </div>
                  {selectedTimeFrame !== 'daily' && (
                    <div className="flex items-center gap-1 mt-1">
                      {calculatePercentageChange(currentData.focusScore, dailyData.focusScore) > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`text-xs ${
                        calculatePercentageChange(currentData.focusScore, dailyData.focusScore) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {Math.abs(calculatePercentageChange(currentData.focusScore, dailyData.focusScore)).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Total Usage</p>
                    <CheckCircle className="h-3 w-3 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{formatTime(currentData.totalTime || totalTime)}</p>
                  {selectedTimeFrame !== 'daily' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      vs daily: {formatTime(dailyData.totalTime || 0)}
                    </p>
                  )}
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Activities</p>
                    <Activity className="h-3 w-3 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{currentData.totalActivities || totalActivities}</p>
                  {selectedTimeFrame !== 'daily' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Apps: {currentData.appCount || 0} | Sites: {currentData.uniqueDomains || 0}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Productive vs Distraction Time - CLICKABLE */}
              {((currentData.focusTime > 0 || currentData.distractionTime > 0) || (focusTime > 0 || distractionTime > 0)) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div 
                    className="bg-green-50 p-3 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => showDetailedUsage('productive')}
                    title="Click to view productive app and tab details"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Productive Time</p>
                        <p className="text-lg font-bold text-green-800">{formatTime(currentData.focusTime || focusTime)}</p>
                      </div>
                      <div className="text-xs text-green-600">
                        {(currentData.totalTime || totalTime) > 0 ? Math.round(((currentData.focusTime || focusTime) / (currentData.totalTime || totalTime)) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="bg-red-50 p-3 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => showDetailedUsage('distraction')}
                    title="Click to view distracted app and tab details"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-700">Distraction Time</p>
                        <p className="text-lg font-bold text-red-800">{formatTime(currentData.distractionTime || distractionTime)}</p>
                      </div>
                      <div className="text-xs text-red-600">
                        {(currentData.totalTime || totalTime) > 0 ? Math.round(((currentData.distractionTime || distractionTime) / (currentData.totalTime || totalTime)) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Apps and Websites for current timeframe */}
              {(currentData.topApps?.length > 0 || currentData.topWebsites?.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Top Apps */}
                  {currentData.topApps?.length > 0 && (
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Top Apps ({selectedTimeFrame.charAt(0).toUpperCase() + selectedTimeFrame.slice(1)})
                      </h4>
                      <div className="space-y-2">
                        {currentData.topApps.slice(0, 3).map((app, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                index === 0 ? 'bg-blue-500' : 
                                index === 1 ? 'bg-green-500' : 'bg-orange-500'
                              }`}></div>
                              <span className="text-sm font-medium truncate">{app.name}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {formatTime(app.duration)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Websites */}
                  {currentData.topWebsites?.length > 0 && (
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Top Websites ({selectedTimeFrame.charAt(0).toUpperCase() + selectedTimeFrame.slice(1)})
                      </h4>
                      <div className="space-y-2">
                        {currentData.topWebsites.slice(0, 3).map((site, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                index === 0 ? 'bg-purple-500' : 
                                index === 1 ? 'bg-pink-500' : 'bg-indigo-500'
                              }`}></div>
                              <span className="text-sm font-medium truncate">{site.domain}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {site.visits} visits
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {formatTime(site.duration)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between items-center">
            <Button variant="outline" className="text-sm" onClick={handleSync} disabled={isLoading || isLoadingTimeFrame}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isLoadingTimeFrame ? 'animate-spin' : ''}`} />
              {isLoading || isLoadingTimeFrame ? 'Syncing...' : 'Refresh Stats'}
            </Button>
            
            <Link to="/focus-analytics">
              <Button variant="outline" className="gap-2">
                View Analytics <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog for detailed app/tab usage */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className={dialogType === 'productive' ? 'text-green-700' : 'text-red-700'}>
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>
              {selectedTimeFrame === 'daily' ? 'Today\'s' : selectedTimeFrame === 'weekly' ? 'This week\'s' : 'This month\'s'} {dialogType === 'productive' ? 'productive' : 'distraction'} time breakdown
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-between items-center mb-3 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              {dialogType === 'productive' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span>{detailedUsageData.length} items</span>
            </div>
            
            <Badge variant={dialogType === 'productive' ? 'outline' : 'secondary'} className="text-xs">
              {selectedTimeFrame}
            </Badge>
          </div>
          
          {isLoadingTimeFrame ? (
            <div className="py-8 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading usage data...</p>
            </div>
          ) : detailedUsageData.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No {dialogType === 'productive' ? 'productive' : 'distraction'} activity recorded during this period.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {detailedUsageData.map((item, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-md ${
                      dialogType === 'productive' ? 'bg-green-50' : 'bg-red-50'
                    } hover:bg-opacity-70 transition-colors`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={item.type === 'app' ? 'default' : 'outline'} 
                            className="text-xs"
                          >
                            {item.type === 'app' ? 'App' : 'Web'}
                          </Badge>
                          <h4 className="text-sm font-medium truncate">
                            {/* Clean up the name for display */}
                            {item.name.replace('Browser - ', '').replace(/_/g, '.')}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {formatTime(Math.round(item.duration / 60))} {/* Round and convert seconds to minutes */}
                          </span>
                          
                          <Clock3 className="h-3.5 w-3.5 ml-2 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {Object.keys(item.dates).length} day{Object.keys(item.dates).length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress bar showing proportion of total time */}
                      <div className="w-24">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              dialogType === 'productive' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, (item.duration / detailedUsageData[0].duration) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FocusStatusCard;