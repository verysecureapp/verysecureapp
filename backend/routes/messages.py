from flask import Blueprint, request, jsonify, g
import re
from models import db, Message
from auth import require_auth, current_token
from sqlalchemy import select

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('', methods=['POST'], strict_slashes=False)
@require_auth()
def create_message():
    """
    Create a new message.
    ---
    tags:
      - Messages
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - recipient_email
            - message
            - subject
          properties:
            recipient_email:
              type: string
              description: The email of the message receiver
            subject:
              type: string
              description: Subject or note for the message
            message:
              type: string
              description: Content of the message
    security:
      - Bearer: []
    responses:
      201:
        description: Message created successfully
      400:
        description: Missing fields or input data
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400
    
    required_fields = ['recipient_email', 'message', 'subject']
    
    MAX_SUBJECT_LENGTH = 255
    MAX_MESSAGE_LENGTH = 5000
    
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
        
        val = data[field]
        if not isinstance(val, str):
            return jsonify({"error": f"Field '{field}' must be a string"}), 400
            
        if not val.strip():
            return jsonify({"error": f"Field '{field}' cannot be empty"}), 400

    # Specific Validation
    email_regex = re.compile(
        r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+"
        r"@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$"
    )
    if not email_regex.fullmatch(data['recipient_email']):
        return jsonify({"error": "Invalid email format"}), 400
        
    if len(data['subject']) > MAX_SUBJECT_LENGTH:
        return jsonify({"error": f"Subject exceeds maximum length of {MAX_SUBJECT_LENGTH} characters"}), 400
        
    if len(data['message']) > MAX_MESSAGE_LENGTH:
        return jsonify({"error": f"Message content exceeds maximum length of {MAX_MESSAGE_LENGTH} characters"}), 400

    # Lookup receiver Auth0 ID
    from auth0_client import Auth0Client
    import traceback
    import sys
    try:
        auth0_client = Auth0Client()
        receiver_id = auth0_client.get_user_by_email(data['recipient_email'])
    except Exception as e:
        print(f"Error looking up recipient: {e}", file=sys.stderr)
        traceback.print_exc()
        return jsonify({"error": f"Failed to lookup recipient: {str(e)}"}), 500

    if not receiver_id:
        return jsonify({"message": "Message sent successfully"}), 201

    new_message = Message(
        sender=current_token['sub'],
        receiver=receiver_id,
        subject=data['subject'],
        message=data['message']
    )
    
    db.session.add(new_message)
    db.session.commit()
    
    return jsonify({"message": "Message sent successfully"}), 201

@messages_bp.route('/inbox', methods=['GET'], strict_slashes=False)
@require_auth()
def get_inbox():
    """
    Get all messages where the current user is the receiver.
    ---
    tags:
      - Messages
    security:
      - Bearer: []
    responses:
      200:
        description: List of messages received by the current user
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              sender_email:
                type: string
              subject:
                type: string
              message:
                type: string
              time_received:
                type: string
    """
    from auth0_client import Auth0Client
    
    # current_token is a dict, 'sub' is the Auth0 user ID
    receiver_id = current_token['sub']
    
    query = select(Message).where(Message.receiver == receiver_id)
    messages = db.session.scalars(query).all()
    
    auth0_client = Auth0Client()
    user_cache = {}
    
    results = []
    for msg in messages:
        # Resolve sender email
        if msg.sender in user_cache:
            sender_email = user_cache[msg.sender]
        else:
            try:
                user_details = auth0_client.get_user(msg.sender)
                if user_details and 'email' in user_details:
                    sender_email = user_details['email']
                    user_cache[msg.sender] = sender_email
                else:
                    sender_email = msg.sender
                    user_cache[msg.sender] = sender_email
            except Exception as e:
                print(f"Failed to lookup sender {msg.sender}: {e}")
                sender_email = msg.sender
        
        results.append({
            "id": msg.id,
            "sender_email": sender_email,
            "subject": msg.subject,
            "message": msg.message,
            "time_received": msg.time_received.isoformat() + 'Z'
            # TODO: Implement time_deleted "time_deleted": msg.time_deleted.isoformat() if msg.time_deleted else None
        })
        
    return jsonify(results), 200

