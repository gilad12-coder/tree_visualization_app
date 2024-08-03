from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pandas as pd
from models import (Folder, Table, DataEntry, get_session, get_db_path, 
                    dispose_db, create_new_db, init_db, set_db_path, 
                    check_db_schema, is_valid_sqlite_db)
from utils import parse_org_data, check_continuation
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session
import logging
from datetime import datetime
import json
import io
import sys
import os
import sqlite3
import glob
import time
from contextlib import contextmanager
from sqlalchemy import func
import sys
import os
from flask import send_from_directory
import webbrowser
import threading

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
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='build', static_url_path='')
CORS(app)


@contextmanager
def retry_on_error(max_attempts=5, delay=1):
    attempts = 0
    while attempts < max_attempts:
        try:
            yield
            break
        except OSError as e:
            attempts += 1
            logger.warning(f"Operation failed. Attempt {attempts} of {max_attempts}. Error: {str(e)}")
            if attempts == max_attempts:
                raise
            time.sleep(delay)

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
    init_db()

    has_data = check_if_db_has_data(db_path)

    return jsonify({
        "exists": True,
        "path": db_path,
        "hasData": has_data
    }), 200

@app.route("/create_new_db", methods=["POST"])
def create_new_db_route():
    try:
        data = request.json
        folder_path = data.get('db_path')
        db_name = data.get('db_name', 'orgchart.db')
        
        if not folder_path:
            logger.error("No folder path provided")
            return jsonify({"error": "Folder path is required"}), 400
        
        if not os.path.exists(folder_path):
            logger.error(f"Directory does not exist: {folder_path}")
            return jsonify({"error": "The specified directory does not exist"}), 404
        
        if not os.access(folder_path, os.W_OK):
            logger.error(f"Directory is not writable: {folder_path}")
            return jsonify({"error": "The specified directory is not writable"}), 403
        
        db_path = os.path.join(folder_path, db_name)
        logger.info(f"Attempting to create new database at: {db_path}")
        
        dispose_db()

        if os.path.exists(db_path):
            try:
                os.remove(db_path)
                logger.info(f"Existing database {db_path} removed successfully")
            except PermissionError:
                logger.error(f"Unable to remove existing database {db_path}. It may be in use.")
                return jsonify({"error": "Unable to remove existing database. It may be in use."}), 500
            except Exception as e:
                logger.error(f"Error removing existing database {db_path}: {str(e)}")
                return jsonify({"error": f"Error removing existing database: {str(e)}"}), 500

        try:
            create_new_db(db_path)
            logger.info(f"New database created successfully at {db_path}")
        except Exception as e:
            logger.error(f"Failed to create new database: {str(e)}")
            return jsonify({"error": f"Failed to create new database: {str(e)}"}), 500

        try:
            init_db()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            return jsonify({"error": f"Failed to initialize database: {str(e)}"}), 500

        if not is_valid_sqlite_db(db_path):
            logger.error(f"Newly created database {db_path} is not valid")
            return jsonify({"error": "Failed to create a valid database"}), 500

        has_data = check_if_db_has_data(db_path)

        first_table_id = None
        if has_data:
            session = get_session()
            try:
                first_table = session.query(Table).first()
                if first_table:
                    first_table_id = first_table.id
            finally:
                session.close()

        logger.info(f"New database created and initialized successfully at {db_path}")
        return jsonify({
            "message": "New database created and initialized successfully",
            "db_path": db_path,
            "hasData": has_data,
            "tableId": first_table_id
        }), 200
    except Exception as e:
        logger.exception(f"Unexpected error in create_new_db: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
def get_next_folder_id(session):
    """
    Get the next available folder ID by finding the maximum current ID and adding 1.
    """
    max_id = session.query(func.max(Folder.id)).scalar()
    return (max_id or 0) + 1

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    folder_name = request.form.get("folder_name", "Default Folder")
    upload_date_str = request.form.get("upload_date")
    if not upload_date_str:
        return jsonify({"error": "Upload date is required"}), 400
    try:
        upload_date = datetime.strptime(upload_date_str, "%Y-%m-%d").date()
        logger.info(f"Upload date: {upload_date}")
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    file_extension = file.filename.rsplit(".", 1)[1].lower()
    if file_extension not in ["csv", "xlsx"]:
        return jsonify({"error": "Unsupported file type. Please upload CSV or XLSX files."}), 400

    session = get_session()
    try:
        # Find or create the folder
        folder = session.query(Folder).filter_by(name=folder_name).first()
        if not folder:
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    next_id = get_next_folder_id(session)
                    folder = Folder(id=next_id, name=folder_name)
                    session.add(folder)
                    session.commit()  # Commit the folder to the database
                    logger.info(f"New folder created and committed: {folder.name} (ID: {folder.id})")
                    break
                except IntegrityError:
                    session.rollback()
                    logger.warning(f"Folder creation attempt {attempt + 1} failed due to IntegrityError. Retrying...")
                    if attempt == max_retries - 1:
                        raise ValueError("Failed to create a new folder with a unique ID after multiple attempts.")
        else:
            logger.info(f"Existing folder found: {folder.name} (ID: {folder.id})")
        
        logger.info(f"Using folder: {folder.name} (ID: {folder.id})")

        # Read the file content
        file_content = file.read()
        logger.info(f"File content read, size: {len(file_content)} bytes")

        # Check if this is a valid continuation
        try:
            is_valid_continuation = check_continuation(folder.id, file_content, file_extension)
            if not is_valid_continuation:
                return jsonify({"error": "New table is not a valid continuation of the previous one"}), 400
        except Exception as e:
            logger.error(f"Error in check_continuation: {str(e)}")
            return jsonify({"error": f"Error checking file continuation: {str(e)}"}), 500

        table = Table(name=file.filename, folder_id=folder.id, upload_date=upload_date)
        session.add(table)
        session.flush()  # This will assign an ID to the table
        logger.info(f"Table created: {table.name} (ID: {table.id})")

        try:
            process_file(session, file_content, file_extension, table.id)
            logger.info(f"File processed successfully for table ID: {table.id}")
        except Exception as e:
            logger.error(f"Error in process_file: {str(e)}")
            raise

        session.commit()
        logger.info(f"File upload completed successfully for table ID: {table.id}")
        return jsonify({
            "message": "File uploaded and processed successfully",
            "table_id": table.id,
            "folder_id": folder.id
        }), 200
    except ValueError as ve:
        session.rollback()
        logger.error(f"ValueError in upload_file: {str(ve)}")
        return jsonify({"error": str(ve)}), 400
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"Database error in upload_file: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        session.rollback()
        logger.error(f"Unexpected error in upload_file: {str(e)}")
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
    finally:
        session.close()

def process_file(session: Session, file_content, file_extension, table_id):
    try:
        if file_extension == "csv":
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_extension == "xlsx":
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValueError("Unsupported file type")

        logger.info(f"File read successfully. Shape: {df.shape}")

        for index, row in df.iterrows():
            data_entry = DataEntry(data=row.to_json(), table_id=table_id)
            session.add(data_entry)
            if index % 1000 == 0:  # Log progress every 1000 rows
                logger.info(f"Processed {index} rows for table ID: {table_id}")
        
        session.flush()  # This will assign IDs to the data entries
        logger.info(f"All rows processed for table ID: {table_id}")

        # Fetch the folder_id for the table
        table = session.query(Table).filter_by(id=table_id).first()
        if table:
            return table.folder_id
        else:
            raise ValueError(f"Table with ID {table_id} not found")

    except pd.errors.EmptyDataError:
        logger.error(f"Empty file content for table ID: {table_id}")
        raise ValueError("The uploaded file is empty.")
    except pd.errors.ParserError as e:
        logger.error(f"Error parsing {file_extension.upper()} content for table ID: {table_id}. Error: {str(e)}")
        raise ValueError(f"Error parsing {file_extension.upper()} content: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in process_file for table ID: {table_id}. Error: {str(e)}")
        raise

def get_folder_structure():
    session = get_session()
    try:
        # Fetch all folders and tables from the database
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

        return folder_structure
    except SQLAlchemyError as e:
        logger.error(f"Error retrieving folder structure: {str(e)}")
        raise e
    finally:
        session.close()

@app.route("/folder_structure", methods=["GET"])
def fetch_folder_structure():
    try:
        folder_structure = get_folder_structure()
        return jsonify(folder_structure), 200
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500

@app.route("/view_tables", methods=["GET"])
def view_tables():
    session = get_session()
    try:
        tables = session.query(Table).all()
        return jsonify([{"id": t.id, "name": t.name} for t in tables]), 200
    except SQLAlchemyError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        session.close()

@app.route("/org-data", methods=["GET"])
def get_org_data():
    session = get_session()
    try:
        table_id = request.args.get("table_id")
        if not table_id:
            return jsonify({"error": "Table ID is required"}), 400

        data_entries = session.query(DataEntry).filter_by(table_id=table_id).all()
        if not data_entries:
            return jsonify({"error": "No data found for the specified table"}), 404

        # Parse the string data into dictionaries
        data = []
        for entry in data_entries:
            try:
                entry_dict = json.loads(entry.data)
                data.append(
                    {
                        "Name": entry_dict.get("Name", ""),
                        "Role": entry_dict.get("Role", ""),
                        "Hierarchical_Structure": entry_dict.get("Hierarchical_Structure", ""),
                    }
                )
            except json.JSONDecodeError as e:
                logging.error(f"Error decoding JSON for entry: {entry.data}. Error: {str(e)}")
                continue

        df = pd.DataFrame(data)
        org_dict = parse_org_data(df)

        return jsonify(org_dict), 200
    except SQLAlchemyError as e:
        logging.error(f"Database error in get_org_data: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logging.error(f"Error in get_org_data: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/timeline/<int:folder_id>", methods=["GET"])
def get_timeline(folder_id):
    session = get_session()
    try:
        name = request.args.get('name')
        table_id = request.args.get('table_id')
        
        # Fetch all tables for the folder, ordered by upload date
        tables = (
            session.query(Table)
            .filter_by(folder_id=folder_id)
            .order_by(Table.upload_date)
            .all()
        )
        
        # If a specific table_id is provided, validate it exists in the folder
        if table_id:
            table_id = int(table_id)  # Convert to int for comparison
            if table_id not in [table.id for table in tables]:
                return jsonify({"error": f"Table with id {table_id} not found in folder {folder_id}"}), 404
        
        print(f"Processing {len(tables)} tables")
        
        timeline = []
        cv = []
        current_role = None
        
        for table in tables:
            data_entries = session.query(DataEntry).filter_by(table_id=table.id).all()
            if not data_entries:
                print(f"No data entries found for table {table.id}")
                continue

            df = pd.DataFrame([json.loads(entry.data) for entry in data_entries])
            org_tree = parse_org_data(df)
            
            timeline_entry = {
                "table_id": table.id,
                "name": table.name,
                "upload_date": table.upload_date.isoformat(),
                "org_tree": org_tree,
            }
            
            if name:
                person = find_person_in_tree(org_tree, name)
                if person:
                    if current_role is None or current_role['role'] != person['role']:
                        if current_role:
                            cv.append({
                                "role": current_role['role'],
                                "startDate": current_role['start_date'],
                                "endDate": table.upload_date.isoformat()
                            })
                        current_role = {
                            "role": person['role'],
                            "start_date": table.upload_date.isoformat()
                        }
                    timeline_entry["person_info"] = person
            
            timeline.append(timeline_entry)
            
            # If a specific table_id was provided and we've processed it, stop here
            if table_id and table.id == table_id:
                break
        
        if current_role:
            cv.append({
                "role": current_role['role'],
                "startDate": current_role['start_date'],
                "endDate": None  # This is the most recent role, so no end date
            })
        
        result = {
            "timeline": timeline,
            "cv": cv if name else None
        }
        
        return jsonify(result), 200
    except SQLAlchemyError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
    finally:
        session.close()

def find_person_in_tree(tree, name):
    if tree['name'] == name:
        return tree
    for child in tree.get('children', []):
        result = find_person_in_tree(child, name)
        if result:
            return result
    return None

def check_if_db_has_data(db_path):
    logger.info(f"Checking if database has data: {db_path}")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        if not tables:
            logger.info(f"No tables found in the database: {db_path}")
            return False

        for table in tables:
            table_name = table[0]
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            count = cursor.fetchone()[0]
            
            if count > 0:
                logger.info(f"Data found in table '{table_name}' of database: {db_path}")
                return True

        logger.info(f"No data found in any table of database: {db_path}")
        return False

    except sqlite3.Error as e:
        logger.error(f"SQLite error occurred while checking database {db_path}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error occurred while checking database {db_path}: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()
            
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

@app.route("/compare_tables/<int:folder_id>", methods=["GET"])
def compare_tables(folder_id):
    session = get_session()
    try:
        table1_id = request.args.get('table1_id')
        table2_id = request.args.get('table2_id')
        
        if not table1_id or not table2_id:
            return jsonify({"error": "Both table1_id and table2_id are required"}), 400
        
        table1_id = int(table1_id)
        table2_id = int(table2_id)
        
        # Fetch the tables and ensure they belong to the specified folder
        table1 = session.query(Table).filter_by(id=table1_id, folder_id=folder_id).first()
        table2 = session.query(Table).filter_by(id=table2_id, folder_id=folder_id).first()
        
        if not table1 or not table2:
            return jsonify({"error": "One or both tables not found in the specified folder"}), 404
        
        # Ensure table1 is the earlier table
        if table1.upload_date > table2.upload_date:
            table1, table2 = table2, table1
        
        # Fetch and parse data for both tables
        def get_table_data(table):
            data_entries = session.query(DataEntry).filter_by(table_id=table.id).all()
            if not data_entries:
                raise ValueError(f"No data entries found for table {table.id}")
            df = pd.DataFrame([json.loads(entry.data) for entry in data_entries])
            if df.empty:
                raise ValueError(f"Empty DataFrame for table {table.id}")
            return parse_org_data(df), df
        
        tree1, df1 = get_table_data(table1)
        tree2, df2 = get_table_data(table2)
        
        # Compare the trees
        changes = compare_org_structures(tree1, tree2)
        
        # Analyze role changes
        role_changes = analyze_role_changes(df1, df2)
        
        # Generate aggregated report
        aggregated_report = generate_aggregated_report(changes, role_changes, tree1, tree2)
        
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
            "role_changes": role_changes,
            "aggregated_report": aggregated_report
        }
        
        return jsonify(report), 200
    except ValueError as ve:
        logger.error(f"ValueError in compare_tables: {str(ve)}")
        return jsonify({"error": f"Data error: {str(ve)}"}), 400
    except SQLAlchemyError as e:
        logger.error(f"SQLAlchemyError in compare_tables: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Unexpected error in compare_tables: {str(e)}", exc_info=True)
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
    finally:
        session.close()

def compare_org_structures(tree1, tree2):
    changes = []
    
    def traverse_and_compare(node1, node2, path=""):
        logger.debug(f"Comparing nodes at path: {path}")
        logger.debug(f"Node1: {node1}")
        logger.debug(f"Node2: {node2}")

        if node1 is None and node2 is None:
            return

        if node1 is None:
            changes.append({
                "type": "added",
                "path": path,
                "name": node2.get("name", "Unknown"),
                "role": node2.get("role", "Unknown")
            })
            return

        if node2 is None:
            changes.append({
                "type": "removed",
                "path": path,
                "name": node1.get("name", "Unknown"),
                "role": node1.get("role", "Unknown")
            })
            return

        if node1.get("name") != node2.get("name") or node1.get("role") != node2.get("role"):
            changes.append({
                "type": "changed",
                "path": path,
                "old": {"name": node1.get("name", "Unknown"), "role": node1.get("role", "Unknown")},
                "new": {"name": node2.get("name", "Unknown"), "role": node2.get("role", "Unknown")}
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
    logger.info(f"Comparison completed. Total changes: {len(changes)}")
    return changes

def analyze_role_changes(df1, df2):
    changes = []
    df1_dict = dict(zip(df1['Name'], df1['Role']))
    df2_dict = dict(zip(df2['Name'], df2['Role']))
    
    all_names = set(df1_dict.keys()) | set(df2_dict.keys())
    
    for name in all_names:
        role1 = df1_dict.get(name)
        role2 = df2_dict.get(name)
        
        if role1 != role2:
            changes.append({
                "name": name,
                "old_role": role1,
                "new_role": role2
            })
    
    return changes

def generate_aggregated_report(structure_changes, role_changes, tree1, tree2):
    def count_nodes(tree):
        count = 1  # Count the root
        for child in tree.get("children", []):
            count += count_nodes(child)
        return count

    total_nodes_before = count_nodes(tree1)
    total_nodes_after = count_nodes(tree2)

    structure_change_count = {
        "added": sum(1 for change in structure_changes if change["type"] == "added"),
        "removed": sum(1 for change in structure_changes if change["type"] == "removed"),
        "changed": sum(1 for change in structure_changes if change["type"] == "changed")
    }

    role_change_count = len(role_changes)

    # Calculate percentages
    total_changes = sum(structure_change_count.values()) + role_change_count
    change_percentage = (total_changes / total_nodes_before) * 100 if total_nodes_before > 0 else 0

    # Identify most affected areas
    area_changes = {}
    for change in structure_changes:
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
        "role_changes": role_change_count,
        "total_changes": total_changes,
        "change_percentage": change_percentage,
        "most_affected_areas": most_affected_areas,
        "growth_rate": ((total_nodes_after - total_nodes_before) / total_nodes_before) * 100 if total_nodes_before > 0 else 0
    }
    
@app.route("/highlight-nodes", methods=["GET"])
def highlight_nodes():
    node_name = request.args.get('node_name')
    table_id = request.args.get('table_id')
    
    if not node_name or not table_id:
        return jsonify({"error": "Both node_name and table_id are required"}), 400
    
    session = get_session()
    try:
        # Fetch the org data for the given table
        data_entries = session.query(DataEntry).filter_by(table_id=table_id).all()
        if not data_entries:
            return jsonify({"error": "No data found for the specified table"}), 404

        data = [json.loads(entry.data) for entry in data_entries]
        df = pd.DataFrame(data)
        org_dict = parse_org_data(df)

        # Find the node and its path to the root
        highlighted_nodes = find_node_path(org_dict, node_name)
        
        if highlighted_nodes is None:
            return jsonify({"error": f"Node '{node_name}' not found in the organization chart"}), 404

        return jsonify({"highlighted_nodes": highlighted_nodes}), 200
    except SQLAlchemyError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
    finally:
        session.close()

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
            
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
    
@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == "__main__":
    print("Starting application...")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Static folder path: {app.static_folder}")
    print(f"MEIPASS (if packaged): {getattr(sys, '_MEIPASS', 'Not packaged')}")
    
    threading.Thread(target=open_browser).start()
    app.run(host='0.0.0.0', port=5000, use_reloader=False)