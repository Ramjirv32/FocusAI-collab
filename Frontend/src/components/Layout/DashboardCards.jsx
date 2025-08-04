import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Brain,
  Target,
  Award,
  BarChart3,
  ArrowRight,
  Calendar,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MetricCard = ({ title, value, subtitle, trend, trendValue, icon: Icon, color = "blue" }) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    green: "text-green-600 bg-green-50 border-green-200", 
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200"
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          {trend && (
            <>
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                {trendValue}
              </span>
            </>
          )}
          <span>{subtitle}</span>
        </div>
      </CardContent>  
    </Card>
  );
};

const SessionChannelChart = ({ data }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Session by Channel
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="relative">
          <div className="flex items-center justify-center w-32 h-32 mx-auto">
            <div className="relative w-full h-full">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray="75.36 0"
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">75%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-muted-foreground">Desktop</span>
            <span className="ml-auto font-medium">45%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-muted-foreground">Mobile</span>
            <span className="ml-auto font-medium">30%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Web</span>
            <span className="ml-auto font-medium">25%</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const RecentEvents = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Activity className="h-5 w-5" />
        Recent Events
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">Focus session started</p>
            <p className="text-xs text-muted-foreground">2 minutes ago</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">Productivity goal achieved</p>
            <p className="text-xs text-muted-foreground">1 hour ago</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-500"></div>
          <div className="flex-1">
            <p className="text-sm font-medium">Weekly report generated</p>
            <p className="text-xs text-muted-foreground">3 hours ago</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const DeviceStats = () => (
  <Card>
    <CardHeader>
      <CardTitle>Device Stats</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Uptime</span>
          <span className="font-medium">98.5%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Last seen</span>
          <span className="font-medium">Online</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Memory Space</span>
          <span className="font-medium">67%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '67%' }}></div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SaleAnalytics = () => (
  <Card className="col-span-2">
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>Productivity Analytics</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Track your daily performance</p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Productive</span>
          <span className="font-semibold">22,370</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-300"></div>
          <span>Offline</span>
          <span className="font-semibold">2,456</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-400"></div>
          <span>On Leave</span>
          <span className="font-semibold">114</span>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-end justify-between gap-2">
        {/* Simple bar chart representation */}
        {[30, 45, 35, 50, 40, 60, 55, 70, 45, 65, 50, 75].map((height, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div 
              className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-sm min-h-[20px]"
              style={{ height: `${height}%` }}
            ></div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const DashboardCards = ({ focusStats, summary }) => {
  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Focus Time"
          value={focusStats?.totalFocusTime || "0h 0m"}
          subtitle="since last month"
          trend="up"
          trendValue="+2.5%"
          icon={Clock}
          color="blue"
        />
        <MetricCard
          title="Focus Score"
          value={`${focusStats?.focusScore || 0}%`}
          subtitle="current average"
          trend="up"
          trendValue="+5.2%"
          icon={Target}
          color="green"
        />
        <MetricCard
          title="Productivity Rating"
          value={`${Math.round((focusStats?.focusScore || 0) * 0.85)}%`}
          subtitle="this week"
          trend="down"
          trendValue="-1.2%"
          icon={Brain}
          color="purple"
        />
        <MetricCard
          title="Active Apps"
          value={summary?.totalApps || 0}
          subtitle="applications tracked"
          trend="up"
          trendValue="+3"
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SessionChannelChart />
        <RecentEvents />
        <DeviceStats />
      </div>

      {/* Analytics Chart */}
      <SaleAnalytics />
    </div>
  );
};

export default DashboardCards;
