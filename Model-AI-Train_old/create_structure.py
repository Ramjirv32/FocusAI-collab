import os
import shutil

def create_project_structure():
    """Create a well-organized project structure"""
    
    # Define the project structure
    structure = {
        'src/': [
            'api/',
            'models/',
            'data/',
            'utils/',
            'config/'
        ],
        'src/api/': [
            '__init__.py',
            'main.py',
            'routes/',
            'schemas/',
            'middleware/'
        ],
        'src/api/routes/': [
            '__init__.py',
            'focus_analysis.py',
            'user_stats.py',
            'data_management.py'
        ],
        'src/api/schemas/': [
            '__init__.py',
            'focus_models.py',
            'response_models.py'
        ],
        'src/models/': [
            '__init__.py',
            'classifiers/',
            'training/',
            'evaluation/'
        ],
        'src/models/classifiers/': [
            '__init__.py',
            'smart_classifier.py',
            'context_analyzer.py',
            'enhanced_classifier.py'
        ],
        'src/models/training/': [
            '__init__.py',
            'data_preprocessor.py',
            'model_trainer.py',
            'feature_engineer.py'
        ],
        'src/data/': [
            '__init__.py',
            'raw/',
            'processed/',
            'models/',
            'sample/'
        ],
        'src/utils/': [
            '__init__.py',
            'data_utils.py',
            'model_utils.py',
            'logging_utils.py'
        ],
        'src/config/': [
            '__init__.py',
            'settings.py',
            'constants.py'
        ],
        'tests/': [
            '__init__.py',
            'test_api/',
            'test_models/',
            'test_utils/'
        ],
        'docs/': [
            'README.md',
            'API.md',
            'SETUP.md'
        ],
        'scripts/': [
            'train_model.py',
            'setup_environment.py',
            'deploy.py'
        ]
    }
    
    # Create directories and files
    for directory, files in structure.items():
        os.makedirs(directory, exist_ok=True)
        print(f"📁 Created directory: {directory}")
        
        if files:
            for file in files:
                if file.endswith('/'):
                    # It's a subdirectory
                    continue
                else:
                    # Create file
                    filepath = os.path.join(directory, file)
                    if not os.path.exists(filepath):
                        with open(filepath, 'w') as f:
                            if file.endswith('.py'):
                                f.write(f'"""{file} - Auto-generated file"""\n')
                        print(f"📄 Created file: {filepath}")

if __name__ == "__main__":
    create_project_structure()
    print("✅ Project structure created successfully!")