import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

FROM_EMAIL = "No-reply@edetcorp.com"
FROM_NAME = "Eddit"


def _build_email_parts(to_email: str, reset_url: str):
    text = (
        f"Reset your Eddit password by visiting: {reset_url}\n\n"
        "This link expires in 1 hour. If you didn't request this, ignore this email."
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0e0d11;color:#e8e6f0;border-radius:12px">
      <h1 style="font-size:2.5rem;letter-spacing:0.05em;color:#c084fc;margin:0 0 8px">EDDIT</h1>
      <p style="color:#9d9aad;font-size:0.85rem;margin:0 0 32px">Password Reset</p>
      <p style="margin:0 0 24px">Someone requested a password reset for your account. Click the button below to set a new password.</p>
      <a href="{reset_url}" style="display:inline-block;background:#c084fc;color:#0e0d11;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:0.95rem">Reset Password</a>
      <p style="margin:32px 0 0;color:#9d9aad;font-size:0.8rem">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    return text, html


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    text, html = _build_email_parts(to_email, reset_url)

    if settings.resend_api_key:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": [to_email],
            "subject": "Reset your Eddit password",
            "html": html,
            "text": text,
        })
        return

    # SMTP fallback
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset your Eddit password"
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
