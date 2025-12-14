from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageCreate(BaseModel):
    recipient_email: EmailStr
    plaintext: str = Field(min_length=1, max_length=2048)
    note: Optional[str] = Field(default=None, max_length=256)


class MessageOut(BaseModel):
    id: int
    sender_email: EmailStr
    recipient_email: EmailStr
    ciphertext_hex: str
    created_at: datetime
    note: Optional[str]

    class Config:
        from_attributes = True


class MessageWithKey(MessageOut):
    otp_key_hex: str

