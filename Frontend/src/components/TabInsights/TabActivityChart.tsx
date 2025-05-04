
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, Pie } from 'recharts';
import {
  ResponsiveContainer,
  BarChart,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { GroupedTabData } from '@/types';

interface TabActivityChartProps {
  data: GroupedTabData[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6384'];

const TabActivityChart: React.FC<TabActivityChartProps> = ({ data }) => {
  // Sort data for the bar chart by duration (descending)
  const sortedData = [...data].sort((a, b) => b.totalDuration - a.totalDuration).slice(0, 10);

  // Format time for tooltip
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow">
          <p className="font-bold">{payload[0].payload.label}</p>
          <p>Time: {formatTime(payload[0].value)}</p>
          <p>Visits: {payload[0].payload.count}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Time Spent by Domain</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
            >
              <XAxis 
                dataKey="label" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => formatTime(value)}
                width={80}
              />
              <Tooltip content={customTooltip} />
              <Legend />
              <Bar 
                dataKey="totalDuration" 
                name="Time Spent" 
                fill="#9b87f5"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Tab Activity Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.slice(0, 6)}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={130}
                innerRadius={60}
                paddingAngle={3}
                dataKey="count"
                nameKey="label"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.slice(0, 6).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name, props) => [`${value} visits`, props.payload.label]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TabActivityChart;
