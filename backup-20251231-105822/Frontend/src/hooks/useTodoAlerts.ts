import { useState, useEffect, useCallback } from 'react';
import { todoAlertService, TodoAlert } from '@/services/todoAlertService';
import { todoService } from '@/services/todoService';

export const useTodoAlerts = () => {
  const [currentAlert, setCurrentAlert] = useState<TodoAlert | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  
  const handleAlert = useCallback((alert: TodoAlert) => {
    console.log('📋 New todo alert received:', alert.todo.title, 'due in', alert.minutesUntilDue, 'minutes');
    setCurrentAlert(alert);
  }, []);

  
  const dismissAlert = useCallback(() => {
    if (currentAlert) {
      todoAlertService.clearAlert(currentAlert.todo._id);
    }
    setCurrentAlert(null);
  }, [currentAlert]);

  
  const completeTask = useCallback(async () => {
    if (currentAlert) {
      todoAlertService.clearAlert(currentAlert.todo._id);
      setCurrentAlert(null);
    }
  }, [currentAlert]);

  
  const snoozeAlert = useCallback(async (minutes: number) => {
    if (currentAlert) {
      try {
        
        const newDueDate = new Date(currentAlert.todo.dueDate!);
        newDueDate.setMinutes(newDueDate.getMinutes() + minutes);
        
        await todoService.updateTodo(currentAlert.todo._id, {
          dueDate: newDueDate.toISOString()
        });
        
        
        todoAlertService.clearAlert(currentAlert.todo._id);
        setCurrentAlert(null);
        
        console.log(`⏰ Todo snoozed for ${minutes} minutes:`, currentAlert.todo.title);
      } catch (error) {
        console.error('Failed to snooze todo:', error);
      }
    }
  }, [currentAlert]);

  
  const startMonitoring = useCallback(() => {
    if (!isMonitoring) {
      todoAlertService.subscribe(handleAlert);
      todoAlertService.startMonitoring();
      setIsMonitoring(true);
      console.log('✅ Todo alert monitoring started');
    }
  }, [isMonitoring, handleAlert]);

  
  const stopMonitoring = useCallback(() => {
    if (isMonitoring) {
      todoAlertService.unsubscribe(handleAlert);
      todoAlertService.stopMonitoring();
      setIsMonitoring(false);
      setCurrentAlert(null);
      console.log('❌ Todo alert monitoring stopped');
    }
  }, [isMonitoring, handleAlert]);

  
  const triggerCheck = useCallback(async () => {
    await todoAlertService.triggerCheck();
  }, []);

  
  useEffect(() => {
    startMonitoring();
    
    
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