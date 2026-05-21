"""
ServiceBazaar Geolocation Engine
================================
Haversine distance calculations, travel-time matrices, and Islamabad location resolver.
Includes explicit fallback to city-center radius grids on simulated API failures.
"""

import math
from typing import List, Dict, Tuple, Optional

# ---------- Constants ----------
ISLAMABAD_CENTER = (33.6844, 73.0479)
AVG_SPEED_KMH = 25  # Urban Islamabad average

ISLAMABAD_LOCATIONS: Dict[str, Tuple[float, float]] = {
    "g-13": (33.6321, 73.0148),
    "g-11": (33.6616, 73.0231),
    "g-9":  (33.6844, 73.0401),
    "f-10": (33.6968, 73.0111),
    "f-8":  (33.7104, 73.0413),
    "f-7":  (33.7194, 73.0589),
    "f-6":  (33.7246, 73.0714),
    "blue area": (33.7294, 73.0931),
    "i-8":  (33.6689, 73.0484),
    "i-10": (33.6539, 73.0127),
    "h-8":  (33.6748, 73.0484),
    "e-11": (33.6833, 72.9833),
    "bahria town": (33.5206, 73.0989),
    "dha":  (33.5356, 73.0951),
    "rawalpindi": (33.5651, 73.0169),
}


# ---------- Core Calculations ----------

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance (km) between two lat/lng points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def travel_time_minutes(distance_km: float, speed_kmh: float = AVG_SPEED_KMH) -> float:
    """Estimate travel time in minutes given distance and average speed."""
    if speed_kmh <= 0:
        speed_kmh = AVG_SPEED_KMH
    return (distance_km / speed_kmh) * 60


# ---------- Travel Matrix ----------

def calculate_travel_matrix(
    providers: List[Dict], target_lat: float, target_lng: float
) -> List[Dict]:
    """
    Build a distance + travel-time row for every provider.
    Falls back to a simple Euclidean grid if an exception simulates an API error.
    """
    try:
        results = []
        for p in providers:
            coords = p.get("current_coordinates", {})
            plat = coords.get("lat", ISLAMABAD_CENTER[0])
            plng = coords.get("lng", ISLAMABAD_CENTER[1])
            dist = haversine_distance(plat, plng, target_lat, target_lng)
            results.append({
                "provider_id": p["id"],
                "distance_km": round(dist, 2),
                "travel_time_min": round(travel_time_minutes(dist), 1),
            })
        return results
    except Exception:
        return _fallback_radius_grid(providers, target_lat, target_lng)


def _fallback_radius_grid(
    providers: List[Dict], target_lat: float, target_lng: float
) -> List[Dict]:
    """Graceful degradation: Euclidean approximation when Haversine or API fails."""
    results = []
    for p in providers:
        coords = p.get("current_coordinates", {})
        dlat = abs(coords.get("lat", 33.68) - target_lat) * 111
        dlng = abs(coords.get("lng", 73.04) - target_lng) * 85
        approx = math.sqrt(dlat ** 2 + dlng ** 2)
        results.append({
            "provider_id": p["id"],
            "distance_km": round(approx, 2),
            "travel_time_min": round(approx / AVG_SPEED_KMH * 60, 1),
        })
    return results


# ---------- Location Resolver ----------

def resolve_location(location_str: str) -> Tuple[float, float]:
    """Map a human-readable location string to (lat, lng). Defaults to city center."""
    if not location_str:
        return ISLAMABAD_CENTER
    loc = location_str.lower().strip()
    for key, coords in ISLAMABAD_LOCATIONS.items():
        if key in loc:
            return coords
    return ISLAMABAD_CENTER
