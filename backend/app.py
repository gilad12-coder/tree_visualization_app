from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from models import (Folder, Table, DataEntry, get_session, 
                    dispose_db, create_new_db, init_db, set_db_path, 
                    check_db_schema, is_valid_sqlite_db)
from utils import (check_continuation, process_excel_data, 
                   insert_data_entries, get_org_chart, get_person_history, 
                   get_department_structure, get_age_distribution, export_excel_data)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
import logging
from datetime import datetime
import os
import time
from contextlib import contextmanager
from sqlalchemy import func
import webbrowser
import threading
import sys
import re
from sqlalchemy import and_, or_
from datetime import datetime

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def open_browser():
    time.sleep(1)
    webbrowser.open_new('http://localhost:5000/')

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='build', static_url_path='')
CORS(app)

# Global error handler
@app.errorhandler(Exception)
def handle_exception(e):
    logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({"error": "An unexpected error occurred"}), 500

def validate_input(**expected_args):
    def decorator(f):
        def wrapper(*args, **kwargs):
            for arg, arg_type in expected_args.items():
                value = request.args.get(arg) if request.method == 'GET' else request.form.get(arg)
                if value is None:
                    return jsonify({"error": f"{arg} is required"}), 400
                try:
                    if arg_type == int:
                        value = int(value)
                    elif arg_type == datetime:
                        value = datetime.strptime(value, "%Y-%m-%d").date()
                    kwargs[arg] = value
                except ValueError:
                    return jsonify({"error": f"Invalid {arg}"}), 400
            return f(*args, **kwargs)
        return wrapper
    return decorator

@contextmanager
def session_scope():
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        
def check_if_db_has_data():
    with session_scope() as session:
        for table in [Folder, Table, DataEntry]:
            if session.query(table).first():
                return True
    return False

@app.route("/check_existing_db", methods=["POST"])
def check_existing_db():
    data = request.json
    db_path = data.get('db_path')
    if not db_path:
        return jsonify({"error": "No database path provided"}), 400

    if not os.path.exists(db_path):
        return jsonify({"error": "Database file does not exist"}), 404

    if not is_valid_sqlite_db(db_path):
        return jsonify({"error": "Invalid SQLite database file"}), 400

    schema_valid, schema_message = check_db_schema(db_path)
    if not schema_valid:
        return jsonify({"error": f"Invalid database schema: {schema_message}"}), 400

    dispose_db()
    set_db_path(db_path)

    has_data = check_if_db_has_data()

    return jsonify({
        "exists": True,
        "path": db_path,
        "hasData": has_data
    }), 200

@app.route("/create_new_db", methods=["POST"])
def create_new_db_route():
    data = request.json
    folder_path = data.get('db_path')
    db_name = data.get('db_name', 'orgchart.db')
    
    if not folder_path:
        return jsonify({"error": "Folder path is required"}), 400
    
    if not os.path.exists(folder_path):
        return jsonify({"error": "The specified directory does not exist"}), 404
    
    if not os.access(folder_path, os.W_OK):
        return jsonify({"error": "The specified directory is not writable"}), 403
    
    db_path = os.path.join(folder_path, db_name)
    logger.info(f"Attempting to create new database at: {db_path}")
    
    dispose_db()

    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            logger.info(f"Existing database {db_path} removed successfully")
        except PermissionError:
            return jsonify({"error": "Unable to remove existing database. It may be in use."}), 500
        except Exception as e:
            return jsonify({"error": f"Error removing existing database: {str(e)}"}), 500

    try:
        create_new_db(db_path)
        logger.info(f"New database created successfully at {db_path}")
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        return jsonify({"error": f"Failed to create or initialize database: {str(e)}"}), 500

    if not is_valid_sqlite_db(db_path):
        return jsonify({"error": "Failed to create a valid database"}), 500

    has_data = check_if_db_has_data()
    first_table_id = None

    if has_data:
        with session_scope() as session:
            first_table = session.query(Table).first()
            if first_table:
                first_table_id = first_table.id

    logger.info(f"New database created and initialized successfully at {db_path}")
    return jsonify({
        "message": "New database created and initialized successfully",
        "db_path": db_path,
        "hasData": has_data,
        "tableId": first_table_id
    }), 200

