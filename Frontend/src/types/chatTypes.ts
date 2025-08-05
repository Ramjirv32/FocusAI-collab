export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatHistory {
  sessionId: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}
