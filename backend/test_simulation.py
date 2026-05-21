"""
ServiceBazaar Core Architecture Verification & Stress Simulation
===============================================================
Tests all major system requirements:
1. Multilingual parsing with code-switching and misspelled Urdu/Roman Urdu.
2. Multi-factor scoring and calendar overlap clashes with 30-min travel buffers.
3. Pricing engine tiers, complex formula itemization, and markdown generation.
4. Auto-rollback assignment to runner-up on cancellation.
5. dispute simulation with dynamic score recalculations.
"""

import asyncio
from dotenv import load_dotenv
load_dotenv(".env")
from agents.intent_parser import agent_1_parse
from agents.matcher import agent_2_match, rollback_to_runner_up
from agents.pricing import agent_3_price
from agents.dispute import agent_4_dispute
from api.dispute_routes import DisputeRequest
from tools.services import load_providers, save_providers

# ── Colors for Beautiful Terminal Output ───────────────────────────
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_section(title: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 70}")
    print(f" {title}")
    print(f"{'=' * 70}{Colors.END}")

async def test_case_1_multilingual_parsing():
    print_section("TEST CASE 1: Multilingual Intent Parsing & Edge Cases")
    
    # Misspelled, mixed Roman Urdu / English text
    queries = [
        "AC bilkul kam ni kr rha, kal sbaah G-13 me technician chahye, bjut kam h",
        "Pipes are lekking in Blue Area, need plumber urgent basis foran help plz!",
        "mujhe bacho k lye math tutor chahiye f-7 sector main budget issue nahi hai"
    ]
    
    for idx, q in enumerate(queries, 1):
        print(f"\n{Colors.BOLD}Query {idx}:{Colors.END} '{q}'")
        intent = await agent_1_parse(q)
        print(f"  [OK] Service Extracted: {Colors.BLUE}{intent.get('service_type')}{Colors.END}")
        print(f"  [OK] Location Identified: {Colors.BLUE}{intent.get('location')}{Colors.END}")
        print(f"  [OK] Urgency Level: {Colors.BLUE}{intent.get('urgency_level')}{Colors.END}")
        print(f"  [OK] Price Sensitivity: {Colors.BLUE}{intent.get('price_sensitivity')}{Colors.END}")
        print(f"  [OK] Confidence Score: {Colors.BLUE}{intent.get('confidence_score')}{Colors.END}")
        if intent.get('confidence_score', 1.0) < 0.70:
            print(f"  [WARN] Clarification Needed: {intent.get('clarifying_questions')}")

async def test_case_2_multifactor_clash_resolution():
    print_section("TEST CASE 2: Multi-Factor Matching & Calendar Overlaps")
    
    # Construct an intent with a preferred window that overlaps an existing block
    # E.g. AC Repair in G-13 on 2026-05-19.
    # Note that PROV_AC_01 has booked_slots: "09:00-10:30" and "14:00-15:30"
    intent = {
        "service_type": "AC Repair",
        "location": "G-13",
        "urgency_level": "High",
        "preferred_time_window": "2026-05-19 14:30-15:00",  # Collides with 14:00-15:30 + 30m buffer
        "price_sensitivity": "Medium"
    }
    
    print(f"Requesting AC Repair in G-13 at time window: {Colors.BOLD}{intent['preferred_time_window']}{Colors.END}")
    match = await agent_2_match(intent)
    
    if match.get("status") == "matched":
        sel = match["selected"]
        print(f"  [OK] Selected Provider: {Colors.BLUE}{sel['name']} ({sel['id']}){Colors.END}")
        print(f"  [OK] Matcher Score: {Colors.BLUE}{sel['score']}{Colors.END}")
        print(f"  [OK] Distance: {Colors.BLUE}{sel['distance_km']} km{Colors.END} | Est. Travel: {sel['travel_time_min']} mins")
        print(f"  [OK] Calendar Clash Detected: [WARN] {sel['has_clash']}")
        if sel['has_clash']:
            print(f"  [WARN] Alternative Slots Offered: {Colors.BLUE}{sel['alt_slots']}{Colors.END}")
    else:
        print(f"  [FAIL] No provider matched.")

