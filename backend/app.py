from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from models import (Folder, Table, DataEntry, get_session, 
                    dispose_db, create_new_db, init_db, set_db_path, 
                    check_db_schema, is_valid_sqlite_db)
from utils import (process_excel_data, 
                   insert_data_entries, get_org_chart, get_person_history, 
                   get_department_structure, get_age_distribution, export_excel_data, generate_hierarchical_structure)
from sqlalchemy.exc import SQLAlchemyError
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
from sqlalchemy import and_, or_, not_, inspect
from datetime import datetime, date

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
    logger.info(f"Starting upload process for folder: {folder_name}")
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    file_extension = file.filename.rsplit(".", 1)[1].lower()
    if file_extension not in ["csv", "xlsx"]:
        return jsonify({"error": "Unsupported file type. Please upload CSV or XLSX files."}), 400

    new_folder_created = False
    new_folder_id = None
    with session_scope() as session:
        try:
            # Attempt to retrieve or create the folder
            logger.info(f"Checking for existing folder: {folder_name}")
            folder = session.query(Folder).filter_by(name=folder_name).first()
            if not folder:
                logger.info(f"Folder {folder_name} not found. Creating new folder.")
                folder = Folder(name=folder_name)
                session.add(folder)
                session.flush()  # Flush to get the folder ID
                new_folder_created = True
                new_folder_id = folder.id
            logger.info(f"Using folder: {folder.name} (ID: {folder.id}), new folder created: {new_folder_created}")

            # Process file and create table
            file_content = file.read()
            logger.info(f"File content read, size: {len(file_content)} bytes")

            table = Table(name=file.filename, folder_id=folder.id, upload_date=upload_date)
            session.add(table)
            session.flush()  # Flush to get the table ID
            logger.info(f"Table created: {table.name} (ID: {table.id})")

            # Process the data and insert entries
            df = process_excel_data(file_content, file_extension)
            insert_data_entries(session, table.id, df)
            
            logger.info(f"File processed and data inserted successfully for table ID: {table.id}")
            session.commit()
            logger.info(f"Upload completed successfully for folder: {folder_name}, table ID: {table.id}")
            
            return jsonify({
                "message": "File uploaded and processed successfully",
                "table_id": table.id,
                "folder_id": folder.id
            }), 200

        except Exception as e:
            logger.error(f"Error during file upload: {str(e)}")
            session.rollback()
            
            if new_folder_created and new_folder_id:
                try:
                    # Start a new session to delete the folder
                    with session_scope() as new_session:
                        folder_to_delete = new_session.query(Folder).get(new_folder_id)
                        if folder_to_delete:
                            new_session.delete(folder_to_delete)
                            new_session.commit()
                            logger.info(f"Newly created folder removed: {folder_name} (ID: {new_folder_id})")
                        else:
                            logger.warning(f"Folder not found for deletion: {folder_name} (ID: {new_folder_id})")
                except Exception as delete_error:
                    logger.error(f"Error while attempting to delete folder: {str(delete_error)}")
            
            return jsonify({"error": str(e)}), 500

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
    org_chart, log = get_org_chart(table_id)
    response = {"org_chart": org_chart}
    if log:
        response["log"] = log
    return jsonify(response), 200

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
                org_tree, _ = get_org_chart(table.id)  # Ignoring the log
                
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
        ages = []
        for entry in data:
            if isinstance(entry.birth_date, str):
                try:
                    birth_year = datetime.strptime(entry.birth_date, "%Y-%m-%d").year
                except ValueError:
                    continue  # Skip if the string is not in the correct format
            elif isinstance(entry.birth_date, date):
                birth_year = entry.birth_date.year
            else:
                continue  # Skip if birth_date is neither string nor date
            ages.append(current_year - birth_year)
        
        if not ages:
            return {"average": 0, "min": 0, "max": 0, "median": 0}
        
        return {
            "average": sum(ages) / len(ages),
            "min": min(ages),
            "max": max(ages),
            "median": sorted(ages)[len(ages) // 2]
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
            percent_change = ((after - before) / before * 100) if before > 0 else None
            changes[dept] = {
                "before": before,
                "after": after,
                "change": after - before,
                "percent_change": percent_change
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
@validate_input(person_id=int, table_id=int)
def highlight_nodes(person_id, table_id):
    org_chart = get_org_chart(table_id)[0]
    highlighted_nodes = find_node_path(org_chart, person_id)
    
    if highlighted_nodes is None:
        return jsonify({"error": f"Node with person_id '{person_id}' not found in the organization chart"}), 404

    return jsonify({"highlighted_nodes": highlighted_nodes}), 200

def find_node_path(node, target_id):
    def dfs(current_node, path):
        if current_node['person_id'] == target_id:
            return path + [current_node['person_id']]
        
        for child in current_node.get('children', []):
            result = dfs(child, path + [current_node['person_id']])
            if result:
                return result
        
        return None

    return dfs(node, [])

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

@app.route("/columns/<int:folder_id>/<int:table_id>", methods=["GET"])
def get_available_columns(folder_id, table_id):
    logger.info(f"Fetching available columns for folder_id: {folder_id}, table_id: {table_id}")
    
    try:
        with session_scope() as session:
            table = (
                session.query(Table)
                .filter_by(id=table_id, folder_id=folder_id)
                .first()
            )
            
            if not table:
                logger.error(f"Table with id {table_id} not found in folder {folder_id}")
                return jsonify({"error": f"Table with id {table_id} not found in folder {folder_id}"}), 404
            
            columns = [column.key for column in inspect(DataEntry).columns if column.key not in ['id', 'table_id']]
            
            logger.info(f"Available columns: {columns}")
            
            return jsonify({
                "columns": columns,
                "folder_id": folder_id,
                "table_id": table_id
            }), 200
    
    except Exception as e:
        logger.exception(f"Error fetching columns for folder {folder_id}, table {table_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while fetching columns"}), 500

@app.route("/search/<int:folder_id>/<int:table_id>", methods=["GET"])
def search_nodes(folder_id, table_id):
    query = request.args.get('query', '')
    columns = request.args.get('columns', '').split(',')
    
    logger.info(f"Search request received for folder_id: {folder_id}, table_id: {table_id}, query: '{query}', columns: {columns}")
    
    try:
        with session_scope() as session:
            table = (
                session.query(Table)
                .filter_by(id=table_id, folder_id=folder_id)
                .first()
            )
            
            if not table:
                logger.error(f"Table with id {table_id} not found in folder {folder_id}")
                return jsonify({"error": f"Table with id {table_id} not found in folder {folder_id}"}), 404
            
            logger.info(f"Searching table {table_id} in folder {folder_id} across specified columns: {columns}")
            
            if query:
                results = search_table_specified_columns(session, table_id, query, columns)
            else:
                results = get_all_results(session, table_id)
            
            logger.info(f"Search completed. Total results: {len(results)}")
            
            return jsonify({
                "results": results,
                "total_results": len(results),
                "query": query,
                "columns": columns,
                "folder_id": folder_id,
                "table_id": table_id
            }), 200
    
    except Exception as e:
        logger.exception(f"Error searching in folder {folder_id}, table {table_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while searching"}), 500

def get_all_results(session, table_id):
    logger.info(f"Fetching all results for table with ID: {table_id}")

    results = session.query(DataEntry).filter(DataEntry.table_id == table_id).all()
    logger.info(f"Query executed. Number of results found: {len(results)}")

    search_results = []
    for entry in results:
        result = {
            'person_id': entry.person_id,
            'name': entry.name,
            'role': entry.role,
            'department': entry.department,
            'rank': entry.rank,
            'organization_id': entry.organization_id,
            'matched_terms': [],
            'hierarchical_structure': entry.hierarchical_structure
        }
        search_results.append(result)
        logger.debug(f"Result added for person_id: {entry.person_id}")

    logger.info("All results fetched and prepared.")
    
    return search_results

def search_table_specified_columns(session, table_id, query, columns):
    logger.info(f"Starting search in table with ID: {table_id} for query: '{query}' across columns: {columns}")

    parsed_query = parse_complex_query(query)
    logger.info(f"Parsed query: {parsed_query}")

    base_query = session.query(DataEntry).filter(DataEntry.table_id == table_id)
    logger.info(f"Base query created for table_id: {table_id}")

    all_columns = [column.key for column in DataEntry.__table__.columns if column.key not in ['id', 'table_id']]
    valid_columns = [col for col in columns if col in all_columns]
    
    if not valid_columns:
        valid_columns = all_columns  # If no valid columns specified, search all columns

    # Build the main condition
    main_condition = build_sqlalchemy_condition(parsed_query, valid_columns)
    
    # Log the SQL query
    query_sql = str(base_query.filter(main_condition).statement.compile(compile_kwargs={"literal_binds": True}))
    logger.info(f"SQL query: {query_sql}")

    results = base_query.filter(main_condition).all()
    logger.info(f"Query executed. Number of results found: {len(results)}")

    search_results = []
    for entry in results:
        matched_terms = []
        matched_columns = []

        for column in valid_columns:
            column_value = str(getattr(entry, column))
            column_matches = get_matched_terms(column_value, parsed_query)
            
            if column_matches:
                matched_terms.extend(column_matches)
                matched_columns.append(column)

        result = {
            'person_id': entry.person_id,
            'name': entry.name,
            'role': entry.role,
            'department': entry.department,
            'rank': entry.rank,
            'organization_id': entry.organization_id,
            'matched_terms': list(set(matched_terms)),  # Remove duplicates
            'hierarchical_structure': entry.hierarchical_structure,
            'matched_columns': matched_columns
        }
        search_results.append(result)
        logger.debug(f"Result added: {result}")

    logger.info(f"Search completed and results prepared. Total results: {len(search_results)}")
    
    return search_results

def parse_complex_query(query):
    logger.info(f"Parsing complex query: '{query}'")

    def tokenize(s):
        # Split on spaces, but keep quoted strings and parentheses together
        tokens = re.findall(r'([()]|\w+|"[^"]*")', s)
        logger.debug(f"Tokenized query: {tokens}")
        return tokens

    def parse_expression(tokens):
        result = []
        while tokens:
            token = tokens.pop(0)
            if token == '(':
                subexpr, tokens = parse_expression(tokens)
                if result and result[-1] == 'NOT':
                    result[-1] = ['NOT', subexpr]
                else:
                    result.append(subexpr)
            elif token == ')':
                return result, tokens
            elif token == 'NOT':
                if tokens and tokens[0] == '(':
                    subexpr, tokens = parse_expression(tokens[1:])
                    result.append(['NOT', subexpr])
                else:
                    next_token = tokens.pop(0) if tokens else None
                    result.append(['NOT', next_token])
            else:
                result.append(token)
        return result, []

    try:
        tokens = tokenize(query)
        parsed_query, _ = parse_expression(tokens)
        
        # Flatten the list if it's unnecessarily nested
        while len(parsed_query) == 1 and isinstance(parsed_query[0], list):
            parsed_query = parsed_query[0]
        
        logger.info(f"Parsed complex query result: {parsed_query}")
        return parsed_query
    except Exception as e:
        logger.error(f"Error parsing query '{query}': {str(e)}")
        raise ValueError(f"Invalid query format: {str(e)}")

def build_sqlalchemy_condition(parsed_query, columns):
    logger.info(f"Building SQLAlchemy condition for parsed query: {parsed_query}")
    
    def build_condition(expr):
        logger.debug(f"Building condition for expression: {expr}")
        if isinstance(expr, list):
            if len(expr) == 1:
                return build_condition(expr[0])
            elif expr[0] == 'NOT':
                return not_(or_(*[build_condition([expr[1]]) for column in columns]))
            elif 'OR' in expr:
                return or_(*[build_condition(e) for e in expr if e != 'OR'])
            elif 'AND' in expr:
                return and_(*[build_condition(e) for e in expr if e != 'AND'])
            else:
                return and_(*[build_condition(e) for e in expr])
        else:
            column_conditions = []
            for column in columns:
                if expr.startswith('"') and expr.endswith('"'):
                    column_conditions.append(func.lower(getattr(DataEntry, column)) == func.lower(expr.strip('"')))
                else:
                    column_conditions.append(func.lower(getattr(DataEntry, column)).like(f"%{expr.lower()}%"))
            return or_(*column_conditions)

    try:
        condition = build_condition(parsed_query)
        logger.info(f"Built SQLAlchemy condition: {condition}")
        return condition
    except Exception as e:
        logger.error(f"Error building SQLAlchemy condition: {str(e)}")
        raise ValueError(f"Error building search condition: {str(e)}")

def get_matched_terms(text, parsed_query):
    logger.debug(f"Starting get_matched_terms with text: '{text}' and parsed query: {parsed_query}")
    
    def evaluate_and_explain(expr):
        logger.debug(f"Evaluating expression: {expr}")
        if isinstance(expr, list):
            if expr[0] == 'NOT':
                sub_result, sub_explanation = evaluate_and_explain(expr[1])
                result = not sub_result
                explanation = f"NOT ({expr[1]})" if result else None
                logger.debug(f"NOT result: {result}, explanation: {explanation}")
                return (result, explanation)
            elif 'AND' in expr:
                results = [evaluate_and_explain(e) for e in expr if e != 'AND']
                result = all(r for r, _ in results)
                explanations = [e for _, e in results if e is not None]
                explanation = " AND ".join(explanations) if result and explanations else None
                logger.debug(f"AND result: {result}, explanation: {explanation}")
                return (result, explanation)
            elif 'OR' in expr:
                results = [evaluate_and_explain(e) for e in expr if e != 'OR']
                matching_explanations = [e for r, e in results if r and e is not None]
                result = any(r for r, _ in results)
                explanation = " OR ".join(matching_explanations) if result else None
                logger.debug(f"OR result: {result}, explanation: {explanation}")
                return (result, explanation)
            else:
                return evaluate_and_explain(['AND'] + expr)
        else:
            result = expr.lower() in text.lower()
            explanation = expr if result else None
            logger.debug(f"Leaf node result: {result}, explanation: {explanation}")
            return (result, explanation)

    result, explanation = evaluate_and_explain(parsed_query)
    
    logger.info(f"Final result: {result}, Final explanation: {explanation}")
    
    if result and explanation:
        logger.info(f"Match found. Explanation: {explanation}")
        return [explanation]
    else:
        logger.info("No match found")
        return []
    
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
    
@app.route("/update_node/<int:folder_id>", methods=["POST"])
def update_node_data(folder_id):
    data = request.json
    table_ids = data.get('table_ids')
    search_query = data.get('search_query')
    search_column = data.get('search_column')
    updates = data.get('updates')

    if not table_ids or not search_query or not search_column or not updates:
        return jsonify({"error": "Missing required parameters"}), 400

    if not isinstance(table_ids, list):
        return jsonify({"error": "table_ids must be a list"}), 400

    try:
        with session_scope() as session:
            # Verify the folder exists
            folder = session.query(Folder).filter_by(id=folder_id).first()
            if not folder:
                return jsonify({"error": f"Folder with id {folder_id} not found"}), 404

            # Verify all tables exist and belong to the folder
            tables = session.query(Table).filter(Table.id.in_(table_ids), Table.folder_id == folder_id).all()
            if len(tables) != len(table_ids):
                return jsonify({"error": "One or more tables not found or don't belong to the specified folder"}), 404

            update_results = []

            for table in tables:
                # Search for the node in each table
                search_results = search_table_specified_columns(session, table.id, search_query, search_column)

                if not search_results:
                    update_results.append({
                        "table_id": table.id,
                        "status": "error",
                        "message": "No matching nodes found"
                    })
                    continue

                if len(search_results) > 1:
                    update_results.append({
                        "table_id": table.id,
                        "status": "error",
                        "message": "Multiple matching nodes found. Please refine your search."
                    })
                    continue

                # Get the single matching node
                node = search_results[0]

                # Update the node data using the update_person_data function
                updated_data = update_person_data(session, table.id, node['person_id'], updates)

                if updated_data is None:
                    update_results.append({
                        "table_id": table.id,
                        "status": "error",
                        "message": "Failed to update node data"
                    })
                else:
                    update_results.append({
                        "table_id": table.id,
                        "status": "success",
                        "updated_data": updated_data
                    })

            return jsonify({
                "message": "Update operation completed",
                "results": update_results
            }), 200

    except Exception as e:
        logger.error(f"Error updating nodes in folder {folder_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while updating the nodes"}), 500

