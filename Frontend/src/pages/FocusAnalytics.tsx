import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, BarChart2, Clock, Target, AlertCircle } from 'lucide-react';
import { getFocusAnalysis, syncFocusData } from '@/services/activityDataService';
import { toast } from '@/components/ui/use-toast';

// Recharts components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#4ade80', '#f87171', '#93c5fd'];

const FocusAnalytics = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [focusData, setFocusData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (selectedDate: Date) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const data = await getFocusAnalysis(formattedDate);
      setFocusData(data);
    } catch (err) {
      console.error('Error fetching focus analytics:', err);
      setError('Failed to load focus data. Please try again.');
      toast({
        title: 'Error',
        description: 'Could not load focus analytics.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (newDate: Date) => {
    setDate(newDate);
    fetchAnalytics(newDate);
  };

  const handleSync = async () => {
    try {
      setIsLoading(true);
      const formattedDate = format(date, 'yyyy-MM-dd');
      await syncFocusData(formattedDate);
      await fetchAnalytics(date);
      toast({
        title: 'Success',
        description: 'Focus data synced successfully.',
      });
    } catch (err) {
      console.error('Error syncing focus data:', err);
      toast({
        title: 'Error',
        description: 'Could not sync focus data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(date);
  }, []);

  const formatTimeMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const pieData = focusData ? [
    { name: 'Focus', value: focusData.summary?.focused_duration_minutes || 0, color: '#4ade80' },
    { name: 'Distraction', value: focusData.summary?.distracted_duration_minutes || 0, color: '#f87171' }
  ] : [];

  const activityBarData = focusData ? [
    { 
      name: 'Focus',
      minutes: focusData.summary?.focused_duration_minutes || 0,
      color: '#4ade80'
    },
    { 
      name: 'Distraction',
      minutes: focusData.summary?.distracted_duration_minutes || 0, 
      color: '#f87171'
    }
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Focus Analytics</h2>
            <p className="text-muted-foreground">
              Detailed analysis of your productivity patterns
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-fit justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && handleDateChange(date)}
                  initialFocus
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            
            <Button
              onClick={handleSync}
              disabled={isLoading}
            >
              {isLoading ? 'Syncing...' : 'Sync Data'}
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid place-items-center py-10">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Loading focus analytics...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="bg-destructive/10 border-destructive/20">
            <CardHeader>
              <CardTitle>Error Loading Data</CardTitle>
              <CardDescription>
                There was a problem retrieving your focus analytics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        ) : focusData ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Productivity Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {focusData.summary?.productivity_score || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {focusData.analysis_date || format(date, 'yyyy-MM-dd')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    Focus Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatTimeMinutes(focusData.summary?.focused_duration_minutes || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Most focused: {focusData.summary?.most_focused_app || 'None'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Distraction Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatTimeMinutes(focusData.summary?.distracted_duration_minutes || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Most distracting: {focusData.summary?.most_distracting_app || 'None'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-purple-500" />
                    Total Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {focusData.total_activities || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total time: {formatTimeMinutes(focusData.summary?.total_duration_minutes || 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time Distribution</CardTitle>
                  <CardDescription>Focus vs. Distraction time</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${formatTimeMinutes(Number(value))}`, 'Duration']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Comparison</CardTitle>
                  <CardDescription>Focus vs. Distraction in minutes</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activityBarData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${formatTimeMinutes(Number(value))}`, 'Duration']} />
                      <Legend />
                      <Bar dataKey="minutes" name="Minutes" fill="#8884d8">
                        {activityBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Target className="h-5 w-5" />
                    Focus Areas
                  </CardTitle>
                  <CardDescription>
                    Categories and apps that help your productivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {focusData.focus_areas?.length > 0 ? (
                    <div className="space-y-4">
                      {focusData.focus_areas.map((area: any, index: number) => (
                        <div key={index} className="bg-green-50 p-4 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-green-700">{area.category}</h3>
                            <span className="text-sm text-green-600">{formatTimeMinutes(area.total_duration / 60)}</span>
                          </div>
                          <div className="text-sm text-green-600 flex flex-wrap gap-1">
                            {area.apps.map((app: string, appIndex: number) => (
                              <span key={appIndex} className="bg-green-100 px-2 py-1 rounded">
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No focus areas detected</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Distraction Areas
                  </CardTitle>
                  <CardDescription>
                    Categories and apps that reduce your productivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {focusData.distraction_areas?.length > 0 ? (
                    <div className="space-y-4">
                      {focusData.distraction_areas.map((area: any, index: number) => (
                        <div key={index} className="bg-red-50 p-4 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-red-700">{area.category}</h3>
                            <span className="text-sm text-red-600">{formatTimeMinutes(area.total_duration / 60)}</span>
                          </div>
                          <div className="text-sm text-red-600 flex flex-wrap gap-1">
                            {area.apps.map((app: string, appIndex: number) => (
                              <span key={appIndex} className="bg-red-100 px-2 py-1 rounded">
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No distraction areas detected</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground">No focus data available for this date.</p>
              <Button onClick={handleSync} className="mt-4">
                Sync Data
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FocusAnalytics;