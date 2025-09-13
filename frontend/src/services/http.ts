// /frontend/src/services/http.ts
import axios from 'axios';

// Send every axios request to /api/...
axios.defaults.baseURL = '/api';
axios.defaults.withCredentials = false; // keep or change if you use cookies
