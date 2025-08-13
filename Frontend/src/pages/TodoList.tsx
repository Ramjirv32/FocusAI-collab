import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Filter,
  ListTodo,
  Clock,
  AlertTriangle,
  List,
  CalendarDays,
  Bell,
  BellOff
} from 'lucide-react';
import { todoService, Todo, CreateTodoData, TodoStats } from '@/services/todoService';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import TodoCalendar from '@/components/Todo/TodoCalendar';
import TodoAlert from '@/components/Todo/TodoAlert';
import { useTodoAlerts } from '@/hooks/useTodoAlerts';

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');

  // Todo Alert System
  const { 
    currentAlert, 
    isMonitoring, 
    dismissAlert, 
    completeTask, 
    snoozeAlert,
    startMonitoring,
    stopMonitoring,
    triggerCheck
  } = useTodoAlerts();

  // Form state
  const [newTodo, setNewTodo] = useState<CreateTodoData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    dueDate: ''
  });

  // Load todos and stats
  const loadTodos = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};
      if (filter === 'completed') {
        filterParams.completed = true;
      } else if (filter === 'pending') {
        filterParams.completed = false;
      } else if (filter === 'overdue') {
        filterParams.overdue = true;
      }
      
      if (priorityFilter !== 'all') {
        filterParams.priority = priorityFilter;
      }

      const [todosData, statsData] = await Promise.all([
        todoService.getTodos(filterParams),
        todoService.getTodoStats()
      ]);

      setTodos(todosData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load todos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load todos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [filter, priorityFilter]);

  // Create todo
  const handleCreateTodo = async () => {
    if (!newTodo.title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a title for your todo',
        variant: 'destructive'
      });
      return;
    }

    try {
      const todoData = {
        ...newTodo,
        dueDate: newTodo.dueDate || undefined
      };
      
      await todoService.createTodo(todoData);
      setIsCreateDialogOpen(false);
      setNewTodo({
        title: '',
        description: '',
        priority: 'medium',
        category: 'general',
        dueDate: ''
      });
      loadTodos();
      toast({
        title: 'Success',
        description: 'Todo created successfully'
      });
    } catch (error) {
      console.error('Failed to create todo:', error);
      toast({
        title: 'Error',
        description: 'Failed to create todo',
        variant: 'destructive'
      });
    }
  };

  // Toggle todo completion
  const toggleTodoCompletion = async (todo: Todo) => {
    try {
      await todoService.updateTodo(todo._id, {
        completed: !todo.completed
      });
      loadTodos();
      toast({
        title: 'Success',
        description: `Todo ${todo.completed ? 'unmarked' : 'completed'}`
      });
    } catch (error) {
      console.error('Failed to update todo:', error);
      toast({
        title: 'Error',
        description: 'Failed to update todo',
        variant: 'destructive'
      });
    }
  };

  // Delete todo
  const deleteTodo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      await todoService.deleteTodo(id);
      loadTodos();
      toast({
        title: 'Success',
        description: 'Todo deleted successfully'
      });
    } catch (error) {
      console.error('Failed to delete todo:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete todo',
        variant: 'destructive'
      });
    }
  };

  // Handle alert completion
  const handleAlertComplete = () => {
    completeTask();
    loadTodos(); // Refresh the todo list
  };

  // Toggle alert monitoring
  const toggleAlertMonitoring = () => {
    if (isMonitoring) {
      stopMonitoring();
      toast({
        title: 'Alerts Disabled',
        description: 'Todo due time alerts have been disabled',
      });
    } else {
      startMonitoring();
      toast({
        title: 'Alerts Enabled',
        description: 'You will receive alerts for tasks due within 15 minutes',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const isOverdue = (todo: Todo) => {
    if (!todo.dueDate || todo.completed) return false;
    return new Date(todo.dueDate) < new Date();
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <DashboardLayout>
      {/* Todo Alert Modal */}
      {currentAlert && (
        <TodoAlert
          alert={currentAlert}
          onDismiss={dismissAlert}
          onComplete={handleAlertComplete}
          onSnooze={snoozeAlert}
        />
      )}

      <div className={`container mx-auto p-6 space-y-6 ${currentAlert ? 'pointer-events-none opacity-50' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ListTodo className="h-8 w-8 text-primary" />
              Todo List
            </h1>
            <p className="text-muted-foreground">Manage your tasks and stay productive</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Alert Status Toggle */}
            <Button
              variant={isMonitoring ? "default" : "outline"}
              size="sm"
              onClick={toggleAlertMonitoring}
              className="flex items-center gap-2"
            >
              {isMonitoring ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {isMonitoring ? 'Alerts On' : 'Alerts Off'}
            </Button>

            {/* Test Alert Button (for development/testing) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerCheck}
              className="text-muted-foreground"
              title="Check for upcoming tasks"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Todo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Todo</DialogTitle>
                  <DialogDescription>
                    Add a new task to your todo list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter todo title..."
                      value={newTodo.title}
                      onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter todo description..."
                      value={newTodo.description}
                      onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select 
                        value={newTodo.priority} 
                        onValueChange={(value: any) => setNewTodo({ ...newTodo, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        placeholder="Category"
                        value={newTodo.category}
                        onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={newTodo.dueDate}
                      onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateTodo} className="flex-1">
                      Create Todo
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Alert Status Info */}
        {isMonitoring && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-800">
            <Bell className="h-4 w-4" />
            <span>Todo alerts are active - you'll receive notifications for tasks due within 15 minutes</span>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.dueToday}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Todo List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">Loading todos...</div>
              ) : todos.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No todos found</h3>
                    <p className="text-muted-foreground">Create your first todo to get started</p>
                  </CardContent>
                </Card>
              ) : (
                todos.map((todo) => (
                  <Card key={todo._id} className={`${todo.completed ? 'opacity-60' : ''} ${isOverdue(todo) ? 'border-red-200 bg-red-50/50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTodoCompletion(todo)}
                          className="mt-1"
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className={`font-medium ${todo.completed ? 'line-through' : ''}`}>
                              {todo.title}
                            </h3>
                            <Badge variant={getPriorityColor(todo.priority)} className="text-xs">
                              {getPriorityIcon(todo.priority)}
                              {todo.priority}
                            </Badge>
                            {todo.category !== 'general' && (
                              <Badge variant="outline" className="text-xs">
                                {todo.category}
                              </Badge>
                            )}
                            {isOverdue(todo) && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Overdue
                              </Badge>
                            )}
                          </div>
                          {todo.description && (
                            <p className={`text-sm text-muted-foreground ${todo.completed ? 'line-through' : ''}`}>
                              {todo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Created {new Date(todo.createdAt).toLocaleDateString()}</span>
                            {todo.dueDate && (
                              <span className={`flex items-center gap-1 ${isOverdue(todo) ? 'text-red-600 font-medium' : ''}`}>
                                <Clock className="h-3 w-3" />
                                Due {formatDueDate(todo.dueDate)}
                              </span>
                            )}
                            {todo.completedAt && (
                              <span>Completed {new Date(todo.completedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTodo(todo._id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <TodoCalendar onTodoSelect={(todo) => {
              // Handle todo selection from calendar if needed
              console.log('Selected todo from calendar:', todo);
            }} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TodoList;