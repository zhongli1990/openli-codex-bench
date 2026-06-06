FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends libffi-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic

ENV PYTHONUNBUFFERED=1

EXPOSE 8083

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8083"]
