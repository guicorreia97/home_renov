from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import budget, expenses, health_check
from app.logging.log_config import log_config
from config.settings import settings

log_config.configure_logging()
logger = log_config.get_logger()

logger.info("Starting FastAPI server...")

app = FastAPI(description="FastAPI Base Project")

# Explicit origins only: browsers reject wildcard origins when credentials are
# allowed. Add deployed origins here rather than widening to "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_check.router, tags=["healthcheck"])
app.include_router(expenses.router, tags=["expenses"])
app.include_router(budget.router, tags=["budget"])


@app.get("/", status_code=status.HTTP_200_OK)
async def root() -> dict[str, str]:
    logger.info("Root endpoint accessed.")
    return {"message": settings.SPECIAL_MESSAGE}


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
