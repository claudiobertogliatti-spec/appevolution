"""
Celery Configuration for Evolution PRO
Handles async video production pipeline (HeyGen → YouTube)
"""

import os
from pathlib import Path

# Load .env file explicitly (needed when running as subprocess)
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key not in os.environ:  # Don't override existing env vars
                    os.environ[key] = value

from celery import Celery
from celery.schedules import crontab

# Redis URL - use environment variable or default to localhost
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Debug: print URL (masked)
print(f"[CELERY] Using Redis: {REDIS_URL[:30]}...{REDIS_URL[-20:]}" if len(REDIS_URL) > 50 else f"[CELERY] Using Redis: {REDIS_URL}")

# For Upstash (rediss://), we need to add SSL parameters
broker_url = REDIS_URL
backend_url = REDIS_URL

if REDIS_URL.startswith('rediss://'):
    # Add SSL cert requirement for Upstash
    ssl_params = '?ssl_cert_reqs=CERT_NONE'
    if '?' not in REDIS_URL:
        broker_url = REDIS_URL + ssl_params
        backend_url = REDIS_URL + ssl_params
    print(f"[CELERY] SSL mode enabled for Upstash")

# Create Celery app
celery_app = Celery(
    'evolution_pro',
    broker=broker_url,
    backend=backend_url,
    include=['celery_tasks', 'morning_briefing_task']
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Rome',
    enable_utc=True,
    
    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completes (safer)
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,  # One task at a time
    
    # Result settings
    result_expires=86400,  # Results expire after 24 hours
    
    # Retry settings
    task_default_retry_delay=60,  # 1 minute between retries
    task_max_retries=3,
    
    # Timeout settings
    task_time_limit=1800,  # 30 minutes max per task
    task_soft_time_limit=1500,  # Soft limit at 25 minutes
    
    # Beat schedule for periodic tasks (optional)
    beat_schedule={
        'check-stuck-pipelines': {
            'task': 'celery_tasks.check_stuck_pipelines',
            'schedule': 300.0,  # Every 5 minutes
        },
        'check-pending-analisi-reminders': {
            'task': 'celery_tasks.check_pending_analisi_reminders',
            'schedule': 3600.0,  # Every hour - check for 48h reminders
        },
        'process-auto-approve-leads': {
            'task': 'celery_tasks.process_auto_approve_leads',
            'schedule': 3600.0,  # Every hour - auto-approve hot leads and start sequence
        },
        'gaia-monthly-check': {
            'task': 'celery_tasks.gaia_monthly_check',
            'schedule': 2592000.0,  # Every 30 days (monthly)
        },
        'check-piano-continuita-expiry': {
            'task': 'celery_tasks.check_piano_continuita_expiry',
            'schedule': 86400.0,  # Every 24 hours (daily)
        },
        'daily-hot-leads-outreach': {
            'task': 'celery_tasks.daily_hot_leads_outreach',
            'schedule': crontab(hour=9, minute=0),  # Every day at 9:00 AM
            'kwargs': {'max_leads': 5},  # Max 5 leads/day
        },
        'morning-lead-briefing': {
            'task': 'morning_lead_briefing',
            'schedule': crontab(hour=7, minute=0),  # Every day at 7:00 AM CET
        },
    },
)

if __name__ == '__main__':
    celery_app.start()
