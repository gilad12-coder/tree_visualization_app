/**
 * Color Cascade Utilities
 *
 * Handles color calculation for tree nodes with cascade logic:
 * - Level colors (all nodes at same depth)
 * - Branch colors (node + descendants inherit)
 * - Manual overrides (single node)
 * - Blending when both level and branch apply
 */

export const DEFAULT_NODE_COLOR = '#F5F7FA';

/**
 * Validate hex color format
 * @param {string} hex - Color to validate
 * @returns {boolean} True if valid 6-digit hex color
 */
export const isValidHexColor = (hex) => {
  if (!hex) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
};

/**
 * Normalize hex color (expand short form, lowercase)
 * @param {string} hex - Color to normalize
 * @returns {string|null} Normalized hex or null if invalid
 */
export const normalizeHexColor = (hex) => {
  if (!hex) return null;

  let h = hex.replace('#', '');

  // Expand short form (#F00 -> #FF0000)
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }

  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;

  return '#' + h.toLowerCase();
};

/**
 * Calculate node depth from hierarchical_structure
 * e.g., '/1' = 0, '/1/2' = 1, '/1/2/3' = 2
 */
export const getNodeDepth = (hierarchicalStructure) => {
  if (!hierarchicalStructure) return 0;
  const segments = hierarchicalStructure.split('/').filter(Boolean);
  return segments.length - 1;
};

/**
 * Check if node is a descendant of a branch root
 */
export const isDescendantOf = (nodeStructure, ancestorStructure) => {
  if (!nodeStructure || !ancestorStructure) return false;
  return nodeStructure.startsWith(ancestorStructure + '/') ||
         nodeStructure === ancestorStructure;
};

/**
 * Convert hex color to RGB object
 */
const hex2rgb = (hex) => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
};

/**
 * Convert RGB object to hex color
 */
const rgb2hex = ({ r, g, b }) => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Blend two hex colors with equal weight (50/50)
 * Returns fallback if either color is invalid
 */
export const blendColors = (color1, color2) => {
  // Validate inputs - if invalid, return fallback
  if (!isValidHexColor(color1) || !isValidHexColor(color2)) {
    return color1 || color2 || DEFAULT_NODE_COLOR;
  }

  const c1 = hex2rgb(color1);
  const c2 = hex2rgb(color2);

  return rgb2hex({
    r: (c1.r + c2.r) / 2,
    g: (c1.g + c2.g) / 2,
    b: (c1.b + c2.b) / 2
  });
};

/**
 * Calculate the final display color for a node
 *
 * Priority (highest to lowest):
 * 1. Manual Override → exact color, no blend
 * 2. Level + Branch → blend 50/50
 * 3. Level only → level color
 * 4. Branch only → inherited from closest ancestor
 * 5. Default → #F5F7FA
 *
 * @param {Object} node - Node object with hierarchical_structure
 * @param {Object} nodeColors - Color configuration object
 * @returns {Object} { color: string, status: string, sources: object }
 */
export const calculateNodeColor = (node, nodeColors) => {
  if (!nodeColors) {
    return {
      color: DEFAULT_NODE_COLOR,
      status: 'default',
      sources: {}
    };
  }

  const { levelColors = {}, branchColors = {}, nodeOverrides = {} } = nodeColors;
  const hierarchicalStructure = node?.hierarchical_structure;

  if (!hierarchicalStructure) {
    return {
      color: DEFAULT_NODE_COLOR,
      status: 'default',
      sources: {}
    };
  }

  // 1. Check for manual override (highest priority)
  if (nodeOverrides[hierarchicalStructure]) {
    return {
      color: nodeOverrides[hierarchicalStructure],
      status: 'manual',
      sources: { override: nodeOverrides[hierarchicalStructure] }
    };
  }

  // 2. Get level color
  const depth = getNodeDepth(hierarchicalStructure);
  const levelColor = levelColors[depth] || null;

  // 3. Get branch color (find closest ancestor with branch color)
  let branchColor = null;
  let branchSource = null;
  Object.keys(branchColors).forEach(ancestorStructure => {
    if (isDescendantOf(hierarchicalStructure, ancestorStructure)) {
      // Use the most specific (longest path) ancestor
      if (!branchSource || ancestorStructure.length > branchSource.length) {
        branchColor = branchColors[ancestorStructure];
        branchSource = ancestorStructure;
      }
    }
  });

  // 4. Determine final color based on what's available
  if (levelColor && branchColor) {
    return {
      color: blendColors(levelColor, branchColor),
      status: 'blended',
      sources: { level: levelColor, branch: branchColor, branchSource, depth }
    };
  }

  if (levelColor) {
    return {
      color: levelColor,
      status: 'level',
      sources: { level: levelColor, depth }
    };
  }

  if (branchColor) {
    return {
      color: branchColor,
      status: 'inherited',
      sources: { branch: branchColor, branchSource }
    };
  }

  return {
    color: DEFAULT_NODE_COLOR,
    status: 'default',
    sources: {}
  };
};

