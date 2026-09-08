from fastapi import APIRouter, status

router = APIRouter()


@router.get("/healthcheck", status_code=status.HTTP_200_OK)
async def healthcheck() -> dict[str, str]:
    """
    Root endpoint that returns a 200 status code.
    This can be used as a health check for the application.
    """
    return {"message": "OK"}
