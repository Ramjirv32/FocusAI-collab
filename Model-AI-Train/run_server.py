from flask import Flask, request, jsonify
from main import FocusAI
import json

app = Flask(__name__)
focus_ai = FocusAI()

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Endpoint to analyze app usage data
    
    Expected request format:
    {
        "app_data": [
            {"app_name": "VS Code", "duration": 3600},
            {"app_name": "Chrome", "duration": 1800},
            ...
        ]
    }
    """
    try:
        data = request.json
        if not data or 'app_data' not in data:
            return jsonify({"error": "No app_data provided in request"}), 400
            
        app_data = data['app_data']
        results = focus_ai.analyze_app_usage(app_data)
        
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({"status": "ok", "model": "focus_ai"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=False)