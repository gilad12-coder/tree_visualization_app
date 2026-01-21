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