import React, { useState, useEffect } from 'react';
import axios from 'axios';

import DashboardLayout from '@/components/Layout/DashboardLayout';
import TimeFrameSelector from '@/components/TabInsights/TimeFrameSelector';
import DataSummary from '@/components/TabInsights/DataSummary';
import TabActivityChart from '@/components/TabInsights/TabActivityChart';
import RecentTabsList from '@/components/TabInsights/RecentTabsList';
import AppUsageChart from '@/components/AppUsage/AppUsageChart';
import CurrentSessionList from '@/components/AppUsage/CurrentSessionList';
// Import the new enhanced charts component
import EnhancedUsageCharts from '@/components/AppUsage/EnhancedUsageCharts';
// Add this import near the top
import BrowserTabsAnalysis from '@/components/Browser/BrowserTabsAnalysis';

import { fetchTabLogs, filterByTimeFrame, groupByDomain, generateSummary } from '@/services/tabService';
import { TimeFrame, GroupedTabData } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const [tabLogs, setTabLogs] = useState(null);
  const [appUsageData, setAppUsageData] = useState({});
  const [currentSessionData, setCurrentSessionData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('daily');
  const [showExtendedVisualizations, setShowExtendedVisualizations] = useState(true); // Set to true by default

  // Helper function to get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get token from localStorage for authentication
        const headers = getAuthHeader();
        
        // Fetch tab logs with authorization header
        const tabResponse = await axios.get('http://localhost:5000/tabs', { headers });
        setTabLogs(tabResponse.data);
        
        // Fetch app usage data with authorization header
        const appResponse = await axios.get('http://localhost:5000/focus-data', { headers });
        
        // Debug the response
        console.log('App usage response:', appResponse.data);
        
        setAppUsageData(appResponse.data.appUsage || {});
        setCurrentSessionData(appResponse.data.currentSession || []);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    const tabInterval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => {
      clearInterval(tabInterval);
    };
  }, []);
  

  const filteredLogs = tabLogs ? filterByTimeFrame(tabLogs, selectedTimeFrame) : [];
  const domainGroups = tabLogs ? groupByDomain(filteredLogs) : {};
  

  const chartData: GroupedTabData[] = Object.values(domainGroups);
  

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

  // Add this function in your component
  const debugBrowserTabs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/debug/browser-tabs', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('Browser tab debug data:', data);
      alert(`Found ${data.count} browser tab records. Check console for details.`);
    } catch (error) {
      console.error('Debug failed:', error);
      alert('Failed to debug browser tabs. Check console for details.');
    }
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
          
          <TimeFrameSelector 
            selectedTimeFrame={selectedTimeFrame}
            onTimeFrameChange={setSelectedTimeFrame}
          />
        </div>
        
        <button 
          onClick={debugBrowserTabs}
          className="text-xs text-muted-foreground hover:text-primary"
          style={{ position: 'absolute', right: '10px', top: '10px' }}
        >
          Debug Tabs
        </button>
        
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
            <DataSummary 
              summary={summary} 
              timeFrame={timeFrameDisplays[selectedTimeFrame]} 
            />
            
            {/* Replace the original charts with the enhanced visualizations */}
            <div className="mt-6">
              <EnhancedUsageCharts />
            </div>
            
            {/* You can keep the original components for reference, but they're not needed */}
            {/*
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {chartData.length > 0 ? (
                <TabActivityChart data={chartData} />
              ) : (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle>Tab Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 grid place-items-center">
                    <p className="text-muted-foreground text-center">
                      No tab data available for the selected time frame
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {Object.keys(appUsageData).length > 0 ? (
                <AppUsageChart data={appUsageData} />
              ) : (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle>App Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 grid place-items-center">
                    <p className="text-muted-foreground text-center">
                      No app usage data available for today
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {filteredLogs.length > 0 ? (
                <RecentTabsList tabs={filteredLogs.slice(0, 10)} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Tab Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 grid place-items-center">
                    <p className="text-muted-foreground">No recent tab activity</p>
                  </CardContent>
                </Card>
              )}
              
              <CurrentSessionList data={currentSessionData} />
            </div>
            */}
            {/* Inside your JSX, after the EnhancedUsageCharts component or wherever appropriate: */}
            <div className="mt-10">
              <BrowserTabsAnalysis timeFrame={selectedTimeFrame} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
