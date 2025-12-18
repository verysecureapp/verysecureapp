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

@messages_bp.route('', methods=['GET'], strict_slashes=False)
@require_auth()
def get_messages():
    """
    Get all messages for a specific sender.
    ---
    tags:
      - Messages
    parameters:
      - name: sender
        in: query
        type: string
        required: true
        description: The ID of the sender to retrieve messages for
    security:
      - Bearer: []
    responses:
      200:
        description: List of messages
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              sender:
                type: string
              receiver:
                type: string
              subject:
                type: string
              message:
                type: string
              timestamp:
                type: string
      400:
        description: Sender query parameter is required
    """
    sender = request.args.get('sender')
    if not sender:
        return jsonify({"error": "Sender query parameter is required"}), 400
    
    query = select(Message).where(Message.sender == sender)
    messages = db.session.scalars(query).all()
    
    return jsonify([msg.to_dict() for msg in messages]), 200
