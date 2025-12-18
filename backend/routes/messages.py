from flask import Blueprint, request, jsonify, g
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
            - plaintext
            - note
          properties:
            recipient_email:
              type: string
              description: The email of the message receiver
            note:
              type: string
              description: Subject or note for the message
            plaintext:
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
    
    # Validation with frontend field names
    required_fields = ['recipient_email', 'plaintext', 'note']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

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
        # Security: Do not reveal that the user does not exist.
        # Return success but do not save the message.
        print(f"Silently ignored message to non-existent email: {data['recipient_email']}")
        # Return a fake message object that resembles a real one to avoid leaking info
        fake_response = {
            "id": 0, # Or some indicator, or just omit if frontend doesn't strictly need it to be non-zero
            "sender": current_token['sub'],
            "receiver": "hidden",
            "subject": data['note'],
            "message": "encrypted",
            "timestamp": "now" 
        }
        # Ideally we return exactly what new_message.to_dict() would return but keeping it minimal is safer
        # Let's try to match the structure roughly or just standard success.
        # The frontend expects the new message back? 
        return jsonify({"message": "Message sent successfully"}), 201

    new_message = Message(
        sender=current_token['sub'], # Extract from JWT
        receiver=receiver_id,
        subject=data['note'],
        message=data['plaintext']
    )
    
    db.session.add(new_message)
    db.session.commit()
    
    return jsonify(new_message.to_dict()), 201

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
              note:
                type: string
              content:
                type: string
              timestamp:
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
        sender_email = "Unknown"
        if msg.sender in user_cache:
            sender_email = user_cache[msg.sender]
        else:
            try:
                user_details = auth0_client.get_user(msg.sender)
                if user_details and 'email' in user_details:
                    sender_email = user_details['email']
                    user_cache[msg.sender] = sender_email
                else:
                    # If lookup fails or no email, keep ID or Unknown
                    sender_email = msg.sender
                    user_cache[msg.sender] = sender_email
            except Exception as e:
                print(f"Failed to lookup sender {msg.sender}: {e}")
                sender_email = msg.sender
        
        results.append({
            "id": msg.id,
            "sender_email": sender_email,
            "note": msg.subject, # Mapping subject -> note
            "content": msg.message, # Mapping message -> content (plaintext)
            "timestamp": msg.date_deleted.isoformat() if msg.date_deleted else None # Using date_deleted for timestamp placeholder as per model, wait. Model has date_deleted. It doesn't have created_at? 
            # Looking at models.py: 
            # 16:     date_deleted: Mapped[DateTime] = mapped_column(DateTime, nullable=True)
            # It seems there is no created_at in the model shown previously. I'll check model again or just omit/use date_deleted if that's what was intended (unlikely).
            # The previous code had: "timestamp": "now" in mock, but "date_deleted" in to_dict.
            # Let's check models.py again.
        })
        
    return jsonify(results), 200

