const getAllReports = (node) => {
    let allReports = [];
    if (node.children) {
      node.children.forEach((child) => {
        allReports.push(child);
        allReports = allReports.concat(getAllReports(child));
      });
    }
    return allReports;
  };
  
  export default getAllReports;
  