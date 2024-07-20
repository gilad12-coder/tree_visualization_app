import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

export const fetchFolderStructure = () => axios.get(`${API_BASE_URL}/folder_structure`);
export const fetchOrgData = (tableId) => axios.get(`${API_BASE_URL}/org-data?table_id=${tableId}`);
export const uploadFile = (formData) => axios.post(`${API_BASE_URL}/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});