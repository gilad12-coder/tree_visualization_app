import io
import pandas as pd
import spacy
from spacy.language import Language
from spacy_langdetect import LanguageDetector
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from tqdm import tqdm
import time

# Initialize tqdm.pandas
tqdm.pandas()

# Load multilingual model
nlp = spacy.load("xx_ent_wiki_sm")

# Add sentencizer to the pipeline
nlp.add_pipe("sentencizer")

# Add language detection
@Language.factory("language_detector")
def create_language_detector(nlp, name):
    return LanguageDetector()

nlp.add_pipe("language_detector", last=True)

def preprocess_org_data(df):
    """
    Advanced preprocessing of organization data to establish hierarchical relationships between roles
    using sophisticated NLP techniques, suitable for multiple languages.

    Args:
    df (pd.DataFrame): Input dataframe with columns 'org_name', 'unit', 'department', 'role'

    Returns:
    pd.DataFrame: Processed dataframe with 'hierarchical_structure' column added
    """
    start_time = time.time()
    print(f"Starting preprocessing for {len(df)} rows of data.")

    def clean_text(text):
        """Clean and standardize text."""
        return str(text).strip().lower()

    def analyze_role(role):
        """
        Analyze the role title using advanced NLP techniques.

        Args:
        role (str): The role title.

        Returns:
        dict: A dictionary containing the role analysis.
        """
        doc = nlp(clean_text(role))
        
        # Extract linguistic features
        root_tokens = [token for token in doc if token.dep_ == "ROOT"]
        if root_tokens:
            root = root_tokens[0]
            modifiers = [token for token in root.children if token.dep_ in ["amod", "compound"]]
        else:
            # Fallback: use the last token as root if no ROOT is found
            root = doc[-1]
            modifiers = [token for token in doc if token.dep_ in ["amod", "compound"]]

        entities = [(ent.text, ent.label_) for ent in doc.ents]
        
        # Determine role level based on linguistic features
        level_indicators = {
            "high": ["chief", "head", "director", "president", "executive", "vice"],
            "mid": ["manager", "lead", "senior", "principal"],
            "low": ["assistant", "junior", "intern", "trainee"]
        }
        
        role_level = "standard"
        for token in doc:
            if token.text in level_indicators["high"]:
                role_level = "high"
                break
            elif token.text in level_indicators["mid"]:
                role_level = "mid"
                break
            elif token.text in level_indicators["low"]:
                role_level = "low"
                break

        # Ensure vector is not empty
        vector = doc.vector if doc.vector.size > 0 else np.ones(300)  # Use a default vector if empty

        return {
            "role": role,
            "language": doc._.language,
            "root": root.text,
            "modifiers": [mod.text for mod in modifiers],
            "entities": entities,
            "vector": vector,
            "role_level": role_level
        }

    print("Analyzing roles using advanced NLP...")
    df['role_analysis'] = df['role'].progress_apply(analyze_role)
    print("Role analysis completed.")

    print("Building role hierarchy...")
    # Fill NaN values with placeholders
    df['unit'] = df['unit'].fillna('No Unit')
    df['department'] = df['department'].fillna('No Department')
    
    # Group by org_name, unit, department
    groups = df.groupby(['org_name', 'unit', 'department'])

    def build_hierarchy(group):
        roles = group['role_analysis'].tolist()
        n = len(roles)
        similarity_matrix = np.zeros((n, n))
        
        # Compute similarity matrix
        for i in range(n):
            for j in range(i+1, n):
                # Ensure vectors are 2D for cosine_similarity
                vec_i = roles[i]['vector'].reshape(1, -1)
                vec_j = roles[j]['vector'].reshape(1, -1)
                similarity = cosine_similarity(vec_i, vec_j)[0][0]
                similarity_matrix[i, j] = similarity_matrix[j, i] = similarity

        # Build hierarchy based on similarity and role levels
        hierarchy = {}
        processed = set()
        
        def find_parent(idx):
            role = roles[idx]
            best_parent = None
            best_similarity = -1
            
            for j in range(n):
                if j != idx and j not in processed:
                    similarity = similarity_matrix[idx, j]
                    potential_parent = roles[j]
                    
                    if (similarity > best_similarity and 
                        (potential_parent['role_level'] == 'high' or 
                         (potential_parent['role_level'] == 'mid' and role['role_level'] != 'high'))):
                        best_parent = j
                        best_similarity = similarity
            
            return best_parent

        # Start with high-level roles
        for i, role in enumerate(roles):
            if role['role_level'] == 'high' and i not in processed:
                hierarchy[i] = find_parent(i)
                processed.add(i)

        # Process mid-level roles
        for i, role in enumerate(roles):
            if role['role_level'] == 'mid' and i not in processed:
                hierarchy[i] = find_parent(i)
                processed.add(i)

        # Process remaining roles
        for i, role in enumerate(roles):
            if i not in processed:
                hierarchy[i] = find_parent(i)
                processed.add(i)

        return hierarchy

    print("Establishing hierarchies within units and departments...")
    hierarchies = {}
    for name, group in tqdm(groups):
        hierarchies[name] = build_hierarchy(group)

    def create_path(group_key, group, hierarchies, idx):
        path = []
        current = idx
        group_hierarchy = hierarchies[group_key]
        while current is not None:
            path.append(group.iloc[current]['role'])
            current = group_hierarchy.get(current)
        return '/'.join(reversed(path))

    print("Building hierarchical paths...")
    df['hierarchical_path'] = df.apply(lambda row: create_path(
        (row['org_name'], row['unit'], row['department']),
        groups.get_group((row['org_name'], row['unit'], row['department'])),
        hierarchies,
        groups.get_group((row['org_name'], row['unit'], row['department'])).index.get_loc(row.name)
    ), axis=1)

    print("Finalizing hierarchical structure...")
    df['hierarchical_structure'] = df.apply(
        lambda row: f"{row['org_name']}/" + 
                    f"{row['unit'] if row['unit'] != 'No Unit' else ''}/" +
                    f"{row['department'] if row['department'] != 'No Department' else ''}/" +
                    f"{row['hierarchical_path']}",
        axis=1
    )

    # Clean up temporary columns and restore original NaN values
    df['unit'] = df['unit'].replace('No Unit', np.nan)
    df['department'] = df['department'].replace('No Department', np.nan)
    df = df.drop(columns=['role_analysis', 'hierarchical_path'])

    end_time = time.time()
    print(f"Total preprocessing completed in {end_time - start_time:.2f} seconds.")

    return df

