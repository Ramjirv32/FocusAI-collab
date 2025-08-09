import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import {
  ArrowLeft,
  Monitor,
  Globe,
  Clock,
  Calendar,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useToast } from "../components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import DashboardLayout from '../components/Layout/DashboardLayout';
import TimeFrameSelector from '../components/TabInsights/TimeFrameSelector';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

const Activities = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('daily');
  const [filter, setFilter] = useState('all'); // 'all', 'apps', 'tabs'
  const [sortBy, setSortBy] = useState('time'); // 'time', 'name', 'recent'
  
  // Helper function to get auth headers
  const getAuthHeader = () => {
    const authToken = token || localStorage.getItem('token');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };

  // Format duration from seconds to human readable time
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get activities data from backend
  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      const headers = getAuthHeader();
      
      // Get apps usage data
      const appResponse = await axios.get('http://localhost:5001/api/user-data', {
        headers,
        params: { timeFrame: selectedTimeFrame }
      });
      
      // Process app usage data
      const appActivities = (appResponse.data.appUsage || []).map(app => ({
        id: `app-${app._id || Math.random().toString(36)}`,
        type: 'App',
        name: app.appName || 'Unknown Application',
        duration: app.duration || 0,
        timestamp: app.lastUpdated || new Date().toISOString(),
        formattedDuration: formatDuration(app.duration || 0),
        formattedTime: formatTime(app.lastUpdated || new Date())
      }));
      
      // Process tab usage data
      const tabActivities = (appResponse.data.tabUsage || []).map(tab => ({
        id: `tab-${tab._id || Math.random().toString(36)}`,
        type: 'Tab',
        name: tab.title || tab.domain || tab.url || 'Unknown Website',
        domain: tab.domain || 'unknown',
        url: tab.url || '#',
        duration: tab.duration || 0,
        timestamp: tab.timestamp || tab.lastUpdated || new Date().toISOString(),
        formattedDuration: formatDuration(tab.duration || 0),
        formattedTime: formatTime(tab.timestamp || tab.lastUpdated || new Date())
      }));
      
      // Combine and sort activities
      const allActivities = [...appActivities, ...tabActivities];
      
      // Apply sorting
      sortActivities(allActivities, sortBy);
      
      setActivities(allActivities);
      
      toast({
        title: "Activities Loaded",
        description: `Showing ${allActivities.length} activities for ${selectedTimeFrame} view.`,
      });
      
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error Loading Activities",
        description: "Failed to load your activity data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Sort activities by the selected method
  const sortActivities = (activitiesArray, sortMethod) => {
    switch (sortMethod) {
      case 'time':
        return activitiesArray.sort((a, b) => b.duration - a.duration);
      case 'name':
        return activitiesArray.sort((a, b) => a.name.localeCompare(b.name));
      case 'recent':
        return activitiesArray.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
      default:
        return activitiesArray;
    }
  };

  // Filter activities by type
  const getFilteredActivities = () => {
    if (filter === 'apps') {
      return activities.filter(activity => activity.type === 'App');
    } else if (filter === 'tabs') {
      return activities.filter(activity => activity.type === 'Tab');
    }
    return activities;
  };

  // Apply new sorting
  const handleSort = (newSortBy) => {
    setSortBy(newSortBy);
    const sorted = [...activities];
    sortActivities(sorted, newSortBy);
    setActivities(sorted);
  };

  // Effect to fetch data on initial load and when time frame changes
  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user, selectedTimeFrame]);

  // Return to dashboard
  const handleBackClick = () => {
    navigate('/');
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchActivities();
  };

  const filteredActivities = getFilteredActivities();
  
  // Format time frame for display
  const timeFrameDisplays = {
    'daily': 'Today',
    'weekly': 'This Week',
    'monthly': 'This Month'
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackClick} 
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Activity Details</h2>
              <p className="text-muted-foreground">
                Detailed breakdown of your productivity activities
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> 
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
            <TimeFrameSelector 
              selectedTimeFrame={selectedTimeFrame}
              onTimeFrameChange={setSelectedTimeFrame}
            />
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Activities for {timeFrameDisplays[selectedTimeFrame]}
              </CardTitle>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-1" /> Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilter('all')} className={filter === 'all' ? "bg-primary/20" : ""}>
                      All Activities
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('apps')} className={filter === 'apps' ? "bg-primary/20" : ""}>
                      Apps Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('tabs')} className={filter === 'tabs' ? "bg-primary/20" : ""}>
                      Browser Tabs Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Clock className="h-4 w-4 mr-1" /> Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSort('time')} className={sortBy === 'time' ? "bg-primary/20" : ""}>
                      Time Spent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('name')} className={sortBy === 'name' ? "bg-primary/20" : ""}>
                      Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSort('recent')} className={sortBy === 'recent' ? "bg-primary/20" : ""}>
                      Most Recent
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardDescription>
              {filter === 'all' ? 'All' : filter === 'apps' ? 'App' : 'Browser tab'} activity during {selectedTimeFrame === 'daily' ? 'today' : selectedTimeFrame === 'weekly' ? 'the past week' : 'the past month'}. 
              Showing {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-muted-foreground">Loading your activities...</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground mb-4">No activities found for this time period.</p>
                <Button variant="outline" onClick={handleRefresh}>Refresh Data</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Badge variant={activity.type === 'App' ? 'default' : 'secondary'} className="flex w-16 items-center justify-center">
                          {activity.type === 'App' ? (
                            <><Monitor className="h-3 w-3 mr-1" /> App</>
                          ) : (
                            <><Globe className="h-3 w-3 mr-1" /> Tab</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{activity.name}</div>
                        {activity.type === 'Tab' && activity.domain && (
                          <div className="text-xs text-muted-foreground">{activity.domain}</div>
                        )}
                      </TableCell>
                      <TableCell>{activity.formattedDuration}</TableCell>
                      <TableCell className="text-right">{activity.formattedTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Stats Card */}
        {!isLoading && filteredActivities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Insights</CardTitle>
              <CardDescription>Key statistics about your app and browsing habits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Most Used App
                  </div>
                  <div className="font-semibold">
                    {activities
                      .filter(a => a.type === 'App')
                      .sort((a, b) => b.duration - a.duration)[0]?.name || 'None'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activities
                      .filter(a => a.type === 'App')
                      .sort((a, b) => b.duration - a.duration)[0]?.formattedDuration || '0m'}
                  </div>
                </div>
                
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Most Visited Website
                  </div>
                  <div className="font-semibold">
                    {activities
                      .filter(a => a.type === 'Tab')
                      .sort((a, b) => b.duration - a.duration)[0]?.name || 'None'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activities
                      .filter(a => a.type === 'Tab')
                      .sort((a, b) => b.duration - a.duration)[0]?.formattedDuration || '0m'}
                  </div>
                </div>
                
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Active Time
                  </div>
                  <div className="font-semibold">
                    {formatDuration(activities.reduce((sum, activity) => sum + activity.duration, 0))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Across {activities.length} activities
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Activities;
