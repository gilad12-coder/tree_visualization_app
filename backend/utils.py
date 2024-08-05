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
    # Sort the DataFrame by the structure column to ensure parents are processed before children
    df = df.sort_values('hierarchical_structure')

    # Initialize a dictionary to store all nodes
    nodes = {}
    root = None

    def is_rtl(text):
        # Check for RTL: if the string contains Hebrew or Arabic characters
        return any('\u0590' <= c <= '\u05FF' or '\u0600' <= c <= '\u06FF' for c in text)

    def split_structure(structure):
        # Handle different structure formats: numeric, forward slash, backward slash, RTL
        if '\\' in structure:
            return structure.split('\\')
        elif '/' in structure:
            return [part for part in structure.split('/') if part]
        else:
            return structure.split('/')

    for _, row in df.iterrows():
        structure = row.get('hierarchical_structure', '')
        if not structure:
            continue

        # Create the new node with all available data
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

        # Calculate age if birth_date is available
        if new_node['birth_date']:
            try:
                birth_date = pd.to_datetime(new_node['birth_date']).date()
                upload_date = pd.to_datetime(new_node['upload_date']).date()
                new_node['age'] = (upload_date - birth_date).days // 365
            except:
                new_node['age'] = None

        nodes[structure] = new_node

        parts = split_structure(structure)

        # Identify the root node
        if len(parts) == 1:
            root = new_node
            continue

        # Find the parent
        if is_rtl(structure):
            parent_structure = '/'.join(parts[:-1])
        elif structure.startswith('/') or structure.startswith('\\'):
            parent_structure = structure[:len(structure) - len(parts[-1]) - 1]
        else:
            parent_structure = '/'.join(parts[:-1])

        parent = nodes.get(parent_structure)
        if parent:
            parent["children"].append(new_node)
        else:
            print(f"Parent not found for node: {structure}")

    return root

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
    upload_date = datetime.now().date()
    
    # Ensure birth_date is in date format; handle missing or incorrectly formatted dates
    df['birth_date'] = pd.to_datetime(df['birth_date'], errors='coerce').dt.date
    
    for _, row in df.iterrows():
        data_entry = DataEntry(
            table_id=table_id,
            person_id=row['person_id'],
            upload_date=upload_date,
            hierarchical_structure=row['hierarchical_structure'],
            role=row.get('role'),  # Optional, can be None
            department=row.get('department'),  # Optional, can be None
            birth_date=row.get('birth_date'),  # Already converted to date
            rank=row.get('rank'),  # Optional, can be None
            organization_id=row.get('organization_id'),  # Optional, can be None
            name=row.get('name')  # Optional, can be None
        )
        session.add(data_entry)
    
    session.commit()

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