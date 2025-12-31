import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';


import DashboardLayout from '@/components/Layout/DashboardLayout';
import TimeFrameSelector from '@/components/TabInsights/TimeFrameSelector';
import DataSummary from '@/components/TabInsights/DataSummary';
import TabActivityChart from '@/components/TabInsights/TabActivityChart';
import RecentTabsList from '@/components/TabInsights/RecentTabsList';
import AppUsageChart from '@/components/AppUsage/AppUsageChart';
import CurrentSessionList from '@/components/AppUsage/CurrentSessionList';

import EnhancedUsageCharts from '@/components/AppUsage/EnhancedUsageCharts';
import TabUsageAnalytics from '@/components/TabInsights/TabUsageAnalytics';
import FocusScoreCard from '@/components/FocusAI/FocusScoreCard';

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
  const [showExtendedVisualizations, setShowExtendedVisualizations] = useState(true); 

  
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        
        const headers = getAuthHeader();

        
        const tabResponse = await axios.get(`${API_BASE_URL}/tabs`, { headers });
        setTabLogs(tabResponse.data);

        
        const appResponse = await axios.get(`${API_BASE_URL}/focus-data`, { headers });

        
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

    
    const sendHeartbeat = async () => {
      try {
        const headers = getAuthHeader();
        await axios.post(`${API_BASE_URL}/api/heartbeat`, {}, { headers });
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };

    
    sendHeartbeat(); 
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    
    return () => {
      clearInterval(tabInterval);
      clearInterval(heartbeatInterval);
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

            {}
            <div className="mt-6">
              <FocusScoreCard />
            </div>

            <div className="mt-6">
              <EnhancedUsageCharts />
            </div>

            {}
            <div className="mt-6">
              <TabUsageAnalytics />
            </div>

            {}
            {}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
