import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import AIRecommendations from '@/components/FocusAnalysis/AIRecommendations';
import { useAuth } from '@/context/AuthContext';

const FocusAnalyticsPage = () => {
  const { user } = useAuth();
  const [focusData, setFocusData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState('daily');
  
  useEffect(() => {
    const fetchFocusData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Replace with your actual API endpoint
        const response = await fetch(`http://localhost:5000/api/focus/analytics?timeFrame=${timeFrame}&userId=${user.id}`);
        
        if (response.ok) {
          const data = await response.json();
          setFocusData(data);
        } else {
          console.error('Failed to fetch focus data');
          setFocusData(null);
        }
      } catch (error) {
        console.error('Error fetching focus data:', error);
        setFocusData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFocusData();
  }, [user, timeFrame]);
  
  // Check if we have actual focus data
  const hasData = focusData && focusData.focusPercentage !== undefined;
  
  // Sample data for demonstration
  const demoFocusData = {
    focusPercentage: 65,
    productiveApps: ['VS Code', 'Microsoft Word', 'Figma'],
    distractingApps: ['YouTube', 'Twitter', 'Instagram']
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Focus Analytics</h1>
        
        <Tabs value={timeFrame} onValueChange={setTimeFrame} className="mb-6">
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Focus metrics and charts would go here */}
          
          {/* AI Recommendations */}
          <div className="md:col-span-1">
            <AIRecommendations
              focusPercentage={hasData ? focusData.focusPercentage : demoFocusData.focusPercentage}
              productiveApps={hasData ? focusData.productiveApps : demoFocusData.productiveApps}
              distractingApps={hasData ? focusData.distractingApps : demoFocusData.distractingApps}
              hasData={hasData}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FocusAnalyticsPage;
