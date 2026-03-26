from pydantic import BaseModel
from typing import List

class Question(BaseModel):
    question: str
    options: List[str]

class PDFRequest(BaseModel):
    institution: str
    subject: str
    questions: List[Question]