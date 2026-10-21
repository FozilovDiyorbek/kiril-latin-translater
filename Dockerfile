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

# Set up non-root user (Hugging Face Spaces UID 1000 requirement)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install python dependencies
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY --chown=user:user . .

# Hugging Face Spaces listens on port 7860 by default
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, os; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '7860') + '/health')" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
