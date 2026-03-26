📜 CogDoc LLM: Privacy-Preserving Document Intelligence
CogDoc is an offline, privacy-first legal and policy document analysis system. It utilizes a multi-model pipeline to segment clauses, detect contradictions (NLI), and provide AI-driven risk assessments without sending data to the cloud.

🚀 Features
Offline Execution: Runs entirely on local hardware for data sovereignty.

Multi-Model Pipeline: * Mistral-7B (GGUF): For high-level reasoning and risk assessment.

DeBERTa-v3-small: For Natural Language Inference (NLI) and clause cross-checking.

spaCy: For high-speed document segmentation.

Interactive Dashboard: Built with React and FastAPI.

🛠️ Setup & Installation
1. Clone the Repository
PowerShell
git clone <your-repo-url>
cd legal-ai-app/app
2. Create and Activate Virtual Environment
It is recommended to use a dedicated virtual environment to avoid dependency conflicts.

PowerShell
# Create the environment
python -m venv backend-venv

# Activate it (Windows)
.\backend-venv\Scripts\activate
3. Install Requirements
Install the core dependencies and fix the numpy version for compatibility with spaCy.

PowerShell
pip install -r requirements.txt
pip install "numpy<2" python-docx
4. Download AI Models
To keep the repository lightweight, the large model weights are not included in the git history. Follow these steps to set up the engines:

A. Mistral-7B (LLM Engine)
Visit the Mistral-7B-Instruct-v0.2-GGUF page on Hugging Face.

Download the file: mistral-7b-instruct-v0.2.Q4_K_M.gguf.

Place this file directly inside the /app folder.

B. DeBERTa-v3 & spaCy (NLI & NLP)
The system will automatically download these on the first run, or you can pre-install them:

PowerShell
# Install spaCy language model
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz

# NLI Models (DeBERTa) will download automatically via sentence-transformers
🏃 Running the Application
1. Start the Backend (FastAPI)
From the /app directory, run:

PowerShell
.\backend-venv\Scripts\python.exe -m uvicorn main:app --reload
The server will start at http://127.0.0.1:8000.

2. Start the Frontend (React)
Open a new terminal, navigate to the frontend directory, and run:

PowerShell
npm install
npm run dev
The UI will be available at http://localhost:5173.
