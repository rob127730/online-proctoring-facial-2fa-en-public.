import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== AUTH ==========

export const login = async (matricule, password) => {
  const response = await api.post('/api/auth/login', { matricule, password });
  return response.data;
};

export const verifyFace = async (matricule, imageFile, tempToken) => {
  const formData = new FormData();
  formData.append('matricule', matricule);
  formData.append('image', imageFile);

  const response = await api.post('/api/auth/face-verify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${tempToken}`,
    },
  });
  return response.data;
};

// ========== INSCRIPTION ÉTUDIANT ==========

export const registerStudent = async (matricule, password, name, imageFile) => {
  const formData = new FormData();
  formData.append('matricule', matricule);
  formData.append('password', password);
  formData.append('name', name);
  formData.append('image', imageFile);

  const response = await api.post('/api/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ========== UTILISATEURS (ADMIN) ==========

export const getUsers = async () => {
  const response = await api.get('/api/users');
  return response.data;
};

export const deleteUser = async (matricule) => {
  const response = await api.delete(`/api/users/${matricule}`);
  return response.data;
};

export const updateUser = async (matricule, name, password) => {
  const formData = new FormData();
  if (name) formData.append('name', name);
  if (password) formData.append('password', password);

  const response = await api.put(`/api/users/${matricule}`, formData);
  return response.data;
};

export const updateUserFace = async (matricule, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await api.put(`/api/users/${matricule}/face`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// ========== VALIDATION DES COMPTES (ADMIN) ==========

export const getPendingUsers = async () => {
  const response = await api.get('/api/users/pending');
  return response.data;
};

export const validateAccount = async (matricule, action) => {
  const formData = new FormData();
  formData.append('action', action);

  const response = await api.put(`/api/users/${matricule}/validate`, formData);
  return response.data;
};

// ========== MONITORING ==========

export const startSession = async (matricule) => {
  const response = await api.post('/api/monitoring/start', { matricule });
  return response.data;
};

export const analyzeFrame = async (sessionId, timestamp, frameBlob) => {
  const formData = new FormData();
  formData.append('session_id', sessionId);
  formData.append('timestamp', timestamp);
  formData.append('frame', frameBlob, 'frame.jpg');

  const response = await api.post('/api/monitoring/analyze-frame', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const endSession = async (sessionId) => {
  const response = await api.post('/api/monitoring/end', { session_id: sessionId });
  return response.data;
};

export const getUserSessions = async (matricule) => {
  const response = await api.get(`/api/monitoring/sessions/${matricule}`);
  return response.data;
};

// ========== DASHBOARDS ==========

export const getStudentDashboard = async (matricule) => {
  const response = await api.get(`/api/dashboard/student/${matricule}`);
  return response.data;
};

export const getAdminDashboard = async () => {
  const response = await api.get('/api/dashboard/admin');
  return response.data;
};

export default api;