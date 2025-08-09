import React from 'react';
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

const FocusDistractionsChart = ({ data = [] }) => {
  // If no data is provided, use demo data
  const chartData = data.length > 0 ? data : [
    { name: "VS Code", duration: 3600, type: "Focused" },
    { name: "Chrome - DSA Tutorial", duration: 1800, type: "Focused" },
    { name: "Chrome - Memes", duration: 1200, type: "Distracted" },
    { name: "Instagram", duration: 900, type: "Distracted" },
    { name: "LeetCode", duration: 2400, type: "Focused" },
    { name: "Facebook", duration: 600, type: "Distracted" },
    { name: "Slack", duration: 1500, type: "Focused" }
  ];

  // Calculate totals for focus vs distraction
  const focusTotal = chartData
    .filter(item => item.type === "Focused")
    .reduce((sum, item) => sum + item.duration, 0);
    
  const distractionTotal = chartData
    .filter(item => item.type === "Distracted")
    .reduce((sum, item) => sum + item.duration, 0);
  
  // Prepare data for pie chart
  const pieData = [
    { name: 'Focused', value: focusTotal, color: COLORS.focused },
    { name: 'Distracted', value: distractionTotal, color: COLORS.distracted }
  ];

  // Format time from seconds to hours/minutes
  const formatTime = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Focus to distraction ratio percentage
  const focusPercentage = Math.round((focusTotal / (focusTotal + distractionTotal || 1)) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Focus vs Distraction Breakdown</CardTitle>
        <CardDescription>
          Analysis of your productive vs distracting activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="chart">Bar Chart</TabsTrigger>
            <TabsTrigger value="pie">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h4 className="text-sm font-medium">Activity Breakdown</h4>
                  <p className="text-xs text-muted-foreground">
                    Time spent on focused vs distracting activities
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
                  <XAxis type="number" tickFormatter={formatTime} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150}
                    tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                  />
                  <Tooltip 
                    formatter={(value) => formatTime(value)}
                    labelFormatter={(label) => `Activity: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="duration" 
                    name="Duration" 
                    fill="#8884d8"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.type === "Focused" ? COLORS.focused : COLORS.distracted}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="pie">
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold">{focusPercentage}%</h3>
                <p className="text-sm text-muted-foreground">Focus Ratio</p>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatTime(value)} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 rounded-full" style={{backgroundColor: COLORS.focused}}></div>
                  <span className="text-xs">Focus</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-1 rounded-full" style={{backgroundColor: COLORS.distracted}}></div>
                  <span className="text-xs">Distraction</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FocusDistractionsChart;