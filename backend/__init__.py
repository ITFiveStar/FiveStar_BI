# backend/__init__.py
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from flask_cors import CORS
import os
import sys

print("Starting Flask application initialization...", flush=True)
app = Flask(__name__)
print("Flask app created successfully", flush=True)

# --- Database URL resolution ---
# In production (App Runner), we pass DATABASE_URL via Secrets Manager.
db_url = os.getenv("DATABASE_URL")

# AWS Secrets Manager returns JSON, so we need to parse it
if db_url and db_url.startswith('{"DATABASE_URL"'):
    import json
    try:
        secret_data = json.loads(db_url)
        db_url = secret_data.get("DATABASE_URL")
        print(f"Parsed DATABASE_URL from JSON secret", flush=True)
    except json.JSONDecodeError as e:
        print(f"Failed to parse DATABASE_URL JSON: {e}", flush=True)
        db_url = None

if not db_url:
    # Local dev fallback: build from DB_* envs or .env (optional)
    from dotenv import load_dotenv
    load_dotenv()  # no-op in prod because .env won't be in the image
    DB_USER = os.getenv("DB_USER")
    DB_PASS = os.getenv("DB_PASS")
    DB_HOST = os.getenv("DB_HOST")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME")
    if all([DB_USER, DB_PASS, DB_HOST, DB_NAME]):
        # Keep sslmode=require if your RDS enforces SSL; otherwise you can omit it.
        db_url = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require"

if not db_url:
    print("WARNING: No DATABASE_URL provided and no DB_* envs found. Database functionality will be limited.")
    db_url = "sqlite:///temp.db"  # Fallback to SQLite for startup

print(f"Configuring database with URL: {db_url[:50]}...", flush=True)
app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

print("Initializing SQLAlchemy...", flush=True)
db = SQLAlchemy(app)
print("SQLAlchemy initialized successfully", flush=True)

# --- CORS ---
# Allow everything first; later set ALLOWED_ORIGINS to your Vercel domain.
allowed = os.getenv("ALLOWED_ORIGINS", "*")
if allowed == "*":
    CORS(app, resources={r"/api/*": {"origins": "*"}})
else:
    origins = [o.strip() for o in allowed.split(",") if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}})

# --- Routes ---
@app.route("/")
def home():
    return "Backend is running!"

print("Flask application initialization completed successfully!", flush=True)

@app.get("/health")
def health():
    # Keep this lightweight so App Runner health checks don’t flap while DB warms up
    return jsonify(ok=True), 200

@app.get("/ping-db")
def ping_db():
    try:
        with db.engine.connect() as conn:
            if "sqlite" in str(db.engine.url):
                return jsonify(message="Using SQLite fallback database", db="sqlite")
            else:
                dbname, user = conn.execute(text("SELECT current_database(), current_user")).one()
                return jsonify(db=dbname, user=user)
    except Exception as e:
        return jsonify(error=str(e), message="Database connection failed"), 500



# # Initialize backend package
# from flask import Flask, jsonify
# from flask_sqlalchemy import SQLAlchemy
# from sqlalchemy import text
# from flask_cors import CORS
# import os
# import sys
# from dotenv import load_dotenv
# current_directory = os.path.dirname(os.path.abspath(__file__))
# project_root = os.path.abspath(os.path.join(current_directory, os.pardir))
# sys.path.append(project_root)

# # Initialize Flask app
# app = Flask(__name__)

# # Load environment variables from backend/.env
# load_dotenv()
# DB_USER = os.getenv("DB_USER")
# DB_PASS = os.getenv("DB_PASS")
# DB_HOST = os.getenv("DB_HOST")
# DB_PORT = os.getenv("DB_PORT", "5432")
# DB_NAME = os.getenv("DB_NAME")

# app.config['SQLALCHEMY_DATABASE_URI'] = (
#     f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=require"
# )
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# # Initialize SQLAlchemy
# db = SQLAlchemy(app)

# # Allow local frontend/browser during testing
# CORS(app, resources={r"/*": {"origins": [
#     "http://localhost:3000", "http://127.0.0.1:3000",
#     "http://localhost:5173", "http://127.0.0.1:5173"
# ]}})

# @app.route("/")
# def home():
#     return "Backend is running!"

# @app.get("/health")
# def health():
#     # Basic DB reachability
#     with db.engine.connect() as conn:
#         conn.execute(text("SELECT 1"))
#     return jsonify(status="ok")

# @app.get("/ping-db")
# def ping_db():
#     with db.engine.connect() as conn:
#         dbname, user = conn.execute(text("SELECT current_database(), current_user")).one()
#     return jsonify(db=dbname, user=user)