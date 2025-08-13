import { useState, useEffect, useCallback } from 'react';
import { todoAlertService, TodoAlert } from '@/services/todoAlertService';
import { todoService } from '@/services/todoService';

export const useTodoAlerts = () => {
  const [currentAlert, setCurrentAlert] = useState<TodoAlert | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Handle new alert
  const handleAlert = useCallback((alert: TodoAlert) => {
    console.log('📋 New todo alert received:', alert.todo.title, 'due in', alert.minutesUntilDue, 'minutes');
    setCurrentAlert(alert);
  }, []);

  // Dismiss current alert
  const dismissAlert = useCallback(() => {
    if (currentAlert) {
      todoAlertService.clearAlert(currentAlert.todo._id);
    }
    setCurrentAlert(null);
  }, [currentAlert]);

  // Complete task and dismiss alert
  const completeTask = useCallback(async () => {
    if (currentAlert) {
      todoAlertService.clearAlert(currentAlert.todo._id);
      setCurrentAlert(null);
    }
  }, [currentAlert]);

  // Snooze alert
  const snoozeAlert = useCallback(async (minutes: number) => {
    if (currentAlert) {
      try {
        // Update the due date by adding snooze minutes
        const newDueDate = new Date(currentAlert.todo.dueDate!);
        newDueDate.setMinutes(newDueDate.getMinutes() + minutes);
        
        await todoService.updateTodo(currentAlert.todo._id, {
          dueDate: newDueDate.toISOString()
        });
        
        // Clear the alert
        todoAlertService.clearAlert(currentAlert.todo._id);
        setCurrentAlert(null);
        
        console.log(`⏰ Todo snoozed for ${minutes} minutes:`, currentAlert.todo.title);
      } catch (error) {
        console.error('Failed to snooze todo:', error);
      }
    }
  }, [currentAlert]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!isMonitoring) {
      todoAlertService.subscribe(handleAlert);
      todoAlertService.startMonitoring();
      setIsMonitoring(true);
      console.log('✅ Todo alert monitoring started');
    }
  }, [isMonitoring, handleAlert]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (isMonitoring) {
      todoAlertService.unsubscribe(handleAlert);
      todoAlertService.stopMonitoring();
      setIsMonitoring(false);
      setCurrentAlert(null);
      console.log('❌ Todo alert monitoring stopped');
    }
  }, [isMonitoring, handleAlert]);

  // Manual trigger (for testing)
  const triggerCheck = useCallback(async () => {
    await todoAlertService.triggerCheck();
  }, []);

  // Auto-start monitoring when hook is used
  useEffect(() => {
    startMonitoring();
    
    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  return {
    currentAlert,
    isMonitoring,
    dismissAlert,
    completeTask,
    snoozeAlert,
    startMonitoring,
    stopMonitoring,
    triggerCheck
  };
};