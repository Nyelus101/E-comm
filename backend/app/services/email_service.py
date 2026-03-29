# backend/app/services/email_service.py
import httpx
from app.config import settings
from app.utils.email_templates import verification_email_html, password_reset_email_html
import logging

logger = logging.getLogger(__name__)

# MailerSend API base URL — their REST API, no SDK needed
MAILERSEND_API_URL = "https://api.mailersend.com/v1/email"


async def _send_email(to_email: str, to_name: str, subject: str, html_content: str) -> bool:
    """
    Internal function that makes the actual HTTP request to MailerSend.
    All public functions in this file call this one.

    Returns True if sent successfully, False if it failed.
    We use async httpx because FastAPI is async — never use the blocking
    requests library inside async routes.
    """
    headers = {
        "Authorization": f"Bearer {settings.MAILERSEND_API_KEY}",
        "Content-Type": "application/json",
    }

    # This is exactly the JSON body MailerSend expects
    payload = {
        "from": {
            "email": settings.FROM_EMAIL,
            "name": "LaptopStore"
        },
        "to": [
            {
                "email": to_email,
                "name": to_name
            }
        ],
        "subject": subject,
        "html": html_content,
    }

    try:
        # async with ensures the HTTP connection is properly closed
        async with httpx.AsyncClient() as client:
            response = await client.post(
                MAILERSEND_API_URL,
                json=payload,
                headers=headers,
                timeout=10.0   # Don't wait more than 10 seconds
            )

        # MailerSend returns 202 Accepted for successful sends (not 200)
        if response.status_code == 202:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"MailerSend error {response.status_code}: {response.text}")
            return False

    except httpx.TimeoutException:
        logger.error(f"MailerSend timeout for {to_email}")
        return False
    except Exception as e:
        logger.error(f"Email send failed: {str(e)}")
        return False


async def send_verification_email(email: str, first_name: str, token: str) -> bool:
    """
    Called right after a user registers.
    Builds the verification URL and sends the email.
    """
    # The frontend will have a page at /verify-email that reads this token
    # and calls POST /auth/verify-email with it
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = verification_email_html(first_name, verification_url)

    return await _send_email(
        to_email=email,
        to_name=first_name,
        subject="Verify your email — LaptopStore",
        html_content=html,
    )


async def send_password_reset_email(email: str, first_name: str, token: str) -> bool:
    """
    Called when a user requests a password reset.
    The token is a short-lived random string stored (hashed) in the DB.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = password_reset_email_html(first_name, reset_url)

    return await _send_email(
        to_email=email,
        to_name=first_name,
        subject="Reset your password — LaptopStore",
        html_content=html,
    )