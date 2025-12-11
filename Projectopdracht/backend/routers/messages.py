from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


def xor_bytes(data: bytes, key: bytes) -> bytes:
    return bytes(a ^ b for a, b in zip(data, key))


@router.post("/", response_model=schemas.MessageWithKey, status_code=status.HTTP_201_CREATED)
def send_message(
    message_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    recipient = db.query(models.User).filter(models.User.email == message_in.recipient_email).first()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

    plaintext_bytes = message_in.plaintext.encode("utf-8")
    key_bytes = models.generate_otp_key(len(plaintext_bytes))
    ciphertext = xor_bytes(plaintext_bytes, key_bytes)

    otp_key = models.OTPKey(key_material=key_bytes, key_length=len(key_bytes))
    db.add(otp_key)
    db.flush()  # obtain otp_key.id

    msg = models.Message(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        ciphertext=ciphertext,
        otp_key_id=otp_key.id,
        note=message_in.note,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    db.refresh(otp_key)

    return schemas.MessageWithKey(
        id=msg.id,
        sender_email=current_user.email,
        recipient_email=recipient.email,
        ciphertext_hex=msg.ciphertext.hex(),
        otp_key_hex=otp_key.key_material.hex(),
        created_at=msg.created_at,
        note=msg.note,
    )


@router.get("/inbox", response_model=list[schemas.MessageWithKey])
def inbox(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    messages = (
        db.query(models.Message)
        .join(models.OTPKey)
        .filter(models.Message.recipient_id == current_user.id, models.OTPKey.is_used == False)  # noqa: E712
        .all()
    )

    results = []
    for msg in messages:
        key = msg.otp_key
        if key.is_used:
            continue
        results.append(
            schemas.MessageWithKey(
                id=msg.id,
                sender_email=msg.sender.email,
                recipient_email=msg.recipient.email,
                ciphertext_hex=msg.ciphertext.hex(),
                otp_key_hex=key.key_material.hex(),
                created_at=msg.created_at,
                note=msg.note,
            )
        )
        key.is_used = True
    db.commit()
    return results

