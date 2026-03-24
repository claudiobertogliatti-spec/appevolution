"""
Celery Worker Manager for Emergent Platform
Automatically starts Celery worker as subprocess when backend starts.

This solution works within Emergent's managed environment without
requiring direct SSH access or supervisor configuration changes.

Usage:
1. Set REDIS_URL in backend/.env (use cloud Redis like Upstash or Redis Cloud)
2. Set CELERY_ENABLED=true in backend/.env
3. Worker starts automatically with the backend
"""

import os
import sys
import signal
import logging
import subprocess
import threading
import time
from typing import Optional

logger = logging.getLogger(__name__)

# Global worker process reference
_worker_process: Optional[subprocess.Popen] = None
_beat_process: Optional[subprocess.Popen] = None
_monitor_thread: Optional[threading.Thread] = None
_shutdown_flag = False


def is_celery_enabled() -> bool:
    """Check if Celery is enabled via environment variable"""
    return os.environ.get('CELERY_ENABLED', 'false').lower() in ('true', '1', 'yes')


def is_redis_available() -> bool:
    """Check if Redis is available"""
    redis_url = os.environ.get('REDIS_URL', '')
    if not redis_url:
        return False
    
    try:
        import redis
        r = redis.from_url(redis_url, socket_timeout=2)
        r.ping()
        return True
    except Exception as e:
        logger.warning(f"[CELERY_MANAGER] Redis not available: {e}")
        return False


def start_celery_worker():
    """Start Celery worker as subprocess"""
    global _worker_process, _beat_process, _monitor_thread, _shutdown_flag
    
    if not is_celery_enabled():
        logger.info("[CELERY_MANAGER] Celery disabled (set CELERY_ENABLED=true to enable)")
        return False
    
    if not is_redis_available():
        logger.warning("[CELERY_MANAGER] Redis not available - Celery worker not started. Using BackgroundTasks fallback.")
        return False
    
    try:
        # Get the backend directory
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Start Celery worker
        worker_cmd = [
            sys.executable, '-m', 'celery',
            '-A', 'celery_app',
            'worker',
            '--loglevel=info',
            '--concurrency=2',
            '--pool=prefork',
            '-Q', 'celery,video_pipeline,analisi_automation'
        ]
        
        logger.info(f"[CELERY_MANAGER] Starting worker: {' '.join(worker_cmd)}")
        
        _worker_process = subprocess.Popen(
            worker_cmd,
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env={**os.environ, 'PYTHONUNBUFFERED': '1'}
        )
        
        # Start Celery Beat (scheduler for periodic tasks)
        beat_cmd = [
            sys.executable, '-m', 'celery',
            '-A', 'celery_app',
            'beat',
            '--loglevel=info'
        ]
        
        logger.info(f"[CELERY_MANAGER] Starting beat: {' '.join(beat_cmd)}")
        
        _beat_process = subprocess.Popen(
            beat_cmd,
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env={**os.environ, 'PYTHONUNBUFFERED': '1'}
        )
        
        # Start monitor thread
        _shutdown_flag = False
        _monitor_thread = threading.Thread(target=_monitor_workers, daemon=True)
        _monitor_thread.start()
        
        logger.info("[CELERY_MANAGER] Celery worker and beat started successfully")
        return True
        
    except Exception as e:
        logger.error(f"[CELERY_MANAGER] Failed to start Celery: {e}")
        return False


def _monitor_workers():
    """Monitor worker processes and restart if needed"""
    global _worker_process, _beat_process, _shutdown_flag
    
    while not _shutdown_flag:
        try:
            # Check worker
            if _worker_process and _worker_process.poll() is not None:
                exit_code = _worker_process.returncode
                logger.warning(f"[CELERY_MANAGER] Worker exited with code {exit_code}, restarting...")
                
                if not _shutdown_flag:
                    backend_dir = os.path.dirname(os.path.abspath(__file__))
                    worker_cmd = [
                        sys.executable, '-m', 'celery',
                        '-A', 'celery_app',
                        'worker',
                        '--loglevel=info',
                        '--concurrency=2'
                    ]
                    _worker_process = subprocess.Popen(
                        worker_cmd,
                        cwd=backend_dir,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        env={**os.environ, 'PYTHONUNBUFFERED': '1'}
                    )
            
            # Check beat
            if _beat_process and _beat_process.poll() is not None:
                exit_code = _beat_process.returncode
                logger.warning(f"[CELERY_MANAGER] Beat exited with code {exit_code}, restarting...")
                
                if not _shutdown_flag:
                    backend_dir = os.path.dirname(os.path.abspath(__file__))
                    beat_cmd = [
                        sys.executable, '-m', 'celery',
                        '-A', 'celery_app',
                        'beat',
                        '--loglevel=info'
                    ]
                    _beat_process = subprocess.Popen(
                        beat_cmd,
                        cwd=backend_dir,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        env={**os.environ, 'PYTHONUNBUFFERED': '1'}
                    )
            
            time.sleep(5)  # Check every 5 seconds
            
        except Exception as e:
            logger.error(f"[CELERY_MANAGER] Monitor error: {e}")
            time.sleep(10)


def stop_celery_worker():
    """Stop Celery worker and beat processes"""
    global _worker_process, _beat_process, _shutdown_flag
    
    _shutdown_flag = True
    
    if _worker_process:
        logger.info("[CELERY_MANAGER] Stopping Celery worker...")
        try:
            _worker_process.terminate()
            _worker_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _worker_process.kill()
        _worker_process = None
    
    if _beat_process:
        logger.info("[CELERY_MANAGER] Stopping Celery beat...")
        try:
            _beat_process.terminate()
            _beat_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _beat_process.kill()
        _beat_process = None
    
    logger.info("[CELERY_MANAGER] Celery processes stopped")


def get_celery_status() -> dict:
    """Get current status of Celery processes"""
    return {
        "enabled": is_celery_enabled(),
        "redis_available": is_redis_available(),
        "worker_running": _worker_process is not None and _worker_process.poll() is None,
        "beat_running": _beat_process is not None and _beat_process.poll() is None,
        "worker_pid": _worker_process.pid if _worker_process else None,
        "beat_pid": _beat_process.pid if _beat_process else None
    }
