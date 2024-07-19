export const extractNamesAndRoles = (data) => {
  if (!data || typeof data !== 'object') {
    console.warn('Invalid data provided to extractNamesAndRoles');
    return { names: [], roles: [] };
  }

  const names = new Set();
  const roles = new Set();

  const traverse = (node) => {
    if (node && typeof node === 'object') {
      if (node.name) names.add(node.name);
      if (node.role) roles.add(node.role);
      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    }
  };

  traverse(data);
  return {
    names: Array.from(names),
    roles: Array.from(roles)
  };
};