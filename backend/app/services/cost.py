"""Cost tracking service for agent token usage."""

# Gemini pricing (approximate, per 1K tokens)
PRICING = {
    "gemini-2.0-flash": 0.000075,
    "gemini-2.0-pro": 0.00125,
}


def calculate_cost(tokens_used: int, model: str = "gemini-2.0-flash") -> float:
    rate = PRICING.get(model, 0.000075)
    return round((tokens_used / 1000) * rate, 6)
