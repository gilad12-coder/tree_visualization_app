import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';

export const fetchFolderStructure = () => axios.get(`${API_BASE_URL}/folder_structure`);
export const fetchOrgData = (tableId) => axios.get(`${API_BASE_URL}/org-data?table_id=${tableId}`);
export const uploadFile = (formData) => axios.post(`${API_BASE_URL}/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const createTree = (treeName, nodes, folderName, dbPath) => axios.post(`${API_BASE_URL}/create-tree?db_path=${dbPath}`, { treeName, nodes, folderName });

// Node CRUD operations
export const addNode = (tableId, parentStructure, nodeData) =>
  axios.post(`${API_BASE_URL}/add_node/${tableId}`, {
    parent_structure: parentStructure,
    node_data: nodeData
  });

export const updateNode = (tableId, hierarchicalStructure, nodeData) =>
  axios.put(`${API_BASE_URL}/update_node/${tableId}`, {
    hierarchical_structure: hierarchicalStructure,
    node_data: nodeData
  });

export const deleteNode = (tableId, hierarchicalStructure) =>
  axios.delete(`${API_BASE_URL}/delete_node/${tableId}?hierarchical_structure=${encodeURIComponent(hierarchicalStructure)}`);

// Table colors and labels
export const getTableColors = (tableId) => axios.get(`${API_BASE_URL}/table/${tableId}/colors`);
export const saveTableColors = (tableId, colors) => axios.put(`${API_BASE_URL}/table/${tableId}/colors`, { colors });