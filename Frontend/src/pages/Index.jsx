import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from '../components/ui/use-toast'; // Changed from '../components/ui/toast'

import DashboardLayout from '../components/Layout/DashboardLayout';
import TimeFrameSelector from '../components/TabInsights/TimeFrameSelector';
import EnhancedUsageCharts from '../components/AppUsage/EnhancedUsageCharts';
import TabUsageAnalytics from '../components/TabInsights/TabUsageAnalytics';
import FocusStatusCard from '../components/FocusAI/FocusStatusCard';
import ChromeExtensionStatus from '../components/Extension/ChromeExtensionStatus';
import { syncFocusData, getQuickStats, testAiServerConnection, getConsolidatedFocusData } from '../services/activityDataService';
import { filterByTimeFrame, groupByDomain, generateSummary } from '../services/tabService';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { ArrowRight, Activity, Layers, User, Trophy, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Make sure to add this proper export statement
const Index = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [tabLogs, setTabLogs] = useState(null);
  const [appUsageData, setAppUsageData] = useState({});
  const [currentSessionData, setCurrentSessionData] = useState([]);
  const [focusStats, setFocusStats] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [gamificationData, setGamificationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [focusError, setFocusError] = useState(null);
  const [error, setError] = useState(null); // Added missing error state
  const [aiServerStatus, setAiServerStatus] = useState(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('daily');

  // Helper function to get auth headers
  const getAuthHeader = () => {
    const authToken = token || localStorage.getItem('token');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };

  // Fetch app usage data directly from app-usage endpoint
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

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get('http://localhost:5001/api/profile', { headers });
      setUserProfile(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  // Fetch gamification data
  const fetchGamificationData = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.get('http://localhost:5001/api/gamification/data', { headers });
      setGamificationData(response.data);
    } catch (err) {
      console.error('Error fetching gamification data:', err);
    }
  };


  // Function to load focus data
  const loadFocusData = async (date = null) => {
    try {
      setFocusError(null);
      const formattedDate = date || new Date().toISOString().split('T')[0];
      
      // First try to use the consolidated data service which has fallback logic
      try {
        const consolidatedData = await getConsolidatedFocusData(formattedDate);
        console.log('Consolidated data received:', consolidatedData);
        
        // Try to extract focus stats from different possible data structures
        let focusStats;
        
        if (consolidatedData.quickStats?.quick_stats) {
          // Data from AI server
          const rawFocusTimeMinutes = consolidatedData.quickStats.quick_stats.focus_time_minutes || 0;
          const rawDistractionTimeMinutes = consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0;
          
          // Cap values at realistic amounts (max 24 hours)
          const maxDailyMinutes = 24 * 60; // 24 hours in minutes
          
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
          // Direct stats object
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
          // Fallback with app/tab data count
          const appCount = consolidatedData.appUsage?.length || 0;
          const tabCount = consolidatedData.tabUsage?.length || 0;
          
          // Calculate basic stats from available data
          let totalUsageSeconds = 0;
          if (consolidatedData.appUsage && Array.isArray(consolidatedData.appUsage)) {
            totalUsageSeconds = consolidatedData.appUsage.reduce((sum, app) => {
              return sum + (app.duration || app.usage_time || 0);
            }, 0);
          }
          
          focusStats = {
            focus_score: appCount > 0 ? 50 : 0, // Default moderate score if we have data
            productivity_score: appCount > 0 ? 50 : 0,
            focus_time_minutes: Math.round(totalUsageSeconds / 60 * 0.7), // Assume 70% productive
            distraction_time_minutes: Math.round(totalUsageSeconds / 60 * 0.3), // Assume 30% distraction
            total_time_minutes: Math.round(totalUsageSeconds / 60),
            total_activities: appCount + tabCount,
            date: formattedDate
          };
        }
        
        setFocusStats(focusStats);
        console.log('Extracted focus stats:', focusStats);
        
      } catch (error) {
        console.warn('Consolidated data service failed, trying direct backend:', error);
        
        // Fallback: try to get basic data from backend
        const headers = getAuthHeader();
        const appResponse = await axios.get('http://localhost:5001/focus-data', { 
          headers,
          params: { date: formattedDate }
        });
        
        const appUsage = appResponse.data?.appUsage || [];
        const currentSession = appResponse.data?.currentSession || [];
        
        // Calculate basic stats from backend data
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
          date: formattedDate
        };
        
        setFocusStats(focusStats);
        console.log('Backend fallback focus stats:', focusStats);
      }
      
    } catch (err) {
      console.error('Error in loadFocusData:', err);
      setFocusError('Could not load focus data. AI server may be offline.');
      
      // Set minimal default stats so UI doesn't break
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

  // Manual sync button handler
  const handleSyncClick = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setFocusError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Try to sync focus data using the consolidated service
      try {
        const consolidatedData = await getConsolidatedFocusData(today);
        console.log('Sync - Consolidated data received:', consolidatedData);
        
        // Extract focus stats from the response
        let focusStats;
        
        if (consolidatedData.quickStats?.quick_stats) {
          // Data from AI server
          const rawFocusTimeMinutes = consolidatedData.quickStats.quick_stats.focus_time_minutes || 0;
          const rawDistractionTimeMinutes = consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0;
          
          // Cap values at realistic amounts (max 24 hours)
          const maxDailyMinutes = 24 * 60; // 24 hours in minutes
          
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
          // Direct stats object
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
          // Fallback with app/tab data count
          const appCount = consolidatedData.appUsage?.length || 0;
          const tabCount = consolidatedData.tabUsage?.length || 0;
          
          // Calculate basic stats from available data
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
        
        // Fallback: get basic data from backend
        const headers = getAuthHeader();
        const appResponse = await axios.get('http://localhost:5001/focus-data', { 
          headers,
          params: { date: today }
        });
        
        const appUsage = appResponse.data?.appUsage || [];
        const currentSession = appResponse.data?.currentSession || [];
        
        // Calculate basic stats
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
        
        // Get token from localStorage for authentication
        const headers = getAuthHeader();
        
        // Fetch all data in parallel
        const [tabResponse, appResponse] = await Promise.all([
          axios.get('http://localhost:5001/tabs', { headers }),
          axios.get('http://localhost:5001/focus-data', { headers })
        ]);
        
        setTabLogs(tabResponse.data);
        console.log('App usage response:', appResponse.data);
        
        setAppUsageData(appResponse.data.appUsage || {});
        setCurrentSessionData(appResponse.data.currentSession || []);
        
        // Also load focus data, profile, and gamification data
        await Promise.all([
          loadFocusData(),
          fetchUserProfile(),
          fetchGamificationData(),
          fetchAppUsageData() // Added direct app usage data fetch
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

    // Add heartbeat functionality
    const sendHeartbeat = async () => {
      try {
        const headers = getAuthHeader();
        await axios.post('http://localhost:5001/api/heartbeat', {}, { headers });
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };
    
    // Send heartbeat every 30 seconds
    if (user) {
      sendHeartbeat(); // Send immediately
      const heartbeatInterval = setInterval(sendHeartbeat, 30000);
      
      // Clean up on component unmount
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
       
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/activities')}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {(() => {
                      
                      let count = focusStats?.total_activities || 
                        ((Array.isArray(tabLogs) ? tabLogs.length : 0) + 
                        (Object.keys(appUsageData || {}).length || 0));
             
                      return Math.min(count, 100);
                    })()}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Total tracked activities
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 text-xs w-full"
                  >
                    View Detailed Activities <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            
             
            </div>
            
            <div className="mt-6">
              <EnhancedUsageCharts />
            </div>
            
            {/* Add the Tab Usage Analytics component */}
            <div className="mt-6">
              <TabUsageAnalytics />
            </div>
            
            {/* Recent Activities Section */}
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
                      {/* App Activities */}
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
                      
                      {/* Tab Activities */}
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

// Make sure to add this proper export statement
export default Index;