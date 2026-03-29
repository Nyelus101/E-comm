# backend/app/utils/email_templates.py


def verification_email_html(first_name: str, verification_url: str) -> str:
    """
    Email sent immediately after registration.
    The verification_url contains a one-time token.
    Example: https://yourdomain.com/verify-email?token=abc123
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background:#f4f4f4; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background:#ffffff; border-radius:8px; overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:#1a1a2e; padding:32px 40px;">
                  <h1 style="color:#ffffff; margin:0; font-size:24px;">LaptopStore</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1a1a2e; margin:0 0 16px;">
                    Welcome, {first_name}!
                  </h2>
                  <p style="color:#555; line-height:1.6; margin:0 0 24px;">
                    Thanks for creating an account. Please verify your email address
                    to activate your account and start shopping.
                  </p>
                  <a href="{verification_url}"
                     style="display:inline-block; background:#1a1a2e; color:#ffffff;
                            padding:14px 32px; border-radius:6px; text-decoration:none;
                            font-weight:bold; font-size:16px;">
                    Verify Email Address
                  </a>
                  <p style="color:#999; font-size:13px; margin:24px 0 0;">
                    This link expires in 24 hours. If you didn't create an account,
                    you can safely ignore this email.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8f8f8; padding:20px 40px; text-align:center;">
                  <p style="color:#aaa; font-size:12px; margin:0;">
                    © 2024 LaptopStore. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


def password_reset_email_html(first_name: str, reset_url: str) -> str:
    """
    Email sent when user requests a password reset.
    The reset_url contains a short-lived token (1 hour).
    """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background:#f4f4f4; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" cellpadding="0" cellspacing="0"
                   style="background:#ffffff; border-radius:8px; overflow:hidden;">
              <tr>
                <td style="background:#1a1a2e; padding:32px 40px;">
                  <h1 style="color:#ffffff; margin:0; font-size:24px;">LaptopStore</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1a1a2e; margin:0 0 16px;">
                    Reset your password
                  </h2>
                  <p style="color:#555; line-height:1.6; margin:0 0 8px;">
                    Hi {first_name}, we received a request to reset your password.
                  </p>
                  <p style="color:#555; line-height:1.6; margin:0 0 24px;">
                    Click the button below to choose a new password.
                  </p>
                  <a href="{reset_url}"
                     style="display:inline-block; background:#c0392b; color:#ffffff;
                            padding:14px 32px; border-radius:6px; text-decoration:none;
                            font-weight:bold; font-size:16px;">
                    Reset Password
                  </a>
                  <p style="color:#999; font-size:13px; margin:24px 0 0;">
                    This link expires in 1 hour. If you didn't request this,
                    please ignore this email — your password won't change.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f8f8f8; padding:20px 40px; text-align:center;">
                  <p style="color:#aaa; font-size:12px; margin:0;">
                    © 2024 LaptopStore. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """