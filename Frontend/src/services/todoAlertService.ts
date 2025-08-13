import { todoService, Todo } from './todoService';

export interface TodoAlert {
  todo: Todo;
  minutesUntilDue: number;
  severity: 'warning' | 'urgent' | 'critical';
}

export class TodoAlertService {
  private static instance: TodoAlertService;
  private alertCallbacks: ((alert: TodoAlert) => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckedTodos: Set<string> = new Set();
  
  static getInstance(): TodoAlertService {
    if (!TodoAlertService.instance) {
      TodoAlertService.instance = new TodoAlertService();
    }
    return TodoAlertService.instance;
  }

  // Subscribe to todo alerts
  subscribe(callback: (alert: TodoAlert) => void) {
    this.alertCallbacks.push(callback);
  }

  // Unsubscribe from todo alerts
  unsubscribe(callback: (alert: TodoAlert) => void) {
    this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
  }

  // Start monitoring todos
  startMonitoring() {
    if (this.checkInterval) return;
    
    console.log('🔔 Starting todo alert monitoring...');
    
    // Check immediately
    this.checkUpcomingTodos();
    
    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkUpcomingTodos();
    }, 60000); // Check every minute
  }

  // Stop monitoring todos
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🔕 Stopped todo alert monitoring');
    }
  }

  // Check for upcoming todos
  private async checkUpcomingTodos() {
    try {
      const todos = await todoService.getTodos({ completed: false });
      const now = new Date();
      
      for (const todo of todos) {
        if (!todo.dueDate) continue;
        
        const dueDate = new Date(todo.dueDate);
        const minutesUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60));
        
        // Only alert for tasks due in the next 15 minutes
        if (minutesUntilDue > 0 && minutesUntilDue <= 15) {
          // Don't show the same alert twice
          const alertKey = `${todo._id}-${Math.floor(minutesUntilDue / 5)}`; // Group by 5-minute intervals
          
          if (!this.lastCheckedTodos.has(alertKey)) {
            this.lastCheckedTodos.add(alertKey);
            
            const severity: 'warning' | 'urgent' | 'critical' = 
              minutesUntilDue <= 5 ? 'critical' :
              minutesUntilDue <= 10 ? 'urgent' : 'warning';
            
            const alert: TodoAlert = {
              todo,
              minutesUntilDue,
              severity
            };
            
            console.log(`🚨 Todo Alert: "${todo.title}" due in ${minutesUntilDue} minutes`);
            
            // Notify all subscribers
            this.alertCallbacks.forEach(callback => callback(alert));
          }
        }
      }
      
      // Clean up old alerts (remove alerts older than 20 minutes)
      const currentAlerts = Array.from(this.lastCheckedTodos);
      this.lastCheckedTodos = new Set(currentAlerts.filter(alertKey => {
        // Keep recent alerts, this is a simple cleanup
        return true; // We could implement more sophisticated cleanup logic
      }));
      
    } catch (error) {
      console.error('❌ Error checking upcoming todos:', error);
    }
  }

  // Manually trigger a check (useful for testing)
  async triggerCheck() {
    await this.checkUpcomingTodos();
  }

  // Clear specific todo alert
  clearAlert(todoId: string) {
    const keysToRemove = Array.from(this.lastCheckedTodos)
      .filter(key => key.startsWith(todoId));
    keysToRemove.forEach(key => this.lastCheckedTodos.delete(key));
  }
}

export const todoAlertService = TodoAlertService.getInstance();