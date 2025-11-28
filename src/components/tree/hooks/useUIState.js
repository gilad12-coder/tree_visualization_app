import { useState, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_KEYBINDINGS,
  DEFAULT_MOVE_AMOUNT,
  DEFAULT_ZOOM_AMOUNT,
  DEFAULT_SEARCH_ZOOM_LEVEL,
  DEFAULT_PRIMARY_FIELD,
  DEFAULT_SECONDARY_FIELD
} from '../../settings/DefaultSettings';

const useUIState = (
  setExpandAll,
  handleCenter
) => {
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTableSelectionOpen, setIsTableSelectionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [collapseAll, setCollapseAll] = useState(false);
  // Initialize settings from localStorage or use defaults
  const getInitialSettings = () => {
    const defaultSettings = {
      moveAmount: DEFAULT_MOVE_AMOUNT,
      zoomAmount: DEFAULT_ZOOM_AMOUNT,
      searchZoomLevel: DEFAULT_SEARCH_ZOOM_LEVEL,
      primaryField: DEFAULT_PRIMARY_FIELD,
      secondaryField: DEFAULT_SECONDARY_FIELD,
      keybindings: DEFAULT_KEYBINDINGS,
      toggle: {} // Initialize toggle as empty object to prevent undefined errors
    };

    try {
      const savedSettings = localStorage.getItem('orgChartSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge parsed settings with defaults to ensure all properties exist
        return {
          ...defaultSettings,
          ...parsedSettings,
          keybindings: parsedSettings.keybindings || DEFAULT_KEYBINDINGS,
          toggle: parsedSettings.toggle || {}
        };
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }

    // Return default settings when nothing is found in localStorage
    return defaultSettings;
  };
  
  const [settings, setSettings] = useState(getInitialSettings);

  // Wrapper for setSettings to ensure it always has toggle property
  const safeSetSettings = useCallback((newSettings) => {
    if (typeof newSettings === 'function') {
      setSettings((prevSettings) => {
        const updated = newSettings(prevSettings);
        return {
          ...updated,
          toggle: updated?.toggle || {}
        };
      });
    } else if (newSettings && typeof newSettings === 'object') {
      setSettings({
        ...newSettings,
        toggle: newSettings?.toggle || {}
      });
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (settings && typeof settings === 'object') {
      try {
        localStorage.setItem('orgChartSettings', JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
    }
  }, [settings]);

  const toggleFilterModal = useCallback(() => {
    setIsFilterOpen(prev => !prev);
  }, []);



  const handleCloseTableSelection = useCallback(() => {
    setIsTableSelectionOpen(false);
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandAll(true);
    setCollapseAll(false);
    toast.info(t('orgChart.expandedAllNodes'));
  }, [setExpandAll, t]);

  const handleCollapseAll = useCallback(() => {
    setExpandAll(false);
    setCollapseAll(true);
    setTimeout(() => setCollapseAll(false), 100);
    toast.info(t('orgChart.collapsedAllNodes'));
  }, [setExpandAll, t]);

  const handleExportImage = useCallback((chartRef) => {
    if (!chartRef.current) {
      toast.error(t('orgChart.imageExportError', 'Unable to export image'));
      return;
    }

    // Step 1: Center the tree first
    handleCenter();

    // Step 2: Wait for centering animation to complete, then capture
    setTimeout(() => {
      const element = chartRef.current;

      // Store original styles to restore later
      const originalStyles = {
        transform: element.style.transform,
        transition: element.style.transition,
        transformOrigin: element.style.transformOrigin
      };

      // Temporarily remove transform for accurate capture
      element.style.transition = 'none';
      element.style.transform = 'translate(0px, 0px) scale(1)';
      element.style.transformOrigin = '0 0';

      // Wait for DOM to update
      requestAnimationFrame(() => {
        // Get the actual content size
        const rect = element.getBoundingClientRect();

        // Use high resolution (3x for crisp detail)
        const scaleFactor = 3;
        const captureWidth = rect.width;
        const captureHeight = rect.height;

        // Create high-resolution canvas
        const canvas = document.createElement('canvas');
        canvas.width = captureWidth * scaleFactor;
        canvas.height = captureHeight * scaleFactor;

        // Show loading toast
        const loadingToast = toast.info(t('orgChart.capturingImage', 'Capturing image...'), {
          autoClose: false
        });

        // Capture with html2canvas
        html2canvas(element, {
          canvas: canvas,
          scale: scaleFactor,
          width: captureWidth,
          height: captureHeight,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#f9fafb', // Match the background color
          logging: false,
          imageTimeout: 0,
          removeContainer: true
        }).then((capturedCanvas) => {
          // Restore original styles
          Object.assign(element.style, originalStyles);

          // Convert to blob and download
          capturedCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              const timestamp = new Date().toISOString().slice(0, 10);
              link.href = url;
              link.download = `org_chart_${timestamp}.png`;
              link.click();
              URL.revokeObjectURL(url);

              // Close loading toast and show success
              toast.dismiss(loadingToast);
              toast.success(t('orgChart.imageDownloadSuccess', 'Image downloaded successfully'));
            } else {
              toast.dismiss(loadingToast);
              toast.error(t('orgChart.imageExportError', 'Failed to create image'));
            }
          }, 'image/png', 0.95); // 95% quality
        }).catch((error) => {
          console.error('Error capturing image:', error);

          // Restore original styles
          Object.assign(element.style, originalStyles);

          // Show error
          toast.dismiss(loadingToast);
          toast.error(t('orgChart.imageExportError', 'Failed to export image'));
        });
      });
    }, 500); // Wait 500ms for centering to complete
  }, [handleCenter, t]);

  const handleKeyDown = useCallback((e, isUpdateModalOpen, isFilterOpen, selectedSwapNode, handleCancelSwap, toggleFilterModal, toggleHelpModal, handleCenter, handleExpandAll, handleCollapseAll, handleClearFilter, handleHierarchyMode, handleOrganizationMode, handleToggleVacancies, toggleSearchBar, setIsTableSelectionOpen, setIsUploadOpen, setTransform) => {
    // More detailed logging for debugging
    console.log('Key event in handleKeyDown:', e.key, 'Ctrl:', e.ctrlKey, 'Alt:', e.altKey, 'Shift:', e.shiftKey);
    console.log('Current settings:', settings);
    console.log('setTransform available:', typeof setTransform === 'function');
    
    // Don't process keys if modals are open
    if (isUpdateModalOpen || isFilterOpen) {
      console.log('Modal is open, ignoring keyboard event');
      return;
    }

    // Handle escape key for node swap cancellation
    if (e.key === 'Escape' && selectedSwapNode) {
      console.log('Canceling swap node with Escape key');
      handleCancelSwap();
      return;
    }

    // Get settings with explicit fallbacks
    const moveAmount = settings.moveAmount || DEFAULT_MOVE_AMOUNT;
    const zoomAmount = settings.zoomAmount || DEFAULT_ZOOM_AMOUNT;
    // Always ensure we have keybindings
    const keybindings = settings.keybindings || { ...DEFAULT_KEYBINDINGS };
    
    console.log('Using move amount:', moveAmount, 'zoom amount:', zoomAmount);
    console.log('Current keybindings:', keybindings);

    // Check if setTransform is available before defining shortcuts
    if (typeof setTransform !== 'function') {
      console.error('setTransform is not a function, keyboard navigation will not work');
    }
    
    // Basic navigation shortcuts
    const singleKeyShortcuts = {
      'ArrowUp': () => {
        console.log('ArrowUp pressed, adjusting transform');
        if (typeof setTransform === 'function') {
          setTransform(prev => ({ ...prev, y: prev.y + moveAmount }));
        }
      },
      'ArrowDown': () => {
        console.log('ArrowDown pressed, adjusting transform');
        if (typeof setTransform === 'function') {
          setTransform(prev => ({ ...prev, y: prev.y - moveAmount }));
        }
      },
      'ArrowLeft': () => {
        console.log('ArrowLeft pressed, adjusting transform');
        if (typeof setTransform === 'function') {
          setTransform(prev => ({ ...prev, x: prev.x + moveAmount }));
        }
      },
      'ArrowRight': () => {
        console.log('ArrowRight pressed, adjusting transform');
        if (typeof setTransform === 'function') {
          setTransform(prev => ({ ...prev, x: prev.x - moveAmount }));
        }
      },
      '=': () => {
        console.log('= pressed, zooming in');
        if (typeof setTransform === 'function') {
          setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale + zoomAmount) }));
        }
      },
      '-': () => {
        console.log('- pressed, zooming out');
        if (typeof setTransform === 'function') {
          setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - zoomAmount) }));
        }
      },
    };

    // Actions mapped to their functions with detailed logging
    const actions = {
      'toggleHelp': () => {
        console.log('Executing toggleHelp action');
        if (typeof toggleHelpModal === 'function') {
          toggleHelpModal();
        } else {
          console.error('toggleHelpModal is not a function');
        }
      },
      'changeTable': () => {
        console.log('Executing changeTable action');
        if (typeof setIsTableSelectionOpen === 'function') {
          setIsTableSelectionOpen(true);
        }
      },
      'uploadTable': () => {
        console.log('Executing uploadTable action');
        if (typeof setIsUploadOpen === 'function') {
          setIsUploadOpen(true);
        }
      },
      'centerChart': () => {
        console.log('Executing centerChart action');
        if (typeof handleCenter === 'function') {
          handleCenter();
        }
      },
      'filterNodes': () => {
        console.log('Executing filterNodes action');
        if (typeof toggleFilterModal === 'function') {
          toggleFilterModal();
        }
      },
      'removeFilter': () => {
        console.log('Executing removeFilter action');
        if (typeof handleClearFilter === 'function') {
          handleClearFilter();
        }
      },
      'toggleOrgMode': () => {
        console.log('Executing toggleOrgMode action');
        if (typeof handleOrganizationMode === 'function') {
          handleOrganizationMode();
        }
      },
      'toggleHierarchyMode': () => {
        console.log('Executing toggleHierarchyMode action');
        if (typeof handleHierarchyMode === 'function') {
          handleHierarchyMode();
        }
      },
      'toggleSearchbar': () => {
        console.log('Executing toggleSearchbar action');
        if (typeof toggleSearchBar === 'function') {
          toggleSearchBar();
        }
      },
      'expandAllNodes': () => {
        console.log('Executing expandAllNodes action');
        if (typeof handleExpandAll === 'function') {
          handleExpandAll();
        }
      },
      'collapseAllNodes': () => {
        console.log('Executing collapseAllNodes action');
        if (typeof handleCollapseAll === 'function') {
          handleCollapseAll();
        }
      },
      'toggleVacancies': () => {
        console.log('Executing toggleVacancies action');
        if (typeof handleToggleVacancies === 'function') {
          handleToggleVacancies();
        }
      }
    };

    // Process single key shortcuts first
    if (e.key in singleKeyShortcuts) {
      e.preventDefault();
      singleKeyShortcuts[e.key]();
      return;
    }

    // Get default keybindings for fallback
    const defaultKeybindings = window.localStorage.getItem('defaultOrgChartSettings') ? 
      JSON.parse(window.localStorage.getItem('defaultOrgChartSettings')).keybindings : {};

    // Process custom keybindings
    if (keybindings) {
      // Check each keybinding
      for (const [action, shortcut] of Object.entries(keybindings)) {
        // Skip invalid shortcuts
        if (!shortcut || typeof shortcut !== 'string') {
          console.warn(`⚠️ [Keybinding Warning] Invalid shortcut format for action '${action}': ${shortcut}`);
          console.info(`Using default keybinding for '${action}': ${defaultKeybindings[action] || 'NONE'}`);
          continue;
        }
        
        // Parse the shortcut format (e.g., "CTRL+H")
        const parts = shortcut.split('+');
        
        // Safely get modifier and key with null checks
        const modifier = parts[0] ? parts[0].toUpperCase() : '';
        const key = parts[1] ? parts[1].toUpperCase() : '';

        // Skip this shortcut if key is missing
        if (!key) {
          console.warn(`⚠️ [Keybinding Warning] Missing key in shortcut for action '${action}': ${shortcut}`);
          console.info(`Using default keybinding for '${action}': ${defaultKeybindings[action] || 'NONE'}`);
          continue;
        }

        // Check if this shortcut matches the current key event
        const modifierMatches = 
          (modifier === 'CTRL' && e.ctrlKey) || 
          (modifier === 'ALT' && e.altKey) || 
          (modifier === 'SHIFT' && e.shiftKey);
          
        // Compare case-insensitively
        const keyMatches = e.key.toUpperCase() === key.toUpperCase();
        
        if (modifierMatches && keyMatches) {
          e.preventDefault();
          console.log(`Executing action: ${action} for shortcut: ${shortcut}`);
          
          // Map action to function
          if (actions[action]) {
            actions[action]();
            return; // Exit after handling the shortcut
          }
        }
      }
    }
    
    // We'll completely skip the fallback mechanism to avoid conflicts
    // This ensures that only explicitly defined keybindings in the settings are used
  }, [settings]);

  return {
    isFilterOpen,
    setIsFilterOpen,
    isUploadOpen,
    setIsUploadOpen,
    isTableSelectionOpen,
    setIsTableSelectionOpen,
    isSettingsOpen,
    setIsSettingsOpen,

    isUpdateModalOpen,
    setIsUpdateModalOpen,
    activeMenuId,
    setActiveMenuId,
    collapseAll,
    setCollapseAll,
    settings,
    setSettings: safeSetSettings, // Use the safe wrapper
    toggleFilterModal,

    handleCloseTableSelection,
    handleExpandAll,
    handleCollapseAll,
    handleExportImage,
    handleKeyDown
  };
};

export default useUIState;
