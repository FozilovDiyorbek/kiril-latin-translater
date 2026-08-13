"""
FastAPI Routes for Uzbek Transliteration API
"""

import uuid
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from app.core.transliterator import transliterator
from app.core.dictionary import dictionary_manager

router = APIRouter(prefix="/v1", tags=["Transliteration"])

# Request & Response Schemas
class TransliterateRequest(BaseModel):
    text: str = Field(..., description="Source text to transliterate", example="O'zbekiston Respublikasi")
    direction: str = Field("latin_to_cyrillic", description="Direction: 'latin_to_cyrillic' or 'cyrillic_to_latin'")
    user_dictionary: Optional[Dict[str, str]] = Field(None, description="Custom word exception dictionary overrides")
    target_apostrophe: str = Field("'", description="Target apostrophe symbol for Latin output (e.g. ', ʻ, ʼ)")

class TextStats(BaseModel):
    character_count: int
    word_count: int
    execution_time_ms: float

class TransliterateResponse(BaseModel):
    id: str
    result: str
    direction: str
    stats: TextStats

class BatchItem(BaseModel):
    id: Optional[str] = None
    text: str
    direction: Optional[str] = "latin_to_cyrillic"

class BatchRequest(BaseModel):
    items: List[BatchItem]
    user_dictionary: Optional[Dict[str, str]] = None

class BatchItemResponse(BaseModel):
    id: str
    result: str
    execution_time_ms: float

class BatchResponse(BaseModel):
    results: List[BatchItemResponse]
    total_items: int
    total_time_ms: float

class DictionaryOverrideRequest(BaseModel):
    latin_word: str
    cyrillic_word: str

@router.post(
    "/transliterate",
    response_model=TransliterateResponse,
    status_code=status.HTTP_200_OK,
    summary="Transliterate Uzbek Text (Cyrillic ↔ Latin)",
    description="Transliterates Uzbek text between Latin and Cyrillic scripts with context awareness and exception dictionaries."
)
async def transliterate_text(req: TransliterateRequest):
    if req.direction not in ("latin_to_cyrillic", "cyrillic_to_latin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid direction. Must be 'latin_to_cyrillic' or 'cyrillic_to_latin'."
        )

    result, exec_time = transliterator.transliterate(
        text=req.text,
        direction=req.direction,
        user_dictionary=req.user_dictionary
    )

    words = req.text.split()

    return TransliterateResponse(
        id=f"trl_{uuid.uuid4().hex[:8]}",
        result=result,
        direction=req.direction,
        stats=TextStats(
            character_count=len(req.text),
            word_count=len(words),
            execution_time_ms=exec_time
        )
    )

@router.post(
    "/transliterate/batch",
    response_model=BatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Transliterate Uzbek Text",
    description="Processes multiple text strings in a single batch request."
)
async def batch_transliterate(req: BatchRequest):
    results = []
    total_start = transliterator.transliterate("test", "latin_to_cyrillic")[1] # dummy call to measure total batch

    import time
    b_start = time.perf_counter()

    for item in req.items:
        item_id = item.id or uuid.uuid4().hex[:8]
        dir_choice = item.direction or "latin_to_cyrillic"
        res, item_time = transliterator.transliterate(
            text=item.text,
            direction=dir_choice,
            user_dictionary=req.user_dictionary
        )
        results.append(BatchItemResponse(
            id=item_id,
            result=res,
            execution_time_ms=item_time
        ))

    total_time_ms = round((time.perf_counter() - b_start) * 1000.0, 3)

    return BatchResponse(
        results=results,
        total_items=len(req.items),
        total_time_ms=total_time_ms
    )

@router.post("/dictionary/override", summary="Add Custom Dictionary Override")
async def add_dictionary_override(req: DictionaryOverrideRequest):
    dictionary_manager.latin_to_cyrillic_defaults[req.latin_word.lower()] = req.cyrillic_word.lower()
    dictionary_manager.cyrillic_to_latin_defaults[req.cyrillic_word.lower()] = req.latin_word.lower()
    return {"message": "Override added successfully", "latin": req.latin_word, "cyrillic": req.cyrillic_word}

from fastapi import File, Form, UploadFile
from fastapi.responses import Response
from app.core.doc_processor import doc_processor

