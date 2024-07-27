from sqlalchemy.orm import relationship, sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, ForeignKey, Date, create_engine, inspect
import glob

Base = declarative_base()

class Folder(Base):
    __tablename__ = 'folders'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
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
    data = Column(String, nullable=False)
    table_id = Column(Integer, ForeignKey('tables.id'), nullable=False)
    table = relationship('Table', back_populates='data_entries')

# Global variables for engine, session, and db_path
engine = None
Session = None
db_path = None

def set_db_path(path):
    global db_path
    db_path = path

def get_db_path():
    global db_path
    if db_path:
        return db_path
    db_files = glob.glob('*.db')
    return db_files[0] if db_files else None

def get_engine():
    global engine
    if engine is None:
        path = get_db_path()
        if path:
            engine = create_engine(f'sqlite:///{path}', echo=True)
    return engine

def get_session():
    global Session
    if Session is None:
        engine = get_engine()
        if engine:
            Session = scoped_session(sessionmaker(bind=engine))
    return Session() if Session else None

def dispose_db():
    global engine, Session, db_path
    if Session:
        Session.remove()
    if engine:
        engine.dispose()
    engine = None
    Session = None
    db_path = None

def init_db():
    engine = get_engine()
    if engine:
        Base.metadata.create_all(engine)

def create_new_db(path):
    global engine, Session, db_path
    dispose_db()
    set_db_path(path)
    db_uri = f'sqlite:///{path}'
    engine = create_engine(db_uri, echo=True)
    Session = scoped_session(sessionmaker(bind=engine))
    init_db()
    return engine