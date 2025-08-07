import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from '../components/ui/use-toast'; // Changed from '../components/ui/toast'

import DashboardLayout from '../components/Layout/DashboardLayout';
import TimeFrameSelector from '../components/TabInsights/TimeFrameSelector';
import DataSummary from '../components/TabInsights/DataSummary';
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
          focusStats = {
            focus_score: consolidatedData.quickStats.quick_stats.focus_score || 
                        consolidatedData.quickStats.quick_stats.productivity_score || 0,
            productivity_score: consolidatedData.quickStats.quick_stats.focus_score || 
                               consolidatedData.quickStats.quick_stats.productivity_score || 0,
            focus_time_minutes: consolidatedData.quickStats.quick_stats.focus_time_minutes || 0,
            distraction_time_minutes: consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0,
            total_time_minutes: (consolidatedData.quickStats.quick_stats.focus_time_minutes || 0) + 
                               (consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0),
            total_activities: consolidatedData.quickStats.quick_stats.total_activities || 0,
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
          focusStats = {
            focus_score: consolidatedData.quickStats.quick_stats.focus_score || 
                        consolidatedData.quickStats.quick_stats.productivity_score || 0,
            productivity_score: consolidatedData.quickStats.quick_stats.focus_score || 
                               consolidatedData.quickStats.quick_stats.productivity_score || 0,
            focus_time_minutes: consolidatedData.quickStats.quick_stats.focus_time_minutes || 0,
            distraction_time_minutes: consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0,
            total_time_minutes: (consolidatedData.quickStats.quick_stats.focus_time_minutes || 0) + 
                               (consolidatedData.quickStats.quick_stats.distraction_time_minutes || 0),
            total_activities: consolidatedData.quickStats.quick_stats.total_activities || 0,
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
          fetchGamificationData()
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
            {/* User Profile Overview Card */}
            {(userProfile || gamificationData) && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={userProfile?.profilePhoto} 
                        alt={userProfile?.displayName || user?.email}
                      />
                      <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                        {(userProfile?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        Welcome back, {userProfile?.displayName || user?.email?.split('@')[0] || 'User'}!
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        {gamificationData && (
                          <>
                            <span className="flex items-center gap-1">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              Level {gamificationData.level?.current || 1}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4 text-green-500" />
                              {gamificationData.points?.total || 0} XP
                            </span>
                          </>
                        )}
                        {focusStats && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-blue-500" />
                              {Math.round(focusStats.focus_score || 0)}% Focus Score
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      {gamificationData && (
                        <div>
                          <div className="text-lg font-bold text-yellow-600">
                            {gamificationData.streaks?.current || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Day Streak</div>
                        </div>
                      )}
                      {focusStats && (
                        <div>
                          <div className="text-lg font-bold text-green-600">
                            {Math.round((focusStats.focus_time_minutes || 0) / 60 * 10) / 10}h
                          </div>
                          <div className="text-xs text-muted-foreground">Focus Time</div>
                        </div>
                      )}
                    </div>
                  </div>
                  {userProfile?.bio && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      {userProfile.bio}
                    </div>
                  )}
                  {gamificationData?.badges && gamificationData.badges.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {gamificationData.badges.slice(0, 3).map((badge, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {badge.icon || '🏆'} {badge.badgeName}
                        </Badge>
                      ))}
                      {gamificationData.badges.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{gamificationData.badges.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardHeader>
              </Card>
            )}

            {/* AI Focus Analysis Card */}
            <FocusStatusCard
              stats={focusStats}
              isLoading={isSyncing}
              error={focusError}
              onSync={handleSyncClick}
            />
            
            {/* Extension Status and Data Summary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DataSummary 
                  summary={summary} 
                  timeFrame={timeFrameDisplays[selectedTimeFrame]} 
                />
              </div>
              <div className="lg:col-span-1 space-y-4">
                <ChromeExtensionStatus />
                
                {/* Quick Gamification Link */}
                {gamificationData && (
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          <CardTitle className="text-sm">Your Progress</CardTitle>
                        </div>
                        <Link to="/gamification">
                          <Button variant="ghost" size="sm" className="text-xs">
                            View All <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Level Progress</span>
                          <span>{gamificationData.level?.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                            style={{width: `${gamificationData.level?.progress || 0}%`}}
                          ></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div>
                            <div className="font-semibold text-blue-600">
                              {gamificationData.points?.daily || 0}
                            </div>
                            <div className="text-muted-foreground">XP Today</div>
                          </div>
                          <div>
                            <div className="font-semibold text-green-600">
                              {gamificationData.badges?.length || 0}
                            </div>
                            <div className="text-muted-foreground">Badges</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <EnhancedUsageCharts />
            </div>
            
            {/* Add the new Tab Usage Analytics component */}
            <div className="mt-6">
              <TabUsageAnalytics />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// Make sure to add this proper export statement
export default Index;