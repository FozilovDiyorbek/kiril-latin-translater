"""
OCR & Scanned Document Intelligence Engine for Scanned PDFs and Images.
Handles Page Rasterization, OCR Text Extraction, Orthographical Cleanup, and Transliteration.
"""

import io
import os
from typing import List, Tuple, Optional
from app.core.transliterator import transliterator

class OCREngine:
    """Engine for processing scanned documents, books, and images."""

    def __init__(self):
        self._tesseract_available = False
        self._setup_tesseract()

    def _setup_tesseract(self):
        """Checks for Tesseract OCR binary installation and sets path if available."""
        import pytesseract

        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
        ]

        for p in possible_paths:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                self._tesseract_available = True
                return

        try:
            pytesseract.get_tesseract_version()
            self._tesseract_available = True
        except Exception:
            self._tesseract_available = False

    def is_tesseract_installed(self) -> bool:
        return self._tesseract_available

    def process_scanned_pdf(
        self,
        file_bytes: bytes,
        direction: str = "latin_to_cyrillic"
    ) -> Tuple[str, List[str], bool]:
        """
        Parses a PDF document.
        If pages contain embedded text, extracts it.
        If pages are scanned images, runs OCR (if Tesseract available).
        Returns tuple of (full_transliterated_text, per_page_texts, is_scanned).
        """
        import fitz  # PyMuPDF

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_texts = []
        is_scanned = False

        for page in doc:
            extracted = page.get_text("text") or ""
            
            # If page text is very short/empty, check if it's a scanned page with images
            if len(extracted.strip()) < 10 and self._tesseract_available:
                is_scanned = True
                ocr_text = self._ocr_pdf_page(page)
                extracted = ocr_text if ocr_text.strip() else extracted
            elif len(extracted.strip()) < 10 and not self._tesseract_available:
                is_scanned = True

            trans_page, _ = transliterator.transliterate(extracted, direction=direction)
            page_texts.append(trans_page)

        full_text = "\n\n--- SAHIFA ---\n\n".join(page_texts)
        return full_text, page_texts, is_scanned

    def process_image(
        self,
        image_bytes: bytes,
        direction: str = "latin_to_cyrillic"
    ) -> Tuple[str, str]:
        """
        Extracts text from an image (.png, .jpg, .jpeg, .tiff) via OCR and transliterates it.
        """
        if not self._tesseract_available:
            raise RuntimeError(
                "Tesseract OCR executable is not installed on the server. "
                "Please install Tesseract OCR (with Uzbek/Cyrillic data) to perform Image OCR."
            )

        import pytesseract
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes))
        # Run OCR with Uzbek/Cyrillic/Russian language models
        try:
            raw_text = pytesseract.image_to_string(image, lang="uzb+uzb_cyrl+rus+eng")
        except Exception:
            raw_text = pytesseract.image_to_string(image)

        trans_text, _ = transliterator.transliterate(raw_text, direction=direction)
        return trans_text, raw_text

    def _ocr_pdf_page(self, page) -> str:
        """Rasterizes a PyMuPDF PDF page into a high-DPI image and runs OCR."""
        import pytesseract
        from PIL import Image

        pix = page.get_pixmap(dpi=300)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes))

        try:
            return pytesseract.image_to_string(image, lang="uzb+uzb_cyrl+rus+eng")
        except Exception:
            return pytesseract.image_to_string(image)

# Singleton instance
ocr_engine = OCREngine()