# CSV data
csv_data = """org_name,unit,department,role
TechInnovate,R&D,AI Research,Head of AI Research
TechInnovate,R&D,AI Research,Senior AI Researcher
TechInnovate,R&D,AI Research,AI Researcher
TechInnovate,R&D,Machine Learning,Lead Machine Learning Engineer
TechInnovate,R&D,Machine Learning,Machine Learning Engineer
TechInnovate,R&D,Machine Learning,Junior Machine Learning Engineer
TechInnovate,Engineering,Software Development,Director of Software Engineering
TechInnovate,Engineering,Software Development,Senior Software Engineer
TechInnovate,Engineering,Software Development,Software Engineer
TechInnovate,Engineering,QA,Quality Assurance Manager
TechInnovate,Engineering,QA,QA Engineer
TechInnovate,Product,Product Management,Chief Product Officer
TechInnovate,Product,Product Management,Senior Product Manager
TechInnovate,Product,Product Management,Product Manager
TechInnovate,Marketing,,Head of Marketing
TechInnovate,Marketing,,Digital Marketing Specialist
TechInnovate,Marketing,,Content Creator
TechInnovate,Sales,,Vice President of Sales
TechInnovate,Sales,,Regional Sales Manager
TechInnovate,Sales,,Sales Representative
TechInnovate,Human Resources,,HR Director
TechInnovate,Human Resources,,HR Specialist
TechInnovate,Finance,,Chief Financial Officer
TechInnovate,Finance,,Financial Analyst
TechInnovate,,,Chief Executive Officer
TechInnovate,,,Executive Assistant to CEO"""

# Function to print section headers
def print_header(text):
    print("\n" + "="*50)
    print(text)
    print("="*50)

# Set pandas display options for full visibility
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.max_colwidth', None)

# Read the CSV data
print_header("Step 0: Loading Data")
df = pd.read_csv(io.StringIO(csv_data))
print("Raw data shape:", df.shape)
print(df)

# Step 1: Preprocess the data
print_header("Step 1: Preprocessing the Data")
processed_df = preprocess_org_data(df)

# Display the preprocessed data
print("\nPreprocessed Data:")
print("Processed data shape:", processed_df.shape)
print(processed_df)