"""Regression tests for database switching and CSV uploads."""

import io
import logging
import os
import tempfile
import unittest
from datetime import date

import pandas as pd

from backend.app import app
from backend.models import dispose_db
from backend.utils import insert_data_entries

logging.disable(logging.CRITICAL)


class RecordingSession:
    """Collect model instances added by data-import helpers."""

    def __init__(self):
        self.entries = []

    def add(self, entry):
        self.entries.append(entry)


class DateImportTests(unittest.TestCase):
    """Cover birth-date inputs that previously broke Pandas conversion."""

    def test_mixed_timezone_offsets_preserve_calendar_dates(self):
        session = RecordingSession()
        frame = pd.DataFrame(
            {
                "hierarchical_structure": ["/CEO", "/CEO/CTO"],
                "name": ["Dana", "Yossi"],
                "role": ["CEO", "CTO"],
                "birth_date": [
                    "2000-01-01T00:00:00+02:00",
                    "2000-01-02T00:00:00+03:00",
                ],
            }
        )

        insert_data_entries(session, 1, frame)

        self.assertEqual(
            [entry.birth_date for entry in session.entries],
            [date(2000, 1, 1), date(2000, 1, 2)],
        )

    def test_missing_optional_birth_date_is_accepted(self):
        session = RecordingSession()
        frame = pd.DataFrame(
            {
                "hierarchical_structure": ["/CEO"],
                "name": ["Dana"],
                "role": ["CEO"],
            }
        )

        insert_data_entries(session, 1, frame)

        self.assertIsNone(session.entries[0].birth_date)


class DatabaseUploadTests(unittest.TestCase):
    """Exercise folder and upload requests across database switches."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.client = app.test_client()
        app.config["TESTING"] = True

    def tearDown(self):
        dispose_db()
        self.temp_dir.cleanup()

    def create_database(self, directory_name, database_name):
        directory = os.path.join(self.temp_dir.name, directory_name)
        os.makedirs(directory)
        response = self.client.post(
            "/create_new_db",
            json={"db_path": directory, "db_name": database_name},
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        return response.get_json()["db_path"]

    def create_folder(self, database_path, name):
        response = self.client.post(
            "/folder",
            query_string={"db_path": database_path},
            json={"name": name},
        )
        self.assertEqual(response.status_code, 201, response.get_json())
        return response.get_json()["folder_id"]

    def fetch_folders(self, database_path):
        response = self.client.get(
            "/folder_structure",
            query_string={"db_path": database_path},
        )
        self.assertEqual(response.status_code, 200, response.get_json())
        return response.get_json()

    def test_upload_uses_submitted_database_after_switching(self):
        old_database = self.create_database("old", "old.db")
        self.create_folder(old_database, "Old folder")

        new_database = self.create_database("new", "new.db")
        new_folder_id = self.create_folder(new_database, "New folder")

        self.assertEqual(self.fetch_folders(old_database)[0]["name"], "Old folder")

        csv_data = (
            "person_id,name,role,hierarchical_structure,birth_date\n"
            "1,Dana,CEO,/CEO,2000-01-01T00:00:00+02:00\n"
            "2,Yossi,CTO,/CEO/CTO,2000-01-02T00:00:00+03:00\n"
        ).encode("utf-8")
        response = self.client.post(
            "/upload",
            data={
                "file": (io.BytesIO(csv_data), "org.csv"),
                "folder_id": str(new_folder_id),
                "upload_date": "2026-08-19",
                "db_path": new_database,
            },
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertEqual(self.fetch_folders(old_database)[0]["tables"], [])
        new_folders = self.fetch_folders(new_database)
        self.assertEqual(new_folders[0]["name"], "New folder")
        self.assertEqual(len(new_folders[0]["tables"]), 1)


if __name__ == "__main__":
    unittest.main()
