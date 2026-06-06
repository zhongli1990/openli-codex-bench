FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
COPY skills /app/skills

ENV PYTHONUNBUFFERED=1
ENV GLOBAL_SKILLS_PATH=/app/skills
ENV ENABLE_HOOKS=true
ENV MAX_AGENT_TURNS=20

EXPOSE 8082

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8082"]
