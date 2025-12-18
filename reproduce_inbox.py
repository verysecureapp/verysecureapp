
import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

# Mock auth BEFORE importing routes
mock_require_auth = MagicMock()
def side_effect():
    def decorator(f):
        def wrapper(*args, **kwargs):
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator
mock_require_auth.side_effect = side_effect

import auth
auth.require_auth = mock_require_auth

# Import necessary modules
from flask import Flask
from routes.messages import messages_bp
from models import db, Message
import auth0_client

class TestInbox(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['TESTING'] = True
        
        db.init_app(self.app)
        
        with self.app.app_context():
            db.create_all()
            self.app.register_blueprint(messages_bp, url_prefix='/messages')

    @patch('auth0_client.Auth0Client') 
    def test_get_inbox(self, MockAuth0Client):
        # Setup mock for Auth0Client
        mock_client_instance = MockAuth0Client.return_value
        def get_user_side_effect(user_id):
            if user_id == "auth0|sender123":
                return {"email": "sender@example.com"}
            if user_id == "auth0|other456":
                return {"email": "other@example.com"}
            return None
        mock_client_instance.get_user.side_effect = get_user_side_effect

        # Setup data
        with self.app.app_context():
            sender = "auth0|sender123"
            user_id = "auth0|user123"
            other_user = "auth0|other456"
            
            msg1 = Message(sender=sender, receiver=user_id, subject="Hi", message="Hello world")
            msg2 = Message(sender=sender, receiver=other_user, subject="Other", message="Not for you")
            msg3 = Message(sender=other_user, receiver=user_id, subject="Re: Hi", message="Reply")
            
            db.session.add_all([msg1, msg2, msg3])
            db.session.commit()

        # Test request
        with self.app.test_client() as client:
            with patch('routes.messages.current_token', {'sub': 'auth0|user123'}):
                response = client.get('/messages/inbox')
                
                if response.status_code != 200:
                    print(f"FAILED with status {response.status_code}")
                    print(response.data)
                
                self.assertEqual(response.status_code, 200)
                data = response.get_json()
                
                self.assertEqual(len(data), 2)
                
                # Check formatting
                # msg1
                m1 = next(d for d in data if d['note'] == "Hi")
                self.assertEqual(m1['sender_email'], "sender@example.com")
                self.assertEqual(m1['content'], "Hello world")
                
                # msg3
                m3 = next(d for d in data if d['note'] == "Re: Hi")
                self.assertEqual(m3['sender_email'], "other@example.com")
                self.assertEqual(m3['content'], "Reply")

                print("\nSUCCESS: /messages/inbox verified with email resolution and field mapping")
                for m in data:
                    print(f" - From: {m['sender_email']}, Note: {m['note']}, Content: {m['content']}")

if __name__ == '__main__':
    unittest.main()
