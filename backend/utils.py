import pandas as pd
from models import Table, DataEntry, get_session
import io
import logging
from datetime import datetime
from sqlalchemy import func
from datetime import datetime

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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
        previous_df = pd.DataFrame([entry.__dict__ for entry in previous_data])
        previous_df = previous_df.drop('_sa_instance_state', axis=1, errors='ignore')

        # Parse the new file
        if file_extension == 'csv':
            new_df = pd.read_csv(io.BytesIO(file_content))
        else:  # xlsx
            new_df = pd.read_excel(io.BytesIO(file_content))

        # Check if the new data is a valid continuation of the previous one
        return is_valid_continuation(new_df, previous_df)

    except Exception as e:
        logger.error(f"Error in continuation check: {str(e)}")
        return False
    finally:
        session.close()

def parse_org_data(df):
    df = df.sort_values('hierarchical_structure')
    nodes = {}
    roots = []
    errors = {}
    info = {}
    disconnected_nodes = {}
    excluded_nodes = set()

    def add_error(error_type, message):
        if error_type not in errors:
            errors[error_type] = []
        errors[error_type].append(message)

    def add_info(info_type, message):
        if info_type not in info:
            info[info_type] = []
        info[info_type].append(message)

    def is_rtl(text):
        return any('\u0590' <= c <= '\u05FF' or '\u0600' <= c <= '\u06FF' for c in text)

    def split_structure(structure):
        if '\\' in structure:
            return [part for part in structure.split('\\') if part]
        elif '/' in structure:
            return [part for part in structure.split('/') if part]
        else:
            return [part for part in structure.split('/') if part]

    def count_descendants(node):
        return len(node['children']) + sum(count_descendants(child) for child in node['children'])

    def process_node(row):
        structure = row['hierarchical_structure']
        if not structure:
            add_error('missing_structure', f"Row {row.name}: Missing hierarchical structure")
            return None

        if structure in nodes:
            return nodes[structure]

        new_node = {
            "name": row.get('name', ''),
            "role": row.get('role', ''),
            "person_id": row.get('person_id', None),
            "department": row.get('department', ''),
            "birth_date": row.get('birth_date', None),
            "rank": row.get('rank', ''),
            "organization_id": row.get('organization_id', ''),
            "upload_date": datetime.now().date(),
            "children": []
        }

        if new_node['birth_date']:
            try:
                birth_date = pd.to_datetime(new_node['birth_date']).date()
                upload_date = pd.to_datetime(new_node['upload_date']).date()
                new_node['age'] = (upload_date - birth_date).days // 365
            except ValueError as e:
                add_error('invalid_date', f"Invalid birth date format for {structure} - {e}")
                new_node['age'] = None

        nodes[structure] = new_node

        parts = split_structure(structure)
        if len(parts) == 1:
            roots.append(structure)
        else:
            parent_structure = '/' + '/'.join(parts[:-1])
            if parent_structure in nodes:
                nodes[parent_structure]['children'].append(new_node)
            else:
                disconnected_nodes[structure] = parent_structure

        return new_node

    # Process all nodes
    for _, row in df.iterrows():
        structure = row['hierarchical_structure']
        if not structure.startswith('/'):
            add_error('invalid_structure', f"Row {_}: Structure must start with a slash: {structure}")
            continue
        process_node(row)

    # Select main root based on the number of descendants
    if roots:
        root_info = [(root, count_descendants(nodes[root])) for root in roots]
        main_root, main_descendants = max(root_info, key=lambda x: x[1])
        excluded_roots = [root for root in roots if root != main_root]
        
        add_info('root_selection', f"Selected main root: '{main_root}' (with {main_descendants} descendants)")
        if len(roots) > 1:
            excluded_root_info = [f"'{root}' ({count_descendants(nodes[root])} descendants)" for root in excluded_roots]
            add_info('multiple_roots', f"Additional roots found: {', '.join(excluded_root_info)}")

        # Identify excluded nodes
        for structure in nodes.keys():
            if not structure.startswith(main_root):
                excluded_nodes.add(structure)
    else:
        add_error('missing_root', "No root nodes found")
        main_root = None

    # Categorize nodes
    only_disconnected = set(disconnected_nodes.keys()) - excluded_nodes
    only_excluded = excluded_nodes - set(disconnected_nodes.keys())
    disconnected_and_excluded = set(disconnected_nodes.keys()).intersection(excluded_nodes)

    # Report on categorized nodes
    if only_disconnected:
        add_error('disconnected_nodes', "The following nodes are disconnected (parent not found):")
        for node in sorted(only_disconnected):
            add_error('disconnected_nodes', f"  - {node} (Expected parent: {disconnected_nodes[node]})")

    if only_excluded:
        add_error('excluded_nodes', f"The following nodes are not connected to the main root '{main_root}' and are excluded from the final structure:")
        for node in sorted(only_excluded):
            add_error('excluded_nodes', f"  - {node}")

    if disconnected_and_excluded:
        add_error('disconnected_and_excluded', "The following nodes are both disconnected and excluded:")
        for node in sorted(disconnected_and_excluded):
            add_error('disconnected_and_excluded', f"  - {node} (Expected parent: {disconnected_nodes[node]})")

    if info:
        print("Information about the parsed structure:")
        for info_type, info_list in info.items():
            print(f"\n{info_type.replace('_', ' ').title()}:")
            for message in info_list:
                print(f"  - {message}")

    if errors:
        print("\nErrors encountered during parsing:")
        for error_type, error_list in errors.items():
            print(f"\n{error_type.replace('_', ' ').title()}:")
            for error in error_list:
                print(f"  - {error}")
        print("\nPlease resolve these issues and try again.")
    elif not info:
        print("\nNo issues encountered during parsing.")

    return nodes[main_root] if main_root else None

