from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from models import Folder, Table, DataEntry, get_session, get_db_path, dispose_db, create_new_db, init_db, get_engine, inspect
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

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)

app = Flask(__name__)
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

@app.route("/check_existing_db", methods=["GET"])
def check_existing_db():
    db_path = get_db_path()
    if db_path:
        return jsonify({"exists": True, "path": db_path}), 200
    else:
        return jsonify({"exists": False}), 200

def check_db_schema(db_path):
    try:
        engine = get_engine(db_path)
        inspector = inspect(engine)

        expected_tables = {'folders', 'tables', 'data_entries'}
        actual_tables = set(inspector.get_table_names())
        
        if not expected_tables.issubset(actual_tables):
            return False, f"Missing tables. Expected {expected_tables}, found {actual_tables}"

        # Check columns for each table
        table_models = {
            'folders': Folder,
            'tables': Table,
            'data_entries': DataEntry
        }

        for table_name, model in table_models.items():
            expected_columns = set(column.key for column in model.__table__.columns)
            actual_columns = set(column['name'] for column in inspector.get_columns(table_name))
            
            if not expected_columns.issubset(actual_columns):
                return False, f"Missing columns in {table_name}. Expected {expected_columns}, found {actual_columns}"

        return True, "Schema is valid"
    except Exception as e:
        return False, f"Error checking schema: {str(e)}"

@app.route("/upload_new_db", methods=["POST"])
def upload_new_db():
    uploaded_file = request.files.get('db_file')
    if not uploaded_file:
        logger.error("No file uploaded")
        return jsonify({"error": "No file uploaded"}), 400

    try:
        # Save the uploaded file
        db_path = uploaded_file.filename
        logger.info(f"Saving uploaded file to {db_path}")
        uploaded_file.save(db_path)

        # Verify if it's a valid SQLite database
        logger.info(f"Verifying if {db_path} is a valid SQLite database")
        if not is_valid_sqlite_db(db_path):
            logger.error(f"{db_path} is not a valid SQLite database")
            os.remove(db_path)
            return jsonify({"error": "Invalid SQLite database file"}), 400

        # Check the schema
        schema_valid, schema_message = check_db_schema(db_path)
        if not schema_valid:
            logger.error(f"Schema validation failed: {schema_message}")
            os.remove(db_path)
            return jsonify({"error": f"Invalid database schema: {schema_message}"}), 400

        # Dispose of the current engine and session
        dispose_db()

        # Initialize the database with the new file
        init_db(db_path)

        logger.info("New database successfully uploaded and verified")
        return jsonify({
            "message": "New database uploaded successfully",
            "hasData": check_if_db_has_data(db_path),
            "db_path": db_path
        }), 200
    except Exception as e:
        logger.exception(f"Error in upload_new_db: {str(e)}")
        if os.path.exists(db_path):
            os.remove(db_path)
        return jsonify({"error": str(e)}), 500

@app.route("/create_new_db", methods=["POST"])
def create_new_db_route():
    try:
        data = request.json
        folder_path = data.get('db_path')
        db_name = data.get('db_name', 'orgchart.db')
        
        # Validate the folder path
        if not folder_path:
            return jsonify({"error": "Folder path is required"}), 400
        
        # Check if the directory exists
        if not os.path.exists(folder_path):
            logger.error(f"Directory does not exist: {folder_path}")
            return jsonify({"error": "The specified directory does not exist"}), 404
        
        # Check if the directory is writable
        if not os.access(folder_path, os.W_OK):
            logger.error(f"Directory is not writable: {folder_path}")
            return jsonify({"error": "The specified directory is not writable"}), 403
        
        # Construct the full database path
        db_path = os.path.join(folder_path, db_name)
        
        # Dispose of any existing database connections
        dispose_db()

        # Remove the existing database file if it exists
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

        # Create a new database file
        try:
            create_new_db(db_path)
            logger.info(f"New database created successfully at {db_path}")
        except Exception as e:
            logger.error(f"Failed to create new database: {str(e)}")
            return jsonify({"error": f"Failed to create new database: {str(e)}"}), 500

        # Initialize the database with the new file
        try:
            init_db()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            return jsonify({"error": f"Failed to initialize database: {str(e)}"}), 500

        # Verify the newly created database
        if not is_valid_sqlite_db(db_path):
            logger.error(f"Newly created database {db_path} is not valid")
            return jsonify({"error": "Failed to create a valid database"}), 500

        # Check if the database has any data
        has_data = check_if_db_has_data(db_path)

        # Get the first table ID if available
        first_table_id = None
        if has_data:
            session = get_session()
            try:
                first_table = session.query(Table).first()
                if first_table:
                    first_table_id = first_table.id
            finally:
                session.close()

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
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get all tables in the database
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        if not tables:
            logger.info(f"No tables found in the database: {db_path}")
            return False

        # Check each table for data
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

def is_valid_sqlite_db(file_path):
    try:
        conn = sqlite3.connect(file_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        conn.close()
        logger.info(f"Database at {file_path} has {len(tables)} tables")
        return len(tables) > 0
    except sqlite3.Error as e:
        logger.error(f"SQLite error in is_valid_sqlite_db: {str(e)}")
        return False
    except Exception as e:
        logger.exception(f"Unexpected error in is_valid_sqlite_db: {str(e)}")
        return False

if __name__ == "__main__":
    app.run(debug=True)