import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

const useTransformHandlers = () => {
  const { t } = useTranslation();
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [initialRootPosition, setInitialRootPosition] = useState(null);
  const [regularModePosition, setRegularModePosition] = useState(null);
  const [orgModePosition, setOrgModePosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragRef = useRef(null);
  const chartRef = useRef(null);

  const findRootNodeElement = useCallback((isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData) => {
    // Determine the correct root node ID based on the mode
    const rootNodeId = isOrganizationMode
      ? `orgnode-${organizationModeData?.hierarchical_structure}`
      : isHierarchyMode
      ? `node-${hierarchyModeData?.hierarchical_structure}`
      : `node-${filteredOrgData?.hierarchical_structure}`;
      
    // Try to find the root element by ID
    let rootElement = document.getElementById(rootNodeId);
    
    // If not found, find the topmost node element
    if (!rootElement) {
      // Select all node elements, both tree nodes and org nodes
      const allNodes = document.querySelectorAll('[id^="node-"], [id^="orgnode-"]');
      if (allNodes.length > 0) {
        let highestElement = null;
        let highestY = Infinity;
        
        allNodes.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top < highestY) {
            highestY = rect.top;
            highestElement = el;
          }
        });
        
        rootElement = highestElement;
      }
    }
    
    return rootElement;
  }, []);

  // Modified function to store the initial position of the root node WITHOUT applying it
  const storeInitialRootPosition = useCallback((isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData) => {
    const rootElement = findRootNodeElement(isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData);
    
    if (rootElement && chartRef.current) {
      try {
        const rootRect = rootElement.getBoundingClientRect();
        const chartRect = chartRef.current.getBoundingClientRect();
        
        // Account for the navigation bar height
        const navBarHeight = 60;
        
        // Calculate center coordinates - adjust for different node types
        // The key fix: use the same centering logic regardless of node type
        const centerX = window.innerWidth / 2 - rootRect.width / 2;
        const centerY = (window.innerHeight - navBarHeight) / 2 - rootRect.height / 2 + navBarHeight;
        
        // Calculate the transform to center the root node
        const x = centerX - rootRect.left + chartRect.left;
        const y = centerY - rootRect.top + chartRect.top;
        
        // Store position for future use only, without applying it
        setInitialRootPosition({ x, y, scale: 1 });
        console.log("Stored initial position for " + (isOrganizationMode ? "OrgNode" : "TreeNode") + ":", { x, y, scale: 1 });
        
        // No longer automatically applying the transform here
      } catch (error) {
        console.error("Error calculating initial position:", error);
      }
    }
  }, [findRootNodeElement]);

  // Updated function to center the chart - using mode-specific positions
  const centerOnRoot = useCallback((isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData) => {
    // Use the appropriate stored position based on current mode
    const positionToUse = isOrganizationMode ? 
                         orgModePosition : 
                         regularModePosition || initialRootPosition;
    
    if (positionToUse && chartRef.current) {
      // Use the stored position
      chartRef.current.style.transition = 'transform 0.5s ease-out';
      setTransform(positionToUse);
      
      // Show a success notification when chart is centered
      toast.success(t('chartOperations.chartCentered'));
      
      // Reset transition after animation completes
      setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.style.transition = '';
        }
      }, 500);
    } else {
      // If position isn't stored yet, calculate and store it
      storeInitialRootPosition(isOrganizationMode, isHierarchyMode, organizationModeData, hierarchyModeData, filteredOrgData);
      
      // Then use it (after a slight delay to allow state to update)
      setTimeout(() => {
        if (initialRootPosition && chartRef.current) {
          chartRef.current.style.transition = 'transform 0.5s ease-out';
          setTransform(initialRootPosition);
          
          // Store in the mode-specific state
          if (isOrganizationMode) {
            setOrgModePosition(initialRootPosition);
          } else {
            setRegularModePosition(initialRootPosition);
          }
          
          setTimeout(() => {
            if (chartRef.current) {
              chartRef.current.style.transition = '';
            }
          }, 500);
        }
      }, 50);
    }
  }, [initialRootPosition, orgModePosition, regularModePosition, storeInitialRootPosition, t]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleFactor = 1 - e.deltaY * 0.001;
    setTransform(prev => {
      const newScale = Math.max(0.1, Math.min(3, prev.scale * scaleFactor));
      const scaleDiff = newScale - prev.scale;
      const mouseX = e.clientX - dragRef.current.offsetLeft;
      const mouseY = e.clientY - dragRef.current.offsetTop;
      const newX = prev.x - (mouseX - prev.x) * (scaleDiff / prev.scale);
      const newY = prev.y - (mouseY - prev.y) * (scaleDiff / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  return {
    transform,
    setTransform,
    initialRootPosition,
    setInitialRootPosition,
    regularModePosition,
    setRegularModePosition,
    orgModePosition,
    setOrgModePosition,
    isDragging,
    setIsDragging,
    dragRef,
    chartRef,
    findRootNodeElement,
    storeInitialRootPosition,
    centerOnRoot,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  };
};

export default useTransformHandlers;
