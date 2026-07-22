from pydantic import BaseModel
from typing import Optional, List

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class AIChatRequest(BaseModel):
    messages: List[ChatMessage]