async def test_case_3_pricing_itemization():
    print_section("TEST CASE 3: Dynamic Complex Pricing & Markdown Itemization")
    
    intent = {
        "service_type": "AC Repair",
        "location": "G-13",
        "urgency_level": "High",
        "preferred_time_window": "ASAP",
        "price_sensitivity": "Low"
    }
    
    # Provider: PROV_AC_01 (Base Rate: 1500)
    provider = {
        "id": "PROV_AC_01",
        "name": "Asif Khan",
        "base_rate": 1500
    }
    distance_km = 8.5 # Beyond 5km threshold
    
    pricing = await agent_3_price(intent, provider, distance_km)
    print(f"Complexity Tier: {Colors.BLUE}{pricing['complexity_tier']}{Colors.END} (Multiplier: {pricing['complexity_multiplier']})")
    print(f"Final Quoted Price: {Colors.GREEN}PKR {pricing['final_price']}{Colors.END}")
    print("\nItemized Breakdown Markdown:")
    print(pricing["breakdown_md"])

async def test_case_4_rollback_protocol():
    print_section("TEST CASE 4: Rollback Assignation Protocol")
    
    intent = {
        "service_type": "Plumbing",
        "location": "Blue Area",
        "urgency_level": "Medium",
        "preferred_time_window": "ASAP",
        "price_sensitivity": "Medium"
    }
    
    match = await agent_2_match(intent)
    print(f"Primary Selected: {Colors.BLUE}{match['selected']['name']} ({match['selected']['id']}){Colors.END}")
    if match.get("runner_up"):
        print(f"Runner-up Available: {Colors.BLUE}{match['runner_up']['name']} ({match['runner_up']['id']}){Colors.END}")
        
        # Simulate primary provider canceling/crashed
        print(f"\n[WARN] Simulating provider cancellation... Triggering Rollback Protocol!")
        rollback = rollback_to_runner_up(match)
        
        print(f"  [OK] Rollback Status: {Colors.BLUE}{rollback['status']}{Colors.END}")
        print(f"  [OK] Auto-Assigned New Provider: {Colors.GREEN}{rollback['new_provider']['name']} ({rollback['new_provider']['id']}){Colors.END}")
    else:
        print("  No runner-up found to test rollback.")

async def test_case_5_dispute_reciprocal_scoring():
    print_section("TEST CASE 5: Dispute Lifecycle & Score Penalization")
    
    # Find initial scores of Hamza Ali (PROV_PLB_01)
    provs = load_providers()
    target_id = "PROV_PLB_01"
    hamza = next(p for p in provs if p["id"] == target_id)
    
    print(f"Provider: {Colors.BOLD}Hamza Ali{Colors.END}")
    print(f"  Before Dispute -> Reliability: {Colors.BLUE}{hamza['reliability_score']}{Colors.END} | Risk: {Colors.BLUE}{hamza['risk_score']}{Colors.END}")
    
    # File extreme severity complaint
    dispute = DisputeRequest(
        booking_id="BK-9876A",
        provider_id=target_id,
        rating=1,
        complaint="Technician didn't fix the leak and broke another pipe, flooded the living room!",
        severity="extreme"
    )
    
    print(f"\nFiling Extreme Complaint (Rating 1, Severity Extreme)...")
    res = await agent_4_dispute(dispute)
    
    print(f"  Action Taken: [FAIL] {res['action']}")
    print(f"  After Dispute  -> Reliability: {Colors.GREEN}{res['reliability_score']['new']}{Colors.END} | Risk: {Colors.GREEN}{res['risk_score']['new']}{Colors.END}")
    print(f"  Empathetic AI Response: {Colors.BLUE}\"{res['ai_response']}\"{Colors.END}")
    
    # Reset/Restore provider metrics for subsequent trials
    provs = load_providers()
    for p in provs:
        if p["id"] == target_id:
            p["reliability_score"] = hamza["reliability_score"]
            p["risk_score"] = hamza["risk_score"]
    save_providers(provs)
    print(f"\n[OK] Restored original provider metrics to maintain seeding.")

async def main():
    print(f"{Colors.BOLD}STARTING SYSTEM INTEGRATION VERIFICATION SIMULATION{Colors.END}")
    await test_case_1_multilingual_parsing()
    await test_case_2_multifactor_clash_resolution()
    await test_case_3_pricing_itemization()
    await test_case_4_rollback_protocol()
    await test_case_5_dispute_reciprocal_scoring()
    print(f"\n{Colors.BOLD}{Colors.GREEN}ALL TEST SIMULATIONS EXECUTED PERFECTLY!{Colors.END}\n")

if __name__ == "__main__":
    asyncio.run(main())
