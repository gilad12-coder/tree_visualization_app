// src/components/OrgChart.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter, Upload, List } from 'react-feather';
import FilterModal from './FilterModal';
import TreeNode from './TreeNode';
import Modal from './Modal';
import Button from './Button';
import FileUploadModal from './FileUploadModal';
import TableSelectionModal from './TableSelectionModal';
import LandingPage from './LandingPage';

const OrgChart = () => {
  const [orgData, setOrgData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [folderStructure, setFolderStructure] = useState(null);
  const [folderError, setFolderError] = useState(null);
  const [showLanding, setShowLanding] = useState(true);
  const [hasTables, setHasTables] = useState(false);
  const dragRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    fetchFolderStructure();
  }, []);

  useEffect(() => {
    if (selectedTableId) {
      fetchOrgData(selectedTableId);
    }
  }, [selectedTableId]);

  const fetchFolderStructure = async () => {
    try {
      setFolderError(null);
      const response = await axios.get('http://localhost:5000/folder_structure');
      setFolderStructure(response.data);
      setHasTables(response.data.length > 0);
    } catch (err) {
      console.error('Error fetching folder structure:', err);
      setFolderError('Failed to fetch folder structure. Please try again later.');
    }
  };

  const fetchOrgData = async (tableId) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/org-data?table_id=${tableId}`);
      setOrgData(response.data);
      setLoading(false);
      setShowLanding(false);
    } catch (err) {
      console.error('Error fetching org data:', err);
      setError('Failed to fetch organizational data');
      setLoading(false);
    }
  };

  const handleFileUpload = async (formData) => {
    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsUploadOpen(false);
      fetchFolderStructure();
      if (response.data.table_id) {
        setSelectedTableId(response.data.table_id);
        fetchOrgData(response.data.table_id);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
    }
  };

  const handleTableSelection = async (tableId) => {
    setSelectedTableId(tableId);
    setIsTableSelectionOpen(false);
    fetchOrgData(tableId);
  };

  const handleViewTables = () => {
    setIsTableSelectionOpen(true);
  };

  const handleUpload = () => {
    setIsUploadOpen(true);
  };

  const handleCreateTable = () => {
    setIsUploadOpen(true);
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
    setIsFilterOpen(false);
  };

  const filterOrgData = useCallback((node) => {
    if (activeFilters.length === 0) return true;
    return activeFilters.some(filter => 
      node.name.toLowerCase().includes(filter.toLowerCase()) ||
      node.role.toLowerCase().includes(filter.toLowerCase())
    );
  }, [activeFilters]);

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: prev.x + e.movementX / prev.scale,
        y: prev.y + e.movementY / prev.scale
      }));
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = (e) => {
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
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (folderError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <p className="text-red-600 text-xl mb-4">{folderError}</p>
        <Button onClick={fetchFolderStructure}>Retry</Button>
      </div>
    );
  }

  if (folderStructure === null) {
    return <div className="flex justify-center items-center h-screen text-2xl text-gray-600">Loading folder structure...</div>;
  }

  if (showLanding) {
    return (
      <LandingPage
        hasTables={hasTables}
        onViewTables={handleViewTables}
        onUpload={handleUpload}
        onCreateTable={handleCreateTable}
      />
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-2xl text-gray-600">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-2xl text-red-600">{error}</div>;
  }

  if (!selectedTableId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Button onClick={handleViewTables} icon={List} className="mr-4">
          Select Table
        </Button>
        <Button onClick={handleUpload} icon={Upload}>
          Upload New Table
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="absolute top-4 left-4 z-10 flex space-x-2">
        <Button onClick={() => setExpandAll(true)} icon={ChevronDown}>
          Open All
        </Button>
        <Button onClick={() => setExpandAll(false)} icon={ChevronUp}>
          Collapse All
        </Button>
        <Button onClick={() => setIsFilterOpen(true)} icon={Filter}>
          Filter
        </Button>
        <Button onClick={() => setIsTableSelectionOpen(true)} icon={List}>
          Change Table
        </Button>
        <Button onClick={() => setIsUploadOpen(true)} icon={Upload}>
          Upload New Table
        </Button>
      </div>
      <div
        ref={dragRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        style={{
          overflow: 'hidden'
        }}
      >
        <div
          ref={chartRef}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            transformOrigin: '0 0'
          }}
        >
          <div className="p-8 pt-20">
            {orgData && (
              <TreeNode 
                node={orgData} 
                onNodeClick={handleNodeClick} 
                expandAll={expandAll}
                filterNode={filterOrgData}
              />
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {selectedNode && (
          <Modal node={selectedNode} onClose={() => setSelectedNode(null)} />
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
        onClose={() => {
          setIsTableSelectionOpen(false);
          if (!selectedTableId) setShowLanding(true);
        }}
        onSelectTable={handleTableSelection}
        folderStructure={folderStructure}
      />
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          if (!selectedTableId) setShowLanding(true);
        }}
        onUpload={handleFileUpload}
      />
    </div>
  );
};

export default OrgChart;