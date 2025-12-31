import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../components/ui/use-toast';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

import DashboardLayout from '../components/Layout/DashboardLayout';
import TimeFrameSelector from '../components/TabInsights/TimeFrameSelector';
import EnhancedUsageCharts from '../components/AppUsage/EnhancedUsageCharts';
import TabUsageAnalytics from '../components/TabInsights/TabUsageAnalytics';
import FocusStatusCard from '../components/FocusAI/FocusStatusCard';
import ChromeExtensionStatus from '../components/Extension/ChromeExtensionStatus';
import LeetCodeStyleHeatmap from '../components/Gamification/LeetCodeStyleHeatmap';
import { syncFocusData, getQuickStats, testAiServerConnection, getConsolidatedFocusData, getHeatmapData } from '../services/activityDataService';
import { filterByTimeFrame, groupByDomain, generateSummary } from '../services/tabService';
import {
  ArrowRight, Activity, Layers, User, Trophy, Target, TrendingUp,
  Clock, X, Shield, Ban, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://localhost:5001';

const Index = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [tabLogs, setTabLogs] = useState(null);
  const [appUsageData, setAppUsageData] = useState({});
  const [currentSessionData, setCurrentSessionData] = useState([]);
  const [focusStats, setFocusStats] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [gamificationData, setGamificationData] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [focusError, setFocusError] = useState(null);
  const [error, setError] = useState(null);
  const [aiServerStatus, setAiServerStatus] = useState(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('daily');


  const [alertMessage, setAlertMessage] = useState('');
  const [isBlockingAlert, setIsBlockingAlert] = useState(false);
  const [alertType, setAlertType] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('medium');
  const [alertTimer, setAlertTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);


  const getAuthHeader = () => {
    const authToken = token || localStorage.getItem('token');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };


  const fetchAppUsageData = async () => {
    try {
      const headers = getAuthHeader();
      console.log('Fetching app usage data directly from app-usage endpoint');

      const response = await axios.get('http://localhost:5001/api/app-usage/app-analytics', {
        headers,
        params: { timeFrame: selectedTimeFrame }
      });

      console.log('App usage direct API response:', response.data);

      if (response.data && response.data.success) {
        setAppUsageData(response.data);
      } else {
        console.log('Response format unexpected:', response.data);
      }
    } catch (err) {
      console.error('Error fetching app usage data:', err);
    }
  };


  const fetchUserProfile = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get('http://localhost:5001/api/profile', { headers });
      setUserProfile(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };


  const fetchGamificationData = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get('http://localhost:5001/api/gamification/data', { headers });
      setGamificationData(response.data);
    } catch (err) {
      console.error('Error fetching gamification data:', err);
    }
  };



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


  const showBlockingAlert = (message, type, severity = 'medium') => {
    console.log(`🚨 Showing ${type} alert:`, message);

    setAlertMessage(message);
    setAlertType(type);
    setAlertSeverity(severity);

    const isBlocking = type === 'is50' || type === 'is20';
    setIsBlockingAlert(isBlocking);


    const timerDuration = isBlocking ? 10 : 5;
    setTimeRemaining(timerDuration);


    if (alertTimer) {
      clearInterval(alertTimer);
    }


    const newTimer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
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


  const fallbackAlertCheck = (focusScore) => {
    if (focusScore <= 20) {
      showBlockingAlert(
        `🚨 CRITICAL: Your focus score is ${focusScore}%. Immediate action required!`,
        'is20',
        'critical'
      );
    } else if (focusScore <= 50) {
      showBlockingAlert(
        `⚠️ WARNING: Your focus score is ${focusScore}%. Stay productive!`,
        'is50',
        'high'
      );
    }
  };


  const checkProductivityAlerts = async (focusScore) => {
    if (!user || focusScore === 0) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/alerts/check`,
        {
          focusScore,
          date: new Date().toISOString().split('T')[0]
        },
        {
          headers: getAuthHeader(),
          timeout: 5000
        }
      );

      const data = response.data;
      if (data.showAlert && data.alert) {
        const severity = data.alertType === 'is20' ? 'critical' : 'high';
        showBlockingAlert(data.alert, data.alertType, severity);
      }
    } catch (error) {

      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('Alerts endpoint not available, using fallback');
        fallbackAlertCheck(focusScore);
      } else {
        console.error('Error checking productivity alerts:', error);
        fallbackAlertCheck(focusScore);
      }
    }
  };


  useEffect(() => {
    return () => {
      if (alertTimer) {
        clearInterval(alertTimer);
      }
    };
  }, [alertTimer]);


  const loadFocusData = async (date = null) => {
    try {
      setFocusError(null);
      const formattedDate = date || new Date().toISOString().split('T')[0];


      try {
        const consolidatedData = await getConsolidatedFocusData(formattedDate);


        let focusStats;
        if (consolidatedData.quickStats?.quick_stats) {

          const rawFocusTimeMinutes = consolidatedData.quickStats.quick_stats.focus_time_minutes || 0;
          const rawDistractionTimeMinutes = consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0;


          const focusScore = consolidatedData.quickStats.quick_stats.focus_score;
          if (focusScore !== undefined && focusScore !== null && !isNaN(focusScore) && focusScore > 0) {
            await checkProductivityAlerts(focusScore);
          }

          const maxDailyMinutes = 24 * 60;

          focusStats = {
            focus_score: consolidatedData.quickStats.quick_stats.focus_score ||
              consolidatedData.quickStats.quick_stats.productivity_score || 0,
            productivity_score: consolidatedData.quickStats.quick_stats.focus_score ||
              consolidatedData.quickStats.quick_stats.productivity_score || 0,
            focus_time_minutes: Math.min(rawFocusTimeMinutes, maxDailyMinutes),
            distraction_time_minutes: Math.min(rawDistractionTimeMinutes, maxDailyMinutes),
            total_time_minutes: Math.min((rawFocusTimeMinutes + rawDistractionTimeMinutes), maxDailyMinutes),
            total_activities: Math.min(consolidatedData.quickStats.quick_stats.total_activities || 0, 100),
            date: formattedDate
          };
        } else if (consolidatedData.quickStats) {

          focusStats = {
            focus_score: consolidatedData.quickStats.focus_score ||
              consolidatedData.quickStats.productivity_score || 0,
            productivity_score: consolidatedData.quickStats.focus_score ||
              consolidatedData.quickStats.productivity_score || 0,
            focus_time_minutes: consolidatedData.quickStats.focus_time_minutes || 0,
            distraction_time_minutes: consolidatedData.quickStats.distraction_time_minutes || 0,
            total_time_minutes: (consolidatedData.quickStats.focus_time_minutes || 0) +
              (consolidatedData.quickStats.distraction_time_minutes || 0),
            total_activities: consolidatedData.quickStats.total_activities || 0,
            date: formattedDate
          };
        } else {

          const appCount = consolidatedData.appUsage?.length || 0;
          const tabCount = consolidatedData.tabUsage?.length || 0;


          let totalUsageSeconds = 0;
          if (consolidatedData.appUsage) {
            if (Array.isArray(consolidatedData.appUsage)) {
              totalUsageSeconds = consolidatedData.appUsage.reduce((sum, app) => sum + (app.duration || app.usage_time || 0), 0);
            } else if (typeof consolidatedData.appUsage === 'object') {
              totalUsageSeconds = Object.values(consolidatedData.appUsage).reduce((sum, val) => sum + (Number(val) || 0), 0);
            }
          }

          const actualAppCount = typeof consolidatedData.appUsage === 'object' ? Object.keys(consolidatedData.appUsage).length : 0;
          const actualTabCount = Array.isArray(consolidatedData.tabUsage) ? consolidatedData.tabUsage.length : 0;

          focusStats = {
            focus_score: 0,
            productivity_score: 0,
            focus_time_minutes: 0,
            distraction_time_minutes: 0,
            total_time_minutes: Math.round(totalUsageSeconds / 60),
            total_activities: actualAppCount + actualTabCount,
            date: formattedDate,
            isEstimated: true
          };
        }

        setFocusStats(focusStats);
        console.log('Extracted focus stats:', focusStats);

      } catch (error) {
        console.warn('Consolidated data service failed, trying direct backend:', error);


        const headers = getAuthHeader();
        const appResponse = await axios.get('http://localhost:5001/focus-data', {
          headers,
          params: { date: formattedDate }
        });

        const appUsage = appResponse.data?.appUsage || [];
        const currentSession = appResponse.data?.currentSession || [];


        let totalUsageSeconds = 0;
        if (Array.isArray(appUsage)) {
          totalUsageSeconds = appUsage.reduce((sum, app) => {
            return sum + (app.duration || app.usage_time || 0);
          }, 0);
        }

        const focusStats = {
          focus_score: 0,
          productivity_score: 0,
          focus_time_minutes: 0,
          distraction_time_minutes: 0,
          total_time_minutes: Math.round(totalUsageSeconds / 60),
          total_activities: (Array.isArray(appUsage) ? appUsage.length : Object.keys(appUsage).length) + (Array.isArray(currentSession) ? currentSession.length : Object.keys(currentSession).length),
          date: formattedDate,
          isEstimated: true
        };

        setFocusStats(focusStats);
        console.log('Backend fallback focus stats:', focusStats);
      }

    } catch (err) {
      console.error('Error in loadFocusData:', err);
      setFocusError('Could not load focus data. AI server may be offline.');


      setFocusStats({
        focus_score: 0,
        productivity_score: 0,
        focus_time_minutes: 0,
        distraction_time_minutes: 0,
        total_time_minutes: 0,
        total_activities: 0,
        date: date || new Date().toISOString().split('T')[0]
      });
    }
  };


  const handleSyncClick = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setFocusError(null);

    try {
      const today = new Date().toISOString().split('T')[0];


      try {
        const consolidatedData = await getConsolidatedFocusData(today);
        console.log('Sync - Consolidated data received:', consolidatedData);


        let focusStats;

        if (consolidatedData.quickStats?.quick_stats) {

          const rawFocusTimeMinutes = consolidatedData.quickStats.quick_stats.focus_time_minutes || 0;
          const rawDistractionTimeMinutes = consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0;


          const maxDailyMinutes = 24 * 60;

          focusStats = {
            focus_score: consolidatedData.quickStats.quick_stats.focus_score ||
              consolidatedData.quickStats.quick_stats.productivity_score || 0,
            productivity_score: consolidatedData.quickStats.quick_stats.focus_score ||
              consolidatedData.quickStats.quick_stats.productivity_score || 0,
            focus_time_minutes: Math.min(rawFocusTimeMinutes, maxDailyMinutes),
            distraction_time_minutes: Math.min(rawDistractionTimeMinutes, maxDailyMinutes),
            total_time_minutes: Math.min((rawFocusTimeMinutes + rawDistractionTimeMinutes), maxDailyMinutes),
            total_activities: Math.min(consolidatedData.quickStats.quick_stats.total_activities || 0, 100),
            date: today
          };
        } else if (consolidatedData.quickStats) {

          focusStats = {
            focus_score: consolidatedData.quickStats.focus_score ||
              consolidatedData.quickStats.productivity_score || 0,
            productivity_score: consolidatedData.quickStats.focus_score ||
              consolidatedData.quickStats.productivity_score || 0,
            focus_time_minutes: consolidatedData.quickStats.focus_time_minutes || 0,
            distraction_time_minutes: consolidatedData.quickStats.distraction_time_minutes || 0,
            total_time_minutes: (consolidatedData.quickStats.focus_time_minutes || 0) +
              (consolidatedData.quickStats.distraction_time_minutes || 0),
            total_activities: consolidatedData.quickStats.total_activities || 0,
            date: today
          };
        } else {

          const appCount = consolidatedData.appUsage?.length || 0;
          const tabCount = consolidatedData.tabUsage?.length || 0;


          let totalUsageSeconds = 0;
          if (consolidatedData.appUsage && Array.isArray(consolidatedData.appUsage)) {
            totalUsageSeconds = consolidatedData.appUsage.reduce((sum, app) => {
              return sum + (app.duration || app.usage_time || 0);
            }, 0);
          }

          focusStats = {
            focus_score: appCount > 0 ? 50 : 0,
            productivity_score: appCount > 0 ? 50 : 0,
            focus_time_minutes: Math.round(totalUsageSeconds / 60 * 0.7),
            distraction_time_minutes: Math.round(totalUsageSeconds / 60 * 0.3),
            total_time_minutes: Math.round(totalUsageSeconds / 60),
            total_activities: appCount + tabCount,
            date: today
          };
        }

        setFocusStats(focusStats);
        console.log('Sync - Extracted focus stats:', focusStats);

        toast({
          title: "Focus data synced",
          description: "Your productivity analysis has been updated.",
        });

      } catch (error) {
        console.warn('Sync failed, AI server may be offline:', error);
        setFocusError('AI server is offline. Showing available data from backend.');


        const headers = getAuthHeader();
        const appResponse = await axios.get('http://localhost:5001/focus-data', {
          headers,
          params: { date: today }
        });

        const appUsage = appResponse.data?.appUsage || [];
        const currentSession = appResponse.data?.currentSession || [];


        let totalUsageSeconds = 0;
        if (Array.isArray(appUsage)) {
          totalUsageSeconds = appUsage.reduce((sum, app) => {
            return sum + (app.duration || app.usage_time || 0);
          }, 0);
        }

        const focusStats = {
          focus_score: appUsage.length > 0 ? 50 : 0,
          productivity_score: appUsage.length > 0 ? 50 : 0,
          focus_time_minutes: Math.round(totalUsageSeconds / 60 * 0.7),
          distraction_time_minutes: Math.round(totalUsageSeconds / 60 * 0.3),
          total_time_minutes: Math.round(totalUsageSeconds / 60),
          total_activities: appUsage.length + currentSession.length,
          date: today
        };

        setFocusStats(focusStats);

        toast({
          title: "Limited sync completed",
          description: "AI server is offline. Showing basic usage data.",
          variant: "default"
        });
      }

    } catch (err) {
      console.error('Manual sync failed:', err);
      setFocusError(err.message || 'Failed to sync data');

      toast({
        title: "Sync failed",
        description: err.message || "Could not sync focus data. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);


        const headers = getAuthHeader();


        const [tabResponse, appResponse] = await Promise.all([
          axios.get('http://localhost:5001/tabs', { headers }),
          axios.get('http://localhost:5001/focus-data', { headers })
        ]);

        setTabLogs(tabResponse.data);
        console.log('App usage response:', appResponse.data);

        setAppUsageData(appResponse.data.appUsage || {});
        setCurrentSessionData(appResponse.data.currentSession || []);


        await Promise.all([
          loadFocusData(),
          fetchUserProfile(),
          fetchGamificationData(),
          fetchAppUsageData(),
          getHeatmapData().then(data => setHeatmapData(data))
        ]);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchData();
    }

    const tabInterval = setInterval(() => {
      if (user) {
        fetchData();
      }
    }, 30000);


    const sendHeartbeat = async () => {
      try {
        const headers = getAuthHeader();
        await axios.post('http://localhost:5001/api/heartbeat', {}, { headers });
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };


    if (user) {
      sendHeartbeat();
      const heartbeatInterval = setInterval(sendHeartbeat, 30000);


      return () => {
        clearInterval(tabInterval);
        clearInterval(heartbeatInterval);
      };
    }

    return () => {
      clearInterval(tabInterval);
    };
  }, [user]);

  const filteredLogs = tabLogs ? filterByTimeFrame(tabLogs, selectedTimeFrame) : [];
  const domainGroups = tabLogs ? groupByDomain(filteredLogs) : {};

  const chartData = Object.values(domainGroups);

  const summary = tabLogs ? generateSummary(filteredLogs) : {
    totalTime: 0,
    mostVisitedTab: 'None',
    mostTimeSpentTab: 'None',
    averageSessionDuration: 0,
    totalTabs: 0
  };

  const timeFrameDisplays = {
    'daily': 'Today',
    'weekly': 'This Week',
    'monthly': 'This Month'
  };

  return (
    <DashboardLayout>
      { }
      {isBlockingAlert && alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeAlert} />

          <div className={`relative w-full max-w-2xl p-8 rounded-2xl shadow-2xl border-2 ${alertType === 'is20' ? 'bg-red-600 border-white/20' : 'bg-orange-500 border-white/20'
            } text-white transform transition-all duration-300 scale-100`}>

            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-bold">{timeRemaining}s</span>
            </div>

            <div className="text-center">
              <div className="mb-6">
                {alertType === 'is20' ? (
                  <Ban className="mx-auto h-20 w-20 text-white animate-pulse" />
                ) : (
                  <Shield className="mx-auto h-20 w-20 text-white" />
                )}
              </div>

              <h2 className="text-4xl font-black mb-4 tracking-tight">
                {alertType === 'is20' ? 'CRITICAL ALERT' : 'FOCUS WARNING'}
              </h2>

              <p className="text-xl font-medium mb-8 leading-relaxed opacity-90">{alertMessage}</p>

              <div className="space-y-4 mb-8">
                <div className="bg-black/20 p-4 rounded-xl text-left">
                  <p className="font-bold mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5" /> Recommended Actions:
                  </p>
                  <ul className="space-y-2 opacity-90">
                    <li>• {alertType === 'is20' ? 'Immediately close non-work tabs' : 'Take a 2-minute stretch break'}</li>
                    <li>• {alertType === 'is20' ? 'Reset your focus environment' : 'Re-read your primary goal for today'}</li>
                    <li>• {alertType === 'is20' ? 'Try the Pomodoro technique' : 'Close your email and messengers'}</li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={closeAlert}
                size="lg"
                className={`w-full py-8 text-xl font-bold bg-white hover:bg-white/90 shadow-xl transition-all hover:scale-[1.02] ${alertType === 'is20' ? 'text-red-600' : 'text-orange-600'
                  }`}
              >
                {alertType === 'is20' ? 'I Commit to Focusing Now' : 'Got it, Back to Work'}
              </Button>
            </div>
          </div>
        </div>
      )}

      { }
      {alertMessage && !isBlockingAlert && (
        <div className={`fixed top-0 left-0 right-0 z-[90] w-full p-4 border-b-2 shadow-lg animate-in slide-in-from-top ${alertSeverity === 'critical' ? 'bg-red-600 border-red-700' :
          alertSeverity === 'high' ? 'bg-orange-500 border-orange-600' :
            'bg-yellow-500 border-yellow-600'
          } text-white`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-grow justify-center">
              {alertType === 'is20' ? <Ban className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
              <span className="font-bold">{alertMessage}</span>
              {timeRemaining > 0 && (
                <Badge variant="outline" className="text-white border-white bg-white/10 ml-2">
                  {timeRemaining}s
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeAlert}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Focus Activity Dashboard</h2>
            <p className="text-muted-foreground">
              Track and analyze your browsing and app usage patterns
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncClick}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync Focus Data'}
            </Button>
            <TimeFrameSelector
              selectedTimeFrame={selectedTimeFrame}
              onTimeFrameChange={setSelectedTimeFrame}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-10">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading your activity insights...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardHeader>
              <CardTitle>Error Loading Data</CardTitle>
              <CardDescription>
                There was a problem retrieving your activity data. Please make sure the backend server is running.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {error}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>


            <FocusStatusCard
              stats={focusStats}
              isLoading={isSyncing}
              error={focusError}
              onSync={handleSyncClick}
            />

            { }
            <div className="mt-6">
              <LeetCodeStyleHeatmap
                data={heatmapData}
                title="Focus Activity Heatmap"
                description="Your 1-year contribution graph - Track your daily focus streaks"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">



            </div>

            <div className="mt-6">
              <EnhancedUsageCharts />
            </div>

            { }
            <div className="mt-6">
              <TabUsageAnalytics />
            </div>

            { }
            <div className="mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">Recent Activities</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/application-analytics')}
                        className="text-xs"
                      >
                        App Analytics <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/activities')}
                        className="text-xs"
                      >
                        View All Activities <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Your most recent application and website activity. View detailed analytics to improve productivity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-4 text-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      { }
                      {Object.entries(appUsageData || {}).slice(0, 3).map(([app, duration]) => (
                        <div key={`app-${app}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Layers className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{app}</div>
                              <div className="text-xs text-muted-foreground">Application</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {Math.round(duration / 60)} min
                          </Badge>
                        </div>
                      ))}

                      { }
                      {(tabLogs || []).slice(0, 3).map((tab) => (
                        <div key={`tab-${tab._id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-2 rounded-full">
                              <svg className="h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18v10H3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3" />
                              </svg>
                            </div>
                            <div>
                              <div className="font-medium truncate max-w-[200px]">{tab.title || tab.domain || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{tab.domain || "Website"}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-auto">
                            {Math.round(tab.duration / 60)} min
                          </Badge>
                        </div>
                      ))}

                      {Object.entries(appUsageData || {}).length === 0 && (tabLogs || []).length === 0 && (
                        <div className="text-center py-6">
                          <p className="text-muted-foreground">No recent activities recorded</p>
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-2"
                            onClick={handleSyncClick}
                          >
                            Sync Data Now
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};


export default Index;