import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

// Helper function to get auth headers
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchGamificationData = async () => {
  try {
    const headers = getAuthHeader();
    const response = await axios.get(`${API_URL}/gamification/data`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    throw error;
  }
};

export const fetchAchievements = async () => {
  try {
    const headers = getAuthHeader();
    const response = await axios.get(`${API_URL}/gamification/achievements`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    throw error;
  }
};

export const fetchChallenges = async () => {
  try {
    const headers = getAuthHeader();
    const response = await axios.get(`${API_URL}/gamification/challenges`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching challenges:', error);
    throw error;
  }
};

export const completeChallenge = async (challengeId) => {
  try {
    const headers = getAuthHeader();
    const response = await axios.post(`${API_URL}/gamification/challenges/${challengeId}/complete`, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Error completing challenge:', error);
    throw error;
  }
};

export const fetchLeaderboard = async (timeFrame = 'weekly', limit = 10) => {
  try {
    const headers = getAuthHeader();
    const response = await axios.get(`${API_URL}/leaderboard`, {
      headers,
      params: { timeFrame, limit }
    });
    return response.data.leaderboard || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};