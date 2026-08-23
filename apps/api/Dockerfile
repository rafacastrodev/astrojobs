FROM python:3.12-slim

RUN pip install --no-cache-dir uv

ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    /etc/ssl/certs/rds-global-bundle.pem
RUN chmod 644 /etc/ssl/certs/rds-global-bundle.pem

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project

COPY src ./src
COPY alembic.ini ./
COPY migrations ./migrations
RUN uv sync --locked

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main.server:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000"]