def update_person_data(session, table_id, person_id, updates):
    """
    Update a person's data in a specific table.

    Args:
    session (Session): The database session.
    table_id (int): The ID of the table containing the person's data.
    person_id (int): The ID of the person to update.
    updates (dict): A dictionary containing the fields to update and their new values.

    Returns:
    dict: The updated person data or None if the person was not found.
    """
    try:
        # Find the person's data entry
        data_entry = session.query(DataEntry).filter_by(
            table_id=table_id,
            person_id=person_id
        ).first()

        if not data_entry:
            logger.warning(f"Person with ID {person_id} not found in table {table_id}")
            return None

        # Update fields
        for key, value in updates.items():
            if hasattr(data_entry, key) and key != 'hierarchical_structure':
                if key == 'birth_date' and value:
                    # Convert string to datetime object
                    value = datetime.strptime(value, '%Y-%m-%d').date()
                setattr(data_entry, key, value)

        # Commit the changes
        session.commit()

        # Refresh the data entry to get the updated values
        session.refresh(data_entry)

        # Prepare the updated data to return
        updated_data = {
            "person_id": data_entry.person_id,
            "name": data_entry.name,
            "role": data_entry.role,
            "department": data_entry.department,
            "rank": data_entry.rank,
            "birth_date": data_entry.birth_date.isoformat() if data_entry.birth_date else None,
            "organization_id": data_entry.organization_id,
            "hierarchical_structure": data_entry.hierarchical_structure
        }

        logger.info(f"Successfully updated data for person {person_id} in table {table_id}")
        return updated_data

    except Exception as e:
        logger.error(f"Error updating data for person {person_id} in table {table_id}: {str(e)}")
        session.rollback()
        raise

