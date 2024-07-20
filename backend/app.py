from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import pandas as pd
from models import Session, Folder, Table, DataEntry  # Updated import statement
from sqlalchemy.exc import SQLAlchemyError
from utils import parse_org_data  # Updated import statement
import logging
from sqlalchemy.orm import joinedload
import json

logging.basicConfig(level=logging.DEBUG)


app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = 'uploads/'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB upload limit

# Ensure the uploads directory exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

def process_csv(file_path, table_id):
    try:
        df = pd.read_csv(file_path)
        session = Session()
        for _, row in df.iterrows():
            data_entry = DataEntry(data=row.to_json(), table_id=table_id)
            session.add(data_entry)
        session.commit()
    except pd.errors.ParserError:
        raise ValueError("Error parsing CSV file.")
    except SQLAlchemyError as e:
        session.rollback()
        raise RuntimeError(f"Database error: {str(e)}")
    finally:
        session.close()

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'csv'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    folder_name = request.form.get('folder_name', 'Default Folder')
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        session = Session()
        try:
            # Find or create the folder
            folder = session.query(Folder).filter_by(name=folder_name).first()
            if not folder:
                folder = Folder(name=folder_name)
                session.add(folder)
                session.commit()
            
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], str(folder.id), filename)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            file.save(file_path)
            
            table = Table(name=filename, folder_id=folder.id)
            session.add(table)
            session.commit()
            
            process_csv(file_path, table.id)
            return jsonify({"message": "File uploaded and processed successfully", "table_id": table.id}), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except SQLAlchemyError as e:
            session.rollback()
            return jsonify({"error": f"Database error: {str(e)}"}), 500
        finally:
            session.close()
    else:
        return jsonify({"error": "Invalid file format"}), 400

def get_next_table_id(folder):
    # Implement logic to determine the next table_id based on the folder structure
    # For example, count the number of files in the folder and use that as table_id
    files = os.listdir(folder)
    return len(files) + 1

def update_folder_schema(filename):
    # Update the database with the new folder information
    session = Session()
    try:
        folder_name = os.path.basename(app.config['UPLOAD_FOLDER'])
        parent_folder = session.query(Folder).filter_by(name=folder_name).first()
        
        if parent_folder is None:
            parent_folder = Folder(name=folder_name)
            session.add(parent_folder)
            session.commit() 
        
        table_folder = Folder(name=filename, parent_id=parent_folder.id)
        session.add(table_folder)
        session.commit()

        # Create a corresponding Table entry in the Table model
        new_table = Table(name=filename, folder_id=table_folder.id)
        session.add(new_table)
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_folder_structure():
    session = Session()
    try:
        # Fetch all folders and tables from the database
        folders = session.query(Folder).all()
        folder_structure = []

        def build_folder_structure(folder):
            subfolders = [build_folder_structure(subfolder) for subfolder in folder.subfolders]
            tables = [{"id": table.id, "name": table.name} for table in folder.tables]
            return {
                "id": folder.id,
                "name": folder.name,
                "parent_id": folder.parent_id,
                "subfolders": subfolders,
                "tables": tables
            }

        root_folders = [folder for folder in folders if folder.parent_id is None]
        for root_folder in root_folders:
            folder_structure.append(build_folder_structure(root_folder))

        return folder_structure
    except SQLAlchemyError as e:
        raise e
    finally:
        session.close()


@app.route('/folder_structure', methods=['GET'])
def fetch_folder_structure():
    try:
        folder_structure = get_folder_structure()
        print(f"here is the output of the folder structure: {folder_structure}")
        return jsonify(folder_structure), 200
    except SQLAlchemyError as e:
        return jsonify({"error": str(e)}), 500

@app.route('/view_tables', methods=['GET'])
def view_tables():
    session = Session()
    try:
        tables = session.query(Table).all()
        return jsonify([{"id": t.id, "name": t.name} for t in tables]), 200
    except SQLAlchemyError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        session.close()

@app.route('/update_table', methods=['POST'])
def update_table():
    session = Session()
    try:
        data = request.json
        table_id = data.get('table_id')
        entries = data.get('entries')
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

@app.route('/org-data', methods=['GET'])
def get_org_data():
    session = Session()
    try:
        table_id = request.args.get('table_id')
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
                data.append({
                    "Name": entry_dict.get('Name', ''),
                    "Role": entry_dict.get('Role', ''),
                    "Hierarchical_Structure": entry_dict.get('Hierarchical_Structure', '')
                })
            except json.JSONDecodeError as e:
                logging.error(f"Error decoding JSON for entry: {entry.data}. Error: {str(e)}")
                continue

        df = pd.DataFrame(data)
        
        logging.debug(f"DataFrame before parsing: {df.to_dict(orient='records')}")
        
        org_dict = parse_org_data(df)
        
        logging.debug(f"Org dict after parsing: {org_dict}")
        
        return jsonify(org_dict), 200
    except SQLAlchemyError as e:
        logging.error(f"Database error in get_org_data: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        logging.error(f"Error in get_org_data: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

if __name__ == '__main__':
    app.run(debug=True)
