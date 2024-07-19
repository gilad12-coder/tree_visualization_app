import unittest
import pandas as pd
from backend.utils import parse_org_data

class TestUtils(unittest.TestCase):

    def test_parse_org_data_basic(self):
        data = {
            'Hierarchical_Structure': [
                '/1', 
                '/1/1', 
                '/1/2', 
                '/1/1/1'
            ],
            'Name': [
                'Alice Johnson', 
                'Bob Smith', 
                'Carol White', 
                'Eve Green'
            ],
            'Role': [
                'CEO', 
                'CTO', 
                'CFO', 
                'VP Engineering'
            ]
        }
        df = pd.DataFrame(data)
        org_structure = parse_org_data(df)
        self.assertIsNotNone(org_structure)
        self.assertIn('children', org_structure)
        self.assertEqual(len(org_structure['children']), 2)
        self.assertEqual(org_structure['children'][0]['name'], 'Bob Smith')
        self.assertEqual(org_structure['children'][1]['name'], 'Carol White')

    def test_parse_org_data_empty(self):
        df = pd.DataFrame(columns=['Hierarchical_Structure', 'Name', 'Role'])
        org_structure = parse_org_data(df)
        self.assertEqual(org_structure, {})

    def test_parse_org_data_missing_hierarchical_structure(self):
        data = {
            'Hierarchical_Structure': [
                '', 
                '/1/1', 
                '/1/2'
            ],
            'Name': [
                'Alice Johnson', 
                'Bob Smith', 
                'Carol White'
            ],
            'Role': [
                'CEO', 
                'CTO', 
                'CFO'
            ]
        }
        df = pd.DataFrame(data)
        org_structure = parse_org_data(df)
        self.assertIn('children', org_structure)
        self.assertEqual(len(org_structure['children']), 2)
        self.assertEqual(org_structure['children'][0]['name'], 'Bob Smith')

    def test_parse_org_data_escaped_slashes(self):
        data = {
            'Hierarchical_Structure': [
                '/1', 
                '/1\\/1', 
                '/1\\/1\\/1'
            ],
            'Name': [
                'Alice Johnson', 
                'Bob Smith', 
                'Eve Green'
            ],
            'Role': [
                'CEO', 
                'CTO', 
                'VP Engineering'
            ]
        }
        df = pd.DataFrame(data)
        org_structure = parse_org_data(df)
        self.assertIn('children', org_structure)
        self.assertEqual(len(org_structure['children']), 1)
        self.assertEqual(org_structure['children'][0]['name'], 'Bob Smith')

    def test_parse_org_data_complex_structure(self):
        data = {
            'Hierarchical_Structure': [
                '/1', 
                '/1/1', 
                '/1/1/1', 
                '/1/1/2', 
                '/1/2', 
                '/1/2/1'
            ],
            'Name': [
                'Alice Johnson', 
                'Bob Smith', 
                'Charlie Brown', 
                'Daisy Blue', 
                'Eve Green', 
                'Frank Black'
            ],
            'Role': [
                'CEO', 
                'CTO', 
                'Engineer', 
                'Engineer', 
                'CFO', 
                'Accountant'
            ]
        }
        df = pd.DataFrame(data)
        org_structure = parse_org_data(df)
        self.assertIn('children', org_structure)
        self.assertEqual(len(org_structure['children']), 2)
        self.assertEqual(org_structure['children'][0]['name'], 'Bob Smith')
        self.assertEqual(len(org_structure['children'][0]['children']), 2)
        self.assertEqual(org_structure['children'][0]['children'][0]['name'], 'Charlie Brown')
        self.assertEqual(org_structure['children'][1]['name'], 'Eve Green')
        self.assertEqual(len(org_structure['children'][1]['children']), 1)
        self.assertEqual(org_structure['children'][1]['children'][0]['name'], 'Frank Black')

    def test_parse_org_data_missing_parent(self):
        data = {
            'Hierarchical_Structure': [
                '/1/1', 
                '/1/1/1'
            ],
            'Name': [
                'Bob Smith', 
                'Charlie Brown'
            ],
            'Role': [
                'CTO', 
                'Engineer'
            ]
        }
        df = pd.DataFrame(data)
        org_structure = parse_org_data(df)
        self.assertEqual(org_structure, {})

if __name__ == '__main__':
    unittest.main()
