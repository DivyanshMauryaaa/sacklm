from flask import Flask, request, jsonify
import requests
from flask_cors import CORS  # Import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# Example headers and URLs
GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?'
GOOGLE_API_KEY = 'AIzaSyA7cKRnNEj6YXyA6L4IKckwox-8YtVciKw'

CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
CLAUDE_API_KEY = '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'

@app.route('/generate', methods=['GET'])
def generate_response():
    model = request.args.get('model', 'google')  # Default to 'google' if no model specified
    prompt = request.args.get('prompt', 'Hello AI!')
    instructions = request.args.get('instructions', '')  # Handle instructions parameter
    chatContext = request.args.get('context', '')

    # Determine which model to use
    if model == "google":
        # Google API call
        headers = {
            "Content-Type": "application/json"
        }
        params = {
            "key": GOOGLE_API_KEY
        }
        data = {
            "contents": [
                {"parts": [{"text": "User prompt: " + prompt + "\n" + " instructions by user: " + instructions + " Previous chat: " + chatContext }]}  # Pass prompt + instructions
            ]
        }
        response = requests.post(GOOGLE_API_URL, headers=headers, params=params, json=data)

    elif model == "claude":
        # Claude API call
        headers = {
            "x-api-key": CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        data = {
            "model": "claude-3-opus-20240229",
            "max_tokens": 1000,
            "messages": [
                {"role": "user", "content": prompt + "\n" + instructions}  # Pass prompt + instructions
            ]
        }
        response = requests.post(CLAUDE_API_URL, headers=headers, json=data)

    else:
        return jsonify({"error": "Unsupported model"}), 400

    if response.status_code == 200:
        return jsonify(response.json())  # Return the response from the API
    else:
        return jsonify({"error": "API call failed", "status_code": response.status_code}), 500


if __name__ == '__main__':
    app.run(debug=True)
