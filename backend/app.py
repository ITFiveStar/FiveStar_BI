# backend/app.py
import os

# Your package should expose app, db in backend/__init__.py
from backend import app, db
from flask import jsonify
from flask_cors import CORS

# CORS (relax now, tighten later to your Vercel domain)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# TEMPORARY: schema bootstrap (prefer Alembic migrations in prod)
if os.environ.get("FLASK_BOOTSTRAP_DB") == "1":
    with app.app_context():
        db.create_all()

# Import routes AFTER app/db exist to avoid circular imports
from backend import crud           # noqa: E402,F401
from backend import evaluate_performance_input_crud   # noqa: E402,F401
from backend import evaluate_performance_dashboard_crud  # noqa: E402,F401



# import os
# import sys
# current_directory = os.path.dirname(os.path.abspath(__file__))
# project_root = os.path.abspath(os.path.join(current_directory, os.pardir))
# sys.path.append(project_root)

# # Import app and db from backend package
# from backend import app, db

# # Initialize the app and database
# with app.app_context():
#     db.create_all()

# # Import routes after database setup to prevent circular imports
# from backend import crud
# from backend import evaluate_performance_input_crud
# from backend import evaluate_performance_dashboard_crud

# # printing registered routes
# # for rule in app.url_map.iter_rules():
# #     print(f"Route: {rule}, Methods: {rule.methods}")

# if __name__ == '__main__':
#     app.run(debug=True)
