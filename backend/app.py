from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import pandas as pd
from models import Session, User, Folder, Table, DataEntry
from sqlalchemy.exc import SQLAlchemyError
from utils import parse_org_data

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
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        try:
            table_id = 1  # This should be dynamically assigned based on the folder/table structure
            process_csv(file_path, table_id)
            return jsonify({"message": "File uploaded and processed successfully"}), 200
        except ValueError as ve:
            return jsonify({"error": str(ve)}), 400
        except RuntimeError as re:
            return jsonify({"error": str(re)}), 500
    else:
        return jsonify({"error": "Invalid file format"}), 400

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
        
        data = [entry.data for entry in data_entries]
        df = pd.DataFrame([eval(d) for d in data])  # Assuming the data is stored as JSON strings
        
        org_dict = parse_org_data(df)
        return jsonify(org_dict), 200
    except SQLAlchemyError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route('/folder_structure', methods=['GET'])
def get_folder_structure():
    session = Session()
    try:
        folders = session.query(Folder).all()
        folder_dict = build_folder_tree(folders)
        return jsonify(folder_dict), 200
    except SQLAlchemyError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        session.close()

def build_folder_tree(folders):
    structure = {}

    # Create a map of folder ID to folder node
    folder_map = {folder.id: {"id": folder.id, "name": folder.name, "children": []} for folder in folders}

    # Link children to their parents
    root_nodes = []
    for folder in folders:
        node = folder_map[folder.id]
        if folder.parent_id:
            parent_node = folder_map.get(folder.parent_id)
            if parent_node:
                parent_node["children"].append(node)
        else:
            root_nodes.append(node)
    
    return root_nodes


    structure = {}
    root_nodes = []
    for folder in folders:
        node = add_node(structure, folder)
        if not folder.parent_id:
            root_nodes.append(node)
    
    return root_nodes

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

if __name__ == '__main__':
    app.run(debug=True)
