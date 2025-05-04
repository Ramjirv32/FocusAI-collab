import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface BrowserTabsAnalysisProps {
  className?: string;
  timeFrame?: 'daily' | 'weekly' | 'monthly';
}

const BrowserTabsAnalysis: React.FC<BrowserTabsAnalysisProps> = ({ className, timeFrame = 'daily' }) => {
  const [tabData, setTabData] = useState<any>({ domains: [], rawData: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get authorization header
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchBrowserTabData = async () => {
      setIsLoading(true);
      try {
        const headers = getAuthHeader();
        console.log('Fetching browser tab data with timeFrame:', timeFrame);
        const response = await axios.get(`http://localhost:5000/browser-tabs?timeFrame=${timeFrame}`, { headers });
        
        console.log('Browser tab data response:', response.data);
        
        if (response.data && response.data.domains) {
          setTabData(response.data);
          setError(null);
        } else {
          console.error('Invalid data format received:', response.data);
          setError('Received invalid data format');
        }
      } catch (err) {
        console.error('Failed to fetch browser tab data:', err);
        setError('Failed to load browser tab data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrowserTabData();
  }, [timeFrame]);

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

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!tabData.domains || tabData.domains.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Website Usage</CardTitle>
          <CardDescription>No website usage data available for the selected time period.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10 text-muted-foreground">
          Visit some websites to see your usage data here.
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const chartData = tabData.domains.slice(0, 10).map((domain: any) => ({
    name: domain.domain,
    value: domain.totalDuration,
    visits: domain.visits,
  }));

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#A4DE6C', '#D0ED57', '#83A6ED'];

  const timeFrameLabel = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month'
  }[timeFrame];

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-4">Website Usage Analysis</h2>
      <p className="text-muted-foreground mb-6">
        Your browsing activity for {timeFrameLabel}
      </p>
      
      <Tabs defaultValue="pie" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          <TabsTrigger value="details">Detailed List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pie">
          <Card>
            <CardHeader>
              <CardTitle>Website Usage Distribution</CardTitle>
              <CardDescription>Percentage of time spent on each website</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatDuration(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bar">
          <Card>
            <CardHeader>
              <CardTitle>Time Spent on Websites</CardTitle>
              <CardDescription>Duration spent on each website</CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatDuration} />
                  <Tooltip formatter={(value: any) => formatDuration(value)} />
                  <Legend />
                  <Bar dataKey="value" name="Duration" fill="#8884d8">
                    {chartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Website Usage</CardTitle>
              <CardDescription>All websites visited and time spent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tabData.domains.map((domain: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={domain.favicon || `https://www.google.com/s2/favicons?domain=${domain.domain}`}
                        alt={domain.domain}
                        className="w-6 h-6"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://www.google.com/s2/favicons?domain=example.com";
                        }}
                      />
                      <div>
                        <h3 className="font-medium text-lg">{domain.domain}</h3>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Duration: {formatDuration(domain.totalDuration)}</span>
                          <span>Visits: {domain.visits}</span>
                        </div>
                      </div>
                    </div>
                    {domain.pages && domain.pages.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-primary">Show pages ({domain.pages.length})</summary>
                        <ul className="mt-2 pl-8 list-disc space-y-1 text-sm">
                          {domain.pages.map((page: any, pageIndex: number) => (
                            <li key={pageIndex}>
                              <span title={page.url}>{page.title || page.url}</span>
                              <span className="text-muted-foreground ml-2">({formatDuration(page.duration)})</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrowserTabsAnalysis;