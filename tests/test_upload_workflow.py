"""Regression tests for database switching and CSV uploads."""

import io
import logging
import os
import tempfile
import unittest
from datetime import date

import pandas as pd

from backend.app import app, compare_org_data
from backend.models import DataEntry, dispose_db
from backend.utils import insert_data_entries

logging.disable(logging.CRITICAL)


class RecordingSession:
    """Collect model instances added by data-import helpers."""

    def __init__(self):
        self.entries = []

    def add(self, entry):
        self.entries.append(entry)


class DataImportTests(unittest.TestCase):
    """Cover required columns and optional values during data import."""

    def test_mixed_timezone_offsets_preserve_calendar_dates(self):
        session = RecordingSession()
        frame = pd.DataFrame(
            {
                "person_id": ["1", "2"],
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
                "person_id": ["1"],
                "hierarchical_structure": ["/CEO"],
                "name": ["Dana"],
                "role": ["CEO"],
            }
        )

        insert_data_entries(session, 1, frame)

        self.assertIsNone(session.entries[0].birth_date)

    def test_missing_optional_name_column_is_accepted(self):
        session = RecordingSession()
        frame = pd.DataFrame(
            {
                "person_id": ["1"],
                "hierarchical_structure": ["/CEO"],
                "role": ["CEO"],
            }
        )

        insert_data_entries(session, 1, frame)

        self.assertIsNone(session.entries[0].name)

    def test_blank_optional_identity_fields_are_stored_as_none(self):
        session = RecordingSession()
        frame = pd.DataFrame(
            {
                "person_id": [None, "   "],
                "hierarchical_structure": ["/CEO", "/CEO/CTO"],
                "name": [None, "   "],
                "role": [None, "   "],
            }
        )

        insert_data_entries(session, 1, frame)

        self.assertEqual([entry.person_id for entry in session.entries], [None, None])
        self.assertEqual([entry.name for entry in session.entries], [None, None])
        self.assertEqual([entry.role for entry in session.entries], [None, None])

    def test_missing_optional_role_column_is_accepted(self):
        session = RecordingSession()
        frame = pd.DataFrame(
            {
                "person_id": ["1"],
                "hierarchical_structure": ["/CEO"],
            }
        )

        insert_data_entries(session, 1, frame)

        self.assertIsNone(session.entries[0].role)

    def test_missing_optional_person_id_column_is_accepted(self):
        session = RecordingSession()
        frame = pd.DataFrame({"hierarchical_structure": ["/CEO"]})

        insert_data_entries(session, 1, frame)

        self.assertIsNone(session.entries[0].person_id)

    def test_hierarchical_structure_column_is_required(self):
        with self.assertRaisesRegex(ValueError, "hierarchical_structure"):
            insert_data_entries(
                RecordingSession(),
                1,
                pd.DataFrame({"person_id": ["1"]}),
            )

    def test_hierarchical_structure_value_is_required(self):
        with self.assertRaisesRegex(ValueError, "hierarchical_structure"):
            insert_data_entries(
                RecordingSession(),
                1,
                pd.DataFrame({"hierarchical_structure": ["   "]}),
            )


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
            "hierarchical_structure,birth_date\n"
            "/CEO,2000-01-01T00:00:00+02:00\n"
            "/CEO/CTO,2000-01-02T00:00:00+03:00\n"
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
        table_id = response.get_json()["table_id"]
        org_response = self.client.get("/org_data", query_string={"table_id": table_id})
        self.assertEqual(org_response.status_code, 200, org_response.get_json())
        org_chart = org_response.get_json()["org_chart"]
        self.assertIsNone(org_chart["name"])
        self.assertIsNone(org_chart["role"])
        self.assertIsNone(org_chart["person_id"])
        self.assertIsNone(org_chart["children"][0]["name"])
        self.assertIsNone(org_chart["children"][0]["role"])
        self.assertIsNone(org_chart["children"][0]["person_id"])
        self.assertEqual(self.fetch_folders(old_database)[0]["tables"], [])
        new_folders = self.fetch_folders(new_database)
        self.assertEqual(new_folders[0]["name"], "New folder")
        self.assertEqual(len(new_folders[0]["tables"]), 1)


class ComparisonTests(unittest.TestCase):
    """Keep vacant positions distinct when comparing tables."""

    def test_vacant_positions_fall_back_to_hierarchical_identity(self):
        previous = [
            DataEntry(hierarchical_structure="/1", person_id=None),
            DataEntry(hierarchical_structure="/1/1", person_id="nan"),
        ]
        current = [
            DataEntry(hierarchical_structure="/1", person_id=None),
            DataEntry(hierarchical_structure="/1/1", person_id="nan"),
            DataEntry(hierarchical_structure="/1/2", person_id=None),
        ]

        changes = compare_org_data(previous, current)

        self.assertEqual(
            [entry["hierarchical_structure"] for entry in changes["added"]],
            ["/1/2"],
        )
        self.assertEqual(changes["removed"], [])


if __name__ == "__main__":
    unittest.main()
