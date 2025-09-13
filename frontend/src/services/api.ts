import axios from 'axios';

// For production (Vercel), use /api/ prefix which gets rewritten to AWS App Runner
// For local development, use the direct backend URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:5000');

export const api = axios.create({
  baseURL: API_BASE_URL,
}); 