@app.route("/upload", methods=["POST"])
@validate_input(folder_name=str, upload_date=datetime)
def upload_file(folder_name, upload_date):
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    file_extension = file.filename.rsplit(".", 1)[1].lower()
    if file_extension not in ["csv", "xlsx"]:
        return jsonify({"error": "Unsupported file type. Please upload CSV or XLSX files."}), 400

    with session_scope() as session:
        # Retrieve the folder by name, or create a new one if it doesn't exist
        folder = session.query(Folder).filter_by(name=folder_name).first()
        if not folder:
            folder = Folder(name=folder_name)
            session.add(folder)
            session.commit()  # Commit to ensure the folder is added to the database and has an ID assigned
            
        logger.info(f"Using folder: {folder.name} (ID: {folder.id})")

        file_content = file.read()
        logger.info(f"File content read, size: {len(file_content)} bytes")

        # Check if the new table is a valid continuation of the previous one
        is_valid_continuation = check_continuation(folder.id, file_content, file_extension)
        if not is_valid_continuation:
            return jsonify({"error": "New table is not a valid continuation of the previous one"}), 400

        # Create a new Table record linked to the folder
        table = Table(name=file.filename, folder_id=folder.id, upload_date=upload_date)
        session.add(table)
        session.commit()  # Commit to ensure the table is added to the database and has an ID assigned
        
        logger.info(f"Table created: {table.name} (ID: {table.id})")

        # Process the Excel data and insert it into the DataEntry table
        df = process_excel_data(file_content, file_extension)
        insert_data_entries(session, table.id, df)
        session.commit()  # Commit to ensure all data entries are added to the database
        
        logger.info(f"File processed and data inserted successfully for table ID: {table.id}")

        logger.info(f"File upload completed successfully for table ID: {table.id}")
        return jsonify({
            "message": "File uploaded and processed successfully",
            "table_id": table.id,
            "folder_id": folder.id
        }), 200

@app.route("/folder_structure", methods=["GET"])
def fetch_folder_structure():
    with session_scope() as session:
        folders = session.query(Folder).all()
        folder_structure = []

        for folder in folders:
            tables = [
                {
                    "id": table.id,
                    "name": table.name,
                    "upload_date": (table.upload_date.isoformat() if table.upload_date else None),
                }
                for table in folder.tables
            ]
            folder_structure.append({
                "id": folder.id,
                "name": folder.name,
                "tables": tables,
            })

        return jsonify(folder_structure), 200

#TODO: Utilize the table upload date.
@app.route("/view_tables", methods=["GET"])
def view_tables():
    with session_scope() as session:
        tables = session.query(Table).all()
        return jsonify([{"id": t.id, "name": t.name} for t in tables]), 200

@app.route("/org_data", methods=["GET"], endpoint='get_org_data')
@validate_input(table_id=int)
def get_org_data(table_id):
    org_chart = get_org_chart(table_id)
    return jsonify(org_chart), 200

@app.route("/person_history/<int:person_id>", methods=["GET"])
def fetch_person_history(person_id):
    history = get_person_history(person_id)
    return jsonify(history), 200

@app.route("/department_structure", methods=["GET"], endpoint='fetch_department_structure')
@validate_input(table_id=int, department=str)
def fetch_department_structure(table_id, department):
    structure = get_department_structure(table_id, department)
    return jsonify(structure), 200

@app.route("/age_distribution/<int:table_id>", methods=["GET"])
def fetch_age_distribution(table_id):
    distribution = get_age_distribution(table_id)
    return jsonify(distribution), 200

