# # backend/Dockerfile
# FROM python:3.12-slim

# # Set working directory inside the container
# WORKDIR /app

# # Install system dependencies needed to compile psycopg2
# RUN apt-get update && apt-get install -y \
#     gcc \
#     libpq-dev \
#     && rm -rf /var/lib/apt/lists/*

# # Copy requirements first (Docker layer caching — only re-installs if requirements.txt changes)
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# # Copy the rest of the application code
# COPY . .

# # Don't run as root — security best practice
# RUN adduser --disabled-password --gecos '' appuser
# USER appuser

# COPY start.sh /app/start.sh 
# RUN chmod +x /app/start.sh

# EXPOSE 8000

# # CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# CMD ["/app/start.sh"]







# Stable

# # backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies needed to compile psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy startup script BEFORE switching user
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser

# Switch to non-root user
USER appuser

EXPOSE 8000

CMD ["/app/start.sh"]