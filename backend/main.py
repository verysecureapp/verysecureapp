import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import Base, engine
from routers import auth, messages

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Secure OTP Messenger", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(messages.router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

