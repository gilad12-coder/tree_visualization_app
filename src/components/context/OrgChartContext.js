import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { updateRecentColors } from '../../Utilities/colorUtils';
import { getTableColors, saveTableColors } from '../../Utilities/api';

const OrgChartContext = createContext();

export const useOrgChartContext = () => useContext(OrgChartContext);

// Initial empty state for node colors
const INITIAL_NODE_COLORS = {
  levelColors: {},      // { depth: '#hex' }
  branchColors: {},     // { hierarchical_structure: '#hex' }
  nodeOverrides: {},    // { hierarchical_structure: '#hex' }
  recentColors: [],     // max 3 recent colors
  // Labels for color legend
  colorLabels: {
    level: {},          // { depth: 'label' }
    branch: {},         // { hierarchical_structure: 'label' }
    node: {}            // { hierarchical_structure: 'label' }
  },
  savedLabels: {}       // { '#hex': ['label1', 'label2', ...] } - max 5 per color
};

export const OrgChartProvider = ({ children }) => {
  const [showLanding, setShowLanding] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [expandAll, setExpandAll] = useState(false);
  const [nodeOrder, setNodeOrder] = useState({});
  const [selectedSwapNode, setSelectedSwapNode] = useState(null);
  const [nodeColors, setNodeColors] = useState(INITIAL_NODE_COLORS);
  const [currentTableId, setCurrentTableId] = useState(null);
  const saveTimeoutRef = useRef(null);

  // Helper to filter out null/undefined/empty values from an object
  const filterNullValues = (obj) => {
    if (!obj) return {};
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v != null && v !== '')
    );
  };

  // Load colors from API for a specific table
  const loadColorsFromAPI = useCallback(async (tableId) => {
    if (!tableId) return;

    try {
      const response = await getTableColors(tableId);
      const colors = response.data?.colors;

      if (colors) {
        // Sanitize loaded colors - filter out null/empty values from all objects
        const sanitizedColors = {
          levelColors: filterNullValues(colors.levelColors),
          branchColors: filterNullValues(colors.branchColors),
          nodeOverrides: filterNullValues(colors.nodeOverrides),
          recentColors: (colors.recentColors || []).filter(c => c != null),
          colorLabels: {
            level: filterNullValues(colors.colorLabels?.level),
            branch: filterNullValues(colors.colorLabels?.branch),
            node: filterNullValues(colors.colorLabels?.node)
          },
          savedLabels: colors.savedLabels || {}
        };
        setNodeColors(sanitizedColors);
      } else {
        // No colors saved for this table, reset to defaults
        setNodeColors(INITIAL_NODE_COLORS);
      }
      setCurrentTableId(tableId);
    } catch (error) {
      console.error('Failed to load colors from API:', error);
      // Fallback to defaults on error
      setNodeColors(INITIAL_NODE_COLORS);
    }
  }, []);

  // Save colors to API for the current table (debounced)
  const saveColorsToAPI = useCallback(async (tableId, colorsToSave) => {
    if (!tableId) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveTableColors(tableId, colorsToSave);
        console.log('Colors saved to database for table', tableId);
      } catch (error) {
        console.error('Failed to save colors to API:', error);
      }
    }, 1000);
  }, []);

  // Auto-save colors when they change (if we have a current table)
  useEffect(() => {
    if (currentTableId && nodeColors !== INITIAL_NODE_COLORS) {
      saveColorsToAPI(currentTableId, nodeColors);
    }
  }, [nodeColors, currentTableId, saveColorsToAPI]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load node order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('orgChartNodeOrder');
    if (savedOrder) {
      setNodeOrder(JSON.parse(savedOrder));
    }
  }, []);

  // Save node order to localStorage
  useEffect(() => {
    localStorage.setItem('orgChartNodeOrder', JSON.stringify(nodeOrder));
  }, [nodeOrder]);

  // Color application functions with optional label support
  const applyNodeColor = useCallback((hierarchicalStructure, color, label = '') => {
    setNodeColors(prev => {
      const newOverrides = { ...prev.nodeOverrides };
      const newNodeLabels = { ...(prev.colorLabels?.node || {}) };

      if (color) {
        newOverrides[hierarchicalStructure] = color;
        newNodeLabels[hierarchicalStructure] = label;
      } else {
        // Delete entry when removing (not set to null)
        delete newOverrides[hierarchicalStructure];
        delete newNodeLabels[hierarchicalStructure];
      }

      return {
        ...prev,
        nodeOverrides: newOverrides,
        colorLabels: {
          ...prev.colorLabels,
          node: newNodeLabels
        },
        recentColors: updateRecentColors(prev.recentColors, color)
      };
    });
  }, []);

  const applyLevelColor = useCallback((depth, color, label = '') => {
    setNodeColors(prev => {
      const newLevelColors = { ...prev.levelColors };
      const newLevelLabels = { ...(prev.colorLabels?.level || {}) };

      if (color) {
        newLevelColors[depth] = color;
        newLevelLabels[depth] = label;
      } else {
        // Delete entry when removing (not set to null)
        delete newLevelColors[depth];
        delete newLevelLabels[depth];
      }

      return {
        ...prev,
        levelColors: newLevelColors,
        colorLabels: {
          ...prev.colorLabels,
          level: newLevelLabels
        },
        recentColors: updateRecentColors(prev.recentColors, color)
      };
    });
  }, []);

  const applyBranchColor = useCallback((hierarchicalStructure, color, label = '') => {
    setNodeColors(prev => {
      const newBranchColors = { ...prev.branchColors };
      const newBranchLabels = { ...(prev.colorLabels?.branch || {}) };

      if (color) {
        newBranchColors[hierarchicalStructure] = color;
        newBranchLabels[hierarchicalStructure] = label;
      } else {
        // Delete entry when removing (not set to null)
        delete newBranchColors[hierarchicalStructure];
        delete newBranchLabels[hierarchicalStructure];
      }

      return {
        ...prev,
        branchColors: newBranchColors,
        colorLabels: {
          ...prev.colorLabels,
          branch: newBranchLabels
        },
        recentColors: updateRecentColors(prev.recentColors, color)
      };
    });
  }, []);

  const removeNodeColor = useCallback((hierarchicalStructure) => {
    setNodeColors(prev => {
      const newOverrides = { ...prev.nodeOverrides };
      const newBranch = { ...prev.branchColors };
      const newNodeLabels = { ...(prev.colorLabels?.node || {}) };
      const newBranchLabels = { ...(prev.colorLabels?.branch || {}) };

      delete newOverrides[hierarchicalStructure];
      delete newBranch[hierarchicalStructure];
      delete newNodeLabels[hierarchicalStructure];
      delete newBranchLabels[hierarchicalStructure];

      return {
        ...prev,
        nodeOverrides: newOverrides,
        branchColors: newBranch,
        colorLabels: {
          ...prev.colorLabels,
          node: newNodeLabels,
          branch: newBranchLabels
        }
      };
    });
  }, []);

  // Remove branch colors + node overrides for a node and all its descendants
  const removeBranchColors = useCallback((hierarchicalStructure) => {
    setNodeColors(prev => {
      const newOverrides = { ...prev.nodeOverrides };
      const newBranch = { ...prev.branchColors };
      const newNodeLabels = { ...(prev.colorLabels?.node || {}) };
      const newBranchLabels = { ...(prev.colorLabels?.branch || {}) };

      // Remove all entries that match this node or are descendants (start with this path + /)
      Object.keys(newOverrides).forEach(key => {
        if (key === hierarchicalStructure || key.startsWith(hierarchicalStructure + '/')) {
          delete newOverrides[key];
          delete newNodeLabels[key];
        }
      });

      Object.keys(newBranch).forEach(key => {
        if (key === hierarchicalStructure || key.startsWith(hierarchicalStructure + '/')) {
          delete newBranch[key];
          delete newBranchLabels[key];
        }
      });

      return {
        ...prev,
        nodeOverrides: newOverrides,
        branchColors: newBranch,
        colorLabels: {
          ...prev.colorLabels,
          node: newNodeLabels,
          branch: newBranchLabels
        }
      };
    });
  }, []);

  // Remove level color AND all branch/node colors for the branch at that level
  // This ensures "Remove Level" truly clears all colors
  const removeLevelColors = useCallback((depth, hierarchicalStructure) => {
    setNodeColors(prev => {
      const newLevelColors = { ...prev.levelColors };
      const newBranchColors = { ...prev.branchColors };
      const newOverrides = { ...prev.nodeOverrides };
      const newLevelLabels = { ...(prev.colorLabels?.level || {}) };
      const newBranchLabels = { ...(prev.colorLabels?.branch || {}) };
      const newNodeLabels = { ...(prev.colorLabels?.node || {}) };

      // Remove the level color
      delete newLevelColors[depth];
      delete newLevelLabels[depth];

      // Also remove branch colors for this node and descendants
      Object.keys(newBranchColors).forEach(key => {
        if (key === hierarchicalStructure || key.startsWith(hierarchicalStructure + '/')) {
          delete newBranchColors[key];
          delete newBranchLabels[key];
        }
      });

      // Also remove node overrides for this node and descendants
      Object.keys(newOverrides).forEach(key => {
        if (key === hierarchicalStructure || key.startsWith(hierarchicalStructure + '/')) {
          delete newOverrides[key];
          delete newNodeLabels[key];
        }
      });

      return {
        ...prev,
        levelColors: newLevelColors,
        branchColors: newBranchColors,
        nodeOverrides: newOverrides,
        colorLabels: {
          ...prev.colorLabels,
          level: newLevelLabels,
          branch: newBranchLabels,
          node: newNodeLabels
        }
      };
    });
  }, []);

  const resetAllColors = useCallback(() => {
    setNodeColors(INITIAL_NODE_COLORS);
  }, []);

  // Save a label for a color for future reuse (max 5 per color)
  const saveLabelForColor = useCallback((color, label) => {
    if (!label?.trim()) return;

    setNodeColors(prev => {
      const colorKey = color.toLowerCase();
      const existingLabels = prev.savedLabels?.[colorKey] || [];

      // Don't add duplicates
      if (existingLabels.includes(label.trim())) return prev;

      // Keep max 5 labels per color
      const newLabels = [label.trim(), ...existingLabels].slice(0, 5);

      return {
        ...prev,
        savedLabels: {
          ...prev.savedLabels,
          [colorKey]: newLabels
        }
      };
    });
  }, []);

  // Get saved labels for a specific color
  const getSavedLabelsForColor = useCallback((color) => {
    if (!color) return [];
    return nodeColors.savedLabels?.[color.toLowerCase()] || [];
  }, [nodeColors.savedLabels]);

  // Delete a saved label for a specific color
  const deleteSavedLabel = useCallback((color, labelToDelete) => {
    if (!color || !labelToDelete) return;

    setNodeColors(prev => {
      const colorKey = color.toLowerCase();
      const existingLabels = prev.savedLabels?.[colorKey] || [];
      const newLabels = existingLabels.filter(label => label !== labelToDelete);

      // If no labels left, remove the color key entirely
      if (newLabels.length === 0) {
        const { [colorKey]: _, ...restLabels } = prev.savedLabels || {};
        return {
          ...prev,
          savedLabels: restLabels
        };
      }

      return {
        ...prev,
        savedLabels: {
          ...prev.savedLabels,
          [colorKey]: newLabels
        }
      };
    });
  }, []);

  // Get all legend entries (for ColorLegend component)
  const getLegendEntries = useCallback(() => {
    const entries = [];
    const { levelColors = {}, branchColors = {}, nodeOverrides = {}, colorLabels = {} } = nodeColors;

    // Level colors
    Object.entries(levelColors).forEach(([depth, color]) => {
      if (color) {
        entries.push({
          id: `level-${depth}`,
          type: 'level',
          key: depth,  // The depth number
          color,
          label: colorLabels.level?.[depth] || ''
        });
      }
    });

    // Branch colors
    Object.entries(branchColors).forEach(([structure, color]) => {
      if (color) {
        entries.push({
          id: `branch-${structure}`,
          type: 'branch',
          key: structure,  // The hierarchical structure
          color,
          label: colorLabels.branch?.[structure] || ''
        });
      }
    });

    // Node overrides
    Object.entries(nodeOverrides).forEach(([structure, color]) => {
      if (color) {
        entries.push({
          id: `node-${structure}`,
          type: 'node',
          key: structure,  // The hierarchical structure
          color,
          label: colorLabels.node?.[structure] || ''
        });
      }
    });

    return entries;
  }, [nodeColors]);

  // Update just the label for an existing color entry
  const updateLabel = useCallback((type, key, newLabel) => {
    setNodeColors(prev => {
      const trimmedLabel = newLabel?.trim() || '';
      return {
        ...prev,
        colorLabels: {
          ...prev.colorLabels,
          [type]: {
            ...(prev.colorLabels?.[type] || {}),
            [key]: trimmedLabel
          }
        }
      };
    });
  }, []);

  const handleSelectForSwap = (node) => setSelectedSwapNode(node);
  const handleCancelSwap = () => setSelectedSwapNode(null);

  const handleSwapNodes = (parentId, node1Id, node2Id) => {
    setNodeOrder(prevOrder => {
      const currentOrder = prevOrder[parentId] || [];
      const index1 = currentOrder.indexOf(node1Id);
      const index2 = currentOrder.indexOf(node2Id);
      const newOrder = [...currentOrder];

      if (index1 === -1) newOrder.push(node1Id);
      if (index2 === -1) newOrder.push(node2Id);

      const updatedIndex1 = newOrder.indexOf(node1Id);
      const updatedIndex2 = newOrder.indexOf(node2Id);
      [newOrder[updatedIndex1], newOrder[updatedIndex2]] = [newOrder[updatedIndex2], newOrder[updatedIndex1]];

      setSelectedSwapNode(null);
      return { ...prevOrder, [parentId]: newOrder };
    });
  };

  const handleReorderNodes = (parentId, nodeId, direction) => {
    setNodeOrder(prevOrder => {
      const currentOrder = prevOrder[parentId] || [];
      const currentIndex = currentOrder.indexOf(nodeId);

      if (currentIndex === -1) {
        return { ...prevOrder, [parentId]: [...currentOrder, nodeId] };
      }

      const newIndex = direction === 'up' ? Math.max(0, currentIndex - 1) : Math.min(currentOrder.length - 1, currentIndex + 1);
      if (newIndex === currentIndex) return prevOrder;

      const newOrder = [...currentOrder];
      newOrder.splice(currentIndex, 1);
      newOrder.splice(newIndex, 0, nodeId);

      return { ...prevOrder, [parentId]: newOrder };
    });
  };

  const value = {
    showLanding,
    setShowLanding,
    activeFilters,
    setActiveFilters,
    expandAll,
    setExpandAll,
    nodeOrder,
    setNodeOrder,
    handleReorderNodes,
    selectedSwapNode,
    handleSelectForSwap,
    handleSwapNodes,
    handleCancelSwap,
    // Node colors
    nodeColors,
    setNodeColors,
    applyNodeColor,
    applyLevelColor,
    applyBranchColor,
    removeNodeColor,
    removeBranchColors,
    removeLevelColors,
    resetAllColors,
    loadColorsFromAPI,
    // Label management for legend
    saveLabelForColor,
    getSavedLabelsForColor,
    deleteSavedLabel,
    getLegendEntries,
    updateLabel
  };

  return (
    <OrgChartContext.Provider value={value}>
      {children}
    </OrgChartContext.Provider>
  );
};

export default OrgChartContext;