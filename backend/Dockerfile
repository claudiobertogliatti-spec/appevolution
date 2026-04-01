FROM python:3.11-slim

WORKDIR /app/backend

# Installa dipendenze sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e installa dipendenze Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia tutto il backend
COPY . .

# Crea cartelle necessarie
RUN mkdir -p /app/backend/static /app/backend/uploads /app/backend/storage

# Espone porta 8080 (richiesta da Cloud Run)
EXPOSE 8080

# Avvia il server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
