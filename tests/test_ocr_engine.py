"""
Unit Tests for OCR Engine and Scanned Document Processing
"""

import io
import pytest
from app.core.ocr_engine import ocr_engine

def test_ocr_status():
    installed = ocr_engine.is_tesseract_installed()
    assert isinstance(installed, bool)

def test_pdf_scanned_detection():
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet

    in_io = io.BytesIO()
    pdf_doc = SimpleDocTemplate(in_io, pagesize=letter)
    styles = getSampleStyleSheet()
    story = [Paragraph("O'zbekiston Respublikasi", styles["Normal"])]
    pdf_doc.build(story)
    file_bytes = in_io.getvalue()

    full_text, pages, is_scanned = ocr_engine.process_scanned_pdf(file_bytes, direction="latin_to_cyrillic")
    assert len(pages) == 1
    assert "Ўзбекистон" in full_text
