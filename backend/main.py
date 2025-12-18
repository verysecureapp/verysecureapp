from os import environ as env
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv

from models import db
from validator import Auth0JWTBearerTokenValidator
from auth import require_auth
from routes.messages import messages_bp

# Load env variables
ENV_FILE = find_dotenv()
if ENV_FILE:
    load_dotenv(ENV_FILE)

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}}) # Allow all by default for this stage, strict later
    
    # DB Configuration
    db_name = env.get("DB_NAME", "otpchat")
    db_user = env.get("DB_USER", "appuser")
    db_password = env.get("DB_PASSWORD", "apppassword")
    db_host = env.get("DB_HOST", "db") # 'db' is the service name in docker-compose
    
    app.config["SQLALCHEMY_DATABASE_URI"] = f"mysql+pymysql://{db_user}:{db_password}@{db_host}/{db_name}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # Initialize DB
    db.init_app(app)
    
    # Configure Auth0 Validator
    domain = env.get("AUTH0_DOMAIN")
    audience = env.get("AUTH0_API_IDENTIFIER")
    
    if domain and audience:
        try:
            validator = Auth0JWTBearerTokenValidator(domain, audience)
            require_auth.register_token_validator(validator)
        except Exception as e:
            print(f"WARNING: Failed to initialize Auth0 validator: {e}")
            print("Auth0 integration will not work until valid credentials are provided and the domain is reachable.")
    else:
        print("WARNING: AUTH0_DOMAIN or AUTH0_API_IDENTIFIER not set.")

    # Register Blueprints
    app.register_blueprint(messages_bp, url_prefix='/messages')
    
    # Create tables (for simplicity in this task, usually do via migrations)
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"Error creating database tables: {e}")

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify(error="Unauthorized"), 401
        
    @app.errorhandler(403)
    def forbidden(e):
        return jsonify(error="Forbidden"), 403

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
