from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)

class Folder(Base):
    __tablename__ = 'folders'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    parent_id = Column(Integer, ForeignKey('folders.id'), nullable=True)  # Add this line
    user = relationship('User', back_populates='folders')
    parent = relationship('Folder', remote_side=[id], back_populates='children')  # Add this line

Folder.children = relationship('Folder', back_populates='parent')  # Add this line
User.folders = relationship('Folder', order_by=Folder.id, back_populates='user')

class Table(Base):
    __tablename__ = 'tables'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    folder_id = Column(Integer, ForeignKey('folders.id'), nullable=False)
    folder = relationship('Folder', back_populates='tables')

Folder.tables = relationship('Table', order_by=Table.id, back_populates='folder')

class DataEntry(Base):
    __tablename__ = 'data_entries'
    id = Column(Integer, primary_key=True)
    data = Column(String, nullable=False)  # Store data as JSON string
    table_id = Column(Integer, ForeignKey('tables.id'), nullable=False)
    table = relationship('Table', back_populates='data_entries')

Table.data_entries = relationship('DataEntry', order_by=DataEntry.id, back_populates='table')

engine = create_engine('sqlite:///database.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()
