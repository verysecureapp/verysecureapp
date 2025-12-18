from os import environ as env
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv, find_dotenv
from flasgger import Swagger

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
    
    # Define allowed origins
    allowed_origins = [
        "https://verysecureapp.com",
        "https://www.verysecureapp.com"
    ]
    
    # Allow extending via env var
    env_origins = env.get("CORS_ALLOWED_ORIGINS")
    if env_origins:
        allowed_origins.extend([o.strip() for o in env_origins.split(",")])

    CORS(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)
    
    
    # Swagger config
    if env.get("ENABLE_SWAGGER", "True").lower() == "true":
        swagger_config = {
            "headers": [],
            "specs": [
                {
                    "endpoint": 'apispec_1',
                    "route": '/apispec_1.json',
                    "rule_filter": lambda rule: True,
                    "model_filter": lambda tag: True,
                }
            ],
            "static_url_path": "/flasgger_static",
            "swagger_ui": True,
            "specs_route": "/apidocs/",
            "securityDefinitions": {
                "Bearer": {
                    "type": "apiKey",
                    "name": "Authorization",
                    "in": "header",
                    "description": "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\""
                }
            }
        }
        
        Swagger(app, config=swagger_config)
    
    # DB Configuration
    db_name = env.get("DB_NAME", "otpchat")
    db_user = env.get("DB_USER", "appuser")
    db_password = env.get("DB_PASSWORD", "apppassword")
    db_host = env.get("DB_HOST", "db")
    
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
    
    # Create tables
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
    host_ip = env.get("HOST_IP", "127.0.0.1")
    app.run(host=host_ip, port=8000)
