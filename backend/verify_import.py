
import sys
import os

# Add current directory to path so we can import modules
sys.path.append(os.getcwd())

try:
    print("Attempting to import main...")
    from main import app
    print("Successfully imported main.")
    
    print("Attempting to import routes.messages...")
    from routes.messages import messages_bp
    print("Successfully imported routes.messages.")
    
    print("Verification successful!")
    sys.exit(0)
except Exception as e:
    print(f"Verification failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
