from tools.services import load_providers

async def handle_provider_list():
    return load_providers()
