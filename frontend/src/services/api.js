import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const startSession = async (candidateName) => {
  const response = await api.post('/proctor/start-session', { candidateName });
  return response.data;
};

export const endSession = async (sessionId) => {
  const response = await api.post(`/proctor/end-session/${sessionId}`);
  return response.data;
};

export const logEvent = async (eventData) => {
  const response = await api.post('/proctor/log-event', eventData);
  return response.data;
};

export const uploadVideo = async (sessionId, videoBlob) => {
  const formData = new FormData();
  formData.append('video', videoBlob);

  const response = await api.post(`/proctor/upload-video/${sessionId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const getSessionReport = async (sessionId) => {
  const response = await api.get(`/report/session/${sessionId}`);
  return response.data;
};

export const downloadPDFReport = async (sessionId) => {
  const response = await api.get(`/report/pdf/${sessionId}`, {
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `report-${sessionId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const downloadCSVReport = async (sessionId) => {
  const response = await api.get(`/report/csv/${sessionId}`, {
    responseType: 'blob'
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `report-${sessionId}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};