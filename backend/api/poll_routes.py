from fastapi import APIRouter
from controllers.poll_controller import handle_poll

router = APIRouter()

@router.get("/poll")
async def poll_response():
    return await handle_poll()
