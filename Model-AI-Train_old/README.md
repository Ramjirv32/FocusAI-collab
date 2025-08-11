# Focus AI Analysis - Productivity Tracking System

![Focus AI Logo](https://via.placeholder.com/150?text=Focus+AI)

A machine learning-powered productivity tracking and analysis system that helps users understand their focus patterns.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+ installed
- pip package manager
- Virtual environment (recommended)

### Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd Model-AI-Train
```

2. **Create and activate a virtual environment**

```bash

python -m venv venv


source venv/bin/activate


venv\Scripts\activate
```

3. **Install dependencies**

```bash
pip install -r requirements.txt
```

4. **Set up the project structure** (if needed)

```bash
python create_structure.py
```

### Running the Application

1. **Start the API server**

```bash
python main.py
```

The API will be available at: http://localhost:8000

2. **Access the API documentation**

Open your browser and navigate to: http://localhost:8000/docs

### Sample API Endpoints

- **Get Focus Analysis**: `GET /user/{user_id}/focus-analysis`
- **Quick Statistics**: `GET /user/{user_id}/quick-stats`
- **View Real Data**: `GET /real-data`

## 📊 Data Collection

The system processes usage data from:
- Applications/windows used
- Duration of usage
- Timestamp information

## 🧠 Machine Learning Model

The AI model classifies activities into:
- **Focused** - Productive work-related activities
- **Distracted** - Entertainment or non-work related activities

### Model Files

The system automatically creates placeholder models if they don't exist:
- `focus_model.pkl` - Main classification model
- `app_name_encoder.pkl` - App name encoder
- `tab_name_encoder.pkl` - Tab name encoder
- `label_encoder.pkl` - Label encoder

For production use, replace these with properly trained models.

## 🏗️ Project Structure

```
Model-AI-Train/
├── src/
│   ├── api/             # API implementation
│   ├── models/          # ML models and classifiers
│   ├── data/            # Data storage and management
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
├── tests/               # Unit and integration tests
├── docs/                # Documentation
├── scripts/             # Utility scripts
├── main.py              # Main application entry point
├── create_structure.py  # Project structure setup
└── README.md            # This documentation
```

## 📈 Analysis Features

The system provides:
- Activity focus categorization (focused vs. distracted)
- Duration statistics for different activities
- Focus percentage and productivity score
- Most used applications
- Confidence scores for predictions

## 🛠️ Development

### Adding New Models

To add a new model:

1. Create your model training script in `src/models/training/`
2. Save the trained model in `src/data/models/`
3. Update the classifier in `src/models/classifiers/`

### Extending the API

To add new API endpoints:

1. Create a new route file in `src/api/routes/`
2. Define response models in `src/api/schemas/`
3. Include the router in `src/api/main.py`

## 📝 License

[Your License Information]

## 🤝 Contributing

[Your Contribution Guidelines]

---

Developed with ❤️ by [Your Name/Organization]