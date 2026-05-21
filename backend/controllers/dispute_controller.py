from agents.dispute import agent_4_dispute

async def handle_dispute(dispute_req):
    result = await agent_4_dispute(dispute_req)
    return {"status": "resolved", "data": result}
