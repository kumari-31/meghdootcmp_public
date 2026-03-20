FROM python:3.9-slim

# Environment variables to optimize Python
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install system dependencies for PostgreSQL and building packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 1. Install standard requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Install Websocket specific packages from your instructions
RUN pip install --no-cache-dir \
    channels==4.3.2 \
    daphne==4.2.1 \
    websocket-client==1.8.0 \
    gunicorn \
    uvicorn \
    'uvicorn[standard]'

# Copy the application code
COPY . .

# Expose the port your Gunicorn command binds to
EXPOSE 8000

# 3. Start the application using your specific Websocket command
# Note: Ensure the path to .asgi:application matches your project folder structure
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "Unified_Proect_Api.asgi:application", "--bind", "0.0.0.0:8000", "--ws", "websockets"]
