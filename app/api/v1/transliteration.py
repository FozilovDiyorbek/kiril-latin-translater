"""
FastAPI Routes for Uzbek Transliteration API
"""

import os
import re
import time
import uuid
from typing import Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, File, Form, Header, HTTPException, Response, UploadFile, status
from pydantic import BaseModel, Field

from app.core.transliterator import transliterator
from app.core.dictionary import dictionary_manager
from app.core.doc_processor import doc_processor
from app.core.ocr_engine import ocr_engine
from app.core.job_manager import job_manager

router = APIRouter(prefix="/v1", tags=["Transliteration"])

# Maximum allowed file sizes
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024        # 50 MB for direct document conversion
MAX_OCR_FILE_SIZE_BYTES = 25 * 1024 * 1024    # 25 MB for direct OCR conversion
MAX_ASYNC_FILE_SIZE_BYTES = 100 * 1024 * 1024 # 100 MB for async background jobs

def sanitize_filename(filename: str) -> str:
    """Sanitizes filename for Content-Disposition header and path traversal safety."""
    clean = os.path.basename(filename)
    clean = re.sub(r'[\r\n"\';\\]', '_', clean)
    return clean.strip() or "document"

# Request & Response Schemas
class TransliterateRequest(BaseModel):
    text: str = Field(..., description="Source text to transliterate", examples=["O'zbekiston Respublikasi"])
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

class OCRTransliterateResponse(BaseModel):
    id: str
    filename: str
    direction: str
    is_scanned: bool
    page_count: int
    result: str
    raw_text: Optional[str] = None
    pages: Optional[List[str]] = None

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
async def add_dictionary_override(
    req: DictionaryOverrideRequest,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")
):
    admin_key = os.environ.get("ADMIN_API_KEY")
    if admin_key and x_admin_key != admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid X-Admin-Key header required to modify server global dictionary"
        )
    dictionary_manager.latin_to_cyrillic_defaults[req.latin_word.lower()] = req.cyrillic_word.lower()
    dictionary_manager.cyrillic_to_latin_defaults[req.cyrillic_word.lower()] = req.latin_word.lower()
    return {"message": "Override added successfully", "latin": req.latin_word, "cyrillic": req.cyrillic_word}

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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")

    filename = sanitize_filename(file.filename)
    ext = filename.lower().split('.')[-1]

    if ext not in ("txt", "docx", "pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '.{ext}'. Supported extensions: .txt, .docx, .pdf"
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum direct processing size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB. Use /v1/jobs/submit for larger documents."
        )

    try:
        out_bytes, out_filename, mime_type = doc_processor.process_document(
            file_bytes=file_bytes,
            filename=filename,
            direction=direction
        )
        safe_out_name = sanitize_filename(out_filename)
        return Response(
            content=out_bytes,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{safe_out_name}"',
                "X-Transliterated-Filename": safe_out_name
            }
        )

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Document processing failed: {str(e)}")

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
    response_model=OCRTransliterateResponse,
    summary="Transliterate Scanned Image / PDF Document",
    description="Processes scanned images (.png, .jpg, .tiff) or scanned PDFs via OCR text extraction and transliterates the extracted text."
)
async def ocr_transliterate_image(
    file: UploadFile = File(..., description="Scanned image (.png, .jpg, .tiff) or scanned PDF"),
    direction: str = Form("latin_to_cyrillic", description="Direction: 'latin_to_cyrillic' or 'cyrillic_to_latin'")
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")

    filename = sanitize_filename(file.filename)
    ext = filename.lower().split('.')[-1]

    if ext not in ("png", "jpg", "jpeg", "tiff", "pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Supported OCR formats: .png, .jpg, .jpeg, .tiff, .pdf"
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_OCR_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum direct OCR size of {MAX_OCR_FILE_SIZE_BYTES // (1024 * 1024)}MB. Use /v1/jobs/submit for larger files."
        )

    try:
        if ext in ("png", "jpg", "jpeg", "tiff"):
            trans_text, raw_text = ocr_engine.process_image(file_bytes, direction=direction)
            is_scanned = True
            pages = [trans_text]
        else:
            trans_text, pages, is_scanned = ocr_engine.process_scanned_pdf(file_bytes, direction=direction)
            raw_text = trans_text

        return OCRTransliterateResponse(
            id=f"ocr_{uuid.uuid4().hex[:8]}",
            filename=filename,
            direction=direction,
            is_scanned=is_scanned,
            page_count=len(pages),
            result=trans_text,
            raw_text=raw_text,
            pages=pages
        )

    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"OCR processing failed: {str(e)}")

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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")

    filename = sanitize_filename(file.filename)
    file_bytes = await file.read()

    if len(file_bytes) > MAX_ASYNC_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum background job size of {MAX_ASYNC_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    job_id = job_manager.create_job(filename, direction)

    background_tasks.add_task(
        run_async_transliteration_job,
        job_id=job_id,
        file_bytes=file_bytes,
        filename=filename,
        direction=direction
    )

    return {
        "job_id": job_id,
        "filename": filename,
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found")
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
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found")
        if status_info["status"] != "completed":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Job is currently '{status_info['status']}'. Progress: {status_info['progress_percent']}%")

    out_bytes, out_filename, mime_type = res
    safe_out_name = sanitize_filename(out_filename)
    return Response(
        content=out_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_out_name}"',
            "X-Transliterated-Filename": safe_out_name
        }
    )

@router.delete(
    "/jobs/{job_id}",
    summary="Delete Job and Free Memory",
    description="Explicitly removes a finished or failed job from server memory."
)
async def delete_job(job_id: str):
    deleted = job_manager.delete_job(job_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found")
    return {"message": f"Job '{job_id}' deleted successfully"}



