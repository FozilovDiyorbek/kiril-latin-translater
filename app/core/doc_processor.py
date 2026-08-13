"""
Document Transliteration Processor for .txt, .docx, and .pdf files.
Preserves layout, fonts, and handles scanned books with watermarks via OCR integration.
Supports live progress reporting via JobManager.
"""

import io
import os
from typing import Tuple, List, Optional
from app.core.transliterator import transliterator

WATERMARK_KEYWORDS = ["ziyouz.com", "kutubxonasi", "kutubxona", "www.ziyouz", "http://", "https://", "watermark"]

def is_watermark_line(line: str) -> bool:
    line_lower = line.strip().lower()
    if not line_lower:
        return False
    for kw in WATERMARK_KEYWORDS:
        if kw in line_lower:
            return True
    return False

def clean_watermarks(text: str) -> str:
    lines = text.split('\n')
    clean = [l for l in lines if not is_watermark_line(l)]
    return "\n".join(clean).strip()

class DocumentProcessor:
    """Handles parsing, transliterating, and re-assembling documents."""

    def __init__(self):
        self._font_registered = False
        self._active_font_name = "Helvetica"

    def _ensure_unicode_font(self) -> str:
        """Registers a TrueType font (e.g. Arial) that supports Cyrillic & Latin Unicode characters."""
        if self._font_registered:
            return self._active_font_name

        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        font_candidates = [
            ("Arial_Uz", "C:\\Windows\\Fonts\\arial.ttf"),
            ("Segoe_Uz", "C:\\Windows\\Fonts\\segoeui.ttf"),
            ("Times_Uz", "C:\\Windows\\Fonts\\times.ttf"),
            ("DejaVu_Uz", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            ("FreeSans_Uz", "/usr/share/fonts/truetype/freefont/FreeSans.ttf")
        ]

        for font_name, path in font_candidates:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont(font_name, path))
                    self._active_font_name = font_name
                    self._font_registered = True
                    return font_name
                except Exception:
                    continue

        self._active_font_name = "Helvetica"
        self._font_registered = True
        return self._active_font_name

    def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        direction: str = "latin_to_cyrillic",
        job_id: Optional[str] = None
    ) -> Tuple[bytes, str, str]:
        """
        Processes uploaded document bytes.
        Returns tuple of (output_file_bytes, output_filename, mime_type).
        """
        ext = filename.lower().split('.')[-1]

        if ext == "txt":
            return self._process_txt(file_bytes, filename, direction, job_id)
        elif ext == "docx":
            return self._process_docx(file_bytes, filename, direction, job_id)
        elif ext == "pdf":
            return self._process_pdf(file_bytes, filename, direction, job_id)
        else:
            raise ValueError(f"Unsupported file format: .{ext}. Supported formats: .txt, .docx, .pdf")

    def _process_txt(self, file_bytes: bytes, filename: str, direction: str, job_id: Optional[str] = None) -> Tuple[bytes, str, str]:
        from app.core.job_manager import job_manager
        if job_id:
            job_manager.update_progress(job_id, 1, 1, "Processing text document")

        try:
            content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = file_bytes.decode("latin-1")

        content_clean = clean_watermarks(content)
        transliterated_content, _ = transliterator.transliterate(content_clean or content, direction=direction)
        out_bytes = transliterated_content.encode("utf-8")

        base_name = filename.rsplit('.', 1)[0]
        out_filename = f"{base_name}_transliterated.txt"
        return out_bytes, out_filename, "text/plain"

    def _process_docx(self, file_bytes: bytes, filename: str, direction: str, job_id: Optional[str] = None) -> Tuple[bytes, str, str]:
        import docx
        from app.core.job_manager import job_manager

        doc_io = io.BytesIO(file_bytes)
        doc = docx.Document(doc_io)

        total_paragraphs = len(doc.paragraphs)
        if job_id:
            job_manager.update_progress(job_id, 1, max(1, total_paragraphs), "Processing Word document paragraphs")

        # Transliterate paragraphs
        for idx, p in enumerate(doc.paragraphs):
            if not p.text.strip() or is_watermark_line(p.text):
                continue
            for run in p.runs:
                if run.text and not is_watermark_line(run.text):
                    run.text, _ = transliterator.transliterate(run.text, direction=direction)
            if job_id and idx % 10 == 0:
                job_manager.update_progress(job_id, idx + 1, total_paragraphs)

        # Transliterate tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        if is_watermark_line(p.text):
                            continue
                        for run in p.runs:
                            if run.text and not is_watermark_line(run.text):
                                run.text, _ = transliterator.transliterate(run.text, direction=direction)

        out_io = io.BytesIO()
        doc.save(out_io)
        out_io.seek(0)

        base_name = filename.rsplit('.', 1)[0]
        out_filename = f"{base_name}_transliterated.docx"
        return out_io.getvalue(), out_filename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    def _process_pdf(self, file_bytes: bytes, filename: str, direction: str, job_id: Optional[str] = None) -> Tuple[bytes, str, str]:
        import fitz  # PyMuPDF
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from app.core.ocr_engine import ocr_engine
        from app.core.job_manager import job_manager

        font_name = self._ensure_unicode_font()
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        total_pages = len(doc)
        extracted_pages = []

        for i, page in enumerate(doc):
            raw_text = page.get_text("text") or ""
            text_cleaned = clean_watermarks(raw_text)

            is_ocr = False
            # If cleaned text is very short/empty, run OCR on the scanned page image if Tesseract available
            if len(text_cleaned.strip()) < 15 and ocr_engine.is_tesseract_installed():
                is_ocr = True
                ocr_text = ocr_engine._ocr_pdf_page(page)
                text_cleaned = clean_watermarks(ocr_text)

            if job_id:
                log_tag = "OCR Active" if is_ocr else "Text Extracted"
                job_manager.update_progress(job_id, i + 1, total_pages, log_msg=log_tag)

            if text_cleaned.strip():
                trans_text, _ = transliterator.transliterate(text_cleaned, direction=direction)
                extracted_pages.append(trans_text)
            else:
                extracted_pages.append("")

        # Re-build PDF using ReportLab with registered Unicode font
        out_io = io.BytesIO()
        pdf_doc = SimpleDocTemplate(out_io, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
        
        custom_style = ParagraphStyle(
            'UzbekUnicodeStyle',
            fontName=font_name,
            fontSize=10.5,
            leading=14,
            textColor='#111827'
        )

        story = []
        for i, page_text in enumerate(extracted_pages):
            if page_text:
                for paragraph_str in page_text.split('\n'):
                    if paragraph_str.strip() and not is_watermark_line(paragraph_str):
                        # Escape XML special characters for ReportLab Paragraph
                        safe_text = paragraph_str.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                        story.append(Paragraph(safe_text, custom_style))
                        story.append(Spacer(1, 4))

        pdf_doc.build(story)
        out_io.seek(0)

        base_name = filename.rsplit('.', 1)[0]
        out_filename = f"{base_name}_transliterated.pdf"
        return out_io.getvalue(), out_filename, "application/pdf"

# Singleton instance
doc_processor = DocumentProcessor()
