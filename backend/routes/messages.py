from flask import Blueprint, request, jsonify
from models import db, Message
from auth import require_auth
from sqlalchemy import select
from authlib.integrations.flask_oauth2 import current_token

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('', methods=['POST'])
@require_auth(None)
def create_message():
    """Create a new message."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400
    
    # Simple validation
    required_fields = ['receiver', 'subject', 'message']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    new_message = Message(
        sender=current_token['sub'], # Extract from JWT
        receiver=data['receiver'],
        subject=data['subject'],
        message=data['message']
    )
    
    db.session.add(new_message)
    db.session.commit()
    
    return jsonify(new_message.to_dict()), 201

@messages_bp.route('', methods=['GET'])
@require_auth(None)
def get_messages():
    """Get all messages for a specific sender."""
    sender = request.args.get('sender')
    if not sender:
        return jsonify({"error": "Sender query parameter is required"}), 400
    
    query = select(Message).where(Message.sender == sender)
    messages = db.session.scalars(query).all()
    
    return jsonify([msg.to_dict() for msg in messages]), 200
