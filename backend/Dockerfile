FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN python -m pip install --no-cache-dir \
        --index-url https://download.pytorch.org/whl/cpu \
        torch==2.14.0+cpu \
    && python -m pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend/app ./backend/app
COPY data/sample_docs ./data/sample_docs

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
