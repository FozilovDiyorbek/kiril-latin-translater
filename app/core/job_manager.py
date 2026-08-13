"""
Async Job Manager & Progress Tracker for Large Document / Book Transliteration.
Provides Real-Time Status, Progress Percentages, Log Feeds, and Downloads.
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s")
logger = logging.getLogger("UzLang_JobManager")

class JobManager:
    """Tracks background document processing tasks."""

    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}

    def create_job(self, filename: str, direction: str) -> str:
        job_id = f"job_{uuid.uuid4().hex[:10]}"
        self.jobs[job_id] = {
            "job_id": job_id,
            "filename": filename,
            "direction": direction,
            "status": "queued", # queued, processing, completed, failed
            "current_page": 0,
            "total_pages": 0,
            "progress_percent": 0.0,
            "start_time": time.time(),
            "end_time": None,
            "elapsed_seconds": 0.0,
            "logs": [f"[{time.strftime('%H:%M:%S')}] Task created. File: {filename}"],
            "output_bytes": None,
            "output_filename": None,
            "mime_type": None,
            "error": None
        }
        logger.info(f"Created Job {job_id} for file '{filename}'")
        return job_id

    def update_progress(self, job_id: str, current_page: int, total_pages: int, log_msg: Optional[str] = None):
        if job_id not in self.jobs:
            return

        job = self.jobs[job_id]
        job["status"] = "processing"
        job["current_page"] = current_page
        job["total_pages"] = total_pages
        pct = round((current_page / max(1, total_pages)) * 100.0, 1)
        job["progress_percent"] = pct
        job["elapsed_seconds"] = round(time.time() - job["start_time"], 1)

        msg = f"[{time.strftime('%H:%M:%S')}] Processing page {current_page}/{total_pages} ({pct}%)"
        if log_msg:
            msg += f" - {log_msg}"
        
        job["logs"].append(msg)
        logger.info(f"[{job_id}] Page {current_page}/{total_pages} ({pct}%)")

    def complete_job(self, job_id: str, output_bytes: bytes, output_filename: str, mime_type: str):
        if job_id not in self.jobs:
            return

        job = self.jobs[job_id]
        job["status"] = "completed"
        job["progress_percent"] = 100.0
        job["end_time"] = time.time()
        job["elapsed_seconds"] = round(job["end_time"] - job["start_time"], 1)
        job["output_bytes"] = output_bytes
        job["output_filename"] = output_filename
        job["mime_type"] = mime_type

        msg = f"[{time.strftime('%H:%M:%S')}] Completed successfully in {job['elapsed_seconds']}s. Output: {output_filename}"
        job["logs"].append(msg)
        logger.info(f"[{job_id}] Task Completed in {job['elapsed_seconds']}s")

    def fail_job(self, job_id: str, error_msg: str):
        if job_id not in self.jobs:
            return

        job = self.jobs[job_id]
        job["status"] = "failed"
        job["end_time"] = time.time()
        job["elapsed_seconds"] = round(job["end_time"] - job["start_time"], 1)
        job["error"] = error_msg

        msg = f"[{time.strftime('%H:%M:%S')}] ERROR: {error_msg}"
        job["logs"].append(msg)
        logger.error(f"[{job_id}] Task Failed: {error_msg}")

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        if job_id not in self.jobs:
            return None

        job = self.jobs[job_id]
        # Return status dictionary without raw output bytes
        status_copy = {k: v for k, v in job.items() if k != "output_bytes"}
        if job["status"] == "processing":
            job["elapsed_seconds"] = round(time.time() - job["start_time"], 1)
            status_copy["elapsed_seconds"] = job["elapsed_seconds"]
        return status_copy

    def get_job_output(self, job_id: str) -> Optional[Tuple[bytes, str, str]]:
        if job_id not in self.jobs or self.jobs[job_id]["status"] != "completed":
            return None
        job = self.jobs[job_id]
        return job["output_bytes"], job["output_filename"], job["mime_type"]

# Singleton instance
job_manager = JobManager()
