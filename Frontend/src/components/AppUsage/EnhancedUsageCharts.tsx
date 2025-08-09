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
  AreaChart,
  Sector,
  Treemap,
  LabelList
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
  const [timeFrame, setTimeFrame] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeSampleData, setIncludeSampleData] = useState(true);
  const [hasSampleData, setHasSampleData] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Helper function to get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchUsageData();
  }, [timeFrame, includeSampleData]);
  
  const fetchUsageData = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeader();
      
      // Get raw usage data with timeFrame parameter
      const response = await axios.get('http://localhost:5001/raw-usage', { 
        headers,
        params: { timeFrame }
      });
      
      console.log(`Raw usage data for ${timeFrame} timeframe:`, response.data);
      
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
      console.error(`Failed to fetch ${timeFrame} usage data:`, err);
      setError(`Failed to load ${timeFrame} usage data. Please make sure you are logged in and the server is running.`);
    } finally {
      setIsLoading(false);
    }
  };

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
      name: name.length > 15 ? `${name.substring(0, 12)}...` : name,
      fullName: name,
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
      name: name.length > 15 ? `${name.substring(0, 12)}...` : name,
      fullName: name,
      duration: Number(duration),
      isSample: name === 'github.com' || 
                name === 'stackoverflow.com' || 
                name === 'developer.mozilla.org'
    }))
    .sort((a, b) => b.duration - a.duration);
  
  // Colors for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'];
  
  // Combined data for treemap
  const combinedData = [
    ...appChartData.map(app => ({
      ...app,
      type: 'App',
      name: `App: ${app.name}`, 
      fullName: `App: ${app.fullName}`,
    })),
    ...tabChartData.map(tab => ({
      ...tab,
      type: 'Web',
      name: `Web: ${tab.name}`,
      fullName: `Web: ${tab.fullName}`,
    }))
  ];

  // Create aggregated data for app vs web comparison
  const appTotal = Object.values(usageData.appUsage || {})
    .map(val => Number(val))
    .reduce((sum: number, val: number) => sum + val, 0);
  
  const webTotal = Object.values(usageData.tabUsage || {})
    .map(val => Number(val))
    .reduce((sum: number, val: number) => sum + val, 0);

  const appVsWebData = [
    { name: 'Applications', value: appTotal },
    { name: 'Websites', value: webTotal }
  ];

  // Pie chart custom active shape
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill}>
          {payload.name}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333">
          {`${formatDuration(value)}`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999">
          {`(${(percent * 100).toFixed(2)}%)`}
        </text>
      </g>
    );
  };

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading {timeFrame} usage data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={fetchUsageData}
          >
            Try Again
          </Button>
        </AlertDescription>
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
            No usage data available for {timeFrame} view. Start using your apps and browsing to collect data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const clearSampleData = async () => {
    try {
      const headers = getAuthHeader();
      const response = await axios.post('http://localhost:5001/api/clear-sample-data', {}, { headers });
      
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
  
  const timeFrameDisplay = {
    'daily': 'Today',
    'weekly': 'This Week',
    'monthly': 'This Month'
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-2xl font-bold">Detailed Usage Analysis</h2>
        
        <div className="mt-2 sm:mt-0">
          <Tabs 
            value={timeFrame} 
            onValueChange={(value) => setTimeFrame(value as 'daily' | 'weekly' | 'monthly')}
            className="w-[300px]"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {usageData.userEmail && (
        <p className="text-muted-foreground mb-4">
          Showing {timeFrameDisplay[timeFrame]} data for user: <strong>{usageData.userEmail}</strong>
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
          <CardTitle>Application Usage - {timeFrameDisplay[timeFrame]}</CardTitle>
          <CardDescription>
            Time spent on different applications during {timeFrameDisplay[timeFrame].toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAppData ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appChartData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatDuration(value)} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const isSample = props.payload.isSample;
                      return [
                        formatDuration(Number(value)), 
                        `${props.payload.fullName}${isSample ? ' (Sample)' : ''}`
                      ];
                    }}
                    labelFormatter={() => 'Duration'}
                  />
                  <Legend />
                  <Bar dataKey="duration" name="Time Spent" fill="#8884d8">
                    {appChartData.slice(0, 10).map((entry, index) => (
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
              No app usage data available for {timeFrame} view.
            </p>
          )}
        </CardContent>
      </Card>
    
      {/* Only show Website Usage card if there's data */}
      {hasTabData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Website Usage - {timeFrameDisplay[timeFrame]}</CardTitle>
            <CardDescription>
              Time spent on different websites during {timeFrameDisplay[timeFrame].toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tabChartData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatDuration(value)} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const isSample = props.payload.isSample;
                      return [
                        formatDuration(Number(value)), 
                        `${props.payload.fullName}${isSample ? ' (Sample)' : ''}`
                      ];
                    }}
                    labelFormatter={() => 'Duration'}
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
          </CardContent>
        </Card>
      )}
     
      <Card>
        <CardHeader>
          <CardTitle>Activity Distribution - {timeFrameDisplay[timeFrame]}</CardTitle>
          <CardDescription>
            Comparison between application and website usage during {timeFrameDisplay[timeFrame].toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Apps vs. Web Comparison</h4>
              
              {/* Add Stacked Bar Chart for Apps vs Web */}
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={appVsWebData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                  >
                    <XAxis type="number" tickFormatter={(value) => formatDuration(value)} />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip formatter={(value) => formatDuration(Number(value))} />
                    <Bar dataKey="value" fill="#8884d8">
                      <Cell fill="#8884d8" />
                      <Cell fill="#82ca9d" />
                      <LabelList dataKey="name" position="insideLeft" fill="#ffffff" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Keep the Pie Chart but with better visibility */}
              <div className="h-60 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      activeIndex={activeIndex}
                      activeShape={renderActiveShape}
                      data={appVsWebData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onMouseEnter={onPieEnter}
                    >
                      <Cell fill="#8884d8" />
                      <Cell fill="#82ca9d" />
                    </Pie>
                    <Tooltip formatter={(value) => formatDuration(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Distribution Bar with percentages */}
              <div>
                <h4 className="font-medium mt-2">
                  Apps vs. Web distribution:
                </h4>
                <div className="w-full bg-gray-200 rounded-full h-6 mt-1">
                  {(() => {
                    const total = appTotal + webTotal;
                    const appPercentage = total > 0 ? (appTotal / total) * 100 : 0;
                    
                    return (
                      <div className="flex h-full">
                        <div 
                          className="bg-blue-600 h-6 rounded-l-full flex items-center justify-center text-white text-xs"
                          style={{ width: `${appPercentage}%`, minWidth: appPercentage > 0 ? '40px' : '0' }}
                        >
                          {appPercentage > 10 ? `${Math.round(appPercentage)}%` : ''}
                        </div>
                        <div 
                          className="bg-green-500 h-6 rounded-r-full flex items-center justify-center text-white text-xs"
                          style={{ width: `${100 - appPercentage}%`, minWidth: (100 - appPercentage) > 0 ? '40px' : '0' }}
                        >
                          {(100 - appPercentage) > 10 ? `${Math.round(100 - appPercentage)}%` : ''}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="flex items-center">
                    <div className="w-3 h-3 mr-1 rounded-full bg-blue-600"></div>
                    Apps: {
                      (() => {
                        const total = appTotal + webTotal;
                        return total > 0 ? Math.round((appTotal / total) * 100) : 0;
                      })()
                    }%
                  </span>
                  <span className="flex items-center">
                    <div className="w-3 h-3 mr-1 rounded-full bg-green-500"></div>
                    Web: {
                      (() => {
                        const total = appTotal + webTotal;
                        return total > 0 ? Math.round((webTotal / total) * 100) : 0;
                      })()
                    }%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-medium mb-4">
                {timeFrameDisplay[timeFrame]} Summary
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between">
                    <span>Total app usage:</span>
                    <span className="font-medium">
                      {formatDuration(appTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total browsing time:</span>
                    <span>
                      {formatDuration(webTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t mt-2 pt-2">
                    <span>Combined total:</span>
                    <span className="font-medium">
                      {formatDuration(appTotal + webTotal)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium">Most used app:</h4>
                  {appChartData.length > 0 ? (
                    <div className="flex justify-between">
                      <span>{appChartData[0].fullName}{appChartData[0].isSample ? ' (Sample)' : ''}</span>
                      <span>{formatDuration(appChartData[0].duration)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No app data</p>
                  )}
                  
                  <h4 className="font-medium mt-2">Most visited site:</h4>
                  {tabChartData.length > 0 ? (
                    <div className="flex justify-between">
                      <span>{tabChartData[0].fullName}{tabChartData[0].isSample ? ' (Sample)' : ''}</span>
                      <span>{formatDuration(tabChartData[0].duration)}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No browsing data</p>
                  )}
                </div>

                {/* Show treemap for top items */}
                {combinedData.length > 0 && (
                  <div className="mt-4 pt-2">
                    <h4 className="font-medium mb-2">Top 5 Activities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {combinedData.slice(0, 5).map((item, index) => (
                        <div 
                          key={`top-${index}`}
                          className={`px-2 py-1 rounded-md text-sm ${
                            item.type === 'App' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          <span className="font-medium">{item.fullName.replace('App: ', '').replace('Web: ', '')}</span>
                          <span className="ml-1 text-xs opacity-75">{formatDuration(item.duration)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between mt-6">
                <Button 
                  variant="outline"
                  onClick={fetchUsageData}
                >
                  Refresh Data
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to reset all usage data? This cannot be undone.\n\nThis will delete ALL data including both sample data and actual tracked activity.')) {
                      try {
                        const headers = getAuthHeader();
                        const response = await axios.post('http://localhost:5001/api/reset-data', {}, { headers });
                    
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedUsageCharts;