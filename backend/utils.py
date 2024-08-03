import pandas as pd
from models import Table, DataEntry, get_session
import json
import io
import logging
import re

logging.basicConfig(level=logging.DEBUG)

def check_continuation(folder_id, file_content, file_extension):
    session = get_session()
    try:
        # Get the most recent table for the folder
        previous_table = session.query(Table).filter_by(folder_id=folder_id).order_by(Table.upload_date.desc()).first()

        # If there's no previous table, it's a valid continuation (initial upload)
        if not previous_table:
            return True

        # Get the data from the previous table
        previous_data = session.query(DataEntry).filter_by(table_id=previous_table.id).all()
        previous_df = pd.DataFrame([json.loads(entry.data) for entry in previous_data])
        previous_tree = parse_org_data(previous_df)

        # Parse the new file
        if file_extension == 'csv':
            new_df = pd.read_csv(io.BytesIO(file_content))
        else:  # xlsx
            new_df = pd.read_excel(io.BytesIO(file_content))

        new_tree = parse_org_data(new_df)

        # Check if the new tree is a valid continuation of the previous one
        return is_valid_continuation(new_tree, previous_tree)

    except Exception as e:
        print(f"Error in continuation check: {str(e)}")
        return False
    finally:
        session.close()

def parse_org_data(df, structure_col='Hierarchical_Structure', name_col='Name', role_col='Role'):
    # Sort the DataFrame by the structure column to ensure parents are processed before children
    df = df.sort_values(structure_col)

    # Initialize a dictionary to store all nodes
    nodes = {}
    root = None

    def is_rtl(text):
        # Simple check for RTL: if the string contains Hebrew characters
        return any('\u0590' <= c <= '\u05FF' for c in text)

    def split_structure(structure):
        if structure.startswith('/'):
            return structure.split('/')[1:]  # Remove empty string at the beginning
        elif '\\' in structure:
            return structure.split('\\')
        else:
            return structure.split('/')

    for _, row in df.iterrows():
        structure = row.get(structure_col, '')
        name = row.get(name_col, '')
        role = row.get(role_col, '')

        if not structure:
            continue

        # Create the new node
        new_node = {"name": name, "role": role, "children": []}
        nodes[structure] = new_node

        parts = split_structure(structure)

        # Identify the root node
        if len(parts) == 1:
            root = new_node
            continue

        # Find the parent
        if structure.startswith('/'):
            parent_structure = '/' + '/'.join(parts[:-1])
        elif '\\' in structure:
            parent_structure = '\\'.join(parts[:-1])
        elif is_rtl(structure):
            parent_structure = '/'.join(parts[:-1])
        else:
            parent_structure = '/'.join(parts[:-1])

        parent = nodes.get(parent_structure)
        if parent:
            parent["children"].append(new_node)
        else:
            print(f"Parent not found for node: {structure}")

    return root

def compare_trees(tree1, tree2):
    def get_node_set(tree):
        node_set = set()
        def traverse(node):
            node_set.add((node['name']))
            for child in node.get('children', []):
                traverse(child)
        traverse(tree)
        return node_set

    set1 = get_node_set(tree1)
    set2 = get_node_set(tree2)
    
    shared_nodes = set1.intersection(set2)
    total_nodes = set1.union(set2)
    
    if not total_nodes:
        return 0
    
    similarity_percentage = (len(shared_nodes) / len(total_nodes)) * 100
    return similarity_percentage

def is_valid_continuation(new_tree, previous_tree):
    similarity = compare_trees(new_tree, previous_tree)
    return similarity >= 50