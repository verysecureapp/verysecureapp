# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.1   | :white_check_mark: |


## Reporting a Vulnerability

To report a vulnerability make an issue with the following template:

**TITLE**

Vuln: [Vulnerability Title]

---

**CONTENT**

Issue: [short summary]

[Filename] [Line]:
```
class OTPKey(Base):
tablename = "otp_keys"

id = Column(Integer, primary_key=True, index=True)
key_material = Column(LargeBinary, nullable=False)
key_length = Column(Integer, nullable=False)
is_used = Column(Boolean, default=False, nullable=False, index=True)
created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
consumed_at = Column(DateTime)

message = relationship("Message", back_populates="otp_key", uselist=False)
```

Solution: [short explanation how it can be fixed]
```
Possible solution
```
