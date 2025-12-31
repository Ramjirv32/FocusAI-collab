import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface HeatmapData {
  date: string;
  score: number;
}

interface LeetCodeStyleHeatmapProps {
  data?: HeatmapData[];
  title?: string;
  description?: string;
}

const LeetCodeStyleHeatmap: React.FC<LeetCodeStyleHeatmapProps> = ({
  data = [],
  title = 'Focus Activity Heatmap',
  description = 'Your 1-year contribution graph'
}) => {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), 0, 1);
  });

  const getDayOfWeek = (date: Date) => date.getDay();

  const getWeekNumber = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + getDayOfWeek(firstDay)) / 7);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getScoreForDate = (date: Date) => {
    const dateStr = formatDate(date);
    const dayData = data.find(d => d.date === dateStr);
    return dayData ? dayData.score : 0;
  };

  const getColorClass = (score: number) => {
    if (score === 0) return 'bg-slate-200 dark:bg-slate-700';
    if (score < 20) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (score < 40) return 'bg-emerald-200 dark:bg-emerald-800/50';
    if (score < 60) return 'bg-emerald-300 dark:bg-emerald-700/70';
    if (score < 80) return 'bg-emerald-400 dark:bg-emerald-600/90';
    return 'bg-emerald-500 dark:bg-emerald-500';
  };


  // Correctly organize days into weeks where each day aligns with its day of the week (Sun-Sat)
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = Array(7).fill(null);

  const tempDate = new Date(startDate);
  tempDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 366; i++) {
    const dayOfWeek = tempDate.getDay();
    currentWeek[dayOfWeek] = new Date(tempDate);

    if (dayOfWeek === 6) {
      weeks.push([...currentWeek]);
      currentWeek = Array(7).fill(null);
    }

    const nextDate = new Date(tempDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Handle end of year
    if (nextDate.getFullYear() !== startDate.getFullYear()) {
      if (dayOfWeek !== 6) {
        weeks.push([...currentWeek]);
      }
      break;
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthStarts: { [key: number]: number } = {};
  let lastMonth = -1;
  weeks.forEach((week, weekIndex) => {
    // Find first non-null date in week to determine the month
    const firstValidDate = week.find(d => d !== null);
    if (firstValidDate) {
      const month = firstValidDate.getMonth();
      if (month !== lastMonth) {
        monthStarts[weekIndex] = month;
        lastMonth = month;
      }
    }
  });

  const totalActive = data.filter(d => d.score > 0).length;
  const avgScore = data.length > 0
    ? Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length)
    : 0;
  const maxScore = data.length > 0
    ? Math.max(...data.map(d => d.score))
    : 0;

  const handlePreviousYear = () => {
    const newDate = new Date(startDate);
    newDate.setFullYear(newDate.getFullYear() - 1);
    setStartDate(newDate);
  };

  const handleNextYear = () => {
    const newDate = new Date(startDate);
    newDate.setFullYear(newDate.getFullYear() + 1);
    setStartDate(newDate);
  };

  const year = startDate.getFullYear();
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return (
    <Card className="w-full border-primary/10 shadow-sm overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousYear}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">{year}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextYear}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        { }
        <div className="overflow-x-auto pb-4">
          <div className="min-w-fit">
            { }
            <div className="flex ml-8 mb-2">
              {weeks.map((week, weekIndex) => (
                <div
                  key={`month-${weekIndex}`}
                  className={`text-[10px] text-muted-foreground ${monthStarts[weekIndex] !== undefined ? 'w-12' : 'w-4'
                    }`}
                >
                  {monthStarts[weekIndex] !== undefined
                    ? monthLabels[monthStarts[weekIndex]]
                    : ''}
                </div>
              ))}
            </div>

            { }
            <div className="flex gap-1">
              { }
              <div className="flex flex-col justify-between pr-2">
                {dayLabels.map((day, idx) => (
                  <div
                    key={day}
                    className="h-4 text-[10px] text-muted-foreground flex items-center"
                  >
                    {idx % 2 === 0 ? day : ''}
                  </div>
                ))}
              </div>

              { }
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => {
                  const isNewMonth = monthStarts[weekIndex] !== undefined;
                  return (
                    <div
                      key={`week-${weekIndex}`}
                      className={`flex flex-col gap-1 ${isNewMonth ? 'pl-2' : ''}`}
                    >
                      {week.map((date, dayIndex) => {
                        if (!date) {
                          return (
                            <div
                              key={`empty-${weekIndex}-${dayIndex}`}
                              className="h-4 w-4 bg-transparent"
                            />
                          );
                        }

                        const score = getScoreForDate(date);
                        const colorClass = getColorClass(score);
                        const dateStr = formatDate(date);
                        const now = new Date();
                        const today = formatDate(now);
                        const isToday = dateStr === today;

                        const monthName = date.toLocaleString('en-US', { month: 'short' });
                        const day = date.getDate();
                        const tooltipText = `${monthName} ${day}: Focus Score ${score}%${isToday ? ' (Today)' : ''}`;

                        return (
                          <div
                            key={dateStr}
                            className={`h-4 w-4 rounded-sm transition-all duration-200 cursor-help hover:ring-2 hover:ring-emerald-500 hover:scale-125 ${colorClass} ${isToday ? 'ring-2 ring-yellow-400 dark:ring-yellow-300 shadow-md' : ''
                              }`}
                            title={tooltipText}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        { }
        <div className="space-y-4 border-t pt-4">
          { }
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1 items-center">
              <div className="h-3 w-3 rounded-sm bg-slate-200 dark:bg-slate-700"></div>
              <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-800"></div>
              <div className="h-3 w-3 rounded-sm bg-emerald-300 dark:bg-emerald-700"></div>
              <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-600"></div>
              <div className="h-3 w-3 rounded-sm bg-emerald-500 dark:bg-emerald-500"></div>
              <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-400"></div>
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>

          { }
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-primary">{totalActive}</div>
              <div className="text-xs text-muted-foreground">active days</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium text-muted-foreground">Avg</div>
              <div className="text-2xl font-bold text-blue-600">{avgScore}%</div>
              <div className="text-xs text-muted-foreground">average score</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium text-muted-foreground">Max</div>
              <div className="text-2xl font-bold text-emerald-600">{maxScore}%</div>
              <div className="text-xs text-muted-foreground">best score</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium text-muted-foreground">Period</div>
              <div className="text-xl font-bold text-primary">365</div>
              <div className="text-xs text-muted-foreground">days shown</div>
            </div>
          </div>

          { }
          <p className="text-xs text-muted-foreground text-center italic">
            🔥 Darker green = more productive! Keep your contributions consistent throughout the year.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeetCodeStyleHeatmap;
