import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface AppUsageData {
  name: string;
  duration: number;
}

interface AppUsageChartProps {
  data: Record<string, number>;
}

const AppUsageChart: React.FC<AppUsageChartProps> = ({ data }) => {
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Transform object data to array format for the chart
  const chartData: AppUsageData[] = Object.entries(data)
    .map(([name, duration]) => ({ name, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 8); // Show top 8 apps

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>App Usage Today</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number"
              tickFormatter={(value) => formatDuration(value)}
            />
            <YAxis 
              dataKey="name" 
              type="category"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number) => [formatDuration(value), "Duration"]}
            />
            <Bar 
              dataKey="duration" 
              fill="#6366F1" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AppUsageChart;