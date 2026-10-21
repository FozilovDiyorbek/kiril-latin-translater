"""
Hugging Face Spaces Entrypoint for UzLang Transliteration Service.
Integrates FastAPI application with Gradio SDK for 100% Free deployment with Tesseract OCR.
"""

import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app as fastapi_app

try:
    import gradio as gr

    # Minimal Gradio interface mounted at /gradio to satisfy Hugging Face Gradio SDK
    with gr.Blocks(title="UzLang Platform") as demo:
        gr.Markdown("""
        # 🔄 UzLang Transliteration Infrastructure Platform
        Enterprise Uzbek Latin ↔ Cyrillic Transliteration & Document OCR Service.

        - 🌐 **[Asosiy Veb Interfeys (Native Web UI)](/)**
        - 📚 **[Interaktiv API Playground (Swagger UI)](/docs)**
        - 📖 **[ReDoc API Spetsifikatsiyasi](/redoc)**
        - ❤️ **[Server Salomatlik Holati (Health Check)](/health)**
        """)

    # Mount Gradio at /gradio so root '/' serves our native HTML/JS SPA UI and '/v1' serves API
    app = gr.mount_gradio_app(fastapi_app, demo, path="/gradio")
except ImportError:
    app = fastapi_app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
