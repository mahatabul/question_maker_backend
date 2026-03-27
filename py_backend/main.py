from fastapi import FastAPI
from app.api import pdf

app = FastAPI()

app.include_router(pdf.router)