def compare_id_column(previous_df, new_df):
    def get_person_id_set(df):
        person_id_set = set(df["person_id"].tolist())
        return person_id_set

    set1 = get_person_id_set(previous_df)
    set2 = get_person_id_set(new_df)
    
    shared_person_ids = set1.intersection(set2)
    total_person_ids = set1.union(set2)
    
    if not total_person_ids:
        return 0
    
    similarity_percentage = (len(shared_person_ids) / len(total_person_ids)) * 100
    logger.info(f"Found similarity percentage: {similarity_percentage}")
    return similarity_percentage

def is_valid_continuation(previous_df, new_df):
    similarity = compare_id_column(previous_df=previous_df, new_df=new_df)
    return similarity >= 50

def process_excel_data(file_content, file_extension):
    if file_extension == 'csv':
        df = pd.read_csv(io.BytesIO(file_content))
    else:  # xlsx
        df = pd.read_excel(io.BytesIO(file_content))
    
    return df


def insert_data_entries(session, table_id, df):
    if table_id is None:
        raise ValueError("table_id cannot be None")

    upload_date = datetime.now().date()
    
    # Convert all column names to lowercase for case-insensitive matching
    df.columns = df.columns.str.lower()
    
    # Ensure required columns are present (case-insensitive)
    required_columns = ['person_id', 'hierarchical_structure', 'name', 'role']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise ValueError(f"Required column(s) {', '.join(missing_columns)} are missing from the DataFrame")
    
    # Convert birth_date to datetime if the column exists
    for col in df.columns:
        df[col] = df[col].astype(str)
            
    df['birth_date'] = pd.to_datetime(df['birth_date'], errors='coerce').dt.date
    
    # Define a mapping of expected column names to DataEntry attribute names
    column_mapping = {
        'person_id': 'person_id',
        'name': 'name',
        'role': 'role',
        'hierarchical_structure': 'hierarchical_structure',
        'department': 'department',
        'birth_date': 'birth_date',
        'rank': 'rank',
        'organization_id': 'organization_id'
    }
    
    for _, row in df.iterrows():
        # Prepare a dictionary with all fields
        data_entry_dict = {
            'table_id': table_id,
            'upload_date': upload_date
        }
        
        # Populate the dictionary using the column mapping
        for df_col, entry_attr in column_mapping.items():
            if df_col in df.columns:
                value = row[df_col]
                data_entry_dict[entry_attr] = value if pd.notna(value) else None
        
        # Create the DataEntry object with the prepared dictionary
        data_entry = DataEntry(**data_entry_dict)
        session.add(data_entry)

def get_org_chart(table_id):
    session = get_session()
    try:
        data_entries = session.query(DataEntry).filter_by(table_id=table_id).all()
        df = pd.DataFrame([entry.__dict__ for entry in data_entries])
        df = df.drop('_sa_instance_state', axis=1, errors='ignore')
        
        print(parse_org_data(df))
        return parse_org_data(df)
    finally:
        session.close()

def get_person_history(person_id):
    session = get_session()
    try:
        entries = session.query(DataEntry).filter_by(person_id=person_id).order_by(DataEntry.upload_date).all()
        history = []
        for entry in entries:
            entry_dict = entry.__dict__
            entry_dict.pop('_sa_instance_state', None)
            history.append(entry_dict)
        return history
    finally:
        session.close()

def get_department_structure(table_id, department):
    session = get_session()
    try:
        entries = session.query(DataEntry).filter_by(table_id=table_id, department=department).all()
        df = pd.DataFrame([entry.__dict__ for entry in entries])
        df = df.drop('_sa_instance_state', axis=1, errors='ignore')
        
        return parse_org_data(df)
    finally:
        session.close()

def get_age_distribution(table_id):
    session = get_session()
    try:
        entries = session.query(DataEntry).filter_by(table_id=table_id).all()
        ages = [entry.age for entry in entries if entry.age is not None]
        return {
            'average': sum(ages) / len(ages) if ages else None,
            'min': min(ages) if ages else None,
            'max': max(ages) if ages else None,
            'distribution': pd.Series(ages).value_counts().sort_index().to_dict()
        }
    finally:
        session.close()
        
def export_excel_data(session, table_id):
    data_entries = session.query(DataEntry).filter_by(table_id=table_id).all()
    
    df = pd.DataFrame([
        {
            "Person ID": entry.person_id,
            "Name": entry.name,
            "Role": entry.role,
            "Department": entry.department,
            "Birth Date": entry.birth_date,
            "Rank": entry.rank,
            "Organization ID": entry.organization_id,
            "Hierarchical Structure": entry.hierarchical_structure
        }
        for entry in data_entries
    ])
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Org Data', index=False)
    
    output.seek(0)
    return output