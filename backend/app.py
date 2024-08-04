from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
from models import (Folder, Table, DataEntry, get_session, get_db_path, 
                    dispose_db, create_new_db, init_db, set_db_path, 
                    check_db_schema, is_valid_sqlite_db)
from utils import (check_continuation, process_excel_data, 
                   insert_data_entries, get_org_chart, get_person_history, 
                   get_department_structure, get_age_distribution)
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
    person_id = request.args.get('person_id')
    table_id = request.args.get('table_id')
    
    with session_scope() as session:
        tables = (
            session.query(Table)
            .filter_by(folder_id=folder_id)
            .order_by(Table.upload_date)
            .all()
        )
        
        if table_id:
            table_id = int(table_id)
            if table_id not in [table.id for table in tables]:
                return jsonify({"error": f"Table with id {table_id} not found in folder {folder_id}"}), 404
        
        logger.info(f"Processing {len(tables)} tables")
        
        timeline = []
        cv = []
        current_role = None
        
        for table in tables:
            org_tree = get_org_chart(table.id)
            
            timeline_entry = {
                "table_id": table.id,
                "name": table.name,
                "upload_date": table.upload_date.isoformat(),
                "org_tree": org_tree,
            }
            
            if person_id:
                person_node = find_person_in_tree(org_tree, person_id)
                if person_node:
                    person_role = next((role for role in person_node.get('roles', []) if str(role.get('person_id')) == person_id), None)
                    if person_role:
                        if current_role is None or current_role['role'] != person_role['role']:
                            if current_role:
                                cv.append({
                                    "role": current_role['role'],
                                    "startDate": current_role['start_date'],
                                    "endDate": table.upload_date.isoformat()
                                })
                            current_role = {
                                "role": person_role['role'],
                                "start_date": table.upload_date.isoformat()
                            }
                        timeline_entry["person_info"] = person_role
            
            timeline.append(timeline_entry)
            
            if table_id and table.id == table_id:
                break
        
        if current_role:
            cv.append({
                "role": current_role['role'],
                "startDate": current_role['start_date'],
                "endDate": None
            })
        
        result = {
            "timeline": timeline,
            "cv": cv if person_id else None
        }
        
        return jsonify(result), 200

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
        
        tree1 = get_org_chart(table1.id)
        tree2 = get_org_chart(table2.id)
        
        changes = compare_org_structures(tree1, tree2)
        aggregated_report = generate_aggregated_report(changes, tree1, tree2)
        
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
            "structure_changes": changes,
            "aggregated_report": aggregated_report
        }
        
        return jsonify(report), 200
    
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

def find_person_in_tree(node, person_id):
    for role in node.get('roles', []):
        if str(role['person_id']) == str(person_id):
            return node
    for child in node.get('children', []):
        result = find_person_in_tree(child, person_id)
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

def compare_org_structures(tree1, tree2):
    changes = []
    
    def traverse_and_compare(node1, node2, path=""):
        if node1 is None and node2 is None:
            return

        if node1 is None:
            changes.append({
                "type": "added",
                "path": path,
                "name": node2.get("name", "Unknown"),
                "roles": node2.get("roles", [])
            })
            return

        if node2 is None:
            changes.append({
                "type": "removed",
                "path": path,
                "name": node1.get("name", "Unknown"),
                "roles": node1.get("roles", [])
            })
            return

        if node1.get("name") != node2.get("name") or node1.get("roles") != node2.get("roles"):
            changes.append({
                "type": "changed",
                "path": path,
                "old": {"name": node1.get("name", "Unknown"), "roles": node1.get("roles", [])},
                "new": {"name": node2.get("name", "Unknown"), "roles": node2.get("roles", [])}
            })

        children1 = node1.get("children", []) or []
        children2 = node2.get("children", []) or []

        child_names1 = {child.get("name", f"Unknown{i}") for i, child in enumerate(children1)}
        child_names2 = {child.get("name", f"Unknown{i}") for i, child in enumerate(children2)}

        all_child_names = child_names1 | child_names2

        for child_name in all_child_names:
            child1 = next((child for child in children1 if child.get("name") == child_name), None)
            child2 = next((child for child in children2 if child.get("name") == child_name), None)
            new_path = f"{path}/{child_name}" if path else child_name
            traverse_and_compare(child1, child2, new_path)

    traverse_and_compare(tree1, tree2)
    return changes

def generate_aggregated_report(changes, tree1, tree2):
    def count_nodes(tree):
        count = 1  # Count the root
        for child in tree.get("children", []):
            count += count_nodes(child)
        return count

    total_nodes_before = count_nodes(tree1)
    total_nodes_after = count_nodes(tree2)

    structure_change_count = {
        "added": sum(1 for change in changes if change["type"] == "added"),
        "removed": sum(1 for change in changes if change["type"] == "removed"),
        "changed": sum(1 for change in changes if change["type"] == "changed")
    }

    total_changes = sum(structure_change_count.values())
    change_percentage = (total_changes / total_nodes_before) * 100 if total_nodes_before > 0 else 0

    area_changes = {}
    for change in changes:
        area = change["path"].split("/")[0] if "/" in change["path"] else "Root"
        area_changes[area] = area_changes.get(area, 0) + 1

    most_affected_areas = sorted(area_changes.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "total_nodes": {
            "before": total_nodes_before,
            "after": total_nodes_after,
            "difference": total_nodes_after - total_nodes_before
        },
        "structure_changes": structure_change_count,
        "total_changes": total_changes,
        "change_percentage": change_percentage,
        "most_affected_areas": most_affected_areas,
        "growth_rate": ((total_nodes_after - total_nodes_before) / total_nodes_before) * 100 if total_nodes_before > 0 else 0
    }

def check_if_db_has_data():
    with session_scope() as session:
        for table in [Folder, Table, DataEntry]:
            if session.query(table).first():
                return True
    return False

if __name__ == "__main__":
    # print("Starting application...")
    # print(f"Current working directory: {os.getcwd()}")
    # print(f"Static folder path: {app.static_folder}")
    # print(f"MEIPASS (if packaged): {getattr(sys, '_MEIPASS', 'Not packaged')}")
    
    # threading.Thread(target=open_browser).start()
    app.run(host='0.0.0.0', port=5000, use_reloader=False)