def compute_hierarchical_changes(session, table_id, person_id, hierarchical_update_params):
    current_entry = session.query(DataEntry).filter_by(table_id=table_id, person_id=person_id).first()
    if not current_entry:
        return {"error": f"Person with ID {person_id} not found in table {table_id}"}

    changes = {}

    if hierarchical_update_params.get('type') == 'create_new':
        new_parent_id = hierarchical_update_params['new_parent_id']
        new_role = hierarchical_update_params.get('new_role')
        
        if not new_role:
            return {"error": "New role must be provided for create_new operation"}

        new_parent = session.query(DataEntry).filter_by(table_id=table_id, person_id=new_parent_id).first()
        if not new_parent:
            return {"error": f"New parent node with ID {new_parent_id} not found"}

        try:
            new_hierarchy = generate_hierarchical_structure(session, table_id, new_parent.hierarchical_structure)
        except ValueError as e:
            return {"error": str(e)}

        changes['new_node'] = {
            "table_id": table_id,
            "person_id": current_entry.person_id,
            "upload_date": current_entry.upload_date,
            "hierarchical_structure": new_hierarchy,
            "name": current_entry.name,
            "role": new_role,
            "department": new_parent.department,
            "birth_date": current_entry.birth_date,
            "rank": current_entry.rank,
            "organization_id": current_entry.organization_id
        }

        changes['null_node'] = {
            "name": None,
            "department": None,
            "birth_date": None,
            "rank": None,
            "organization_id": None
        }

    elif hierarchical_update_params.get('type') == 'override':
        override_person_id = hierarchical_update_params['override_person_id']
        override_entry = session.query(DataEntry).filter_by(table_id=table_id, person_id=override_person_id).first()
        if not override_entry:
            return {"error": f"Person to override with ID {override_person_id} not found in table {table_id}"}

        changes['update_node'] = {
            "person_id": current_entry.person_id,
            "upload_date": current_entry.upload_date,
            "hierarchical_structure": override_entry.hierarchical_structure,
            "name": current_entry.name,
            "role": override_entry.role,
            "department": override_entry.department,
            "birth_date": current_entry.birth_date,
            "rank": current_entry.rank,
            "organization_id": current_entry.organization_id
        }

        changes['null_node'] = {
            "name": None,
            "department": None,
            "birth_date": None,
            "rank": None,
            "organization_id": None
        }

    return changes

