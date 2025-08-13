import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { todoService, Todo, CalendarTodos } from '@/services/todoService';
import { toast } from '@/hooks/use-toast';

interface TodoCalendarProps {
  onTodoSelect?: (todo: Todo) => void;
}

const TodoCalendar: React.FC<TodoCalendarProps> = ({ onTodoSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarTodos, setCalendarTodos] = useState<CalendarTodos>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const loadCalendarTodos = async () => {
    try {
      setLoading(true);
      const todos = await todoService.getTodosForCalendar(
        currentDate.getFullYear(),
        currentDate.getMonth()
      );
      console.log('Calendar todos loaded:', todos);
      setCalendarTodos(todos);
    } catch (error) {
      console.error('Failed to load calendar todos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar todos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarTodos();
  }, [currentDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, key: `empty-${i}` });
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, key: `day-${i}` });
    }

    return days;
  };

  const formatDateKey = (day: number) => {
    // Create date key in the same format as backend: YYYY-MM-DD
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${month}-${dayStr}`;
    console.log('Frontend date key for day', day, ':', dateKey);
    return dateKey;
  };

  const getTodosForDate = (day: number) => {
    const dateKey = formatDateKey(day);
    const todos = calendarTodos[dateKey] || [];
    console.log('Todos for', dateKey, ':', todos.length);
    return todos;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === currentDate.getMonth() &&
           today.getFullYear() === currentDate.getFullYear();
  };

  const isOverdue = (todo: Todo) => {
    if (!todo.dueDate || todo.completed) return false;
    return new Date(todo.dueDate) < new Date();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Debug Info - Remove this in production */}
      <div className="text-xs text-muted-foreground">
        Available dates: {Object.keys(calendarTodos).join(', ')}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map(({ day, key }) => {
              if (!day) {
                return <div key={key} className="h-24" />;
              }

              const todosForDay = getTodosForDate(day);
              const dateKey = formatDateKey(day);
              const isSelected = selectedDate === dateKey;
              const isTodayDate = isToday(day);

              return (
                <div
                  key={key}
                  className={`
                    h-24 p-2 border rounded-lg cursor-pointer transition-colors
                    ${isTodayDate ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted'}
                    ${isSelected ? 'bg-accent' : ''}
                    ${todosForDay.length > 0 ? 'border-blue-200' : ''}
                  `}
                  onClick={() => setSelectedDate(selectedDate === dateKey ? null : dateKey)}
                >
                  <div className={`text-sm font-medium ${isTodayDate ? 'text-primary' : ''}`}>
                    {day}
                    {todosForDay.length > 0 && (
                      <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-1">
                        {todosForDay.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1">
                    {todosForDay.slice(0, 2).map((todo) => (
                      <div
                        key={todo._id}
                        className="text-xs px-1 py-0.5 rounded truncate flex items-center gap-1"
                        style={{ backgroundColor: `${getPriorityColor(todo.priority)}20` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTodoSelect?.(todo);
                        }}
                      >
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
                        <span className={`flex-1 truncate ${todo.completed ? 'line-through opacity-60' : ''}`}>
                          {todo.title}
                        </span>
                        {isOverdue(todo) && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    ))}
                    {todosForDay.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{todosForDay.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && calendarTodos[selectedDate] && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Tasks for {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {calendarTodos[selectedDate].map((todo) => (
                <div
                  key={todo._id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => onTodoSelect?.(todo)}
                >
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(todo.priority)}`} />
                  <div className="flex-1">
                    <div className={`font-medium ${todo.completed ? 'line-through opacity-60' : ''}`}>
                      {todo.title}
                    </div>
                    {todo.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {todo.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={todo.priority === 'high' ? 'destructive' : 'default'}>
                      {todo.priority}
                    </Badge>
                    {todo.dueDate && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(todo.dueDate).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    )}
                    {isOverdue(todo) && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TodoCalendar;