from fastapi import APIRouter
from fastapi.responses import FileResponse
from app.schemas.pdf_schema import PDFRequest
from app.services.pdf_service import create_pdf

router = APIRouter(prefix="/pdf", tags=["PDF"])

@router.post("/generate")
def generate_pdf(data: PDFRequest):
    filename = create_pdf(data)

    return FileResponse(
        path=filename,
        media_type="application/pdf",
        filename="question_bank.pdf"
    )