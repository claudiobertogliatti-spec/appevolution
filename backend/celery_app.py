"""
Celery Configuration for Evolution PRO
Handles async video production pipeline (HeyGen → YouTube)
"""

import os
from celery import Celery

# Redis URL - use environment variable or default to localhost
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Create Celery app
celery_app = Celery(
    'evolution_pro',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['celery_tasks']
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
    },
)

if __name__ == '__main__':
    celery_app.start()
