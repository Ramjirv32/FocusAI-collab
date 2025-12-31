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
  subscribe(callback: (alert: TodoAlert) => void) {
    this.alertCallbacks.push(callback);
  }
  unsubscribe(callback: (alert: TodoAlert) => void) {
    this.alertCallbacks = this.alertCallbacks.filter(cb => cb !== callback);
  }
  startMonitoring() {
    if (this.checkInterval) return;
    console.log('🔔 Starting todo alert monitoring...');
    this.checkUpcomingTodos();
    this.checkInterval = setInterval(() => {
      this.checkUpcomingTodos();
    }, 60000);
  }
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🔕 Stopped todo alert monitoring');
    }
  }
  private async checkUpcomingTodos() {
    try {
      const todos = await todoService.getTodos({ completed: false });
      const now = new Date();
      for (const todo of todos) {
        if (!todo.dueDate) continue;
        const dueDate = new Date(todo.dueDate);
        const minutesUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60));
        if (minutesUntilDue > 0 && minutesUntilDue <= 15) {
          const alertKey = `${todo._id}-${Math.floor(minutesUntilDue / 5)}`;
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
            this.alertCallbacks.forEach(callback => callback(alert));
          }
        }
      }
      const currentAlerts = Array.from(this.lastCheckedTodos);
      this.lastCheckedTodos = new Set(currentAlerts.filter(alertKey => {
        return true;
      }));
    } catch (error) {
      console.error('❌ Error checking upcoming todos:', error);
    }
  }
  async triggerCheck() {
    await this.checkUpcomingTodos();
  }
  clearAlert(todoId: string) {
    const keysToRemove = Array.from(this.lastCheckedTodos)
      .filter(key => key.startsWith(todoId));
    keysToRemove.forEach(key => this.lastCheckedTodos.delete(key));
  }
}
export const todoAlertService = TodoAlertService.getInstance();
