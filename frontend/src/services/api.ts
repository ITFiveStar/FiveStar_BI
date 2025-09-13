import axios from 'axios';

// Get the API base URL from environment variables
// Fallback to local development URL if not set
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
}); 