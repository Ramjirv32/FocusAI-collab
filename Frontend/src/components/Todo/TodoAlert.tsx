import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  X, 
  CheckCircle2, 
  Calendar,
  AlertTriangle,
  Bell,
  Timer,
  Zap
} from 'lucide-react';
import { TodoAlert as TodoAlertType } from '@/services/todoAlertService';
import { todoService } from '@/services/todoService';
import { toast } from '@/hooks/use-toast';

interface TodoAlertProps {
  alert: TodoAlertType;
  onDismiss: () => void;
  onComplete: () => void;
  onSnooze: (minutes: number) => void;
}

const TodoAlert: React.FC<TodoAlertProps> = ({ alert, onDismiss, onComplete, onSnooze }) => {
  const [timeRemaining, setTimeRemaining] = useState(10); // 10 second auto-dismiss timer
  const [isVisible, setIsVisible] = useState(true);

  const { todo, minutesUntilDue, severity } = alert;

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDismiss]);

  const handleComplete = async () => {
    try {
      await todoService.updateTodo(todo._id, { completed: true });
      toast({
        title: 'Task Completed! 🎉',
        description: `"${todo.title}" has been marked as completed.`,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to complete todo:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete task',
        variant: 'destructive'
      });
    }
  };

  const handleSnooze = (minutes: number) => {
    onSnooze(minutes);
    toast({
      title: '⏰ Task Snoozed',
      description: `"${todo.title}" reminder snoozed for ${minutes} minutes.`,
    });
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bgColor: 'bg-red-600',
          borderColor: 'border-red-800',
          icon: <AlertTriangle className="h-8 w-8 text-white animate-pulse" />,
          title: '🚨 URGENT TASK DUE!',
          urgencyText: 'CRITICAL - Due in',
          buttonColor: 'bg-white text-red-600 hover:bg-red-100'
        };
      case 'urgent':
        return {
          bgColor: 'bg-orange-500',
          borderColor: 'border-orange-700',
          icon: <Timer className="h-8 w-8 text-white" />,
          title: '⚠️ Task Due Soon!',
          urgencyText: 'URGENT - Due in',
          buttonColor: 'bg-white text-orange-600 hover:bg-orange-100'
        };
      default:
        return {
          bgColor: 'bg-yellow-500',
          borderColor: 'border-yellow-600',
          icon: <Bell className="h-8 w-8 text-white" />,
          title: '🔔 Upcoming Task',
          urgencyText: 'Due in',
          buttonColor: 'bg-white text-yellow-700 hover:bg-yellow-100'
        };
    }
  };

  const config = getSeverityConfig(severity);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-75" />
      
      {/* Alert Content */}
      <div className={`relative w-full max-w-2xl p-8 rounded-xl shadow-2xl ${config.bgColor} ${config.borderColor} border-4 text-white transform transition-all duration-300 scale-100`}>
        
        {/* Timer Display */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black bg-opacity-30 rounded-full px-3 py-1">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-bold">{timeRemaining}s</span>
        </div>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-16 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          {/* Icon */}
          <div className="mb-6">
            {config.icon}
          </div>
          
          {/* Title */}
          <h2 className="text-3xl font-bold mb-4">
            {config.title}
          </h2>
          
          {/* Task Info */}
          <div className="mb-6 space-y-2">
            <p className="text-xl font-semibold">"{todo.title}"</p>
            {todo.description && (
              <p className="text-lg opacity-90">"{todo.description}"</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-4">
              <Badge className={`text-lg px-4 py-2 ${config.buttonColor.split(' ')[0]} text-current`}>
                {config.urgencyText} {minutesUntilDue} minute{minutesUntilDue !== 1 ? 's' : ''}
              </Badge>
              {todo.priority === 'high' && (
                <Badge variant="destructive" className="text-sm">
                  <Zap className="h-3 w-3 mr-1" />
                  High Priority
                </Badge>
              )}
            </div>
          </div>
          
          {/* Due Date Info */}
          <div className="mb-8 p-4 bg-black bg-opacity-20 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              <span>Due: {new Date(todo.dueDate!).toLocaleString()}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col space-y-4">
            {/* Primary Actions */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleComplete}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold ${config.buttonColor} transition-colors duration-200`}
              >
                <CheckCircle2 className="h-5 w-5" />
                Mark as Complete
              </button>
              
              <button
                onClick={onDismiss}
                className={`px-6 py-3 rounded-lg font-bold ${config.buttonColor} transition-colors duration-200`}
              >
                I'm working on it
              </button>
            </div>
            
            {/* Snooze Options */}
            <div className="flex gap-2 justify-center text-sm">
              <span className="opacity-80">Snooze for:</span>
              <button
                onClick={() => handleSnooze(5)}
                className="underline hover:no-underline opacity-80 hover:opacity-100"
              >
                5 min
              </button>
              <span className="opacity-60">•</span>
              <button
                onClick={() => handleSnooze(10)}
                className="underline hover:no-underline opacity-80 hover:opacity-100"
              >
                10 min
              </button>
              <span className="opacity-60">•</span>
              <button
                onClick={() => handleSnooze(15)}
                className="underline hover:no-underline opacity-80 hover:opacity-100"
              >
                15 min
              </button>
            </div>
          </div>

          {/* Tips based on urgency */}
          {severity === 'critical' && (
            <div className="mt-6 p-4 bg-black bg-opacity-20 rounded-lg text-sm">
              <p className="font-semibold mb-2">💡 Quick Tips:</p>
              <ul className="text-left max-w-md mx-auto space-y-1 opacity-90">
                <li>• Drop everything and focus on this task</li>
                <li>• Set a timer and work intensely</li>
                <li>• Minimize all distractions</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoAlert;