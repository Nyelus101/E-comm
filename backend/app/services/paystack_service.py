# backend/app/services/paystack_service.py
import httpx
import hashlib
import hmac
import secrets
from decimal import Decimal
from fastapi import HTTPException, status
import logging

from app.config import settings

logger = logging.getLogger(__name__)

PAYSTACK_BASE_URL = "https://api.paystack.co"


def _headers() -> dict:
    """
    Returns the Authorization header Paystack requires on every request.
    The secret key is never sent to the frontend — only used server-side.
    """
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def generate_reference() -> str:
    """
    Generates a unique payment reference.
    Format: LST-<16 random hex chars>
    Example: LST-a3f9c2d18b4e7f01

    This reference is stored on the order and sent to Paystack.
    When Paystack sends the webhook, it includes this reference
    so we can find the right order.
    """
    return f"LST-{secrets.token_hex(8)}"


async def initialize_payment(
    email: str,
    amount_naira: Decimal,
    reference: str,
    order_id: str,
    callback_url: str,
) -> dict:
    """
    Calls Paystack's /transaction/initialize endpoint.

    Paystack requires amount in KOBO (smallest Naira unit), not Naira.
    1 Naira = 100 Kobo, so we multiply by 100.

    Returns Paystack's response which includes:
    - authorization_url: the page to redirect the user to for payment
    - access_code: used for Paystack's inline popup (alternative to redirect)
    - reference: echoed back to confirm it was received

    metadata is a custom dict we attach — Paystack sends it back in the
    webhook, so we can use order_id to look up the order without
    relying solely on the reference.
    """
    # Convert Naira to Kobo — Paystack only accepts integers
    amount_kobo = int(amount_naira * 100)

    payload = {
        "email": email,
        "amount": amount_kobo,
        "reference": reference,
        "callback_url": callback_url,
        "metadata": {
            "order_id": order_id,
            "custom_fields": [
                {
                    "display_name": "Order ID",
                    "variable_name": "order_id",
                    "value": order_id,
                }
            ],
        },
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{PAYSTACK_BASE_URL}/transaction/initialize",
                json=payload,
                headers=_headers(),
                timeout=15.0,
            )

        data = response.json()

        if not data.get("status"):
            logger.error(f"Paystack init failed: {data.get('message')}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Payment initialisation failed: {data.get('message', 'Unknown error')}",
            )

        return data["data"]   # contains authorization_url, access_code, reference

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Payment service timed out. Please try again.",
        )


async def verify_transaction(reference: str) -> dict:
    """
    Verifies a transaction with Paystack after the user completes payment.

    Called in two situations:
    1. When the user returns to our callback URL after paying
    2. Optionally to double-check after receiving a webhook

    Returns the transaction data including status ("success", "failed", etc.)
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
                headers=_headers(),
                timeout=15.0,
            )

        data = response.json()

        if not data.get("status"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction verification failed.",
            )

        return data["data"]

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Payment verification timed out.",
        )


def verify_webhook_signature(payload_bytes: bytes, paystack_signature: str) -> bool:
    """
    Verifies that a webhook request actually came from Paystack.

    How it works:
    - Paystack signs every webhook with HMAC-SHA512 using your secret key
    - They put the signature in the 'x-paystack-signature' header
    - We compute the same HMAC on our side and compare
    - If they match, the request is genuine

    Why this matters: without this check, anyone could send fake
    "payment successful" webhooks to our server and get free laptops.

    payload_bytes: the raw request body (MUST be read before parsing JSON)
    paystack_signature: the value of the x-paystack-signature header
    """
    computed = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode("utf-8"),
        payload_bytes,
        hashlib.sha512,
    ).hexdigest()

    # hmac.compare_digest prevents timing attacks
    return hmac.compare_digest(computed, paystack_signature)