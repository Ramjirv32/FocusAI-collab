import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';

const COLORS = {
  focused: '#22c55e',
  distracted: '#ef4444'
};

const FocusDistractionsChart = ({ data = {}, isDemo = false }) => {
  // Process data to get top 5-6 apps
  const { chartData, focusTotal, distractionTotal } = useMemo(() => {
    if (isDemo || !data.productiveContent || !data.nonProductiveContent) {
      // Fallback to demo data if no data provided
      const demoData = [
        { name: "VS Code", duration: 3600, type: "Focused" },
        { name: "Chrome - DSA Tutorial", duration: 1800, type: "Focused" },
        { name: "Chrome - Memes", duration: 1200, type: "Distracted" },
        { name: "Instagram", duration: 900, type: "Distracted" },
        { name: "LeetCode", duration: 2400, type: "Focused" },
        { name: "Facebook", duration: 600, type: "Distracted" },
      ];
      
      const focusTotal = demoData
        .filter(item => item.type === "Focused")
        .reduce((sum, item) => sum + item.duration, 0);
        
      const distractionTotal = demoData
        .filter(item => item.type === "Distracted")
        .reduce((sum, item) => sum + item.duration, 0);
        
      return { chartData: demoData, focusTotal, distractionTotal };
    }

    // Process real data
    const productiveApps = Object.entries(data.productiveContent || {}).map(([name, duration]) => ({
      name: name || 'Unknown App',
      duration: Math.round(duration / 60), // Convert to minutes
      type: 'Focused'
    }));

    const distractingApps = Object.entries(data.nonProductiveContent || {}).map(([name, duration]) => ({
      name: name || 'Unknown App',
      duration: Math.round(duration / 60), // Convert to minutes
      type: 'Distracted'
    }));

    // Combine and sort by duration
    const allApps = [...productiveApps, ...distractingApps]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 6); // Get top 6 apps

    const focusTotal = productiveApps.reduce((sum, item) => sum + item.duration, 0);
    const distractionTotal = distractingApps.reduce((sum, item) => sum + item.duration, 0);

    return { chartData: allApps, focusTotal, distractionTotal };
  }, [data, isDemo]);

  // Prepare data for pie chart
  const pieData = [
    { name: 'Focused', value: focusTotal, color: COLORS.focused },
    { name: 'Distracted', value: distractionTotal, color: COLORS.distracted }
  ];

  // Format time from minutes to hours/minutes
  const formatTime = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Focus to distraction ratio percentage
  const totalTime = focusTotal + distractionTotal;
  const focusPercentage = totalTime > 0 ? Math.round((focusTotal / totalTime) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Focus vs Distraction Breakdown</CardTitle>
        <CardDescription>
          Analysis of your productive vs distracting activities
          {isDemo && <span className="text-yellow-500 ml-2">(Demo Data)</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="chart">Top Apps</TabsTrigger>
            <TabsTrigger value="pie">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h4 className="text-sm font-medium">Top Apps</h4>
                  <p className="text-xs text-muted-foreground">
                    Time spent on your most used applications
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Focus: {formatTime(focusTotal)}
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Distraction: {formatTime(distractionTotal)}
                  </Badge>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <XAxis 
                    type="number" 
                    tickFormatter={formatTime}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                  />
                  <Tooltip 
                    formatter={(value) => formatTime(value)}
                    labelFormatter={(value) => `${value}`}
                  />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Bar 
                    dataKey="duration" 
                    fill="#8884d8"
                    radius={[0, 4, 4, 0]}
                    animationDuration={1000}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.type === 'Focused' ? COLORS.focused : COLORS.distracted} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="pie">
            <div className="flex flex-col items-center">
              <h4 className="text-sm font-medium mb-2">Focus Distribution</h4>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatTime(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-2">
                <p className="text-sm text-muted-foreground">
                  You were focused for <span className="font-medium">{focusPercentage}%</span> of your time
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FocusDistractionsChart;