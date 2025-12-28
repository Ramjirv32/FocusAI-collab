import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CalendarProps {
  data?: Array<{
    date: string;
    score: number;
  }>;
}

const MonthlyCalendar: React.FC<CalendarProps> = ({ data = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get number of days in month
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Check if year is leap year
  const isLeapYear = (year: number) => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  // Get score for a specific date
  const getScoreForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = data.find(d => d.date === dateStr);
    return dayData ? dayData.score : 0;
  };

  // Get color based on score
  const getColorClass = (score: number) => {
    if (score === 0) return 'bg-muted/30 text-muted-foreground';
    if (score < 30) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200';
    if (score < 50) return 'bg-amber-200 dark:bg-amber-700/40 text-amber-900 dark:text-amber-200';
    if (score < 70) return 'bg-emerald-200 dark:bg-emerald-700/40 text-emerald-900 dark:text-emerald-200';
    if (score < 85) return 'bg-emerald-500 dark:bg-emerald-600 text-white';
    return 'bg-emerald-700 dark:bg-emerald-500 text-white font-bold';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate stats for current month
  const totalActive = days.filter(day => getScoreForDate(day) > 0).length;
  const avgScore = data.length > 0 
    ? Math.round(days.reduce((sum, day) => sum + getScoreForDate(day), 0) / days.length)
    : 0;

  return (
    <Card className="border-primary/10 shadow-sm overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Monthly Calendar</CardTitle>
            <CardDescription>Track your daily focus score</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold min-w-[140px] text-center">{monthName}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {dayNames.map(day => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty days before month starts */}
            {emptyDays.map(i => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days of month */}
            {days.map(day => {
              const score = getScoreForDate(day);
              return (
                <div
                  key={day}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 cursor-help hover:ring-2 hover:ring-primary/50 ${getColorClass(score)}`}
                  title={`${monthName.split(' ')[0]} ${day}: Focus Score ${score}%`}
                >
                  <span className="text-xs sm:text-sm">{day}</span>
                  {score > 0 && (
                    <span className="text-[10px] sm:text-xs opacity-75">{score}%</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend and Stats */}
          <div className="space-y-3 pt-4 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-muted/30"></div>
                <span>Inactive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-orange-100"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-200"></div>
                <span>Good</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-700"></div>
                <span>Excellent</span>
              </div>
            </div>

            {/* Month Stats */}
            <div className="grid grid-cols-3 gap-2 text-center p-2 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xl font-bold text-primary">{daysInMonth}</div>
                <div className="text-xs text-muted-foreground">Days</div>
              </div>
              <div>
                <div className="text-xl font-bold text-emerald-600">{totalActive}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{avgScore}%</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
            </div>

            <p className="text-[11px] italic text-muted-foreground text-center">
              {isLeapYear(currentDate.getFullYear()) ? 'Leap Year' : ''} Keep your calendar filled to maintain focus!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyCalendar;
