from fastapi import APIRouter
from controllers.booking_confirm_controller import confirm_pending_booking, cancel_pending_booking

router = APIRouter()


@router.post("/booking/confirm")
async def confirm_booking():
    return await confirm_pending_booking()


@router.post("/booking/cancel")
async def cancel_booking():
    return await cancel_pending_booking()
