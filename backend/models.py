from sqlalchemy.orm import relationship, sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, create_engine, inspect, func
import glob
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

Base = declarative_base()

class Folder(Base):
    __tablename__ = 'folders'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    tables = relationship('Table', back_populates='folder')

class Table(Base):
    __tablename__ = 'tables'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=False)
    upload_date = Column(Date, nullable=False)
    folder = relationship('Folder', back_populates='tables')
    data_entries = relationship('DataEntry', back_populates='table')

class DataEntry(Base):
    __tablename__ = 'data_entries'
    id = Column(Integer, primary_key=True)
    table_id = Column(Integer, ForeignKey('tables.id'), nullable=False)
    person_id = Column(Integer, nullable=False)
    upload_date = Column(Date, nullable=False)
    
    # Org Data
    hierarchical_structure = Column(String, nullable=False)
    role = Column(String)
    department = Column(String)
    
    # Personal Info
    birth_date = Column(Date)
    rank = Column(String)
    organization_id = Column(String)
    name = Column(String)
    
    
    table = relationship('Table', back_populates='data_entries')

    @property
    def age(self):
        if self.birth_date:
            return (self.upload_date - self.birth_date).days // 365
        return None

# Global variables for engine, session, and db_path
engine = None
Session = None
db_path = None

def set_db_path(path):
    global db_path, engine, Session
    logger.info(f"Setting new database path: {path}")
    db_path = path
    dispose_db()
    engine = create_engine(f'sqlite:///{path}', echo=True)
    Session = scoped_session(sessionmaker(bind=engine))
    logger.info("New database engine and session created")

def get_db_path():
    global db_path
    if db_path:
        logger.info(f"Using existing database path: {db_path}")
        return db_path
    db_files = glob.glob('*.db')
    if db_files:
        logger.info(f"Found database file: {db_files[0]}")
        return db_files[0]
    logger.warning("No database file found")
    return None

def get_engine():
    global engine
    if engine is None:
        path = get_db_path()
        if path:
            logger.info(f"Creating new engine for database: {path}")
            engine = create_engine(f'sqlite:///{path}', echo=True)
        else:
            logger.error("No database path available to create engine")
    return engine

def get_session():
    global Session
    if Session is None:
        engine = get_engine()
        if engine:
            logger.info("Creating new session")
            Session = scoped_session(sessionmaker(bind=engine))
        else:
            logger.error("No engine available to create session")
    return Session() if Session else None

def dispose_db():
    global engine, Session
    if Session:
        logger.info("Removing existing session")
        Session.remove()
    if Session:
        logger.info("Disposing existing engine")
        engine.dispose()
    engine = None
    Session = None
    logger.info("Database connections disposed")

def init_db():
    engine = get_engine()
    if engine:
        logger.info("Initializing database schema")
        Base.metadata.create_all(engine)
        logger.info("Database schema initialized successfully")
    else:
        logger.error("Failed to initialize database: No engine available")

def create_new_db(path):
    logger.info(f"Creating new database at: {path}")
    set_db_path(path)
    init_db()
    logger.info(f"New database created successfully at: {path}")
    return engine

def check_db_schema(db_path):
    logger.info(f"Checking schema for database: {db_path}")
    try:
        temp_engine = create_engine(f'sqlite:///{db_path}', echo=True)
        inspector = inspect(temp_engine)

        expected_tables = {'folders', 'tables', 'data_entries'}
        actual_tables = set(inspector.get_table_names())
        
        if not expected_tables.issubset(actual_tables):
            logger.warning(f"Schema check failed: Missing tables. Expected {expected_tables}, found {actual_tables}")
            return False, f"Missing tables. Expected {expected_tables}, found {actual_tables}"

        table_models = {
            'folders': Folder,
            'tables': Table,
            'data_entries': DataEntry
        }

        for table_name, model in table_models.items():
            expected_columns = set(column.key for column in model.__table__.columns)
            actual_columns = set(column['name'] for column in inspector.get_columns(table_name))
            
            if not expected_columns.issubset(actual_columns):
                logger.warning(f"Schema check failed: Missing columns in {table_name}. Expected {expected_columns}, found {actual_columns}")
                return False, f"Missing columns in {table_name}. Expected {expected_columns}, found {actual_columns}"

        logger.info("Schema check passed successfully")
        return True, "Schema is valid"
    except Exception as e:
        logger.error(f"Error checking schema: {str(e)}")
        return False, f"Error checking schema: {str(e)}"
    finally:
        temp_engine.dispose()

def is_valid_sqlite_db(file_path):
    logger.info(f"Checking if file is a valid SQLite database: {file_path}")
    if not os.path.exists(file_path):
        logger.warning(f"File does not exist: {file_path}")
        return False
    try:
        temp_engine = create_engine(f'sqlite:///{file_path}', echo=True)
        inspector = inspect(temp_engine)
        tables = inspector.get_table_names()
        logger.info(f"Database at {file_path} has {len(tables)} tables")
        return len(tables) > 0
    except Exception as e:
        logger.error(f"Error validating SQLite database: {str(e)}")
        return False
    finally:
        temp_engine.dispose()