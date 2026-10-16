FROM python:3.11-slim

# System packages: Tesseract OCR + Uzbek & Cyrillic language models + Unicode fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-uzb \
    tesseract-ocr-uzb-cyrl \
    tesseract-ocr-rus \
    tesseract-ocr-eng \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port (default 8000)
EXPOSE 8000

# Support dynamic PORT environment variable (for Render, Hugging Face, Railway, Koyeb)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
