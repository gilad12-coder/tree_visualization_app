import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const useModeHandlers = (
  fetchOrgStructureData,
  processOrganizationData,
  selectedTableId,
  setExpandAll,
  filteredOrgData
) => {
  const { t } = useTranslation();
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
              toast.error(t('chartOperations.failedToLoadOrgData'));
              setIsOrganizationMode(false);
            }
          })
          .catch(error => {
            console.error("Error in organization mode:", error);
            toast.error(t('chartOperations.failedToLoadOrgView'));
            setIsOrganizationMode(false);
          });
      }
      
      if (isHierarchyMode) {
        setIsHierarchyMode(false);
      }
      
      // Provide feedback when toggling organization mode
      if (newMode) {
        toast.info(t('chartOperations.switchedToOrgMode'));
      } else {
        toast.info(t('chartOperations.exitedOrgMode'));
      }
      
      return newMode;
    });
  }, [
    fetchOrgStructureData,
    processOrganizationData,
    selectedTableId,
    isHierarchyMode,
    setExpandAll,
    t
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
          toast.warning(t('chartOperations.noHierarchyStructure'));
        }
        
        // No automatic centering - user must click center button
      }
      
      if (isOrganizationMode) {
        setIsOrganizationMode(false);
      }
      
      // Provide feedback when toggling hierarchy mode
      if (newMode) {
        toast.info(t('chartOperations.switchedToHierarchyMode'));
      } else {
        toast.info(t('chartOperations.exitedHierarchyMode'));
      }
      
      return newMode;
    });
  }, [filteredOrgData, isOrganizationMode, t]);

  const handleToggleVacancies = useCallback(() => {
    setHideVacancies(prev => {
      const newValue = !prev;
      toast.info(newValue ? t('chartOperations.vacanciesHidden') : t('chartOperations.vacanciesVisible'));
      return newValue;
    });
  }, [t]);

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
