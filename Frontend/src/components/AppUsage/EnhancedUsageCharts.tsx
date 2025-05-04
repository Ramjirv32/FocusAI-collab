import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface EnhancedUsageChartsProps {
  className?: string;
}

const EnhancedUsageCharts: React.FC<EnhancedUsageChartsProps> = ({ className }) => {
  const [usageData, setUsageData] = useState({
    appUsage: {},
    tabUsage: {},
    userEmail: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeSampleData, setIncludeSampleData] = useState(true);
  const [hasSampleData, setHasSampleData] = useState(false);
  
  // Helper function to get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const headers = getAuthHeader();
        
        // Get raw usage data
        const response = await axios.get('http://localhost:5000/raw-usage', { headers });
        console.log('Raw usage data:', response.data);
        
        // Check if the data likely contains sample entries
        const appData = response.data.appUsage || {};
        const tabData = response.data.tabUsage || {};
        
        const hasSampleApps = Object.entries(appData).some(([name, duration]) => 
          (name === 'VS Code' && Number(duration) === 1800) || 
          (name === 'Chrome' && Number(duration) === 1200) ||
          (name === 'Terminal' && Number(duration) === 600) ||
          (name === 'Slack' && Number(duration) === 300)
        );
        
        const hasSampleTabs = Object.keys(tabData).some(domain => 
          domain === 'github.com' || 
          domain === 'stackoverflow.com' || 
          domain === 'developer.mozilla.org'
        );
        
        setHasSampleData(hasSampleApps || hasSampleTabs);
        setUsageData(response.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch usage data:', err);
        setError('Failed to load usage data. Please make sure you are logged in and the server is running.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [includeSampleData]);

  // Format time duration (seconds to readable format)
  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };
  
  // Transform app usage data for chart
  const appChartData = Object.entries(usageData.appUsage || {})
    // Filter out sample data if the toggle is off
    .filter(([name, duration]) => {
      if (!includeSampleData) {
        // These are the exact durations of sample data
        const isSampleData = 
          (name === 'VS Code' && Number(duration) === 1800) || 
          (name === 'Chrome' && Number(duration) === 1200) ||
          (name === 'Terminal' && Number(duration) === 600) ||
          (name === 'Slack' && Number(duration) === 300);
        return !isSampleData;
      }
      return true;
    })
    .map(([name, duration]) => ({
      name,
      duration: Number(duration),
      isSample: (name === 'VS Code' && Number(duration) === 1800) || 
                (name === 'Chrome' && Number(duration) === 1200) ||
                (name === 'Terminal' && Number(duration) === 600) ||
                (name === 'Slack' && Number(duration) === 300)
    }))
    .sort((a, b) => b.duration - a.duration);
  
  // Transform tab usage data for chart
  const tabChartData = Object.entries(usageData.tabUsage || {})
    // Filter out sample data if the toggle is off
    .filter(([name, duration]) => {
      if (!includeSampleData) {
        // These are the domains of sample data
        const isSampleDomain = 
          name === 'github.com' || 
          name === 'stackoverflow.com' || 
          name === 'developer.mozilla.org';
        return !isSampleDomain;
      }
      return true;
    })
    .map(([name, duration]) => ({
      name,
      duration: Number(duration),
      isSample: name === 'github.com' || 
                name === 'stackoverflow.com' || 
                name === 'developer.mozilla.org'
    }))
    .sort((a, b) => b.duration - a.duration);
  
  // Colors for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading usage data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  const hasAppData = appChartData.length > 0;
  const hasTabData = tabChartData.length > 0;
  
  if (!hasAppData && !hasTabData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Usage Data</CardTitle>
          {usageData.userEmail && (
            <CardDescription>No data available for {usageData.userEmail}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No usage data available. Start using your apps and browsing to collect data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const clearSampleData = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.post('http://localhost:5000/api/clear-sample-data', {}, { headers });
      
      // Refresh data after clearing samples
      setIncludeSampleData(false);
      
      alert(`Sample data cleared successfully. Removed:
      - ${response.data.deletedCounts?.appUsage || 0} sample app entries
      - ${response.data.deletedCounts?.tabUsage || 0} sample website entries`);
      
    } catch (err) {
      console.error('Failed to clear sample data:', err);
      alert('Failed to clear sample data. Please try again.');
    }
  };

  return (
    <div >
      <h2 className="text-2xl font-bold mb-6">Detailed Usage Analysis</h2>
      
      {usageData.userEmail && (
        <p className="text-muted-foreground mb-4">
          Showing data for user: <strong>{usageData.userEmail}</strong>
        </p>
      )}
      
      {hasSampleData && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-amber-800">Sample Data Detected</h3>
              <p className="text-sm text-amber-700">
                Your dashboard includes sample data for demonstration purposes.
              </p>
            </div>
            <Button 
              variant="outline"
              size="sm"
              onClick={clearSampleData}
            >
              Remove Sample Data
            </Button>
          </div>
        </div>
      )}
      
      {/* Application Usage Chart */}
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Application Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAppData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatDuration(value)} />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const isSample = props.payload.isSample;
                      return [
                        formatDuration(Number(value)), 
                        `Time Spent${isSample ? ' (Sample)' : ''}`
                      ];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="duration" name="Time Spent" fill="#8884d8">
                    {appChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isSample ? '#d3d3d3' : COLORS[index % COLORS.length]} 
                        strokeWidth={entry.isSample ? 1 : 0}
                        stroke="#888"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No app usage data available.
            </p>
          )}
        </CardContent>
      </Card>
      
    
      <Card className="mb-6">
        <CardHeader>
          <CardTitle></CardTitle>
        </CardHeader>
        <CardContent>
          {hasTabData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tabChartData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => formatDuration(value)} />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const isSample = props.payload.isSample;
                      return [
                        formatDuration(Number(value)), 
                        `Time Spent${isSample ? ' (Sample)' : ''}`
                      ];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="duration" name="Time Spent" fill="#82ca9d">
                    {tabChartData.slice(0, 10).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isSample ? '#d3d3d3' : COLORS[(index + 3) % COLORS.length]} 
                        strokeWidth={entry.isSample ? 1 : 0}
                        stroke="#888"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {/* No website usage data available. */}
            </p>
          )}
        </CardContent>
      </Card>
      
     
      <Card>
        <CardHeader>
          <CardTitle>Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80">
              {(hasAppData || hasTabData) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        ...appChartData.map(item => ({ 
                          name: `App: ${item.name}`, 
                          value: item.duration,
                          isSample: item.isSample
                        })),
                        ...tabChartData.map(item => ({ 
                          name: `Web: ${item.name}`, 
                          value: item.duration,
                          isSample: item.isSample
                        }))
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name.substring(0, 15)}${name.length > 15 ? '...' : ''}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[...appChartData, ...tabChartData].map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isSample ? '#d3d3d3' : COLORS[index % COLORS.length]} 
                          strokeWidth={entry.isSample ? 1 : 0}
                          stroke="#888"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        formatDuration(Number(value)), 
                        `Duration${props.payload.isSample ? ' (Sample)' : ''}`
                      ]} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">No data available</p>
                </div>
              )}
            </div>
            

            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-medium mb-4">Summary</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between">
                    <span>Total app usage:</span>
                    <span className="font-medium">
                      {formatDuration(
                        Object.values(usageData.appUsage || {})
                          .map(val => Number(val))
                          .reduce((sum: number, val: number) => sum + val, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total browsing time:</span>
                    <span>
                      {formatDuration(
                        Object.values(usageData.tabUsage || {})
                          .map(val => Number(val))
                          .reduce((sum: number, val: number) => sum + val, 0)
                      )}
                    </span>
                  </div>
                </div>
                

                <div>
                  <h4 className="font-medium">Most used app:</h4>
                  {appChartData.length > 0 ? (
                    <div className="flex justify-between">
                      <span>{appChartData[0].name}{appChartData[0].isSample ? ' (Sample)' : ''}</span>
                      <span>{formatDuration(appChartData[0].duration)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No app data</p>
                  )}
                  
                  <h4 className="font-medium mt-2">Most visited site:</h4>
                  {tabChartData.length > 0 ? (
                    <div className="flex justify-between">
                      <span>{tabChartData[0].name}{tabChartData[0].isSample ? ' (Sample)' : ''}</span>
                      <span>{formatDuration(tabChartData[0].duration)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No browsing data</p>
                  )}
                </div>
              </div>

              
              <Button 
                variant="destructive" 
                className="mt-6"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to reset all usage data? This cannot be undone.\n\nThis will delete ALL data including both sample data and actual tracked activity.')) {
                    try {
                      const headers = getAuthHeader();
                      const response = await axios.post('http://localhost:5000/reset-data', {}, { headers });
                  
                      setUsageData({ 
                        appUsage: {}, 
                        tabUsage: {},
                        userEmail: usageData.userEmail 
                      });
                      
                      setHasSampleData(false);
                      
                      alert(`Data reset successful! Deleted:
                      - ${response.data?.deletedCounts?.appUsage || 0} app usage entries
                      - ${response.data?.deletedCounts?.tabUsage || 0} website usage entries`);
                    } catch (err) {
                      console.error('Failed to reset data:', err);
                      alert('Failed to reset data. Please try again.');
                    }
                  }
                }}
              >
                Reset All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedUsageCharts;