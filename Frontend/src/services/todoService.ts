const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'; // Changed port to 5001

export interface Todo {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  highPriority: number;
}

export interface CreateTodoData {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  category?: string;
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  category?: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const todoService = {
  // Get all todos
  async getTodos(params?: { completed?: boolean; category?: string; priority?: string }): Promise<Todo[]> {
    const queryParams = new URLSearchParams();
    if (params?.completed !== undefined) queryParams.append('completed', params.completed.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.priority) queryParams.append('priority', params.priority);

    const response = await fetch(`${API_URL}/api/todos?${queryParams}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch todos');
    }

    const data = await response.json();
    return data.data;
  },

  // Create new todo
  async createTodo(todoData: CreateTodoData): Promise<Todo> {
    const response = await fetch(`${API_URL}/api/todos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(todoData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create todo');
    }

    const data = await response.json();
    return data.data;
  },

  // Update todo
  async updateTodo(id: string, updates: UpdateTodoData): Promise<Todo> {
    const response = await fetch(`${API_URL}/api/todos/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update todo');
    }

    const data = await response.json();
    return data.data;
  },

  // Delete todo
  async deleteTodo(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/todos/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete todo');
    }
  },

  // Get todo statistics
  async getTodoStats(): Promise<TodoStats> {
    const response = await fetch(`${API_URL}/api/todos/stats`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch todo statistics');
    }

    const data = await response.json();
    return data.data;
  }
};