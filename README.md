---
title: UzLang Transliteration Infrastructure
emoji: 🔄
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: 5.16.0
app_file: app.py
pinned: false
---

# UzLang Transliteration Infrastructure

O'zbek tili uchun enterprise darajasidagi yuqori tezlikdagi Lotin ↔ Kirill transliteratsiyasi va hujjatlar (DOCX, PDF, OCR) protsessing platformasi.

### Asosiy imkoniyatlari:
- **Matn transliteratsiyasi**: Orfoepik va fonetik qoidalarga asoslangan real-vaqt rejimida o'girish.
- **Hujjat protsessori**: Word (.docx), PDF va matn (.txt) fayllar formatini saqlagan holda o'girish.
- **Tesseract OCR**: Skanerlangan kitoblar va rasmlardagi matnlarni avtomatik tanib transliteratsiya qilish.
- **Paketli o'girish**: Ko'p qatorli matnlarni bir vaqtda qayta ishlash.
- **Maxsus lug'at**: Istisno so'zlar va brend nomlari uchun shaxsiy qoidalar kiritish.
- **RESTful API**: OpenAPI / Swagger (`/docs`) va ReDoc (`/redoc`) spetsifikatsiyalari.
- **Monitoring & Salomatlik tekshiruvi**: `/health` va `/healthz` endpointlari.

### Ishga tushirish (Local & Docker)

#### Docker orqali:
```bash
docker build -t uzlang-transliteration .
docker run -p 7860:7860 uzlang-transliteration
```

#### Mahalliy kompyuterda (Python 3.11):
```bash
python -m venv venv
venv\Scripts\activate   # Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
