FROM docker:29-cli

RUN apk add --no-cache python3
WORKDIR /app
COPY agent.py healthcheck.py ./
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
ENTRYPOINT ["python3", "/app/agent.py"]
