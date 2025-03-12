import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

const useModeHandlers = (
  fetchOrgStructureData,
  processOrganizationData,
  selectedTableId,
  setExpandAll,
  filteredOrgData
) => {
  const [isHierarchyMode, setIsHierarchyMode] = useState(false);
  const [isOrganizationMode, setIsOrganizationMode] = useState(false);
  const [hideVacancies, setHideVacancies] = useState(false);
  const [hierarchyModeData, setHierarchyModeData] = useState(null);
  const [organizationModeData, setOrganizationModeData] = useState(null);

  const handleOrganizationMode = useCallback(() => {
    setIsOrganizationMode((prevMode) => {
      const newMode = !prevMode;
      
      if (newMode) {
        // Don't reset positions, just load org data
        
        fetchOrgStructureData(selectedTableId)
          .then(data => {
            if (data) {
              const processedOrgData = processOrganizationData(data);
              setOrganizationModeData(processedOrgData);
              setExpandAll(true);
              // No automatic centering - user must click center button
            } else {
              toast.error("Failed to load organization data");
              setIsOrganizationMode(false);
            }
          })
          .catch(error => {
            console.error("Error in organization mode:", error);
            toast.error("Failed to load organization view");
            setIsOrganizationMode(false);
          });
      }
      
      if (isHierarchyMode) {
        setIsHierarchyMode(false);
      }
      
      // Provide feedback when toggling organization mode
      if (newMode) {
        toast.info("Switched to Organization Mode");
      } else {
        toast.info("Exited Organization Mode");
      }
      
      return newMode;
    });
  }, [
    fetchOrgStructureData, 
    processOrganizationData, 
    selectedTableId, 
    isHierarchyMode, 
    setExpandAll
  ]);

  const handleHierarchyMode = useCallback(() => {
    setIsHierarchyMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        // Don't reset position when switching to hierarchy mode
        
        const processHierarchyMode = (node) => {
          if (!node) return null;
          const newNode = { ...node };

          if (node.children && node.children.length > 0) {
            newNode.children = node.children.map(processHierarchyMode).filter(Boolean);
          }

          return node.children && node.children.length > 0 ? newNode : null;
        };

        const hierarchyTree = processHierarchyMode(filteredOrgData);
        
        if (hierarchyTree) {
          setHierarchyModeData(hierarchyTree);
        } else {
          setHierarchyModeData(filteredOrgData);
          toast.warning("No hierarchical structure to display in Hierarchy Mode. Showing full tree.");
        }
        
        // No automatic centering - user must click center button
      }
      
      if (isOrganizationMode) {
        setIsOrganizationMode(false);
      }
      
      // Provide feedback when toggling hierarchy mode
      if (newMode) {
        toast.info("Switched to Hierarchy Mode");
      } else {
        toast.info("Exited Hierarchy Mode");
      }
      
      return newMode;
    });
  }, [filteredOrgData, isOrganizationMode]);

  const handleToggleVacancies = useCallback(() => {
    setHideVacancies(prev => {
      const newValue = !prev;
      toast.info(newValue ? "Vacancies hidden" : "Vacancies visible");
      return newValue;
    });
  }, []);

  return {
    isHierarchyMode,
    setIsHierarchyMode,
    isOrganizationMode,
    setIsOrganizationMode,
    hideVacancies,
    setHideVacancies,
    hierarchyModeData,
    setHierarchyModeData,
    organizationModeData,
    setOrganizationModeData,
    handleOrganizationMode,
    handleHierarchyMode,
    handleToggleVacancies
  };
};

export default useModeHandlers;
