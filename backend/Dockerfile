# Skinly backend — production image
# Pinned to Python 3.12 (mediapipe/opencv/pydantic-core all ship 3.12 wheels;
# 3.13/3.14 do not, which is what broke the local machine).
FROM python:3.12-slim

# Native libraries required by opencv-python-headless and mediapipe
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libgles2 \
        libegl1 \
        libglib2.0-0 \
        libgomp1 \
        libsm6 \
        libxext6 \
        libxrender1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first for better layer caching
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# App code
COPY . .

# Render provides $PORT at runtime; default to 8000 for local `docker run`
ENV PORT=8000
EXPOSE 8000

# Shell form so $PORT expands. No --reload in production.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
