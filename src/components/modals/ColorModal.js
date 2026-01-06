import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, ChevronDown, ChevronRight, Tag, Droplet, Layers } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  getNodeDepth,
  countNodesAtDepth,
  countDescendants,
  findNodeByStructure
} from '../../Utilities/colorUtils';
import '../../styles/scrollbar.css';

// Helper functions for tree preview
const findParentNode = (rootNode, hierarchicalStructure) => {
  if (!hierarchicalStructure || !rootNode) return null;
  const segments = hierarchicalStructure.split('/').filter(Boolean);
  if (segments.length <= 1) return null;

  const parentPath = '/' + segments.slice(0, -1).join('/');
  return findNodeByStructure(rootNode, parentPath);
};

const getSiblings = (rootNode, hierarchicalStructure) => {
  const parent = findParentNode(rootNode, hierarchicalStructure);
  if (!parent || !parent.children) {
    const node = findNodeByStructure(rootNode, hierarchicalStructure);
    return node ? [node] : [];
  }
  return parent.children;
};

const getNodeLabel = (node, index) => {
  if (node?.name) return node.name.substring(0, 8);
  if (node?.role) return node.role.substring(0, 8);
  return `N${index + 1}`;
};

// Collapsible section component
const CollapsibleSection = ({ title, icon: Icon, isOpen, onToggle, children, badge }) => {
  return (
    <div
      className="border rounded-xl bg-white shadow-sm overflow-hidden"
      style={{ borderColor: '#E5E7EB' }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        {isOpen ? (
          <ChevronDown size={16} className="text-gray-500" />
        ) : (
          <ChevronRight size={16} className="text-gray-500" />
        )}
        <Icon size={16} className="text-gray-600" />
        <span className="text-sm font-medium text-gray-700 flex-1 text-start">{title}</span>
        {badge}
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Color button component
const ColorButton = ({ color, isSelected, onClick, tooltip, dashed }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`w-8 h-8 rounded transition-all ${
          dashed ? 'border-2 border-dashed' : 'border'
        } ${
          isSelected
            ? 'border-gray-800 ring-2 ring-gray-800'
            : dashed
              ? 'border-gray-400 hover:border-gray-600'
              : 'border-gray-200 hover:border-gray-400'
        }`}
        style={{ backgroundColor: color }}
      />
      {showTooltip && tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
};

// Mini node for preview
const MiniNode = ({ label, color, isSelected, isHighlighted, size = 'normal' }) => {
  const sizeClasses = size === 'small'
    ? 'w-14 h-9 text-[10px]'
    : 'w-16 h-10 text-xs';

  return (
    <div
      className={`
        ${sizeClasses}
        rounded-lg shadow-sm border border-gray-200 transition-all flex items-center justify-center
        ${isSelected ? 'ring-2 ring-blue-500 scale-110 z-10' : ''}
        ${!isHighlighted ? 'opacity-30' : ''}
      `}
      style={{ backgroundColor: isHighlighted ? color : '#E5E7EB' }}
    >
      <div className="truncate px-1 text-center text-gray-700 font-medium">
        {isSelected ? '★' : label}
      </div>
    </div>
  );
};

// Tree preview component
const TreePreview = ({ node, rootNode, applyMode, previewColor, isRTL, t }) => {
  const parent = useMemo(() => findParentNode(rootNode, node?.hierarchical_structure), [rootNode, node]);
  const siblings = useMemo(() => getSiblings(rootNode, node?.hierarchical_structure), [rootNode, node]);
  const children = node?.children || [];
  const nodeDepth = getNodeDepth(node?.hierarchical_structure);

  const shouldHighlight = (targetNode) => {
    if (!targetNode || !node) return false;
    const targetStructure = targetNode.hierarchical_structure;
    const selectedStructure = node.hierarchical_structure;

    switch (applyMode) {
      case 'node':
        return targetStructure === selectedStructure;
      case 'level':
        return getNodeDepth(targetStructure) === nodeDepth;
      case 'branch':
        return targetStructure === selectedStructure ||
               targetStructure?.startsWith(selectedStructure + '/');
      default:
        return false;
    }
  };

  const displayedSiblings = siblings.slice(0, 5);
  const displayedChildren = children.slice(0, 4);
  const hasMoreSiblings = siblings.length > 5;
  const hasMoreChildren = children.length > 4;
  const flexDirection = isRTL ? 'flex-row-reverse' : 'flex-row';

  return (
    <div className="flex flex-col items-center py-3 px-2">
      {parent && (
        <>
          <MiniNode
            label={getNodeLabel(parent, 0)}
            color={previewColor}
            isSelected={false}
            isHighlighted={shouldHighlight(parent)}
          />
          <div className="w-px h-3 bg-gray-300" />
        </>
      )}

      <div className={`flex ${flexDirection} gap-2 items-end`}>
        {displayedSiblings.map((sibling, idx) => {
          const isThisNode = sibling.hierarchical_structure === node?.hierarchical_structure;
          return (
            <div key={sibling.hierarchical_structure || idx} className="flex flex-col items-center">
              {parent && <div className="w-px h-2 bg-gray-300" />}
              <MiniNode
                label={getNodeLabel(sibling, idx)}
                color={previewColor}
                isSelected={isThisNode}
                isHighlighted={shouldHighlight(sibling)}
              />
            </div>
          );
        })}
        {hasMoreSiblings && (
          <div className="text-xs text-gray-400 self-center">+{siblings.length - 5}</div>
        )}
      </div>

      {children.length > 0 && (
        <>
          <div className="w-px h-3 bg-gray-300" />
          <div className={`flex ${flexDirection} gap-1.5 items-start`}>
            {displayedChildren.map((child, idx) => (
              <div key={child.hierarchical_structure || idx} className="flex flex-col items-center">
                <div className="w-px h-2 bg-gray-300" />
                <MiniNode
                  label={getNodeLabel(child, idx)}
                  color={previewColor}
                  isSelected={false}
                  isHighlighted={shouldHighlight(child)}
                  size="small"
                />
              </div>
            ))}
            {hasMoreChildren && (
              <div className="text-xs text-gray-400 self-center pt-3">+{children.length - 4}</div>
            )}
          </div>
        </>
      )}

      <div className="mt-3 text-xs text-gray-400 text-center">
        {applyMode === 'node' && t('colorModal.legendNode', 'Only this node')}
        {applyMode === 'level' && t('colorModal.legendLevel', 'All nodes at this level')}
        {applyMode === 'branch' && t('colorModal.legendBranch', 'This node + descendants')}
      </div>
    </div>
  );
};

// Theme matching the app
const THEME = {
  primary: '#1F2937',
  primaryLight: '#374151',
  buttonColor: '#1F2937',
  buttonHover: '#111827',
  bgGray: '#F9FAFB',
  borderColor: '#E5E7EB'
};

const DEFAULT_COLOR = '#F5F7FA';

const PRESET_COLORS = [
  { color: '#FCA5A5', key: 'red' },
  { color: '#FBBF24', key: 'yellow' },
  { color: '#34D399', key: 'green' },
  { color: '#60A5FA', key: 'blue' },
  { color: '#A78BFA', key: 'purple' },
  { color: '#F472B6', key: 'pink' },
  { color: '#FEE2E2', key: 'lightRed' },
  { color: '#FEF3C7', key: 'lightYellow' },
  { color: '#D1FAE5', key: 'lightGreen' },
  { color: '#DBEAFE', key: 'lightBlue' },
  { color: '#EDE9FE', key: 'lightPurple' },
  { color: '#FCE7F3', key: 'lightPink' }
];


const ColorModal = ({
  isOpen,
  onClose,
  node,
  rootNode,
  nodeColors,
  onApplyNodeColor,
  onApplyLevelColor,
  onApplyBranchColor,
  onRemoveColor,
  onRemoveBranchColors,
  onRemoveLevelColors,
  getSavedLabelsForColor,
  onSaveLabel,
  onUpdateLabel
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  // Section states - all open by default
  const [colorSectionOpen, setColorSectionOpen] = useState(true);
  const [scopeSectionOpen, setScopeSectionOpen] = useState(true);
  const [labelSectionOpen, setLabelSectionOpen] = useState(true);

  // Color state
  const [selectedColor, setSelectedColor] = useState('#60A5FA');
  const [applyMode, setApplyMode] = useState('node');
  const [actionMode, setActionMode] = useState('apply');

  // Label state
  const [label, setLabel] = useState('');

  const nodeDepth = node ? getNodeDepth(node.hierarchical_structure) : 0;

  // Get current color and label for the selected scope
  const currentColorInfo = useMemo(() => {
    if (!node || !nodeColors) return { color: null, label: '' };

    const structure = node.hierarchical_structure;
    const depth = nodeDepth;

    switch (applyMode) {
      case 'node':
        return {
          color: nodeColors.nodeOverrides?.[structure] || null,
          label: nodeColors.colorLabels?.node?.[structure] || ''
        };
      case 'level':
        return {
          color: nodeColors.levelColors?.[depth] || null,
          label: nodeColors.colorLabels?.level?.[depth] || ''
        };
      case 'branch':
        return {
          color: nodeColors.branchColors?.[structure] || null,
          label: nodeColors.colorLabels?.branch?.[structure] || ''
        };
      default:
        return { color: null, label: '' };
    }
  }, [node, nodeColors, applyMode, nodeDepth]);

  // Initialize selectedColor to node's current color when modal opens
  useEffect(() => {
    if (!node || !nodeColors) return;

    const structure = node.hierarchical_structure;
    const depth = getNodeDepth(structure);

    // Check for existing color in order: node override > level > branch
    const nodeColor = nodeColors.nodeOverrides?.[structure];
    const levelColor = nodeColors.levelColors?.[depth];
    const branchColor = nodeColors.branchColors?.[structure];

    const existingColor = nodeColor || levelColor || branchColor;

    if (existingColor) {
      setSelectedColor(existingColor);
    } else {
      setSelectedColor('#60A5FA'); // Reset to default if no color
    }
  }, [node, nodeColors]);

  // Get saved labels for the current color
  const savedLabelsForColor = useMemo(() => {
    if (!getSavedLabelsForColor) return [];
    return getSavedLabelsForColor(selectedColor);
  }, [getSavedLabelsForColor, selectedColor]);

  const levelNodeCount = useMemo(() => {
    if (!rootNode) return 0;
    return countNodesAtDepth(rootNode, nodeDepth);
  }, [rootNode, nodeDepth]);

  const branchNodeCount = useMemo(() => {
    if (!node || !rootNode) return 0;
    const targetNode = findNodeByStructure(rootNode, node.hierarchical_structure);
    return countDescendants(targetNode);
  }, [node, rootNode]);

  // Handle apply/remove
  const handleApply = () => {
    if (!node) return;

    const trimmedLabel = label.trim();
    const key = applyMode === 'level' ? nodeDepth : node.hierarchical_structure;

    if (actionMode === 'remove') {
      switch (applyMode) {
        case 'node':
          onRemoveColor(node.hierarchical_structure);
          break;
        case 'level':
          // Remove level color AND branch/node colors for this branch
          if (onRemoveLevelColors) {
            onRemoveLevelColors(nodeDepth, node.hierarchical_structure);
          } else {
            onApplyLevelColor(nodeDepth, null, '');
          }
          break;
        case 'branch':
          // Remove ALL colors (node overrides + branch colors) for this node and descendants
          if (onRemoveBranchColors) {
            onRemoveBranchColors(node.hierarchical_structure);
          } else {
            // Fallback to just removing branch color entry
            onApplyBranchColor(node.hierarchical_structure, null, '');
          }
          break;
        default:
          break;
      }
      toast.success(t('colorModal.colorRemoved', 'Color removed'));
    } else {
      switch (applyMode) {
        case 'node':
          onApplyNodeColor(key, selectedColor, trimmedLabel);
          break;
        case 'level':
          onApplyLevelColor(key, selectedColor, trimmedLabel);
          break;
        case 'branch':
          onApplyBranchColor(key, selectedColor, trimmedLabel);
          break;
        default:
          break;
      }

      // Automatically save label as recent
      if (onSaveLabel && trimmedLabel) {
        onSaveLabel(selectedColor, trimmedLabel);
      }

      toast.success(t('colorModal.colorApplied', 'Color applied'));
    }

    handleClose();
  };

  const handleClose = () => {
    setLabel('');
    onClose();
  };

  if (!node) return null;

  const isDefaultColor = selectedColor.toLowerCase() === DEFAULT_COLOR.toLowerCase();
  const hasCurrentLabel = !!currentColorInfo.label;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-xl shadow-2xl w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1100px', maxHeight: 'calc(100vh - 40px)' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Close button */}
        <div className="flex justify-end px-4 py-3">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-hidden flex">
          {/* Left Column - Settings */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            {/* Color Section */}
            <CollapsibleSection
              title={t('colorModal.colorSection', 'Color')}
              icon={Droplet}
              isOpen={colorSectionOpen}
              onToggle={() => setColorSectionOpen(!colorSectionOpen)}
              badge={
                <div
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: selectedColor }}
                />
              }
            >
              {/* Action Mode Toggle */}
              <div className="flex rounded-lg bg-gray-100 p-1 mb-4">
                <button
                  onClick={() => setActionMode('apply')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    actionMode === 'apply'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('colorModal.applyColor', 'Apply Color')}
                </button>
                <button
                  onClick={() => setActionMode('remove')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    actionMode === 'remove'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('colorModal.removeColor', 'Remove Color')}
                </button>
              </div>

              {/* Color Picker - Only show in apply mode */}
              {actionMode === 'apply' && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-12 h-10 cursor-pointer rounded-lg border border-gray-300 p-0"
                    />
                    <input
                      type="text"
                      value={selectedColor.toUpperCase()}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-gray-400 outline-none"
                    />
                  </div>

                  {/* Color Presets */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <ColorButton
                      color={DEFAULT_COLOR}
                      isSelected={isDefaultColor}
                      onClick={() => setSelectedColor(DEFAULT_COLOR)}
                      tooltip={t('colorModal.defaultColor', 'Default')}
                      dashed
                    />
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    {PRESET_COLORS.map((preset, idx) => (
                      <ColorButton
                        key={idx}
                        color={preset.color}
                        isSelected={selectedColor.toLowerCase() === preset.color.toLowerCase()}
                        onClick={() => setSelectedColor(preset.color)}
                        tooltip={t(`colorModal.colors.${preset.key}`)}
                      />
                    ))}
                    {nodeColors?.recentColors?.length > 0 && (
                      <>
                        <div className="w-px h-6 bg-gray-300 mx-1" />
                        {nodeColors.recentColors.map((color, idx) => (
                          <ColorButton
                            key={`recent-${idx}`}
                            color={color}
                            isSelected={selectedColor.toLowerCase() === color.toLowerCase()}
                            onClick={() => setSelectedColor(color)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </CollapsibleSection>

            {/* Scope Section */}
            <CollapsibleSection
              title={t('colorModal.scopeSection', 'Apply To')}
              icon={Layers}
              isOpen={scopeSectionOpen}
              onToggle={() => setScopeSectionOpen(!scopeSectionOpen)}
              badge={
                <span className="text-sm text-gray-500">
                  {applyMode === 'node' && t('colorModal.nodeOnly', 'This Node')}
                  {applyMode === 'level' && t('colorModal.thisLevel', 'This Level')}
                  {applyMode === 'branch' && t('colorModal.thisBranch', 'This Branch')}
                </span>
              }
            >
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                  applyMode === 'node' ? 'bg-gray-100 border-gray-300' : 'border-transparent hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="applyMode"
                    checked={applyMode === 'node'}
                    onChange={() => setApplyMode('node')}
                    className="w-4 h-4 text-gray-800"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">{t('colorModal.nodeOnly', 'This Node Only')}</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                  applyMode === 'level' ? 'bg-gray-100 border-gray-300' : 'border-transparent hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="applyMode"
                    checked={applyMode === 'level'}
                    onChange={() => setApplyMode('level')}
                    className="w-4 h-4 text-gray-800"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">{t('colorModal.thisLevel', 'This Level')}</span>
                    <span className="text-gray-400 ms-2">({levelNodeCount} {t('colorModal.nodes', 'nodes')})</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                  applyMode === 'branch' ? 'bg-gray-100 border-gray-300' : 'border-transparent hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="applyMode"
                    checked={applyMode === 'branch'}
                    onChange={() => setApplyMode('branch')}
                    className="w-4 h-4 text-gray-800"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">{t('colorModal.thisBranch', 'This Branch')}</span>
                    <span className="text-gray-400 ms-2">({branchNodeCount} {t('colorModal.nodes', 'nodes')})</span>
                  </div>
                </label>
              </div>
            </CollapsibleSection>

            {/* Label Section - Only show in apply mode */}
            {actionMode === 'apply' && (
              <CollapsibleSection
                title={t('colorModal.labelSection', 'Label (Optional)')}
                icon={Tag}
                isOpen={labelSectionOpen}
                onToggle={() => setLabelSectionOpen(!labelSectionOpen)}
              >
                {!isDefaultColor ? (
                  <div className="space-y-4">
                    {hasCurrentLabel ? (
                      /* Current label display - must clear to add new */
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                          <div
                            className="w-10 h-10 rounded-lg border-2 border-white shadow-sm flex-shrink-0"
                            style={{ backgroundColor: currentColorInfo.color || selectedColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-green-600 font-medium mb-0.5">{t('colorModal.currentLabel', 'Current Label')}</div>
                            <div dir="auto" className="text-gray-800 truncate">
                              {currentColorInfo.label}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (onUpdateLabel) {
                                const key = applyMode === 'level' ? nodeDepth : node.hierarchical_structure;
                                onUpdateLabel(applyMode, key, '');
                                toast.info(t('colorModal.labelCleared', 'Label cleared'));
                              }
                            }}
                            className="text-green-400 hover:text-red-500 p-1.5 hover:bg-white rounded-lg transition-colors"
                            title={t('colorModal.clearLabel', 'Clear label')}
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          {t('colorModal.clearToAddNew', 'Clear current label to add a new one')}
                        </p>
                      </div>
                    ) : (
                      /* Label input - only shown when no current label */
                      <>
                        {/* Label input with color preview */}
                        <div className="flex items-stretch gap-3">
                          <div
                            className="w-12 rounded-lg border-2 border-gray-200 shadow-inner flex-shrink-0"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <div className="flex-1 relative">
                            <input
                              type="text"
                              dir="auto"
                              value={label}
                              onChange={(e) => setLabel(e.target.value)}
                              placeholder={t('colorModal.labelPlaceholder', 'Enter a label for this color...')}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none"
                              maxLength={50}
                            />
                            {/* Character counter */}
                            <span className={`absolute end-3 bottom-1 text-xs ${label.length > 40 ? 'text-orange-500' : 'text-gray-400'}`}>
                              {label.length}/50
                            </span>
                          </div>
                        </div>

                        {/* Recent labels as chips */}
                        {savedLabelsForColor?.length > 0 && (
                          <div>
                            <div className="text-xs text-gray-500 mb-2 font-medium">
                              {t('colorModal.recentLabels', 'Recent Labels')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {savedLabelsForColor.map((savedLabel, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  dir="auto"
                                  onClick={() => setLabel(savedLabel)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                  {savedLabel}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Tag size={24} className="mx-auto mb-2 text-gray-300" />
                    <p>{t('colorModal.selectNonDefaultColor', 'Select a color to add a label')}</p>
                  </div>
                )}
              </CollapsibleSection>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="w-80 bg-gray-50 border-s border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-600">{t('colorModal.preview', 'Preview')}</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <TreePreview
                node={node}
                rootNode={rootNode}
                applyMode={applyMode}
                previewColor={actionMode === 'remove' ? DEFAULT_COLOR : selectedColor}
                isRTL={isRTL}
                t={t}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50" style={{ borderColor: THEME.borderColor }}>
          <button
            onClick={handleApply}
            className={`w-full flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-medium text-white transition-colors ${
              actionMode === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''
            }`}
            style={actionMode === 'apply' ? { backgroundColor: THEME.buttonColor } : {}}
          >
            {actionMode === 'remove' ? (
              <>
                <Trash2 size={18} className="me-2" />
                <span>{t('colorModal.removeColor', 'Remove Color')}</span>
              </>
            ) : (
              <>
                <Check size={18} className="me-2" />
                <span>{t('common.apply', 'Apply')}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ColorModal;
