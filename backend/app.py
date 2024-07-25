from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from models import Session, Folder, Table, DataEntry
from sqlalchemy.exc import SQLAlchemyError
import logging
from datetime import datetime
import json
import io
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.utils import parse_org_data, check_continuation

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


def process_file(file_content, file_extension, table_id):
    try:
        if file_extension == "csv":
            df = pd.read_csv(io.BytesIO(file_content))
        elif file_extension == "xlsx":
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            raise ValueError("Unsupported file type")

        session = Session()
        for _, row in df.iterrows():
            data_entry = DataEntry(data=row.to_json(), table_id=table_id)
            session.add(data_entry)
        session.commit()
    except pd.errors.ParserError:
        raise ValueError(f"Error parsing {file_extension.upper()} content.")
    except SQLAlchemyError as e:
        session.rollback()
        raise RuntimeError(f"Database error: {str(e)}")
    finally:
        session.close()


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
        print(f"Upload date: {upload_date}")
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    file_extension = file.filename.rsplit(".", 1)[1].lower()
    if file_extension not in ["csv", "xlsx"]:
        return (
            jsonify(
                {"error": "Unsupported file type. Please upload CSV or XLSX files."}
            ),
            400,
        )

    session = Session()
    try:
        # Find or create the folder
        folder = session.query(Folder).filter_by(name=folder_name).first()
        if not folder:
            folder = Folder(name=folder_name)
            session.add(folder)
            session.commit()

        # Read the file content
        file_content = file.read()

        # Check if this is a valid continuation
        if not check_continuation(folder.id, file_content, file_extension):
            return (
                jsonify(
                    {
                        "error": "New table is not a valid continuation of the previous one"
                    }
                ),
                400,
            )

        table = Table(name=file.filename, folder_id=folder.id, upload_date=upload_date)
        session.add(table)
        session.commit()

        process_file(file_content, file_extension, table.id)
        return (
            jsonify(
                {
                    "message": "File uploaded and processed successfully",
                    "table_id": table.id,
                }
            ),
            200,
        )
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        session.close()


def get_folder_structure():
    session = Session()
    try:
        # Fetch all folders and tables from the database
        folders = session.query(Folder).all()
        folder_structure = []

        def build_folder_structure(folder):
            subfolders = [
                build_folder_structure(subfolder) for subfolder in folder.subfolders
            ]
            tables = [
                {
                    "id": table.id,
                    "name": table.name,
                    "upload_date": (
                        table.upload_date.isoformat() if table.upload_date else None
                    ),
                }
                for table in folder.tables
            ]
            return {
                "id": folder.id,
                "name": folder.name,
                "parent_id": folder.parent_id,
                "subfolders": subfolders,
                "tables": tables,
            }

        root_folders = [folder for folder in folders if folder.parent_id is None]
        for root_folder in root_folders:
            folder_structure.append(build_folder_structure(root_folder))

        return folder_structure
    except SQLAlchemyError as e:
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
    session = Session()
    try:
        tables = session.query(Table).all()
        return jsonify([{"id": t.id, "name": t.name} for t in tables]), 200
    except SQLAlchemyError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        session.close()


@app.route("/update_table", methods=["POST"])
def update_table():
    session = Session()
    try:
        data = request.json
        table_id = data.get("table_id")
        entries = data.get("entries")
        if not table_id or not entries:
            return jsonify({"error": "Invalid input"}), 400
        table = session.query(Table).filter_by(id=table_id).first()
        if not table:
            return jsonify({"error": "Table not found"}), 404
        for entry in entries:
            data_entry = DataEntry(data=entry, table_id=table_id)
            session.add(data_entry)
        session.commit()
        return jsonify({"message": "Table updated successfully"}), 200
    except SQLAlchemyError as e:
        session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route("/org-data", methods=["GET"])
def get_org_data():
    session = Session()
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
                        "Hierarchical_Structure": entry_dict.get(
                            "Hierarchical_Structure", ""
                        ),
                    }
                )
            except json.JSONDecodeError as e:
                logging.error(
                    f"Error decoding JSON for entry: {entry.data}. Error: {str(e)}"
                )
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
    session = Session()
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
        
        # If a specific table_id is provided, find its upload date and filter tables
        if table_id:
            target_table = next((table for table in tables if str(table.id) == table_id), None)
            if not target_table:
                return jsonify({"error": f"Table with id {table_id} not found"}), 404
            target_date = target_table.upload_date
            tables = [table for table in tables if table.upload_date <= target_date]
        
        print(f"Processing {len(tables)} tables")
        
        timeline = []
        cv = []
        current_role = None
        
        for table in tables:
            data_entries = session.query(DataEntry).filter_by(table_id=table.id).all()
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


if __name__ == "__main__":
    app.run(debug=True)
