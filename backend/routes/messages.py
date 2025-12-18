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

    new_message = Message(
        sender=current_token['sub'], # Extract from JWT
        receiver=data['recipient_email'],
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
