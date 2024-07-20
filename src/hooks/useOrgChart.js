import { useState, useEffect, useCallback } from 'react';
import { fetchFolderStructure, fetchOrgData, uploadFile } from '../Utilities/api';

export const useOrgChart = () => {
  const [orgData, setOrgData] = useState(null);
  const [folderStructure, setFolderStructure] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasTables, setHasTables] = useState(false);

  const fetchFolderStructureData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchFolderStructure();
      setFolderStructure(response.data);
      setHasTables(response.data.length > 0);
    } catch (err) {
      console.error('Error fetching folder structure:', err);
      setError('Failed to fetch folder structure. Please try again later.');
    }
  }, []);

  useEffect(() => {
    fetchFolderStructureData();
  }, [fetchFolderStructureData]);

  useEffect(() => {
    if (selectedTableId) {
      setLoading(true);
      setError(null);
      fetchOrgData(selectedTableId)
        .then((response) => {
          setOrgData(response.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching org data:', err);
          setError('Failed to fetch organizational data. Please try again.');
          setLoading(false);
        });
    }
  }, [selectedTableId]);

  const handleFileUpload = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await uploadFile(formData);
      await fetchFolderStructureData();
      if (response.data.table_id) {
        setSelectedTableId(response.data.table_id);
      }
      return response.data;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    orgData,
    folderStructure,
    selectedTableId,
    loading,
    error,
    hasTables,
    setSelectedTableId,
    handleFileUpload,
    fetchFolderStructureData,
  };
};