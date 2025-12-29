// API Configuration
// This file centralizes all API endpoint configurations

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const AI_SERVER_URL = import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000';

export { API_BASE_URL, AI_SERVER_URL };