/**
 * Check if a node has any color applied (for move restriction)
 *
 * @param {string} hierarchicalStructure - Node's hierarchical structure path
 * @param {Object} nodeColors - Color configuration object
 * @returns {boolean} True if node has any color applied
 */
export const hasColorApplied = (hierarchicalStructure, nodeColors) => {
  if (!nodeColors || !hierarchicalStructure) return false;

  const { levelColors = {}, branchColors = {}, nodeOverrides = {} } = nodeColors;

  // Check manual override
  if (nodeOverrides[hierarchicalStructure]) return true;

  // Check level color
  const depth = getNodeDepth(hierarchicalStructure);
  if (levelColors[depth]) return true;

  // Check branch color (inherited)
  return Object.keys(branchColors).some(ancestorStructure =>
    isDescendantOf(hierarchicalStructure, ancestorStructure)
  );
};

/**
 * Count all nodes at a specific depth in the tree
 *
 * @param {Object} rootNode - Root node of the tree
 * @param {number} targetDepth - Target depth to count nodes at
 * @param {number} currentDepth - Current depth (internal use)
 * @returns {number} Count of nodes at the target depth
 */
export const countNodesAtDepth = (rootNode, targetDepth, currentDepth = 0) => {
  if (!rootNode) return 0;

  let count = 0;

  if (currentDepth === targetDepth) {
    count = 1;
  }

  if (rootNode.children && Array.isArray(rootNode.children)) {
    rootNode.children.forEach(child => {
      count += countNodesAtDepth(child, targetDepth, currentDepth + 1);
    });
  }

  return count;
};

/**
 * Count a node and all its descendants
 *
 * @param {Object} node - Node to count from
 * @returns {number} Count of node + all descendants
 */
export const countDescendants = (node) => {
  if (!node) return 0;

  let count = 1; // Count self

  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      count += countDescendants(child);
    });
  }

  return count;
};

/**
 * Find a node in the tree by its hierarchical structure
 *
 * @param {Object} rootNode - Root node of the tree
 * @param {string} hierarchicalStructure - Path to find
 * @returns {Object|null} Found node or null
 */
export const findNodeByStructure = (rootNode, hierarchicalStructure) => {
  if (!rootNode || !hierarchicalStructure) return null;

  if (rootNode.hierarchical_structure === hierarchicalStructure) {
    return rootNode;
  }

  if (rootNode.children && Array.isArray(rootNode.children)) {
    for (const child of rootNode.children) {
      const found = findNodeByStructure(child, hierarchicalStructure);
      if (found) return found;
    }
  }

  return null;
};

/**
 * Update recent colors list (keeps last 3, removes duplicates)
 *
 * @param {Array} recentColors - Current recent colors array
 * @param {string} newColor - New color to add
 * @returns {Array} Updated recent colors array (max 3)
 */
export const updateRecentColors = (recentColors = [], newColor) => {
  // Don't update recent colors if color is null/undefined (e.g., when removing)
  if (!newColor) return recentColors;

  // Normalize the color (expand short form, lowercase)
  const normalized = normalizeHexColor(newColor);
  if (!normalized) return recentColors;

  // Filter out duplicates (case-insensitive)
  const filtered = recentColors.filter(c => {
    const normalizedExisting = normalizeHexColor(c);
    return normalizedExisting && normalizedExisting !== normalized;
  });

  return [normalized, ...filtered].slice(0, 3);
};