def change_hierarchical_location(session, table_id, person_id, update_type, target_person_id, new_role=None):
    hierarchical_update_params = {
        'type': update_type,
        'new_parent_id' if update_type == 'create_new' else 'override_person_id': target_person_id
    }

    if update_type == 'create_new':
        if not new_role:
            return {"error": "New role must be provided for create_new operation"}
        hierarchical_update_params['new_role'] = new_role

    changes = compute_hierarchical_changes(session, table_id, person_id, hierarchical_update_params)

    if 'error' in changes:
        return changes

    try:
        if 'new_node' in changes:
            new_entry = DataEntry(**changes['new_node'])
            session.add(new_entry)

        if 'update_node' in changes:
            # Update the target entry with the current entry's data
            target_entry = session.query(DataEntry).filter_by(table_id=table_id, person_id=target_person_id).first()
            for key, value in changes['update_node'].items():
                setattr(target_entry, key, value)

        # Convert the original entry to a null node
        original_entry = session.query(DataEntry).filter_by(table_id=table_id, person_id=person_id).first()
        for key, value in changes['null_node'].items():
            setattr(original_entry, key, value)
        
        # If it's an override operation, ensure the role is retained
        if update_type == 'override':
            original_entry.role = original_entry.role  # This line ensures the role is not changed

        session.commit()
        return {"message": "Hierarchical location updated successfully", "changes": changes}
    except Exception as e:
        session.rollback()
        return {"error": f"An error occurred while updating the hierarchical location: {str(e)}"}


