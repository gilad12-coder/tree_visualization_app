import pandas as pd
from collections import Counter, defaultdict
from datetime import datetime
import logging
from io import BytesIO

# ReportLab imports for PDF generation
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Table as RLTable, TableStyle, Paragraph,
    Spacer, PageBreak, Image, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie

try:
    from backend.models import DataEntry, Table, get_session
except ModuleNotFoundError:
    from models import DataEntry, Table, get_session

logger = logging.getLogger(__name__)

class OrganizationReportService:
    """Service for generating comprehensive organizational analysis reports."""
    
    def __init__(self, table_id):
        """Initialize the report service with the specified table ID.
        
        Args:
            table_id (int): The ID of the table containing the organizational data snapshot.
        """
        self.table_id = table_id
        self.session = get_session()
        self.data = None
        self.report_data = {}
        self.load_data()
        
    def load_data(self):
        """Load data from the database and convert to DataFrame for analysis."""
        try:
            # Query all data entries for the specified table
            entries = self.session.query(DataEntry).filter_by(table_id=self.table_id).all()
            
            # Convert to DataFrame
            self.data = pd.DataFrame([{
                'id': entry.id,
                'person_id': entry.person_id,
                'name': entry.name,
                'role': entry.role,
                'department': entry.department,
                'rank': entry.rank,
                'hierarchical_structure': entry.hierarchical_structure,
                'birth_date': entry.birth_date,
                'organization_id': entry.organization_id,
                'personal_information': entry.personal_information,
                'role_information': entry.role_information,
                'is_dead': entry.is_dead,
                'upload_date': entry.upload_date
            } for entry in entries])
            
            # Get table metadata
            table = self.session.query(Table).filter_by(id=self.table_id).first()
            self.report_data['table_name'] = table.name if table else f"Table {self.table_id}"
            self.report_data['upload_date'] = table.upload_date if table else None
            
            logger.info(f"Loaded {len(self.data)} entries for table {self.table_id}")
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            raise
            
    def find_multiple_positions(self):
        """Identify people who hold multiple positions in the organization.
        
        Returns:
            dict: Analysis of people with multiple positions.
        """
        # Skip if no person_id or it's all NaN
        if 'person_id' not in self.data.columns or self.data['person_id'].isna().all():
            return {'error': 'No person_id data available'}
            
        # Get counts of person_ids
        person_counts = self.data['person_id'].value_counts()
        multiple_positions = person_counts[person_counts > 1]
        
        # If no one has multiple positions
        if len(multiple_positions) == 0:
            return {
                'count': 0,
                'details': []
            }
            
        # For each person with multiple positions, get the details
        details = []
        for person_id, count in multiple_positions.items():
            if pd.isna(person_id):
                continue
                
            person_entries = self.data[self.data['person_id'] == person_id]
            details.append({
                'person_id': person_id,
                'name': person_entries['name'].iloc[0],
                'position_count': count,
                'positions': [
                    {
                        'role': row['role'],
                        'department': row['department'],
                        'hierarchical_structure': row['hierarchical_structure']
                    }
                    for _, row in person_entries.iterrows()
                ]
            })
        
        return {
            'count': len(details),
            'details': details
        }
        
    def analyze_hierarchy_distribution(self):
        """Analyze the distribution of people across hierarchy levels.
        
        Returns:
            dict: Analysis of hierarchy distribution.
        """
        # Calculate the depth of each position
        self.data['hierarchy_depth'] = self.data['hierarchical_structure'].apply(
            lambda x: len(str(x).split('/')) - 1 if pd.notna(x) else 0
        )
        
        # Count people at each level
        level_counts = self.data['hierarchy_depth'].value_counts().sort_index()
        
        # Calculate percentage at each level
        total = len(self.data)
        level_percentages = (level_counts / total * 100).round(2)
        
        # Find the maximum and average span of control
        max_span = 0
        spans = []
        span_by_level = defaultdict(list)
        
        # Group nodes by their parent
        parent_to_children = defaultdict(list)
        for _, row in self.data.iterrows():
            if pd.isna(row['hierarchical_structure']):
                continue
                
            parts = row['hierarchical_structure'].split('/')
            if len(parts) > 1:
                # Remove the last part to get the parent
                parent = '/'.join(parts[:-1])
                parent_to_children[parent].append(row)
                
        # Calculate span of control for each parent
        for parent, children in parent_to_children.items():
            span = len(children)
            max_span = max(max_span, span)
            spans.append(span)
            
            # Find the parent's level
            parent_level = len(parent.split('/')) - 1
            span_by_level[parent_level].append(span)
            
        # Calculate average span of control
        avg_span = sum(spans) / len(spans) if spans else 0
        
        # Calculate average span by level
        avg_span_by_level = {
            level: sum(spans) / len(spans) 
            for level, spans in span_by_level.items()
        }
        
        # Calculate org chart depth and breadth
        org_depth = self.data['hierarchy_depth'].max()
        org_breadth = len(self.data[self.data['hierarchy_depth'] == 1])
        
        return {
            'level_counts': level_counts.to_dict(),
            'level_percentages': level_percentages.to_dict(),
            'max_span_of_control': max_span,
            'avg_span_of_control': avg_span,
            'avg_span_by_level': avg_span_by_level,
            'org_depth': org_depth,
            'org_breadth': org_breadth
        }
        
    def analyze_department_distribution(self):
        """Analyze the distribution of people across departments.
        
        Returns:
            dict: Analysis of department distribution.
        """
        # Count people in each department
        dept_counts = self.data['department'].value_counts()
        
        # Calculate percentage in each department
        total = len(self.data)
        dept_percentages = (dept_counts / total * 100).round(2)
        
        # Get hierarchical structure of departments
        dept_hierarchies = {}
        for dept in dept_counts.index:
            if pd.isna(dept):
                continue
                
            # Find the highest-ranking person in each department
            dept_entries = self.data[self.data['department'] == dept]
            
            # Use hierarchy depth as a proxy for seniority
            dept_entries['depth'] = dept_entries['hierarchical_structure'].apply(
                lambda x: len(str(x).split('/')) if pd.notna(x) else 999
            )
            
            # Sort by depth (ascending) to find the highest position
            dept_entries = dept_entries.sort_values('depth')
            
            if len(dept_entries) > 0:
                top_person = dept_entries.iloc[0]
                dept_hierarchies[dept] = {
                    'name': top_person['name'],
                    'role': top_person['role'],
                    'hierarchical_structure': top_person['hierarchical_structure']
                }
        
        return {
            'department_counts': dept_counts.to_dict(),
            'department_percentages': dept_percentages.to_dict(),
            'department_hierarchies': dept_hierarchies
        }

    def analyze_role_distribution(self):
        """Analyze the distribution of roles across the organization.
        
        Returns:
            dict: Analysis of role distribution.
        """
        # Count people in each role
        role_counts = self.data['role'].value_counts()
        
        # Calculate percentage for each role
        total = len(self.data)
        role_percentages = (role_counts / total * 100).round(2)
        
        # Calculate role diversity
        unique_roles = len(role_counts)
        role_diversity_ratio = unique_roles / total if total > 0 else 0
        
        # Get top 10 most common roles
        top_roles = role_counts.head(10).to_dict()
        
        return {
            'unique_roles_count': unique_roles,
            'role_diversity_ratio': role_diversity_ratio,
            'top_roles': top_roles,
            'role_counts': role_counts.to_dict(),
            'role_percentages': role_percentages.to_dict()
        }
        
    def analyze_rank_distribution(self):
        """Analyze the distribution of ranks across the organization.
        
        Returns:
            dict: Analysis of rank distribution.
        """
        # Skip if no rank data available
        if 'rank' not in self.data.columns or self.data['rank'].isna().all():
            return {'error': 'No rank data available'}
            
        # Count people at each rank
        rank_counts = self.data['rank'].value_counts()
        
        # Calculate percentage at each rank
        total = len(self.data)
        rank_percentages = (rank_counts / total * 100).round(2)
        
        # Try to calculate rank ratios (e.g., executive to manager ratio)
        rank_categories = defaultdict(list)
        
        # Categorize ranks (this is approximate and may need customization)
        for rank in rank_counts.index:
            if pd.isna(rank):
                continue
                
            rank_lower = str(rank).lower()
            if any(exec_term in rank_lower for exec_term in ['exec', 'ceo', 'cfo', 'cto', 'chief']):
                rank_categories['executive'].append(rank)
            elif any(mgr_term in rank_lower for mgr_term in ['manager', 'director', 'head', 'lead']):
                rank_categories['manager'].append(rank)
            elif any(ind_term in rank_lower for ind_term in ['specialist', 'analyst', 'associate', 'engineer']):
                rank_categories['individual_contributor'].append(rank)
            else:
                rank_categories['other'].append(rank)
                
        # Count by category
        category_counts = {
            category: sum(rank_counts[rank] for rank in ranks if rank in rank_counts)
            for category, ranks in rank_categories.items()
        }
        
        # Calculate ratios
        ratios = {}
        if 'individual_contributor' in category_counts and category_counts['individual_contributor'] > 0:
            if 'manager' in category_counts:
                ratios['ic_to_manager'] = category_counts['individual_contributor'] / category_counts['manager']
            if 'executive' in category_counts:
                ratios['ic_to_executive'] = category_counts['individual_contributor'] / category_counts['executive']
        
        if 'manager' in category_counts and category_counts['manager'] > 0 and 'executive' in category_counts:
            ratios['manager_to_executive'] = category_counts['manager'] / category_counts['executive']
        
        return {
            'rank_counts': rank_counts.to_dict(),
            'rank_percentages': rank_percentages.to_dict(),
            'category_counts': category_counts,
            'ratios': ratios
        }
        
    def identify_critical_roles(self):
        """Identify critical roles based on position in the hierarchy and span of control.
        
        Returns:
            dict: Analysis of critical roles.
        """
        # Calculate span of control for each person
        spans = defaultdict(int)
        
        # Group nodes by their parent
        for _, row in self.data.iterrows():
            if pd.isna(row['hierarchical_structure']):
                continue
                
            parts = row['hierarchical_structure'].split('/')
            if len(parts) > 1:
                # Remove the last part to get the parent
                parent = '/'.join(parts[:-1])
                spans[parent] += 1
        
        # Find nodes with high span of control
        high_span_nodes = []
        for struct, span in spans.items():
            if span >= 5:  # Threshold for high span
                node_data = self.data[self.data['hierarchical_structure'] == struct]
                if len(node_data) > 0:
                    high_span_nodes.append({
                        'name': node_data['name'].iloc[0],
                        'role': node_data['role'].iloc[0],
                        'span_of_control': span,
                        'hierarchical_structure': struct
                    })
                    
        # Sort by span of control, descending
        high_span_nodes = sorted(high_span_nodes, key=lambda x: x['span_of_control'], reverse=True)
        
        # Identify bottlenecks - nodes with high incoming and outgoing connections
        bottlenecks = []
        for struct in spans.keys():
            # Skip root nodes
            if len(struct.split('/')) <= 2:
                continue
                
            # Check if this node has a high span of control and also has siblings
            if spans[struct] >= 3:
                # Get the parent
                parts = struct.split('/')
                parent = '/'.join(parts[:-1])
                
                # Check if parent has multiple children
                sibling_count = sum(1 for s in spans.keys() if s.startswith(parent + '/') and s != struct)
                
                if sibling_count >= 2:
                    node_data = self.data[self.data['hierarchical_structure'] == struct]
                    if len(node_data) > 0:
                        bottlenecks.append({
                            'name': node_data['name'].iloc[0],
                            'role': node_data['role'].iloc[0],
                            'span_of_control': spans[struct],
                            'sibling_count': sibling_count,
                            'hierarchical_structure': struct
                        })
        
        # Sort bottlenecks by span of control
        bottlenecks = sorted(bottlenecks, key=lambda x: x['span_of_control'], reverse=True)
        
        return {
            'high_span_nodes': high_span_nodes[:10],  # Top 10
            'bottlenecks': bottlenecks[:10]  # Top 10
        }
        
    def perform_anomaly_detection(self):
        """Detect anomalies in the organizational structure.
        
        Returns:
            dict: Anomalies detected in the organization.
        """
        anomalies = []
        
        # 1. Check for inconsistent department assignments within teams
        for _, row in self.data.iterrows():
            if pd.isna(row['hierarchical_structure']):
                continue
                
            struct = row['hierarchical_structure']
            dept = row['department']
            
            # Find all direct reports
            direct_reports = self.data[self.data['hierarchical_structure'].str.startswith(struct + '/')]
            
            if len(direct_reports) > 0:
                # Check if all direct reports have the same department
                dept_counts = direct_reports['department'].value_counts()
                
                if len(dept_counts) > 1:
                    anomalies.append({
                        'type': 'inconsistent_department',
                        'manager_name': row['name'],
                        'manager_dept': dept,
                        'manager_structure': struct,
                        'report_departments': dept_counts.to_dict()
                    })
                    
        # 2. Check for skipped levels in hierarchy
        for _, row in self.data.iterrows():
            if pd.isna(row['hierarchical_structure']):
                continue
                
            struct = row['hierarchical_structure']
            parts = struct.split('/')
            
            if len(parts) > 3:  # Only check non-trivial hierarchies
                # Check if any intermediate levels are empty
                for i in range(2, len(parts)):
                    parent_struct = '/'.join(parts[:i])
                    if len(self.data[self.data['hierarchical_structure'] == parent_struct]) == 0:
                        anomalies.append({
                            'type': 'skipped_level',
                            'name': row['name'],
                            'structure': struct,
                            'missing_parent': parent_struct
                        })
        
        # 3. Check for unusually large teams
        spans = defaultdict(int)
        for _, row in self.data.iterrows():
            if pd.isna(row['hierarchical_structure']):
                continue
                
            parts = row['hierarchical_structure'].split('/')
            if len(parts) > 1:
                parent = '/'.join(parts[:-1])
                spans[parent] += 1
                
        # Calculate average and standard deviation of span
        span_values = list(spans.values())
        avg_span = sum(span_values) / len(span_values) if span_values else 0
        std_span = (sum((x - avg_span) ** 2 for x in span_values) / len(span_values)) ** 0.5 if span_values else 0
        
        # Identify outliers (>2 std dev)
        outlier_threshold = avg_span + 2 * std_span
        for struct, span in spans.items():
            if span > outlier_threshold and span > 5:  # At least 5 direct reports
                node_data = self.data[self.data['hierarchical_structure'] == struct]
                if len(node_data) > 0:
                    anomalies.append({
                        'type': 'unusually_large_team',
                        'name': node_data['name'].iloc[0],
                        'role': node_data['role'].iloc[0],
                        'span_of_control': span,
                        'avg_span': avg_span,
                        'threshold': outlier_threshold,
                        'structure': struct
                    })
        
        return {
            'count': len(anomalies),
            'anomalies': anomalies
        }
        
    def generate_report(self):
        """Generate a complete organizational analysis report.
        
        Returns:
            dict: Complete organizational analysis report.
        """
        try:
            # Generate all analyses
            multiple_positions = self.find_multiple_positions()
            hierarchy_distribution = self.analyze_hierarchy_distribution()
            department_distribution = self.analyze_department_distribution()
            role_distribution = self.analyze_role_distribution()
            rank_distribution = self.analyze_rank_distribution()
            critical_roles = self.identify_critical_roles()
            anomalies = self.perform_anomaly_detection()
            
            # Basic stats
            total_employees = len(self.data)
            total_departments = len(department_distribution['department_counts'])
            total_roles = role_distribution['unique_roles_count']
            org_depth = hierarchy_distribution['org_depth']
            
            # Compile the report
            report = {
                'report_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'table_id': self.table_id,
                'table_name': self.report_data.get('table_name', f"Table {self.table_id}"),
                'upload_date': self.report_data.get('upload_date', None),
                'summary': {
                    'total_employees': total_employees,
                    'total_departments': total_departments,
                    'total_roles': total_roles,
                    'org_depth': org_depth,
                    'avg_span_of_control': hierarchy_distribution['avg_span_of_control'],
                    'multiple_position_count': multiple_positions['count']
                },
                'multiple_positions': multiple_positions,
                'hierarchy_distribution': hierarchy_distribution,
                'department_distribution': department_distribution,
                'role_distribution': role_distribution,
                'rank_distribution': rank_distribution,
                'critical_roles': critical_roles,
                'anomalies': anomalies
            }
            
            logger.info(f"Generated report for table {self.table_id}")
            return report
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            raise
        finally:
            self.session.close()
            
    def generate_pdf_report(self, language='en'):
        """Generate a comprehensive bilingual PDF report with enhanced visuals.

        Args:
            language (str): Language code - 'en' for English, 'he' for Hebrew.

        Returns:
            bytes: PDF report as bytes.
        """
        # Get the report data
        report = self.generate_report()

        # Bilingual translations
        translations = {
            'en': {
                'title': 'Organizational Analysis Report',
                'table': 'Organization',
                'generated_on': 'Generated on',
                'executive_summary': 'Executive Summary',
                'total_employees': 'Total Employees',
                'total_departments': 'Total Departments',
                'total_roles': 'Total Roles',
                'org_depth': 'Organization Depth',
                'avg_span': 'Average Span of Control',
                'multiple_positions': 'Employees with Multiple Positions',
                'hierarchy_analysis': 'Hierarchy Analysis',
                'org_breadth': 'Organization Breadth',
                'max_span': 'Maximum Span of Control',
                'employees_by_level': 'Employees by Level',
                'level': 'Level',
                'employees': 'employees',
                'department_analysis': 'Department Analysis',
                'total_depts': 'Total departments',
                'role_analysis': 'Role Analysis',
                'unique_roles': 'Unique roles',
                'role_diversity': 'Role diversity ratio',
                'top_roles': 'Top Roles',
                'critical_roles': 'Critical Role Analysis',
                'high_span_title': 'High Span of Control',
                'direct_reports': 'direct reports',
                'bottlenecks': 'Organizational Bottlenecks',
                'siblings': 'siblings',
                'anomaly_detection': 'Anomaly Detection',
                'anomalies_detected': 'Total anomalies detected',
                'no_anomalies': 'No anomalies detected in the organization structure.',
                'multiple_pos_analysis': 'Multiple Position Analysis',
                'no_multiple_pos': 'No employees hold multiple positions.',
                'holds_positions': 'employees hold multiple positions',
                'positions': 'positions',
                'in_dept': 'in',
                'and_more': 'and more',
                'levels': 'levels',
                'reports_to_ceo': 'direct reports to leadership',
                'inconsistent_dept': 'inconsistent department',
                'skipped_level': 'skipped level',
                'unusually_large_team': 'unusually large team',
                'anomalies': 'anomalies',
                'key_insights': 'Key Insights',
                'recommendations': 'Recommendations',
                'span_health': 'Span of Control Health',
                'optimal': 'Optimal span of control (3-7 direct reports)',
                'high_span_warning': 'Some managers have high span of control - consider delegating',
                'low_span_warning': 'Some managers have low span of control - consider restructuring',
                'dept_balance': 'Department Balance',
                'page': 'Page',
                'of': 'of'
            },
            'he': {
                'title': 'דוח ניתוח ארגוני',
                'table': 'ארגון',
                'generated_on': 'נוצר בתאריך',
                'executive_summary': 'סיכום מנהלים',
                'total_employees': 'סך כל עובדים',
                'total_departments': 'סך כל מחלקות',
                'total_roles': 'סך כל תפקידים',
                'org_depth': 'עומק ארגוני',
                'avg_span': 'טווח בקרה ממוצע',
                'multiple_positions': 'עובדים עם מספר תפקידים',
                'hierarchy_analysis': 'ניתוח היררכיה',
                'org_breadth': 'רוחב ארגוני',
                'max_span': 'טווח בקרה מקסימלי',
                'employees_by_level': 'עובדים לפי רמה',
                'level': 'רמה',
                'employees': 'עובדים',
                'department_analysis': 'ניתוח מחלקות',
                'total_depts': 'סך כל מחלקות',
                'role_analysis': 'ניתוח תפקידים',
                'unique_roles': 'תפקידים ייחודיים',
                'role_diversity': 'יחס גיוון תפקידים',
                'top_roles': 'תפקידים מובילים',
                'critical_roles': 'ניתוח תפקידים קריטיים',
                'high_span_title': 'טווח בקרה גבוה',
                'direct_reports': 'דיווחים ישירים',
                'bottlenecks': 'צווארי בקבוק ארגוניים',
                'siblings': 'אחים',
                'anomaly_detection': 'זיהוי חריגות',
                'anomalies_detected': 'סך כל חריגות שזוהו',
                'no_anomalies': 'לא זוהו חריגות במבנה הארגוני.',
                'multiple_pos_analysis': 'ניתוח תפקידים מרובים',
                'no_multiple_pos': 'אין עובדים המחזיקים במספר תפקידים.',
                'holds_positions': 'עובדים מחזיקים במספר תפקידים',
                'positions': 'תפקידים',
                'in_dept': 'ב',
                'and_more': 'ועוד',
                'levels': 'רמות',
                'reports_to_ceo': 'דיווחים ישירים להנהלה',
                'inconsistent_dept': 'מחלקה לא עקבית',
                'skipped_level': 'רמה שדולגה',
                'unusually_large_team': 'צוות גדול בצורה חריגה',
                'anomalies': 'חריגות',
                'key_insights': 'תובנות מרכזיות',
                'recommendations': 'המלצות',
                'span_health': 'בריאות טווח בקרה',
                'optimal': 'טווח בקרה אופטימלי (3-7 דיווחים ישירים)',
                'high_span_warning': 'חלק מהמנהלים עם טווח בקרה גבוה - שקול האצלה',
                'low_span_warning': 'חלק מהמנהלים עם טווח בקרה נמוך - שקול ארגון מחדש',
                'dept_balance': 'איזון מחלקות',
                'page': 'עמוד',
                'of': 'מתוך'
            }
        }

        t = translations.get(language, translations['en'])
        is_rtl = (language == 'he')

        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)

        # Container for PDF elements
        story = []

        # Define styles
        styles = getSampleStyleSheet()

        # Custom styles for bilingual support
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1f2937'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#374151'),
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold',
            alignment=TA_RIGHT if is_rtl else TA_LEFT
        )

        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#4b5563'),
            spaceAfter=8,
            fontName='Helvetica',
            alignment=TA_RIGHT if is_rtl else TA_LEFT
        )

        # Title
        story.append(Paragraph(t['title'], title_style))
        story.append(Paragraph(f"{t['table']}: {report['table_name']}", body_style))
        story.append(Paragraph(f"{t['generated_on']}: {report['report_date']}", body_style))
        story.append(Spacer(1, 20))

        # Executive Summary Section with colored background
        summary_data = [
            [t['executive_summary'], ''],
            [t['total_employees'], str(report['summary']['total_employees'])],
            [t['total_departments'], str(report['summary']['total_departments'])],
            [t['total_roles'], str(report['summary']['total_roles'])],
            [t['org_depth'], f"{report['summary']['org_depth']} {t['levels']}"],
            [t['avg_span'], f"{report['summary']['avg_span_of_control']:.2f}"],
            [t['multiple_positions'], str(report['summary']['multiple_position_count'])]
        ]

        summary_table = RLTable(summary_data, colWidths=[3.5*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3b82f6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if is_rtl else 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#eff6ff')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dbeafe')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 11),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))

        # Hierarchy Analysis
        story.append(Paragraph(t['hierarchy_analysis'], heading_style))
        hierarchy_data = [
            [t['org_depth'], f"{report['hierarchy_distribution']['org_depth']} {t['levels']}"],
            [t['org_breadth'], f"{report['hierarchy_distribution']['org_breadth']} {t['reports_to_ceo']}"],
            [t['max_span'], str(report['hierarchy_distribution']['max_span_of_control'])],
            [t['avg_span'], f"{report['hierarchy_distribution']['avg_span_of_control']:.2f}"]
        ]

        hierarchy_table = RLTable(hierarchy_data, colWidths=[3.5*inch, 2*inch])
        hierarchy_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#d1d5db')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if is_rtl else 'LEFT'),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        story.append(hierarchy_table)
        story.append(Spacer(1, 15))

        # Employees by Level Chart
        story.append(Paragraph(t['employees_by_level'], body_style))
        level_data = []
        for level, count in sorted(report['hierarchy_distribution']['level_counts'].items()):
            percentage = report['hierarchy_distribution']['level_percentages'].get(level, 0)
            level_data.append([f"{t['level']} {level}", str(count), f"{percentage:.1f}%"])

        if level_data:
            level_table = RLTable(
                [[t['level'], t['employees'], '%']] + level_data,
                colWidths=[1.8*inch, 1.8*inch, 1.4*inch]
            )
            level_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#e0e7ff')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#c7d2fe')),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(level_table)
        story.append(Spacer(1, 20))

        # Department Analysis
        story.append(Paragraph(t['department_analysis'], heading_style))
        dept_text = f"{t['total_depts']}: {len(report['department_distribution']['department_counts'])}"
        story.append(Paragraph(dept_text, body_style))
        story.append(Spacer(1, 10))

        # Top 10 departments
        sorted_depts = sorted(
            [(dept, count) for dept, count in report['department_distribution']['department_counts'].items()],
            key=lambda x: x[1], reverse=True
        )[:10]

        if sorted_depts:
            dept_data = []
            for dept, count in sorted_depts:
                percentage = report['department_distribution']['department_percentages'].get(dept, 0)
                dept_data.append([str(dept) if dept else 'N/A', str(count), f"{percentage:.1f}%"])

            dept_table = RLTable(
                [[t['department_analysis'], t['employees'], '%']] + dept_data,
                colWidths=[2.5*inch, 1.5*inch, 1*inch]
            )
            dept_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10b981')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if is_rtl else 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#d1fae5')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#a7f3d0')),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(dept_table)
        story.append(Spacer(1, 20))

        # Role Analysis
        story.append(Paragraph(t['role_analysis'], heading_style))
        role_text = f"{t['unique_roles']}: {report['role_distribution']['unique_roles_count']}"
        story.append(Paragraph(role_text, body_style))
        story.append(Spacer(1, 10))

        # Top roles
        top_roles_data = []
        for role, count in list(report['role_distribution']['top_roles'].items())[:10]:
            top_roles_data.append([str(role) if role else 'N/A', str(count)])

        if top_roles_data:
            role_table = RLTable(
                [[t['top_roles'], t['employees']]] + top_roles_data,
                colWidths=[3.5*inch, 1.5*inch]
            )
            role_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f59e0b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if is_rtl else 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fef3c7')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#fde68a')),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(role_table)
        story.append(Spacer(1, 20))

        # Critical Roles
        story.append(Paragraph(t['critical_roles'], heading_style))

        # High span of control
        story.append(Paragraph(t['high_span_title'], body_style))
        high_span_data = []
        for node in report['critical_roles']['high_span_nodes'][:5]:
            high_span_data.append([
                node['name'],
                node['role'] if node['role'] else 'N/A',
                f"{node['span_of_control']} {t['direct_reports']}"
            ])

        if high_span_data:
            high_span_table = RLTable(high_span_data, colWidths=[2*inch, 2*inch, 1.5*inch])
            high_span_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fee2e2')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#fecaca')),
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if is_rtl else 'LEFT'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(high_span_table)
        story.append(Spacer(1, 15))

        # Bottlenecks
        story.append(Paragraph(t['bottlenecks'], body_style))
        bottleneck_data = []
        for node in report['critical_roles']['bottlenecks'][:5]:
            bottleneck_data.append([
                node['name'],
                node['role'] if node['role'] else 'N/A',
                f"{node['span_of_control']} {t['direct_reports']}, {node['sibling_count']} {t['siblings']}"
            ])

        if bottleneck_data:
            bottleneck_table = RLTable(bottleneck_data, colWidths=[2*inch, 2*inch, 1.5*inch])
            bottleneck_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fef9c3')),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#fef08a')),
                ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if is_rtl else 'LEFT'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(bottleneck_table)
        story.append(Spacer(1, 20))

        # Anomaly Detection
        story.append(Paragraph(t['anomaly_detection'], heading_style))
        anomaly_text = f"{t['anomalies_detected']}: {report['anomalies']['count']}"
        story.append(Paragraph(anomaly_text, body_style))

        if report['anomalies']['count'] > 0:
            anomaly_counts = Counter(a['type'] for a in report['anomalies']['anomalies'])
            anomaly_summary = []
            for anomaly_type, count in anomaly_counts.items():
                anomaly_type_translated = t.get(anomaly_type, anomaly_type.replace('_', ' '))
                anomaly_summary.append([f"{count} {anomaly_type_translated} {t['anomalies']}"])

            if anomaly_summary:
                anomaly_table = RLTable(anomaly_summary, colWidths=[5*inch])
                anomaly_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffedd5')),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#fed7aa')),
                    ('ALIGN', (0, 0), (-1, -1), 'RIGHT' if is_rtl else 'LEFT'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('PADDING', (0, 0), (-1, -1), 8),
                ]))
                story.append(Spacer(1, 10))
                story.append(anomaly_table)
        else:
            story.append(Paragraph(t['no_anomalies'], body_style))

        # Build PDF
        doc.build(story)

        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes