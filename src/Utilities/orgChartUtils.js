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

export const extractAllData = (data) => {
  if (!data || typeof data !== 'object') {
    console.warn('Invalid data provided to extractAllData');
    return {
      birth_dates: [],
      departments: [],
      names: [],
      organization_ids: [],
      person_ids: [],
      ranks: [],
      roles: []
    };
  }

  const extractedData = {
    birth_dates: new Set(),
    departments: new Set(),
    names: new Set(),
    organization_ids: new Set(),
    person_ids: new Set(),
    ranks: new Set(),
    roles: new Set()
  };

  const traverse = (node) => {
    if (node && typeof node === 'object') {
      if (node.birth_date) extractedData.birth_dates.add(node.birth_date);
      if (node.department) extractedData.departments.add(node.department);
      if (node.name) extractedData.names.add(node.name);
      if (node.organization_id) extractedData.organization_ids.add(node.organization_id);
      if (node.person_id) extractedData.person_ids.add(node.person_id);
      if (node.rank) extractedData.ranks.add(node.rank);
      if (node.role) extractedData.roles.add(node.role);

      if (Array.isArray(node.children)) {
        node.children.forEach(traverse);
      }
    }
  };

  traverse(data);

  // Convert Sets to Arrays
  return Object.fromEntries(
    Object.entries(extractedData).map(([key, value]) => [key, Array.from(value)])
  );
};