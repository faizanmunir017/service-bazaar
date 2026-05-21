from fastapi import APIRouter
from controllers.provider_controller import handle_provider_list

router = APIRouter()

@router.get("/providers")
async def list_providers():
    return await handle_provider_list()
