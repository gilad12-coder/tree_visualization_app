import { useCallback } from 'react';

const useDataProcessing = () => {
  const filterOrgData = useCallback((node, filters) => {
    const matchesFilter = (n) => {
      if (filters.length === 0) return true;
      
      return filters.every(filter => {
        if (filter.type === 'department' || filter.type === 'organization') {
          const orgFields = ['department', 'organization', 'org', 'role'];
          return orgFields.some(field => {
            if (!n[field]) return false;
            if (Array.isArray(n[field])) {
              return n[field].some(val => 
                val.toString().toLowerCase().includes(filter.value.toLowerCase())
              );
            } else {
              return n[field].toString().toLowerCase().includes(filter.value.toLowerCase());
            }
          });
        }
        
        const value = n[filter.type];
        return value !== null && value !== undefined && 
               value.toString().toLowerCase().includes(filter.value.toLowerCase());
      });
    };

    const filterNode = (n, depth = 0, matchDepth = -1) => {
      if (!n) return { node: null, matchDepth: -1 };

      const currentNodeMatch = matchesFilter(n);
      const newNode = { ...n };

      if (currentNodeMatch) {
        matchDepth = depth;
        if (n.children) {
          newNode.children = n.children.map(child => ({ ...child, children: child.children }));
        }
        return { node: newNode, matchDepth };
      }

      if (n.children) {
        const childResults = n.children.map(child => filterNode(child, depth + 1, matchDepth));
        const newMatchDepth = childResults.reduce((max, result) => Math.max(max, result.matchDepth), matchDepth);

        if (newMatchDepth !== -1) {
          if (depth === newMatchDepth - 1) {
            newNode.children = n.children.map(child => {
              const childResult = childResults.find(result => result.node && result.node.name === child.name);
              return childResult ? childResult.node : { ...child, children: null };
            });
          } else {
            newNode.children = childResults.filter(result => result.node !== null).map(result => result.node);
          }
          return { node: newNode, matchDepth: newMatchDepth };
        }
      }

      return { node: null, matchDepth: -1 };
    };

    return filterNode(node).node;
  }, []);

  const removeVacantPositions = useCallback((node) => {
    if (!node) return null;
    
    const isVacant = node.person_id === "nan";
    
    if (isVacant) return null;
    
    const newNode = { ...node };
    
    if (node.children && node.children.length > 0) {
      newNode.children = node.children
        .map(removeVacantPositions)
        .filter(Boolean);
    }
    
    return newNode;
  }, []);

  const processOrganizationData = useCallback((serverResponse) => {
    if (!serverResponse) return null;
    
    const { organization_data } = serverResponse;
    
    const orgMap = new Map();
    organization_data.forEach(org => {
      orgMap.set(org.organization_name, {
        name: org.organization_name,
        role: `${org.member_count} member${org.member_count !== 1 ? 's' : ''}`,
        department: org.departments.join(", "),
        hierarchical_structure: org.path,
        isOrgNode: true,
        memberCount: org.member_count,
        departments: org.departments,
        level: org.level,
        children: [],
      });
    });
    
    organization_data.forEach(org => {
      if (org.parent) {
        const parentNode = orgMap.get(org.parent);
        const currentNode = orgMap.get(org.organization_name);
        if (parentNode && currentNode) {
          parentNode.children.push(currentNode);
        }
      }
    });
    
    const rootOrgs = organization_data
      .filter(org => org.parent === null)
      .map(org => orgMap.get(org.organization_name))
      .filter(Boolean);
    
    orgMap.forEach(org => {
      if (org.children.length > 0) {
        org.children.sort((a, b) => a.name.localeCompare(b.name));
      }
    });
    
    if (rootOrgs.length > 1) {
      return {
        name: "All Organizations",
        organization_name: "All Organizations",
        role: `${rootOrgs.length} organizations`,
        hierarchical_structure: "/",
        isOrgNode: true,
        children: rootOrgs.sort((a, b) => a.name.localeCompare(b.name))
      };
    } else if (rootOrgs.length === 1) {
      return rootOrgs[0];
    }
    
    return null;
  }, []);

  const findNodesInTree = useCallback((originalTree, searchResults) => {
    if (!originalTree || !searchResults || searchResults.length === 0) {
      return originalTree;
    }
  
    const targetStructures = new Set(searchResults.map(result => result.hierarchical_structure));
  
    const markNodesInPath = (node, targetStructures) => {
      if (!node) return false;
  
      const isTarget = targetStructures.has(node.hierarchical_structure);
  
      let hasTargetDescendant = false;
      if (node.children) {
        for (let child of node.children) {
          if (markNodesInPath(child, targetStructures)) {
            hasTargetDescendant = true;
          }
        }
      }
  
      node.visible = isTarget || hasTargetDescendant;
      return node.visible;
    };
  
    const cloneTree = (node) => {
      if (!node) return null;
      const newNode = { ...node, visible: false };
      if (node.children) {
        newNode.children = node.children.map(cloneTree);
      }
      return newNode;
    };
  
    const newTree = cloneTree(originalTree);
    markNodesInPath(newTree, targetStructures);
  
    const filterVisibleNodes = (node) => {
      if (!node || !node.visible) return null;
  
      const filteredNode = { ...node };
      delete filteredNode.visible;
  
      if (node.children) {
        filteredNode.children = node.children.map(filterVisibleNodes).filter(Boolean);
      }
  
      return filteredNode;
    };
  
    return filterVisibleNodes(newTree);
  }, []);

  const getParentNode = useCallback((hierarchicalStructure, filteredOrgData) => {
    const findParent = (node, targetStructure) => {
      if (!node) return null;
      if (node.children) {
        for (let child of node.children) {
          if (child.hierarchical_structure === targetStructure) {
            return node;
          }
          const result = findParent(child, targetStructure);
          if (result) return result;
        }
      }
      return null;
    };

    return findParent(filteredOrgData, hierarchicalStructure);
  }, []);

  return {
    filterOrgData,
    removeVacantPositions,
    processOrganizationData,
    findNodesInTree,
    getParentNode
  };
};

export default useDataProcessing;