#TODO: Fix the CV part.
@app.route("/timeline/<int:folder_id>", methods=["GET"])
def get_timeline(folder_id):
    """
    Generate a timeline and CV for a person based on organizational data.
    
    Args:
    folder_id (int): The ID of the folder containing the data tables
    
    Query Parameters:
    person_id (str): The ID of the person to generate the timeline/CV for
    table_id (str): Optional. If provided, only process up to this table ID
    
    Returns:
    JSON: A dictionary containing the timeline and CV data
    """
    person_id = request.args.get('person_id')
    table_id = request.args.get('table_id')
    
    try:
        with session_scope() as session:
            tables = (
                session.query(Table)
                .filter_by(folder_id=folder_id)
                .order_by(Table.upload_date)
                .all()
            )
            
            if not tables:
                return jsonify({"error": f"No tables found in folder {folder_id}"}), 404
            
            if table_id:
                table_id = int(table_id)
                if table_id not in [table.id for table in tables]:
                    return jsonify({"error": f"Table with id {table_id} not found in folder {folder_id}"}), 404
            
            logger.info(f"Processing {len(tables)} tables for folder {folder_id}")
            
            timeline = []
            cv = []
            current_role = None
            
            for table in tables:
                org_tree = get_org_chart(table.id)  # Assuming this function exists and returns the org tree
                
                timeline_entry = {
                    "table_id": table.id,
                    "name": table.name,
                    "upload_date": table.upload_date.isoformat(),
                    "org_tree": org_tree,
                }
                
                if person_id:
                    person_node = find_person_in_tree(org_tree, person_id)
                    if person_node:
                        timeline_entry["person_info"] = {
                            "name": person_node.get('name'),
                            "role": person_node.get('role'),
                            "department": person_node.get('department'),
                            "rank": person_node.get('rank')
                        }
                        
                        if current_role is None or current_role['role'] != person_node['role']:
                            if current_role:
                                cv.append({
                                    "role": current_role['role'],
                                    "department": current_role['department'],
                                    "startDate": current_role['start_date'],
                                    "endDate": table.upload_date.isoformat()
                                })
                            current_role = {
                                "role": person_node['role'],
                                "department": person_node['department'],
                                "start_date": table.upload_date.isoformat()
                            }
                
                timeline.append(timeline_entry)
                
                if table_id and table.id == table_id:
                    break
            
            if current_role:
                cv.append({
                    "role": current_role['role'],
                    "department": current_role['department'],
                    "startDate": current_role['start_date'],
                    "endDate": None
                })
            
            result = {
                "timeline": timeline,
                "cv": cv if person_id else None
            }
            
            return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Error processing timeline for folder {folder_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while processing the timeline"}), 500

@app.route("/folders", methods=["GET"])
def get_folders_list():
    db_path = request.args.get('db_path')
    if not db_path:
        return jsonify({"error": "No database path provided"}), 400

    if not os.path.exists(db_path):
        return jsonify({"error": "Database file does not exist"}), 404

    if not is_valid_sqlite_db(db_path):
        return jsonify({"error": "Invalid SQLite database file"}), 400

    dispose_db()
    set_db_path(db_path)
    init_db()

    session = get_session()
    try:
        folders = session.query(Folder).all()
        folders_list = [{"id": folder.id, "name": folder.name} for folder in folders]
        return jsonify(folders_list), 200
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_folders_list: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Unexpected error in get_folders_list: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
    finally:
        session.close()
        
@app.route("/compare_tables/<int:folder_id>", methods=["GET"], endpoint='compare_tables')
@validate_input(table1_id=int, table2_id=int)
def compare_tables(folder_id, table1_id, table2_id):
    with session_scope() as session:
        table1 = session.query(Table).filter_by(id=table1_id, folder_id=folder_id).first()
        table2 = session.query(Table).filter_by(id=table2_id, folder_id=folder_id).first()
        
        if not table1 or not table2:
            return jsonify({"error": "One or both tables not found in the specified folder"}), 404
        
        data1 = session.query(DataEntry).filter_by(table_id=table1.id).all()
        data2 = session.query(DataEntry).filter_by(table_id=table2.id).all()
        
        changes = compare_org_data(data1, data2)
        aggregated_report = generate_aggregated_report(changes, data1, data2)
        
        report = {
            "table1": {
                "id": table1.id,
                "name": table1.name,
                "upload_date": table1.upload_date.isoformat()
            },
            "table2": {
                "id": table2.id,
                "name": table2.name,
                "upload_date": table2.upload_date.isoformat()
            },
            "changes": changes,
            "aggregated_report": aggregated_report
        }
        
        return jsonify(report), 200

def compare_org_data(data1, data2):
    changes = {
        "added": [],
        "removed": [],
        "changed": [],
        "department_changes": {},
        "role_changes": {},
        "rank_changes": {},
        "reporting_line_changes": {}
    }
    
    data1_dict = {entry.person_id: entry for entry in data1}
    data2_dict = {entry.person_id: entry for entry in data2}
    
    for person_id, entry2 in data2_dict.items():
        if person_id not in data1_dict:
            changes["added"].append(entry_to_dict(entry2))
        else:
            entry1 = data1_dict[person_id]
            if entry1.department != entry2.department:
                changes["department_changes"][person_id] = {
                    "name": entry2.name,
                    "old": entry1.department,
                    "new": entry2.department
                }
            if entry1.role != entry2.role:
                changes["role_changes"][person_id] = {
                    "name": entry2.name,
                    "old": entry1.role,
                    "new": entry2.role
                }
            if entry1.rank != entry2.rank:
                changes["rank_changes"][person_id] = {
                    "name": entry2.name,
                    "old": entry1.rank,
                    "new": entry2.rank
                }
            if entry1.hierarchical_structure != entry2.hierarchical_structure:
                changes["reporting_line_changes"][person_id] = {
                    "name": entry2.name,
                    "old": entry1.hierarchical_structure,
                    "new": entry2.hierarchical_structure
                }
            if any([
                entry1.department != entry2.department,
                entry1.role != entry2.role,
                entry1.rank != entry2.rank,
                entry1.hierarchical_structure != entry2.hierarchical_structure
            ]):
                changes["changed"].append({
                    "person_id": person_id,
                    "name": entry2.name,
                    "changes": {
                        "department": (entry1.department, entry2.department),
                        "role": (entry1.role, entry2.role),
                        "rank": (entry1.rank, entry2.rank),
                        "hierarchical_structure": (entry1.hierarchical_structure, entry2.hierarchical_structure)
                    }
                })
    
    for person_id, entry1 in data1_dict.items():
        if person_id not in data2_dict:
            changes["removed"].append(entry_to_dict(entry1))
    
    return changes

def generate_aggregated_report(changes, data1, data2):
    return {
        "total_employees": {
            "before": len(data1),
            "after": len(data2),
            "difference": len(data2) - len(data1)
        },
        "department_changes": summarize_changes(changes["department_changes"]),
        "role_changes": summarize_changes(changes["role_changes"]),
        "rank_changes": summarize_changes(changes["rank_changes"]),
        "reporting_line_changes": summarize_changes(changes["reporting_line_changes"]),
        "structural_changes": len(changes["changed"]),
        "new_employees": len(changes["added"]),
        "departed_employees": len(changes["removed"]),
        "age_distribution_change": compare_age_distributions(data1, data2),
        "rank_distribution_change": compare_rank_distributions(data1, data2),
        "department_size_changes": compare_department_sizes(data1, data2),
        "role_diversity": compare_role_diversity(data1, data2),
        "org_depth_analysis": compare_org_depths(data1, data2),
        "span_of_control_changes": compare_span_of_control(data1, data2),
        "turnover_rate": calculate_turnover_rate(changes, data1),
        "promotion_rate": calculate_promotion_rate(changes, data1)
    }

def summarize_changes(changes):
    return {
        "total": len(changes),
        "details": changes
    }

def compare_age_distributions(data1, data2):
    def get_age_distribution(data):
        current_year = datetime.now().year
        ages = [current_year - datetime.strptime(entry.birth_date, "%Y-%m-%d").year for entry in data]
        return {
            "average": sum(ages) / len(ages) if ages else 0,
            "min": min(ages) if ages else 0,
            "max": max(ages) if ages else 0,
            "median": sorted(ages)[len(ages) // 2] if ages else 0
        }
    
    dist1 = get_age_distribution(data1)
    dist2 = get_age_distribution(data2)
    
    return {
        "before": dist1,
        "after": dist2,
        "average_change": dist2["average"] - dist1["average"],
        "median_change": dist2["median"] - dist1["median"]
    }

def compare_rank_distributions(data1, data2):
    def get_rank_distribution(data):
        ranks = [entry.rank for entry in data]
        return {rank: ranks.count(rank) for rank in set(ranks)}
    
    dist1 = get_rank_distribution(data1)
    dist2 = get_rank_distribution(data2)
    
    all_ranks = set(list(dist1.keys()) + list(dist2.keys()))
    
    changes = {}
    for rank in all_ranks:
        before = dist1.get(rank, 0)
        after = dist2.get(rank, 0)
        if before != after:
            changes[rank] = after - before
    
    return changes

def compare_department_sizes(data1, data2):
    def get_department_sizes(data):
        departments = [entry.department for entry in data]
        return {dept: departments.count(dept) for dept in set(departments)}
    
    sizes1 = get_department_sizes(data1)
    sizes2 = get_department_sizes(data2)
    
    all_departments = set(list(sizes1.keys()) + list(sizes2.keys()))
    
    changes = {}
    for dept in all_departments:
        before = sizes1.get(dept, 0)
        after = sizes2.get(dept, 0)
        if before != after:
            changes[dept] = {
                "before": before,
                "after": after,
                "change": after - before,
                "percent_change": ((after - before) / before * 100) if before > 0 else float('inf')
            }
    
    return changes

def compare_role_diversity(data1, data2):
    def get_role_diversity(data):
        roles = [entry.role for entry in data]
        unique_roles = len(set(roles))
        return {
            "unique_roles": unique_roles,
            "role_to_employee_ratio": unique_roles / len(data) if data else 0
        }
    
    div1 = get_role_diversity(data1)
    div2 = get_role_diversity(data2)
    
    return {
        "before": div1,
        "after": div2,
        "unique_roles_change": div2["unique_roles"] - div1["unique_roles"],
        "ratio_change": div2["role_to_employee_ratio"] - div1["role_to_employee_ratio"]
    }

def compare_org_depths(data1, data2):
    def get_max_depth(data):
        return max(len(entry.hierarchical_structure.split('/')) for entry in data)
    
    depth1 = get_max_depth(data1)
    depth2 = get_max_depth(data2)
    
    return {
        "before": depth1,
        "after": depth2,
        "change": depth2 - depth1
    }

def compare_span_of_control(data1, data2):
    def get_avg_span(data):
        manager_counts = {}
        for entry in data:
            manager = '/'.join(entry.hierarchical_structure.split('/')[:-1])
            if manager:
                manager_counts[manager] = manager_counts.get(manager, 0) + 1
        return sum(manager_counts.values()) / len(manager_counts) if manager_counts else 0
    
    span1 = get_avg_span(data1)
    span2 = get_avg_span(data2)
    
    return {
        "before": span1,
        "after": span2,
        "change": span2 - span1
    }

def calculate_turnover_rate(changes, data1):
    departed = len(changes["removed"])
    total_before = len(data1)
    return (departed / total_before) * 100 if total_before > 0 else 0

def calculate_promotion_rate(changes, data1):
    promotions = sum(1 for change in changes["rank_changes"].values() if change["old"] < change["new"])
    total_before = len(data1)
    return (promotions / total_before) * 100 if total_before > 0 else 0

def entry_to_dict(entry):
    return {
        "person_id": entry.person_id,
        "name": entry.name,
        "role": entry.role,
        "department": entry.department,
        "rank": entry.rank,
        "hierarchical_structure": entry.hierarchical_structure
    }
    
@app.route("/highlight_nodes", methods=["GET"], endpoint='highlight_nodes')
@validate_input(node_name=str, table_id=int)
def highlight_nodes(node_name, table_id):
    org_chart = get_org_chart(table_id)
    #TODO: Make the find node path function rely on the ID of the node instead of the name.
    highlighted_nodes = find_node_path(org_chart, node_name)
    
    if highlighted_nodes is None:
        return jsonify({"error": f"Node '{node_name}' not found in the organization chart"}), 404

    return jsonify({"highlighted_nodes": highlighted_nodes}), 200

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

def find_person_in_tree(node, target_person_id):
    """
    Recursively search for a person in the organization tree.
    
    Args:
    node (dict): The current node in the org tree
    target_person_id (str): The ID of the person to find
    
    Returns:
    dict: The node containing the person, or None if not found
    """
    if str(node.get('person_id')) == str(target_person_id):
        return node
    
    for child in node.get('children', []):
        result = find_person_in_tree(child, target_person_id)
        if result:
            return result
    
    return None

def find_node_path(node, target_name):
    def dfs(current_node, path):
        if current_node['name'] == target_name:
            return path + [current_node['name']]
        
        for child in current_node.get('children', []):
            result = dfs(child, path + [current_node['name']])
            if result:
                return result
        
        return None

    return dfs(node, [])

@app.route("/search/<int:folder_id>/<int:table_id>", methods=["GET"])
def search_nodes(folder_id, table_id):
    """
    Search for nodes in organizational data based on keywords and operators.
    
    Args:
    folder_id (int): The ID of the folder containing the data tables
    table_id (int): The ID of the table to search within
    
    Query Parameters:
    query (str): The search query with keywords and operators
    column (str): The name of the column to search in
    
    Returns:
    JSON: A dictionary containing the search results
    """
    query = request.args.get('query')
    column = request.args.get('column')

    if not query or not column:
        return jsonify({"error": "Query and column are required"}), 400

    try:
        with session_scope() as session:
            table = (
                session.query(Table)
                .filter_by(id=table_id, folder_id=folder_id)
                .first()
            )
            
            if not table:
                return jsonify({"error": f"Table with id {table_id} not found in folder {folder_id}"}), 404
            
            logger.info(f"Searching table {table_id} in folder {folder_id} for column {column}")
            
            results = search_table(session, table_id, query, column)
            
            return jsonify({
                "results": results,
                "total_results": len(results),
                "query": query,
                "column_searched": column,
                "folder_id": folder_id,
                "table_id": table_id
            }), 200
    
    except Exception as e:
        logger.error(f"Error searching in folder {folder_id}, table {table_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while searching"}), 500

def search_table(session, table_id, query, column):
    # Parse the query into keywords and operators
    parsed_query = parse_query(query)
    
    # Build the SQLAlchemy query
    base_query = session.query(DataEntry).filter(DataEntry.table_id == table_id)
    
    conditions = []
    for item in parsed_query:
        if isinstance(item, list):  # AND group
            and_conditions = []
            for keyword in item:
                and_conditions.append(getattr(DataEntry, column).ilike(f'%{keyword}%'))
            conditions.append(and_conditions)
        elif item.lower() == 'or':
            continue  # Skip 'or', it's handled by combining conditions with or_()
        else:  # Single keyword
            conditions.append([getattr(DataEntry, column).ilike(f'%{item}%')])
    
    # Combine all conditions with OR
    final_condition = or_(*[and_(*condition_group) for condition_group in conditions])
    results = base_query.filter(final_condition).all()
    
    # Prepare the results
    search_results = []
    for entry in results:
        result = {
            'person_id': entry.person_id,
            'name': entry.name,
            'role': entry.role,
            'department': entry.department,
            'matched_terms': get_matched_terms(getattr(entry, column), parsed_query),
            'hierarchical_structure': entry.hierarchical_structure
        }
        search_results.append(result)
    
    return search_results

def parse_query(query):
    # Split the query into words, preserving quoted phrases
    words = re.findall(r'"[^"]*"|\S+', query)
    
    parsed = []
    current_and_group = []
    
    for word in words:
        if word.lower() == 'or':
            if current_and_group:
                parsed.append(current_and_group)
                current_and_group = []
            parsed.append(word)
        elif word.startswith('"') and word.endswith('"'):
            current_and_group.append(word[1:-1])  # Remove quotes
        elif word == '+':
            continue  # Skip '+' as it's implied in AND groups
        else:
            current_and_group.append(word)
    
    if current_and_group:
        parsed.append(current_and_group)
    
    return parsed

def get_matched_terms(text, parsed_query):
    matched = []
    text_lower = text.lower()
    
    for item in parsed_query:
        if isinstance(item, list):  # AND group
            if all(keyword.lower() in text_lower for keyword in item):
                matched.extend(item)
        elif item.lower() != 'or':  # Single keyword
            if item.lower() in text_lower:
                matched.append(item)
    
    return list(set(matched))  # Remove duplicates

@app.route("/export_excel/<int:table_id>", methods=["GET"])
def export_excel(table_id):
    try:
        with session_scope() as session:
            table = session.query(Table).filter_by(id=table_id).first()
            if not table:
                return jsonify({"error": f"Table with id {table_id} not found"}), 404
            
            excel_data = export_excel_data(session, table_id)
            
            return send_file(
                excel_data,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=f"org_data_table_{table_id}.xlsx"
            )
    
    except Exception as e:
        logger.error(f"Error exporting Excel for table {table_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while exporting the Excel file"}), 500

if __name__ == "__main__":
    print("Starting application...")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Static folder path: {app.static_folder}")
    print(f"MEIPASS (if packaged): {getattr(sys, '_MEIPASS', 'Not packaged')}")
    
    threading.Thread(target=open_browser).start()
    app.run(host='0.0.0.0', port=5000, use_reloader=False)