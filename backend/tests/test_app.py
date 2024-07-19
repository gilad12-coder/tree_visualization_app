import unittest
from unittest.mock import patch, MagicMock
from backend.app import app, process_csv, allowed_file

class TestApp(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_upload_file_no_file_part(self):
        response = self.app.post('/upload', content_type='multipart/form-data', data={})
        self.assertEqual(response.status_code, 400)
        self.assertIn(b"No file part", response.data)

    def test_upload_file_no_selected_file(self):
        response = self.app.post('/upload', content_type='multipart/form-data', data={'file': (None, '')})
        self.assertEqual(response.status_code, 400)
        self.assertIn(b"No selected file", response.data)

    def test_allowed_file(self):
        self.assertTrue(allowed_file('test.csv'))
        self.assertFalse(allowed_file('test.txt'))

    @patch('backend.app.Session')
    @patch('backend.app.pd.read_csv')
    def test_process_csv(self, mock_read_csv, mock_session):
        mock_df = MagicMock()
        mock_read_csv.return_value = mock_df
        mock_session.return_value = MagicMock()
        
        process_csv('test_path', 1)
        
        mock_read_csv.assert_called_once_with('test_path')
        self.assertTrue(mock_df.iterrows.called)
        self.assertTrue(mock_session().commit.called)

if __name__ == '__main__':
    unittest.main()
