from fastapi import APIRouter
from pydantic import BaseModel
from controllers.dispute_controller import handle_dispute

router = APIRouter()

class DisputeRequest(BaseModel):
    booking_id: str
    provider_id: str
    rating: int = 3
    complaint: str = ""
    severity: str = "low"

@router.post("/dispute")
async def file_dispute(dispute: DisputeRequest):
    return await handle_dispute(dispute)
