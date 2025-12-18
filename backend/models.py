from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Integer, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

db = SQLAlchemy()

class Message(db.Model):
    __tablename__ = 'messages'

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sender: Mapped[str] = mapped_column(String(255), nullable=False)
    receiver: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False) # Not hashed for now
    time_received: Mapped[DateTime] = mapped_column(DateTime, default=func.now())
    time_deleted: Mapped[DateTime] = mapped_column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "sender": self.sender,
            "receiver": self.receiver,
            "subject": self.subject,
            "message": self.message,
            "time_received": self.time_received.isoformat() if self.time_received else None,
            "time_deleted": self.time_deleted.isoformat() if self.time_deleted else None
        }
