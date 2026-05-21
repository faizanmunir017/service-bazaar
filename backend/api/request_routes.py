from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from controllers.request_controller import handle_request

router = APIRouter()


class ServiceRequest(BaseModel):
    message: str
    locale: str = "en"
    location: str | None = None


@router.post("/request", status_code=status.HTTP_202_ACCEPTED)
async def create_request(req: ServiceRequest, bg: BackgroundTasks):
    if not req.message.strip():
        raise HTTPException(400, "Message cannot be empty.")

    return await handle_request(req, bg)
