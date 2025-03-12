import { useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = "http://localhost:5001";

const useDataFetching = (
  dbPath, 
  selectedTableId, 
  selectedFolderId,
  setIsLoading,
  setError,
  setFolderStructure,
  setOrgData,
  setFilteredOrgData,
  setRegularModePosition,
  setOrgModePosition
) => {
  const fetchData = useCallback(async () => {
    if (!dbPath || !selectedTableId) return;

    setIsLoading(true);
    setError(null);
    // Reset mode-specific positions when loading completely new data
    setRegularModePosition(null);
    setOrgModePosition(null);

    try {
      const [folderResponse, orgDataResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/folder_structure`, { params: { db_path: dbPath } }),
        axios.get(`${API_BASE_URL}/org_data`, { params: { table_id: selectedTableId, db_path: dbPath } }),
      ]);

      setFolderStructure(folderResponse.data);

      if (orgDataResponse.data.log) {
        const blob = new Blob([JSON.stringify(orgDataResponse.data.log, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'parsing_log.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.warning("Parsing encountered issues. The log has been downloaded for your review.");
      }

      setOrgData(orgDataResponse.data.org_chart);
      setFilteredOrgData(orgDataResponse.data.org_chart);
      // Return the data so we can use it for centering in the component
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
      setFolderStructure([]);
      setOrgData(null);
      setFilteredOrgData(null);

      if (error.response?.data?.log) {
        const blob = new Blob([JSON.stringify(error.response.data.log, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'error_log.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.error("An error occurred. The error log has been downloaded for your review.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [dbPath, selectedTableId, setIsLoading, setError, setFolderStructure, setOrgData, setFilteredOrgData, setRegularModePosition, setOrgModePosition]);

  const fetchOrgStructureData = useCallback(async (tableId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/org_structure_data/${tableId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching organization structure data:", error);
      toast.error("Failed to fetch organization data. Please try again.");
      return null;
    }
  }, []);

  const handleExportExcel = useCallback(() => {
    axios({
      url: `${API_BASE_URL}/export_excel/${selectedTableId}`,
      method: 'GET',
      responseType: 'blob',
    }).then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `org_data_table_${selectedTableId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Excel file downloaded successfully");
    }).catch((error) => {
      console.error("Error exporting Excel:", error);
      toast.error("Failed to export as Excel. Please try again.");
    });
  }, [selectedTableId]);

  const handleHighlight = useCallback(async (hierarchicalNodeStructure, highlightedNodes, setHighlightedNodes) => {
    try {
      if (highlightedNodes.includes(hierarchicalNodeStructure)) {
        setHighlightedNodes([]);
      } else {
        const response = await axios.get(`${API_BASE_URL}/highlight_nodes`, {
          params: {
            hierarchical_structure: hierarchicalNodeStructure,
            table_id: selectedTableId,
          },
        });
        setHighlightedNodes(response.data.highlighted_nodes);
      }
    } catch (error) {
      console.error("Error fetching highlighted nodes:", error);
      setHighlightedNodes([]);
    }
  }, [selectedTableId]);

  return {
    fetchData,
    fetchOrgStructureData,
    handleExportExcel,
    handleHighlight,
    API_BASE_URL
  };
};

export default useDataFetching;
