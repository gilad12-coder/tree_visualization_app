from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Folder(Base):
    __tablename__ = 'folders'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey('folders.id'), nullable=True)
    parent = relationship('Folder', remote_side=[id], back_populates='subfolders')
    subfolders = relationship('Folder', back_populates='parent')
    tables = relationship('Table', back_populates='folder')

class Table(Base):
    __tablename__ = 'tables'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=False)
    folder = relationship('Folder', back_populates='tables')
    data_entries = relationship('DataEntry', back_populates='table')

class DataEntry(Base):
    __tablename__ = 'data_entries'
    id = Column(Integer, primary_key=True)
    data = Column(String, nullable=False)
    table_id = Column(Integer, ForeignKey('tables.id'), nullable=False)
    table = relationship('Table', back_populates='data_entries')

# Database setup
engine = create_engine('sqlite:///your_database.db', echo=True)
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
