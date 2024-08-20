export const formatLogToJSON = (logString) => {
  const logLines = logString.split('\n');
  const formattedLog = {
    errors: {
      invalid_structure: [],
      disconnected_nodes: [],
      disconnected_and_excluded: []
    },
    info: {},
    summary: {
      total_errors: 0,
      error_types: []
    }
  };

  let currentCategory = null;

  logLines.forEach(line => {
    const [type, category, ...message] = line.split(' - ');
    const fullMessage = message.join(' - ').trim();

    if (type === 'ERROR') {
      if (fullMessage.startsWith('The following nodes')) {
        currentCategory = category;
      } else if (currentCategory && fullMessage.startsWith('  -')) {
        formattedLog.summary.total_errors++;
        if (!formattedLog.summary.error_types.includes(currentCategory)) {
          formattedLog.summary.error_types.push(currentCategory);
        }

        const [node, parent] = fullMessage.split(' (Expected parent: ');
        formattedLog.errors[currentCategory].push({
          node: node.replace('  - ', '').trim(),
          expected_parent: parent ? parent.replace(')', '') : null
        });
      } else {
        formattedLog.summary.total_errors++;
        if (!formattedLog.summary.error_types.includes(category)) {
          formattedLog.summary.error_types.push(category);
        }

        if (category === 'invalid_structure') {
          const [row, structure] = fullMessage.split(': Structure must start with a slash: ');
          formattedLog.errors.invalid_structure.push({
            row: row.replace('Row ', ''),
            invalid_structure: structure
          });
        }
      }
    } else if (type === 'INFO') {
      if (category === 'root_selection') {
        const [root, descendants] = fullMessage.split(' (with ');
        formattedLog.info.root_selection = {
          main_root: root.replace("Selected main root: ", ''),
          descendants: parseInt(descendants.replace(' descendants)', ''))
        };
      }
    }
  });

  return formattedLog;
};