import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';

interface TabUsageData {
  domain: string;
  duration: number;
  visits: number;
  averageDuration: number;
}

const TabUsageAnalytics: React.FC = () => {
  const [tabData, setTabData] = useState<TabUsageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  
  useEffect(() => {
    const fetchTabUsageData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        // Fetch raw tab data
        const response = await axios.get(`http://localhost:5001/tabs?timeFrame=${timeRange}`, { headers });
        
        // Process the data
        const domainsMap = new Map<string, TabUsageData>();
        
        response.data.forEach((tab: any) => {
          const domain = tab.domain || 'unknown';
          if (!domainsMap.has(domain)) {
            domainsMap.set(domain, {
              domain,
              duration: 0,
              visits: 0,
              averageDuration: 0
            });
          }
          
          const domainData = domainsMap.get(domain)!;
          domainData.duration += tab.duration || 0;
          domainData.visits += 1;
        });
        
        // Calculate average durations
        domainsMap.forEach(data => {
          data.averageDuration = data.visits > 0 ? Math.round(data.duration / data.visits) : 0;
        });
        
        // Convert map to array and sort by duration
        const processedData = Array.from(domainsMap.values())
          .sort((a, b) => b.duration - a.duration);
          
        setTabData(processedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching tab usage data:", err);
        setError("Failed to load tab usage data. Please make sure the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTabUsageData();
    
    // Refresh data every minute
    const interval = setInterval(fetchTabUsageData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);
  
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tab Usage Analytics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading tab data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/20">
        <CardHeader>
          <CardTitle>Error Loading Tab Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tab Usage Analytics</CardTitle>
        <div className="flex space-x-2 pt-2">
          <Button
            variant={timeRange === 'daily' ? 'default' : 'outline'}
            onClick={() => setTimeRange('daily')}
            className="text-xs h-8"
          >
            Today
          </Button>
          <Button
            variant={timeRange === 'weekly' ? 'default' : 'outline'}
            onClick={() => setTimeRange('weekly')}
            className="text-xs h-8"
          >
            Past Week
          </Button>
          <Button
            variant={timeRange === 'monthly' ? 'default' : 'outline'}
            onClick={() => setTimeRange('monthly')}
            className="text-xs h-8"
          >
            Past Month
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="duration" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="duration">Duration</TabsTrigger>
            <TabsTrigger value="visits">Visit Count</TabsTrigger>
            <TabsTrigger value="average">Avg Time</TabsTrigger>
            <TabsTrigger value="pie">Distribution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="duration" className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Time Spent by Website</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tabData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={formatDuration} />
                  <YAxis 
                    dataKey="domain" 
                    type="category" 
                    width={100} 
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <Tooltip formatter={(value) => [formatDuration(Number(value)), "Time Spent"]} />
                  <Bar dataKey="duration" name="Duration" fill="#8884d8">
                    {tabData.slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="visits" className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Most Frequently Visited Websites</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tabData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="domain" 
                    type="category" 
                    width={100} 
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <Tooltip />
                  <Bar dataKey="visits" name="Visits" fill="#82ca9d">
                    {tabData.slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="average" className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Average Time per Visit</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tabData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tickFormatter={formatDuration} />
                  <YAxis 
                    dataKey="domain" 
                    type="category" 
                    width={100} 
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <Tooltip formatter={(value) => [formatDuration(Number(value)), "Avg Time/Visit"]} />
                  <Bar dataKey="averageDuration" name="Average Duration" fill="#ffc658">
                    {tabData.slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="pie" className="space-y-4">
            <h3 className="text-sm font-medium mb-2">Website Usage Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tabData.slice(0, 6)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="duration"
                    nameKey="domain"
                    label={({domain, percent}) => 
                      `${domain.length > 15 ? domain.substring(0, 15) + '...' : domain} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {tabData.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatDuration(Number(value)), "Time Spent"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Total Websites:</span>
              <span className="font-medium">{tabData.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Total Browsing Time:</span>
              <span className="font-medium">
                {formatDuration(tabData.reduce((sum, item) => sum + item.duration, 0))}
              </span>
            </div>
            {tabData.length > 0 && (
              <>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Most Visited:</span>
                  <span className="font-medium truncate" title={tabData.sort((a, b) => b.visits - a.visits)[0].domain}>
                    {tabData.sort((a, b) => b.visits - a.visits)[0].domain}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Most Time Spent:</span>
                  <span className="font-medium truncate" title={tabData[0].domain}>
                    {tabData[0].domain}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TabUsageAnalytics;