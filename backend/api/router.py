from fastapi import APIRouter

from .request_routes import router as request_router
from .poll_routes import router as poll_router
from .dispute_routes import router as dispute_router
from .provider_routes import router as provider_router
from .health_routes import router as health_router
from .bookings_routes import router as bookings_router
from .traces_routes import router as traces_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(request_router)
api_router.include_router(poll_router)
api_router.include_router(dispute_router)
api_router.include_router(provider_router)
api_router.include_router(bookings_router)
api_router.include_router(traces_router)
