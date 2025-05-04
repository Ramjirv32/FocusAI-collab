import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart, 
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';

interface UsageChartsViewProps {
  className?: string;
}

const UsageChartsView: React.FC<UsageChartsViewProps> = ({ className }) => {
  const [rawData, setRawData] = useState<{
    appUsage: Record<string, number>;
    tabUsage: Record<string, number>;
  }>({
    appUsage: {},
    tabUsage: {}
  });
  
  const [productivityData, setProductivityData] = useState({
    productive: 0,
    unproductive: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get raw usage data
        const rawResponse = await axios.get('http://localhost:5000/raw-usage');
        setRawData(rawResponse.data);
        
        // Get productivity data
        const focusResponse = await axios.get('http://localhost:5000/focus-data');
        
        // Calculate productive vs unproductive time
        // This is a simplified version - you would need to implement proper
        // productivity classification in your real app
        const tabs = focusResponse.data.tabs || [];
        
        // For demo, consider domains with "github", "docs", or "stackoverflow" as productive
        const productive = tabs
          .filter((tab: any) => {
            try {
              const url = new URL(tab.url);
              return url.hostname.includes('github') || 
                     url.hostname.includes('docs') || 
                     url.hostname.includes('stackoverflow');
            } catch (e) {
              return false;
            }
          })
          .reduce((sum: number, tab: any) => sum + (tab.duration || 0), 0);
        
        const unproductive = tabs
          .filter((tab: any) => {
            try {
              const url = new URL(tab.url);
              return url.hostname.includes('youtube') || 
                     url.hostname.includes('facebook') ||
                     url.hostname.includes('twitter') ||
                     url.hostname.includes('instagram');
            } catch (e) {
              return false;
            }
          })
          .reduce((sum: number, tab: any) => sum + (tab.duration || 0), 0);
        
        setProductivityData({ productive, unproductive });
      } catch (e) {
        console.error("Error fetching usage data:", e);
        setError("Failed to load usage data. Please make sure the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-3 text-muted-foreground">Loading usage data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`${className} bg-destructive/10`}>
        <CardHeader>
          <CardTitle>Error Loading Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  // Prepare bar chart data for app usage
  const appUsageData = Object.entries(rawData.appUsage).map(([name, duration]) => ({
    name,
    duration
  })).sort((a, b) => b.duration - a.duration);

  // Prepare bar chart data for tab usage
  const tabUsageData = Object.entries(rawData.tabUsage).map(([name, duration]) => ({
    name,
    duration
  })).sort((a, b) => b.duration - a.duration).slice(0, 10); // Top 10 tabs

  // Prepare productivity pie chart data
  const productivityChartData = [
    { name: 'Productive', value: productivityData.productive },
    { name: 'Unproductive', value: productivityData.unproductive }
  ];

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-4">Activity Visualizations</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* App Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>App Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={appUsageData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatDuration} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => [formatDuration(Number(value)), "Duration"]} />
                <Legend />
                <Bar 
                  dataKey="duration" 
                  fill="#8884d8" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tab Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Website Usage</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tabUsageData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatDuration} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(value) => [formatDuration(Number(value)), "Duration"]} />
                <Legend />
                <Bar 
                  dataKey="duration" 
                  fill="#82ca9d" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Productivity Analysis</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={productivityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {productivityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatDuration(Number(value)), "Time"]} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-medium mb-4">Summary</h3>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>Productive time:</span>
                  <span className="font-medium">{formatDuration(productivityData.productive)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Unproductive time:</span>
                  <span className="font-medium">{formatDuration(productivityData.unproductive)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Productivity ratio:</span>
                  <span className="font-medium">
                    {productivityData.productive + productivityData.unproductive > 0 
                      ? `${((productivityData.productive / (productivityData.productive + productivityData.unproductive)) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </li>
              </ul>
              
              <button 
                className="mt-6 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to reset all tracking data? This cannot be undone.")) {
                    try {
                      await axios.post('http://localhost:5000/reset-data');
                      alert("Data reset successful");
                      window.location.reload();
                    } catch (e) {
                      alert("Failed to reset data");
                      console.error(e);
                    }
                  }
                }}
              >
                Reset All Data
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageChartsView;