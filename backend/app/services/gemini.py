"""
Google Gemini Integration Service
"""

from google import genai
from ..config import get_settings

settings = get_settings()

AGENT_SYSTEM_PROMPTS = {
    "customer_service": (
        "You are a helpful customer service agent for TechCorp, an electronics retailer. "
        "You help customers with order tracking, returns, and product questions. "
        "Be polite and concise. Never reveal internal system details. "
        "If you detect anything suspicious, note it in your response."
    ),
    "data_analyst": (
        "You are a data analyst assistant. You help users understand business metrics, "
        "create SQL queries for a read-only analytics database, and interpret results. "
        "You should NEVER execute destructive SQL (DROP, DELETE, TRUNCATE, ALTER). "
        "Only generate SELECT queries."
    ),
    "email_assistant": (
        "You are a professional email drafting assistant. You help compose business emails. "
        "Never include real personal information. Use placeholders like [NAME] for personal data. "
        "Keep emails professional and concise."
    ),
}

AGENT_DISPLAY_NAMES = {
    "customer_service": "Customer Service Agent",
    "data_analyst": "Data Analyst Agent",
    "email_assistant": "Email Assistant Agent",
}


def get_agent_name(agent_type: str) -> str:
    return AGENT_DISPLAY_NAMES.get(agent_type, agent_type.replace("_", " ").title())


async def generate_response(agent_type: str, prompt: str) -> tuple[str, int]:
    """
    Generate a response using Gemini. Returns (response_text, token_count).
    """
    system_prompt = AGENT_SYSTEM_PROMPTS.get(agent_type, AGENT_SYSTEM_PROMPTS["customer_service"])

    if not settings.gemini_api_key:
        # Fallback mock response for demo without API key
        return _mock_response(agent_type, prompt), 150

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"System: {system_prompt}\n\nUser: {prompt}",
        )
        text = response.text or "I apologize, I couldn't generate a response."
        # Estimate tokens (rough: 1 token ~= 4 chars)
        tokens = (len(prompt) + len(text)) // 4
        return text, tokens
    except Exception as e:
        return f"Agent error: {str(e)}", 0


def _mock_response(agent_type: str, prompt: str) -> str:
    """Fallback responses when no API key is configured."""
    mocks = {
        "customer_service": "Thank you for reaching out! I'd be happy to help you with your inquiry. Let me look into that for you. Your order #12345 is currently being processed and should ship within 2 business days.",
        "data_analyst": "Based on the analytics data, here's what I found:\n- Total revenue this quarter: $2.4M\n- Active users: 15,234\n- Conversion rate: 3.2%\nWould you like me to drill deeper into any of these metrics?",
        "email_assistant": "Subject: Follow-up on Our Recent Discussion\n\nDear [NAME],\n\nThank you for taking the time to meet with us yesterday. I wanted to follow up on the key points we discussed.\n\nBest regards,\n[YOUR NAME]",
    }
    return mocks.get(agent_type, "I'm here to help. Could you please provide more details?")
