"""Mint LiveKit access tokens for browser participants.
The agent worker authenticates with the same API key+secret pair via its own SDK."""

import os
import uuid

from livekit import api


def mint_token(*, identity: str, room: str, ttl_seconds: int = 60 * 30) -> str:
    api_key = os.environ.get("LIVEKIT_API_KEY")
    api_secret = os.environ.get("LIVEKIT_API_SECRET")
    if not api_key or not api_secret:
        raise RuntimeError("LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set")

    grant = api.VideoGrants(
        room_join=True,
        room=room,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
    )
    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_name(identity)
        .with_grants(grant)
        .with_ttl(ttl_seconds)
    )
    return token.to_jwt()


def room_for_handle(handle: str) -> str:
    """One room per handle so participants don't crosstalk; the agent
    framework dispatches a worker on first join."""
    safe = "".join(c for c in handle.lower() if c.isalnum() or c in "-_")[:32]
    return f"hm-{safe}-{uuid.uuid4().hex[:8]}"