@app.route("/update_hierarchical_structure/<int:folder_id>/<int:table_id>", methods=["POST"])
def update_hierarchical_structure(folder_id, table_id):
    data = request.json
    person_id = data.get('person_id')
    update_type = data.get('update_type')
    target_person_id = data.get('target_person_id')
    new_role = data.get('new_role')

    if not all([person_id, update_type, target_person_id]):
        return jsonify({"error": "Missing required parameters"}), 400

    if update_type not in ['create_new', 'override']:
        return jsonify({"error": "Invalid update type. Must be 'create_new' or 'override'"}), 400

    if update_type == 'create_new' and not new_role:
        return jsonify({"error": "New role must be provided for create_new operation"}), 400

    try:
        with session_scope() as session:
            # Verify the folder and table exist
            folder = session.query(Folder).filter_by(id=folder_id).first()
            if not folder:
                return jsonify({"error": f"Folder with id {folder_id} not found"}), 404

            table = session.query(Table).filter_by(id=table_id, folder_id=folder_id).first()
            if not table:
                return jsonify({"error": f"Table with id {table_id} not found in folder {folder_id}"}), 404

            result = change_hierarchical_location(session, table_id, person_id, update_type, target_person_id, new_role)

            if 'error' in result:
                return jsonify(result), 400

            return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    print("Starting application...")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Static folder path: {app.static_folder}")
    print(f"MEIPASS (if packaged): {getattr(sys, '_MEIPASS', 'Not packaged')}")
    
    threading.Thread(target=open_browser).start()
    app.run(host='0.0.0.0', port=5000, use_reloader=False)