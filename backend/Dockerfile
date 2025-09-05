# backend/Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for psycopg2
RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY backend ./backend

# Expose the port App Runner will hit
EXPOSE 8080

# WSGI entry: backend.app:app  (module:object)
CMD ["gunicorn", "-w", "4", "-k", "gthread", "--threads", "8", "--timeout", "120", "-b", "0.0.0.0:8080", "backend.app:app"]