@router.post(
    "/transliterate/file",
    summary="Transliterate Document (.pdf, .docx, .txt)",
    description="Uploads a PDF, DOCX, or TXT file, transliterates its contents between Cyrillic and Latin scripts, and returns the converted document."
)
async def transliterate_file(
    file: UploadFile = File(..., description="Document file (.pdf, .docx, .txt)"),
    direction: str = Form("latin_to_cyrillic", description="Direction: 'latin_to_cyrillic' or 'cyrillic_to_latin'")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename
    ext = filename.lower().split('.')[-1]

    if ext not in ("txt", "docx", "pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '.{ext}'. Supported extensions: .txt, .docx, .pdf"
        )

    try:
        file_bytes = await file.read()
        out_bytes, out_filename, mime_type = doc_processor.process_document(
            file_bytes=file_bytes,
            filename=filename,
            direction=direction
        )
        return Response(
            content=out_bytes,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{out_filename}"',
                "X-Transliterated-Filename": out_filename
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

from app.core.ocr_engine import ocr_engine


@router.get(
    "/ocr/status",
    summary="Check OCR Engine Status",
    description="Returns whether Tesseract OCR binary is installed and active on the server for scanned document & image processing."
)
async def ocr_status():
    return {
        "tesseract_installed": ocr_engine.is_tesseract_installed(),
        "supported_formats": [".png", ".jpg", ".jpeg", ".tiff", ".pdf (scanned/vector)"],
        "ocr_engine": "Tesseract OCR v5 + PyMuPDF Page Rasterizer"
    }

@router.post(
    "/ocr/transliterate",
    summary="Transliterate Scanned Image / PDF Document",
    description="Processes scanned images (.png, .jpg, .tiff) or scanned PDFs via OCR text extraction and transliterates the extracted text."
)
async def ocr_transliterate_image(
    file: UploadFile = File(..., description="Scanned image (.png, .jpg, .tiff) or scanned PDF"),
    direction: str = Form("latin_to_cyrillic", description="Direction: 'latin_to_cyrillic' or 'cyrillic_to_latin'")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.lower().split('.')[-1]

    if ext not in ("png", "jpg", "jpeg", "tiff", "pdf"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Supported OCR formats: .png, .jpg, .jpeg, .tiff, .pdf"
        )

    file_bytes = await file.read()

from fastapi import BackgroundTasks
from app.core.job_manager import job_manager

def run_async_transliteration_job(job_id: str, file_bytes: bytes, filename: str, direction: str):
    try:
        out_bytes, out_filename, mime_type = doc_processor.process_document(
            file_bytes=file_bytes,
            filename=filename,
            direction=direction,
            job_id=job_id
        )
        job_manager.complete_job(job_id, out_bytes, out_filename, mime_type)
    except Exception as e:
        job_manager.fail_job(job_id, str(e))

@router.post(
    "/jobs/submit",
    summary="Submit Async Document Transliteration Job",
    description="Submits a large PDF/book or Word document for background processing and returns a job_id for live progress tracking."
)
async def submit_async_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    direction: str = Form("latin_to_cyrillic")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()
    job_id = job_manager.create_job(file.filename, direction)

    background_tasks.add_task(
        run_async_transliteration_job,
        job_id=job_id,
        file_bytes=file_bytes,
        filename=file.filename,
        direction=direction
    )

    return {
        "job_id": job_id,
        "filename": file.filename,
        "direction": direction,
        "status": "queued",
        "status_url": f"/v1/jobs/{job_id}",
        "download_url": f"/v1/jobs/{job_id}/download"
    }

@router.get(
    "/jobs/{job_id}",
    summary="Get Job Progress & Status",
    description="Returns current status, progress percentage, current page, and live logs for a processing job."
)
async def get_job_progress(job_id: str):
    status_info = job_manager.get_job_status(job_id)
    if not status_info:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return status_info

@router.get(
    "/jobs/{job_id}/download",
    summary="Download Transliterated Document Result",
    description="Downloads the completed document after background processing finishes."
)
async def download_job_result(job_id: str):
    res = job_manager.get_job_output(job_id)
    if not res:
        status_info = job_manager.get_job_status(job_id)
        if not status_info:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
        if status_info["status"] != "completed":
            raise HTTPException(status_code=400, detail=f"Job is currently '{status_info['status']}'. Progress: {status_info['progress_percent']}%")

    out_bytes, out_filename, mime_type = res
    return Response(
        content=out_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{out_filename}"',
            "X-Transliterated-Filename": out_filename
        }
    )



