from fastapi import APIRouter
from fastapi.responses import FileResponse
from app.schemas.pdf_schema import PDFRequest
from app.services.pdf_service import create_pdf
from fastapi.background import BackgroundTasks
import os

router = APIRouter(prefix="/pdf", tags=["PDF"])


@router.post("/generate")
def generate_pdf(data: PDFRequest, background_tasks: BackgroundTasks):
    filename = create_pdf(data.dict())
    background_tasks.add_task(os.remove, filename)
    
    return FileResponse(
        path=filename, media_type="application/pdf", filename="question_bank.pdf"
    )
