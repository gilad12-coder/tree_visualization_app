import React, { useState, useEffect, useCallback, useRef} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, List, Target, Home, Menu, Upload } from "react-feather";
import axios from "axios";
import FilterModal from "./FilterModal";
import TreeNode from "./TreeNode";
import EnhancedNodeCard from "./EnhancedNodeCard";
import Button from "./Button";
import FileUploadModal from "./FileUploadModal";
import TableSelectionModal from "./TableSelectionModal";
import ComparisonDashboard from "./ComparisonDashboard";
import SettingsModal from "./SettingsModal";
import HelpModal from "./HelpModal";
import ToolbarMenu from "./ToolbarMenu";
import { useKeyboardShortcut } from "../Utilities/KeyboardShortcuts";
import { useOrgChartContext } from "./OrgChartContext";

const API_BASE_URL = "http://localhost:5000";

const OrgChart = ({
  dbPath,
  initialTableId,
  initialFolderId,
  onReturnToLanding,
}) => {
  const { activeFilters, setActiveFilters } = useOrgChartContext();

  const [orgData, setOrgData] = useState(null);
  const [filteredOrgData, setFilteredOrgData] = useState(null);
  const [folderStructure, setFolderStructure] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [initialTransform, setInitialTransform] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [collapseAll, setCollapseAll] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(initialTableId);
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [isComparisonLoading, setIsComparisonLoading] = useState(false);
  const [comparisonTableSelected, setComparisonTableSelected] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [settings, setSettings] = useState({
    moveAmount: 30,
    zoomAmount: 0.1,
  });

  const dragRef = useRef(null);
  const chartRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!dbPath || !selectedTableId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [folderResponse, orgDataResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/folder_structure`, {
          params: { db_path: dbPath },
        }),
        axios.get(`${API_BASE_URL}/org_data`, {
          params: { table_id: selectedTableId, db_path: dbPath },
        }),
      ]);

      setFolderStructure(folderResponse.data);
      setOrgData(orgDataResponse.data);
      setFilteredOrgData(orgDataResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
      setFolderStructure([]);
      setOrgData(null);
      setFilteredOrgData(null);
    } finally {
      setIsLoading(false);
    }
  }, [dbPath, selectedTableId]);

  const filterOrgData = useCallback((node, filters) => {
    const matchesFilter = (n) => {
        if (filters.length === 0) return true;
        return filters.every(filter => {
            const value = n[filter.type];
            return value !== null && value.toString().toLowerCase().includes(filter.value.toLowerCase());
        });
    };

    const filterNode = (n, depth = 0, matchDepth = -1) => {
        if (!n) return { node: null, matchDepth: -1 };

        const currentNodeMatch = matchesFilter(n);
        const newNode = { ...n };

        if (currentNodeMatch) {
            // If this node matches, we've found our target depth
            matchDepth = depth;
            // Include all children of the matching node
            if (n.children) {
                newNode.children = n.children.map(child => ({ ...child, children: child.children }));
            }
            return { node: newNode, matchDepth };
        }

        if (n.children) {
            const childResults = n.children.map(child => filterNode(child, depth + 1, matchDepth));
            const newMatchDepth = childResults.reduce((max, result) => Math.max(max, result.matchDepth), matchDepth);

            if (newMatchDepth !== -1) {
                // We found a match in a descendant
                if (depth === newMatchDepth - 1) {
                    // This is the parent of the matching node, include all children
                    newNode.children = n.children.map(child => {
                        const childResult = childResults.find(result => result.node && result.node.name === child.name);
                        return childResult ? childResult.node : { ...child, children: null };
                    });
                } else {
                    // This is an ancestor, only include the path to the match
                    newNode.children = childResults
                        .filter(result => result.node !== null)
                        .map(result => result.node);
                }
                return { node: newNode, matchDepth: newMatchDepth };
            }
        }

        return { node: null, matchDepth: -1 };
    };

    const result = filterNode(node);
    return result.node;
}, []);

useEffect(() => {
    if (orgData) {
        const filtered = activeFilters.length > 0 ? filterOrgData(orgData, activeFilters) : orgData;
        setFilteredOrgData(filtered);
        setExpandAll(activeFilters.length > 0);
    }
}, [orgData, activeFilters, filterOrgData]);

  const handleFileUpload = async (uploadedData) => {
    console.log("File uploaded:", uploadedData);
    setSelectedTableId(uploadedData.table_id);
    setSelectedFolderId(uploadedData.folder_id);
    await fetchData();
    setIsUploadOpen(false);
  };

  const fetchComparisonData = useCallback(
    async (table1Id, table2Id) => {
      setIsComparisonLoading(true);
      setError(null);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/compare_tables/${selectedFolderId}`,
          {
            params: {
              table1_id: table1Id,
              table2_id: table2Id,
              db_path: dbPath,
            },
          }
        );
        setComparisonData(response.data);
        setIsComparing(true);
      } catch (error) {
        console.error("Error fetching comparison data:", error);
        setError("Failed to fetch comparison data. Please try again.");
        setIsComparing(false);
      } finally {
        setIsComparisonLoading(false);
      }
    },
    [selectedFolderId, dbPath]
  );

  const handleTableSelection = useCallback(
    async (tableId, folderId) => {
      console.log("Table selected:", { tableId, folderId });
      if (isComparing) {
        setComparisonTableSelected(true);
        await fetchComparisonData(selectedTableId, tableId);
      } else {
        setSelectedTableId(tableId);
        setSelectedFolderId(folderId);
        await fetchData();
      }
      setIsTableSelectionOpen(false);
    },
    [fetchData, isComparing, selectedTableId, fetchComparisonData]
  );

  const handleNodeClick = useCallback(
    (node) => {
      console.log("Node clicked:", node);
      setSelectedNode((prevNode) => ({
        ...node,
        folderId: selectedFolderId,
        tableId: selectedTableId,
      }));
    },
    [selectedFolderId, selectedTableId]
  );

  const handleFilterChange = useCallback(
    (filters) => {
      console.log("Filters changed:", filters);
      setActiveFilters(filters);
      setIsFilterOpen(false);
    },
    [setActiveFilters]
  );

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        setTransform((prev) => ({
          ...prev,
          x: prev.x + e.movementX,
          y: prev.y + e.movementY,
        }));
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleFactor = 1 - e.deltaY * 0.001;
    setTransform((prev) => {
      const newScale = Math.max(0.1, Math.min(3, prev.scale * scaleFactor));
      const scaleDiff = newScale - prev.scale;
      const mouseX = e.clientX - dragRef.current.offsetLeft;
      const mouseY = e.clientY - dragRef.current.offsetTop;
      const newX = prev.x - (mouseX - prev.x) * (scaleDiff / prev.scale);
      const newY = prev.y - (mouseY - prev.y) * (scaleDiff / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  }, []);

  const toggleFilterModal = useCallback(() => {
    setIsFilterOpen((prev) => !prev);
  }, []);

  const toggleHelpModal = useCallback(() => {
    setIsHelpOpen((prev) => !prev);
  }, []);

  const toggleToolbarMenu = useCallback(() => {
    setIsToolbarMenuOpen((prev) => !prev);
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setCollapseAll(false);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setCollapseAll(true);
    setTimeout(() => setCollapseAll(false), 100);
  }, []);

  const handleCenter = useCallback(() => {
    if (initialTransform) {
      setTransform(initialTransform);
    }
  }, [initialTransform]);

  const handleHome = useCallback(() => {
    setSelectedNode(null);
    handleCenter();
    onReturnToLanding();
  }, [handleCenter, onReturnToLanding]);

  const handleCompare = useCallback(() => {
    if (selectedFolderId) {
      setIsComparing(true);
      setComparisonTableSelected(false);
      setIsTableSelectionOpen(true);
    } else {
      console.log("Please select a folder before comparing tables");
    }
  }, [selectedFolderId]);

  const handleCloseTableSelection = useCallback(() => {
    setIsTableSelectionOpen(false);
    if (isComparing && !comparisonTableSelected) {
      setIsComparing(false);
      setComparisonData(null);
    }
  }, [isComparing, comparisonTableSelected]);

  const handleCloseComparison = useCallback(() => {
    setIsComparing(false);
    setComparisonData(null);
    setComparisonTableSelected(false);
  }, []);

  const handleHighlight = useCallback(
    async (nodeName) => {
      try {
        if (highlightedNodes.includes(nodeName)) {
          setHighlightedNodes([]);
        } else {
          const response = await axios.get(`${API_BASE_URL}/highlight_nodes`, {
            params: {
              node_name: nodeName,
              table_id: selectedTableId,
            },
          });
          setHighlightedNodes(response.data.highlighted_nodes);
        }
      } catch (error) {
        console.error("Error fetching highlighted nodes:", error);
        setHighlightedNodes([]);
      }
    },
    [selectedTableId, highlightedNodes]
  );

  const handleKeyDown = useCallback(
    (e) => {
      const { moveAmount, zoomAmount } = settings;

      switch (e.key) {
        case "ArrowUp":
          setTransform((prev) => ({ ...prev, y: prev.y + moveAmount }));
          break;
        case "ArrowDown":
          setTransform((prev) => ({ ...prev, y: prev.y - moveAmount }));
          break;
        case "ArrowLeft":
          setTransform((prev) => ({ ...prev, x: prev.x + moveAmount }));
          break;
        case "ArrowRight":
          setTransform((prev) => ({ ...prev, x: prev.x - moveAmount }));
          break;
        case "+":
          setTransform((prev) => ({
            ...prev,
            scale: Math.min(3, prev.scale + zoomAmount),
          }));
          break;
        case "-":
          setTransform((prev) => ({
            ...prev,
            scale: Math.max(0.1, prev.scale - zoomAmount),
          }));
          break;
        default:
          break;
      }
    },
    [settings]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const updateInitialTransform = () => {
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        const centerX = window.innerWidth / 2 - rect.width / 2;
        const centerY = (window.innerHeight / 2 - rect.height / 2) * 0.9;
        const initialState = { x: centerX, y: centerY, scale: 1 };
        setInitialTransform(initialState);
        setTransform(initialState);
      }
    };

    updateInitialTransform();
    window.addEventListener("resize", updateInitialTransform);

    return () => {
      window.removeEventListener("resize", updateInitialTransform);
    };
  }, [orgData]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useKeyboardShortcut("f", true, toggleFilterModal);
  useKeyboardShortcut("h", true, toggleHelpModal);
  useKeyboardShortcut("q", true, () => setIsTableSelectionOpen(true));
  useKeyboardShortcut("c", true, handleCenter);
  useKeyboardShortcut("o", true, handleExpandAll);
  useKeyboardShortcut("l", true, handleCollapseAll);
  useKeyboardShortcut("u", true, () => setIsUploadOpen(true));
  useKeyboardShortcut("m", true, handleCompare);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex justify-center items-center h-screen text-2xl text-gray-600"
      >
        Loading...
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col justify-center items-center h-screen"
      >
        <p className="text-red-600 text-xl mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </motion.div>
    );
  }

  if (!dbPath || !selectedTableId || !filteredOrgData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col justify-center items-center h-screen"
      >
        <p className="text-xl mb-4">
          No data available. Please upload a file or select a table.
        </p>
        <Button
          onClick={() => setIsUploadOpen(true)}
          icon={Upload}
          className="mb-4"
        >
          Upload File
        </Button>
        <Button onClick={() => setIsTableSelectionOpen(true)} icon={List}>
          Select Table
        </Button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100"
      >
        {!isComparing && (
          <div className="absolute top-4 left-4 z-10 flex space-x-2 items-center">
            <Button onClick={handleHome} icon={Home} tooltip="Home">
              Home
            </Button>
            <Button
              onClick={handleCenter}
              icon={Target}
              tooltip="Center (Ctrl+C)"
            >
              Center
            </Button>
            <Button
              onClick={toggleFilterModal}
              icon={Filter}
              tooltip="Filter (Ctrl+F)"
            >
              Filter
            </Button>
            <Button
              onClick={() => setIsTableSelectionOpen(true)}
              icon={List}
              tooltip="Change Table (Ctrl+Q)"
            >
              Change Table
            </Button>
            <Button
              onClick={toggleToolbarMenu}
              icon={Menu}
              tooltip="More Options"
            >
              More
            </Button>
            <AnimatePresence>
              {isToolbarMenuOpen && (
                <ToolbarMenu
                  isOpen={isToolbarMenuOpen}
                  onClose={() => setIsToolbarMenuOpen(false)}
                  onExpandAll={handleExpandAll}
                  onCollapseAll={handleCollapseAll}
                  onUpload={() => setIsUploadOpen(true)}
                  onCompare={handleCompare}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenHelp={toggleHelpModal}
                />
              )}
            </AnimatePresence>
          </div>
        )}
        {!isComparing ? (
          <div
            ref={dragRef}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            style={{ overflow: "hidden" }}
          >
            <div
              ref={chartRef}
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transition: isDragging ? "none" : "transform 0.3s ease-out",
                transformOrigin: "0 0",
              }}
            >
              <div className="p-8 pt-20">
                <TreeNode
                  node={filteredOrgData}
                  onNodeClick={handleNodeClick}
                  expandAll={expandAll}
                  collapseAll={collapseAll}
                  folderId={selectedFolderId}
                  tableId={selectedTableId}
                  highlightedNodes={highlightedNodes}
                  onHighlight={handleHighlight}
                />
              </div>
            </div>
          </div>
        ) : (
          <ComparisonDashboard
            comparisonData={comparisonData}
            onClose={handleCloseComparison}
            isLoading={isComparisonLoading}
            error={error}
          />
        )}
      </motion.div>
      <AnimatePresence>
        {selectedNode && !isComparing && (
          <EnhancedNodeCard
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            folderId={selectedFolderId}
            tableId={selectedTableId}
          />
        )}
      </AnimatePresence>
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApplyFilters={handleFilterChange}
        activeFilters={activeFilters}
        orgData={orgData}
      />
      <TableSelectionModal
        isOpen={isTableSelectionOpen}
        onClose={handleCloseTableSelection}
        onSelectTable={handleTableSelection}
        folderStructure={folderStructure}
        currentFolderId={selectedFolderId}
        isComparingMode={isComparing}
      />
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleFileUpload}
        dbPath={dbPath}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};

export default OrgChart;