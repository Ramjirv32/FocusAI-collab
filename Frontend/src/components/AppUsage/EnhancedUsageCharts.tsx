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
  LabelList,
  ReferenceLine,
  ReferenceDot
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
              <div className="border p-4 rounded-md">
                <h4 className="font-medium mb-3">App Usage Forecast</h4>
                
                {/* Forecast style chart inspired by the reference image */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        ...appChartData.slice(0, 5).map((item, index) => ({
                          name: item.name,
                          value: item.duration,
                          forecast: item.duration * (1 + (Math.random() * 0.3 - 0.1))
                        }))
                      ].sort((a, b) => a.value - b.value)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => formatDuration(value)} 
                        domain={['dataMin - 100', 'dataMax + 200']}
                        axisLine={false}
                      />
                      <Tooltip formatter={(value) => formatDuration(Number(value))} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#4299e1"
                        strokeWidth={3}
                        dot={{ r: 6, fill: "#4299e1", strokeWidth: 2, stroke: "#fff" }}
                        isAnimationActive={true}
                        name="Current"
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#a3bffa"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={{ r: 6, fill: "#a3bffa", strokeWidth: 2, stroke: "#fff" }}
                        isAnimationActive={true}
                        name="Forecast"
                      />
                      <Legend />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Moderate Buy style chart inspired by the reference image */}
              <div className="border p-4 rounded-md mt-4">
                <div className="flex justify-between mb-3">
                  <h4 className="font-medium text-xl">
                    <span className="text-teal-500">Moderate Productivity</span>
                  </h4>
                  <div className="text-sm text-teal-500">
                    {appTotal > webTotal ? "↑" : "↓"}{Math.abs(Math.round((appTotal - webTotal) / (appTotal + webTotal) * 100))}% balance
                  </div>
                </div>
                
                <div className="flex items-center mb-6">
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 120 120" className="w-full h-full">
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="12"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        fill="none"
                        stroke="#38b2ac"
                        strokeWidth="12"
                        strokeDasharray="339.292"
                        strokeDashoffset={339.292 * (1 - (appTotal / (appTotal + webTotal)))}
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">
                        {Math.round(appTotal / (appTotal + webTotal) * 100)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-6">
                    <div className="text-3xl font-bold">
                      {formatDuration(appTotal + webTotal)}
                    </div>
                    <div className="text-sm text-gray-500">Total Activity</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-gray-500">Apps</div>
                    <div className="font-semibold">{Math.round(appTotal / (appTotal + webTotal) * 100)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Web</div>
                    <div className="font-semibold">{Math.round(webTotal / (appTotal + webTotal) * 100)}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Balance</div>
                    <div className={`font-semibold ${Math.abs((appTotal - webTotal) / (appTotal + webTotal)) < 0.2 ? "text-green-500" : "text-yellow-500"}`}>
                      {Math.abs(Math.round((appTotal - webTotal) / (appTotal + webTotal) * 100))}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border p-4 rounded-md">
                <h4 className="font-medium mb-2">12 Hour Activity Forecast</h4>
                
                {/* Create a 12-hour forecast chart similar to the stock price chart */}
                <div className="h-64 relative">
                  <div className="absolute right-0 top-0 flex flex-col space-y-1 text-xs">
                    <div className="text-green-500">High<br/>{formatDuration(Math.max(...appChartData.map(d => d.duration)))}</div>
                    <div className="text-gray-500">Average<br/>{formatDuration((appTotal + webTotal) / (appChartData.length + tabChartData.length))}</div>
                    <div className="text-red-500">Low<br/>{formatDuration(Math.min(...appChartData.filter(d => d.duration > 0).map(d => d.duration)))}</div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        // Generate synthetic time series data for a 12-hour forecast
                        [...Array(12)].map((_, i) => {
                          const baseValue = (appTotal + webTotal) / (appChartData.length + tabChartData.length);
                          const hour = new Date();
                          hour.setHours(hour.getHours() + i);
                          const hourStr = hour.getHours() + ':00';
                          
                          // Create variation for past and future values
                          let value;
                          if (i < 4) {
                            // Past hours - actual data with small variations
                            value = baseValue * (0.8 + (i * 0.1));
                          } else {
                            // Future hours - forecast with more variation
                            value = baseValue * (1 + ((Math.sin(i) * 0.3) + (Math.random() * 0.2 - 0.1)));
                          }
                          
                          return {
                            hour: hourStr,
                            value: value,
                            forecast: i >= 4,
                            actual: i < 4,
                            label: i === 3 ? 'Current' : (i === 11 ? 'Forecast' : null)
                          };
                        })
                      }
                      margin={{ top: 20, right: 80, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4299e1" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#4299e1" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a3bffa" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#a3bffa" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="hour"
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatDuration(value)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        formatter={(value) => formatDuration(Number(value))}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#4299e1"
                        fillOpacity={1}
                        fill="url(#activityGradient)"
                        strokeWidth={2}
                        name="Activity"
                        activeDot={{ r: 6 }}
                      />
                      
                      {/* Add a vertical line at the current time */}
                      <ReferenceLine 
                        x="3:00" 
                        stroke="#718096" 
                        strokeDasharray="3 3" 
                        label={{ value: 'Current', position: 'insideTopRight', fill: '#718096' }} 
                      />
                      
                      {/* Add a custom dots for current and forecast points */}
                      {[...Array(12)].map((_, i) => {
                        const hour = new Date();
                        hour.setHours(hour.getHours() + i);
                        const hourStr = hour.getHours() + ':00';
                        return i === 3 ? (
                          <ReferenceDot
                            key={`dot-${i}`}
                            x={hourStr}
                            y={(appTotal + webTotal) / (appChartData.length + tabChartData.length) * (0.8 + (i * 0.1))}
                            r={6}
                            fill="#4299e1"
                            stroke="#fff"
                          />
                        ) : null;
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Add a legend for the forecast chart */}
                <div className="flex justify-center mt-2 space-x-6 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 mr-1 rounded-full bg-blue-500"></div>
                    <span>Actual</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 mr-1 rounded-full bg-blue-300"></div>
                    <span>Forecast</span>
                  </div>
                </div>
              </div>
              
              {/* Detailed List of Activity Forecasts */}
              <div className="border p-4 rounded-md mt-4">
                <h4 className="font-medium mb-4">Detailed Activity Forecast</h4>
                
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b text-xs text-gray-500">
                      <th className="text-left py-2">Activity</th>
                      <th className="text-left py-2">Current</th>
                      <th className="text-left py-2">Forecast</th>
                      <th className="text-left py-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedData.slice(0, 5).map((item, index) => {
                      const forecastValue = item.duration * (1 + (Math.random() * 0.3 - 0.1));
                      const change = ((forecastValue - item.duration) / item.duration) * 100;
                      
                      return (
                        <tr key={`forecast-${index}`} className="border-b">
                          <td className="py-2">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 mr-2 rounded-full ${item.type === 'App' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                              <span>{item.fullName.replace('App: ', '').replace('Web: ', '')}</span>
                            </div>
                          </td>
                          <td className="py-2">{formatDuration(item.duration)}</td>
                          <td className="py-2">{formatDuration(forecastValue)}</td>
                          <td className={`py-2 ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {change > 0 ? '▲' : '▼'} {Math.abs(Math.round(change))}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedUsageCharts;