FROM python:3.13-slim

# Create a non‑root user for security
RUN useradd -m appuser
WORKDIR /app

# Install system dependencies (if any). This image is minimal; most pure‑Python packages work out‑of‑the‑box.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source code
COPY . .

# Change ownership to the app user and drop privileges
RUN chown -R appuser:appuser /app
USER appuser

# Expose the port FastAPI runs on
EXPOSE 8000

# Default command – start the ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
