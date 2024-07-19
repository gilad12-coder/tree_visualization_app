import pandas as pd

def parse_org_data(df):
    def add_node(structure, name, role):
        parts = structure.split('/')
        current = org_structure
        for part in parts[1:]:
            if part not in current:
                current[part] = {}
            current = current[part]
        current['name'] = name
        current['role'] = role

    org_structure = {}
    df = df.sort_values('Hierarchical_Structure')
    for _, row in df.iterrows():
        add_node(row['Hierarchical_Structure'], row['Name'], row['Role'])

    def build_tree(structure):
        result = []
        for key, value in structure.items():
            if key != 'name' and key != 'role':
                node = {'name': value.get('name', f"Department {key}"),
                        'role': value.get('role', 'Department')}
                children = build_tree(value)
                if children:
                    node['children'] = children
                result.append(node)
        return result

    return {'name': 'Company', 'role': 'Organization', 'children': build_tree(org_structure)}
