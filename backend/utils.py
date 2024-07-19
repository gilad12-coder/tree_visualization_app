# utils.py

import pandas as pd
import logging
import re

logging.basicConfig(level=logging.DEBUG)

def parse_org_data(df):
    logging.debug(f"Received DataFrame with {len(df)} rows")

    # Sort the DataFrame by Hierarchical_Structure to ensure parents are processed before children
    df = df.sort_values('Hierarchical_Structure')

    # Initialize a dictionary to store all nodes
    nodes = {}

    def split_structure(structure):
        # Use regex to split the structure, preserving escaped forward slashes
        return re.findall(r'/(?:\\\/|[^/])+', structure)

    for _, row in df.iterrows():
        structure = row.get('Hierarchical_Structure', '')
        name = row.get('Name', '')
        role = row.get('Role', '')

        if not structure:
            logging.warning(f"Skipping row due to missing Hierarchical_Structure: {row}")
            continue

        # Create the new node
        new_node = {"name": name, "role": role, "children": []}
        nodes[structure] = new_node

        # Split the structure into parts
        parts = split_structure(structure)

        # If not the root node, add this node as a child to its parent
        if len(parts) > 1:
            parent_structure = ''.join(parts[:-1])
            parent = nodes.get(parent_structure)
            if parent:
                parent["children"].append(new_node)
            else:
                logging.warning(f"Parent not found for node: {structure}")

    # The root is the node with structure '/1'
    root = nodes.get('/1', {})

    logging.debug(f"Returning root node: {root}")
    return root