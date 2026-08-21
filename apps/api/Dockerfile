FROM python:3.12-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project

COPY src ./src
RUN uv sync --locked

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main.server:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000"]
