# Use the official uv image, which ships uv alongside Python.
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /backend

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install dependencies first, in their own layer, so code edits do not
# invalidate the dependency cache.
COPY pyproject.toml uv.lock /backend/
RUN uv sync --frozen --no-install-project --no-dev

COPY . /backend
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uv", "run", "start"]
