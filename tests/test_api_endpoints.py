"""
Integration & Unit Tests for Production API Endpoints
"""

import io
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.job_manager import JobManager

client = TestClient(app)

def test_health_check_endpoints():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "uzlang-transliteration"
    assert "ocr_available" in data

    res_z = client.get("/healthz")
    assert res_z.status_code == 200
    assert res_z.json()["status"] == "healthy"

def test_api_transliterate():
    res = client.post("/v1/transliterate", json={
        "text": "O'zbekiston kelajagi buyuk davlatdir.",
        "direction": "latin_to_cyrillic"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["result"] == "Ўзбекистон келажаги буюк давлатдир."
    assert data["stats"]["word_count"] == 4

def test_api_transliterate_all_caps():
    res = client.post("/v1/transliterate", json={
        "text": "ШАҲАР ЧОЙХОНА ЎЗБЕКИСТОН",
        "direction": "cyrillic_to_latin"
    })
    assert res.status_code == 200
    assert res.json()["result"] == "SHAHAR CHOYXONA O'ZBEKISTON"

def test_api_batch_transliterate():
    res = client.post("/v1/transliterate/batch", json={
        "items": [
            {"id": "item1", "text": "Salom dunyo", "direction": "latin_to_cyrillic"},
            {"id": "item2", "text": "Янги кун", "direction": "cyrillic_to_latin"}
        ]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["total_items"] == 2
    assert data["results"][0]["result"] == "Салом дунё"
    assert data["results"][1]["result"] == "Yangi kun"

def test_dictionary_override_protection(monkeypatch):
    # When ADMIN_API_KEY is configured
    monkeypatch.setenv("ADMIN_API_KEY", "super_secret_admin_token")

    # Unauthorized request (no header)
    unauth_res = client.post("/v1/dictionary/override", json={
        "latin_word": "testword",
        "cyrillic_word": "тестсўз"
    })
    assert unauth_res.status_code == 401

    # Authorized request with valid header
    auth_res = client.post(
        "/v1/dictionary/override",
        json={"latin_word": "testword", "cyrillic_word": "тестсўз"},
        headers={"X-Admin-Key": "super_secret_admin_token"}
    )
    assert auth_res.status_code == 200
    assert auth_res.json()["message"] == "Override added successfully"

def test_ocr_status():
    res = client.get("/v1/ocr/status")
    assert res.status_code == 200
    data = res.json()
    assert "tesseract_installed" in data
    assert isinstance(data["tesseract_installed"], bool)

def test_ocr_transliterate_scanned_pdf(monkeypatch):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet

    # Build a sample single-page PDF with selectable text
    pdf_io = io.BytesIO()
    doc = SimpleDocTemplate(pdf_io, pagesize=letter)
    styles = getSampleStyleSheet()
    doc.build([Paragraph("O'zbekiston Respublikasi Prezidenti", styles["Normal"])])
    pdf_bytes = pdf_io.getvalue()

    res = client.post(
        "/v1/ocr/transliterate",
        files={"file": ("test_doc.pdf", pdf_bytes, "application/pdf")},
        data={"direction": "latin_to_cyrillic"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["filename"] == "test_doc.pdf"
    assert "Ўзбекистон" in data["result"]
    assert data["page_count"] >= 1

def test_ocr_transliterate_unsupported_format():
    res = client.post(
        "/v1/ocr/transliterate",
        files={"file": ("test.xyz", b"dummy content", "text/plain")},
        data={"direction": "latin_to_cyrillic"}
    )
    assert res.status_code == 400

def test_jobs_lifecycle():
    # Submit a text document as an async job
    res = client.post(
        "/v1/jobs/submit",
        files={"file": ("async_doc.txt", b"O'zbekiston taraqqiyoti", "text/plain")},
        data={"direction": "latin_to_cyrillic"}
    )
    assert res.status_code == 200
    data = res.json()
    job_id = data["job_id"]
    assert job_id.startswith("job_")

    # Poll status
    status_res = client.get(f"/v1/jobs/{job_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["job_id"] == job_id
    assert status_data["status"] in ("queued", "processing", "completed")

    # Give background task brief moment to complete (sync in test client)
    time.sleep(0.1)

    # Check download
    dl_res = client.get(f"/v1/jobs/{job_id}/download")
    if status_data["status"] == "completed":
        assert dl_res.status_code == 200
        assert "Ўзбекистон" in dl_res.content.decode("utf-8")

    # Delete job to free memory
    del_res = client.delete(f"/v1/jobs/{job_id}")
    assert del_res.status_code == 200

    # Ensure job is deleted
    assert client.get(f"/v1/jobs/{job_id}").status_code == 404

def test_job_manager_ttl_cleanup():
    mgr = JobManager(max_job_age_seconds=1, max_completed_jobs=2)
    jid1 = mgr.create_job("file1.txt", "latin_to_cyrillic")
    mgr.complete_job(jid1, b"output1", "out1.txt", "text/plain")

    jid2 = mgr.create_job("file2.txt", "latin_to_cyrillic")
    mgr.complete_job(jid2, b"output2", "out2.txt", "text/plain")

    # Sleep past TTL
    time.sleep(1.1)

    # Creating a new job triggers expired cleanup
    jid3 = mgr.create_job("file3.txt", "latin_to_cyrillic")

    # jid1 and jid2 must be purged due to TTL expiration
    assert mgr.get_job_status(jid1) is None
    assert mgr.get_job_status(jid2) is None
    assert mgr.get_job_status(jid3) is not None
