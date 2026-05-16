"""SSE (Server-Sent Events) broadcasting for real-time updates."""

import asyncio
import json
from typing import AsyncGenerator

# Global event queue for SSE broadcasting
_listeners: list[asyncio.Queue] = []


async def broadcast_event(event: dict):
    """Broadcast an event to all connected SSE listeners."""
    for queue in _listeners:
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            pass  # Skip slow consumers


async def event_generator() -> AsyncGenerator[str, None]:
    """Generate SSE events for a connected client."""
    queue = asyncio.Queue(maxsize=100)
    _listeners.append(queue)
    try:
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        _listeners.remove(queue)
