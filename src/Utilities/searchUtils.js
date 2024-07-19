export const searchPerson = (orgData, term) => {
    const results = [];
    const queue = [orgData];
  
    while (queue.length > 0) {
      const node = queue.shift();
      if (node.name.toLowerCase().includes(term.toLowerCase())) {
        results.push(node);
      }
      if (node.children) {
        queue.push(...node.children);
      }
    }
  
    return results;
  };
  
  export const findNodePath = (orgData, targetId) => {
    const path = [];
  
    const dfs = (node) => {
      path.push(node);
      if (node.id === targetId) {
        return true;
      }
      if (node.children) {
        for (const child of node.children) {
          if (dfs(child)) {
            return true;
          }
        }
      }
      path.pop();
      return false;
    };
  
    dfs(orgData);
    return path;
  };