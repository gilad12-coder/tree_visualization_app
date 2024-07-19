import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Session, Folder, Table, DataEntry, Base

class TestModels(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine('sqlite:///:memory:')
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.session = self.Session()

    def tearDown(self):
        self.session.close()
        Base.metadata.drop_all(self.engine)

    def test_folder_model(self):
        folder = Folder(name='Test Folder')
        self.session.add(folder)
        self.session.commit()
        retrieved = self.session.query(Folder).filter_by(name='Test Folder').first()
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.name, 'Test Folder')

if __name__ == '__main__':
    unittest.main()
