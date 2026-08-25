"""Unit tests for transactional email templates, SMTP transport, and notifications."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi import BackgroundTasks

from app.services.notification_config import smtp_configured, smtp_settings
from app.services.notification_log import STATUS_MOCKED, STATUS_SENT
from app.services.notification_providers.mock import MockNotificationProvider
from app.services.notification_providers.smtp import SmtpNotificationProvider
from app.services.notification_service import (
    NotificationService,
    get_notification_service,
    schedule_notification,
    send_order_confirmation,
    send_password_reset_email,
    send_restaurant_status_update,
)
from app.services.notification_templates import (
    TEMPLATE_CUSTOMER_ORDER_PLACED,
    TEMPLATE_ORDER_DELIVERED,
    TEMPLATE_PASSWORD_RESET,
    TEMPLATE_REFUND_INITIATED,
    TEMPLATE_RESTAURANT_NEW_ORDER,
    render_template,
)


def test_render_password_reset_template():
    """Verify password reset template contains customer name, reset link, and 15-min expiry."""
    context = {
        "customer_name": "Alice Sharma",
        "reset_link": "https://campusbite.in/reset-password?token=sample123&role=customer",
    }
    subject, body = render_template(TEMPLATE_PASSWORD_RESET, context)

    assert "Password Reset" in subject
    assert "Alice Sharma" in body
    assert "https://campusbite.in/reset-password?token=sample123&role=customer" in body
    assert "15 minutes" in body


def test_render_order_placed_and_delivered_templates():
    """Verify order templates format totals and status messages."""
    order_ctx = {
        "order_id": "ord_9876543210ab",
        "customer_name": "Bob Kumar",
        "restaurant_email": "royal_mess@campus.in",
        "total": 178.50,
        "status": "Placed",
    }
    subject, body = render_template(TEMPLATE_CUSTOMER_ORDER_PLACED, order_ctx)
    assert "placed" in subject.lower()
    assert "Bob Kumar" in body
    assert "₹178.5" in body

    # Delivered template
    deliv_subject, deliv_body = render_template(TEMPLATE_ORDER_DELIVERED, order_ctx)
    assert "delivered" in deliv_subject.lower()
    assert "Bob Kumar" in deliv_body


@pytest.mark.asyncio
async def test_mock_notification_provider_dispatch():
    """Verify mock provider logs transmission cleanly without throwing errors."""
    mock_provider = MockNotificationProvider()
    service = NotificationService(mock_provider)

    with patch("app.services.notification_service.log_notification", new_callable=AsyncMock) as mock_log:
        await service.send(
            notification_type=TEMPLATE_PASSWORD_RESET,
            recipient="test@example.com",
            context={
                "customer_name": "Test User",
                "reset_link": "https://campusbite.in/reset-password?token=abc",
            },
        )
        assert mock_log.called
        assert mock_log.call_args.kwargs["recipient"] == "test@example.com"
        assert mock_log.call_args.kwargs["provider"] == "mock"
        assert mock_log.call_args.kwargs["status"] == STATUS_MOCKED


@pytest.mark.asyncio
async def test_smtp_notification_provider_transmission():
    """Verify SMTP notification provider connects and sends message via TLS."""
    smtp_provider = SmtpNotificationProvider()

    with patch("smtplib.SMTP") as mock_smtp_cls, \
         patch("app.services.notification_providers.smtp.smtp_settings") as mock_settings:
        mock_settings.return_value = {
            "host": "smtp.mailgun.org",
            "port": 587,
            "username": "postmaster@campusbite.com",
            "password": "secret_smtp_password",
            "from_address": "noreply@campusbite.com",
            "tls": True,
        }

        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        status = await smtp_provider.send(
            recipient="customer@campus.in",
            subject="Order Placed",
            body="Your meal is being prepared",
            notification_type=TEMPLATE_CUSTOMER_ORDER_PLACED,
        )

        assert status == STATUS_SENT
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("postmaster@campusbite.com", "secret_smtp_password")
        assert mock_server.send_message.called


def test_smtp_config_detection():
    """Verify SMTP configuration detector validates all required parameters."""
    with patch("app.services.notification_config.smtp_settings") as mock_settings:
        mock_settings.return_value = {
            "host": "smtp.sendgrid.net",
            "port": 587,
            "username": "apikey",
            "password": "SG.secretKey",
            "from_address": "orders@campusbite.com",
        }
        assert smtp_configured() is True

        # Incomplete settings should return False
        mock_settings.return_value = {
            "host": "",
            "port": 587,
            "username": "",
            "password": "",
            "from_address": "",
        }
        assert smtp_configured() is False


@pytest.mark.asyncio
async def test_canonical_notification_helpers():
    """Verify canonical helper functions call notification service correctly."""
    with patch("app.services.notification_service.get_notification_service") as mock_get_svc, \
         patch("app.services.notification_service.get_order_by_id", new_callable=AsyncMock) as mock_get_order:

        mock_svc = MagicMock()
        mock_svc.send = AsyncMock()
        mock_get_svc.return_value = mock_svc

        mock_get_order.return_value = {
            "_id": "order_123",
            "customer_name": "Test Customer",
            "customer_email": "customer@campus.in",
            "restaurant_email": "rest@campus.in",
            "total": 250.0,
            "status": "In Kitchen",
        }

        # 1. Password reset helper
        await send_password_reset_email("user@campus.in", "https://campusbite.in/reset-password?token=xyz", "User")
        assert mock_svc.send.called
        assert mock_svc.send.call_args.kwargs["recipient"] == "user@campus.in"

        # 2. Status update helper
        await send_restaurant_status_update("order_123", "Out for Delivery")
        assert mock_svc.send.called


def test_schedule_notification_background_tasks():
    """Verify schedule_notification queues tasks onto FastAPI BackgroundTasks."""
    bg_tasks = BackgroundTasks()
    sample_coroutine = AsyncMock()

    schedule_notification(bg_tasks, sample_coroutine, "order_123")
    assert len(bg_tasks.tasks) == 1
    assert bg_tasks.tasks[0].func == sample_coroutine
    assert bg_tasks.tasks[0].args == ("order_123",)


@pytest.mark.asyncio
async def test_log_notification_flexible_kwargs_and_customer_id():
    """Verify log_notification accepts customer_id, user_id, metadata, and arbitrary kwargs without raising TypeError."""
    from app.services.notification_log import log_notification

    with patch("app.services.notification_log.notification_logs_collection.insert_one", new_callable=AsyncMock) as mock_insert:
        await log_notification(
            recipient="alice@campus.in",
            notification_type=TEMPLATE_PASSWORD_RESET,
            provider="smtp",
            status=STATUS_SENT,
            customer_id="cust_65f123456789",
            user_id="user_65f123456789",
            recipient_id="rec_999",
            metadata={"ip": "192.168.1.1"},
            custom_tracking_id="track_xyz",
        )

        assert mock_insert.called
        inserted_doc = mock_insert.call_args[0][0]
        assert inserted_doc["recipient"] == "alice@campus.in"
        assert inserted_doc["type"] == TEMPLATE_PASSWORD_RESET
        assert inserted_doc["provider"] == "smtp"
        assert inserted_doc["status"] == STATUS_SENT
        assert inserted_doc["customer_id"] == "cust_65f123456789"
        assert inserted_doc["user_id"] == "user_65f123456789"
        assert inserted_doc["recipient_id"] == "rec_999"
        assert inserted_doc["metadata"] == {"ip": "192.168.1.1"}
        assert inserted_doc["custom_tracking_id"] == "track_xyz"
        assert "created_at" in inserted_doc


@pytest.mark.asyncio
async def test_send_password_reset_email_with_customer_id_and_kwargs():
    """Verify send_password_reset_email dispatches with customer_id and extra kwargs without TypeError."""
    with patch("app.services.notification_service.log_notification", new_callable=AsyncMock) as mock_log:
        await send_password_reset_email(
            email="resetuser@campusbite.com",
            reset_link="https://campusbite.in/reset-password?token=tok_987",
            customer_name="Bob",
            customer_id="cust_id_12345",
            ip_address="10.0.0.5",
        )

        assert mock_log.called
        kwargs = mock_log.call_args.kwargs
        assert kwargs["recipient"] == "resetuser@campusbite.com"
        assert kwargs["notification_type"] == TEMPLATE_PASSWORD_RESET
        assert kwargs["customer_id"] == "cust_id_12345"
        assert kwargs["ip_address"] == "10.0.0.5"


@pytest.mark.asyncio
async def test_resend_smtp_provider_dispatch():
    """Verify SmtpNotificationProvider handles Resend SMTP transport correctly (smtp.resend.com:587)."""
    smtp_provider = SmtpNotificationProvider()

    with patch("smtplib.SMTP") as mock_smtp_cls, \
         patch("app.services.notification_providers.smtp.smtp_settings") as mock_settings:
        mock_settings.return_value = {
            "host": "smtp.resend.com",
            "port": 587,
            "username": "resend",
            "password": "re_123456789_testApiKey",
            "from_address": "noreply@campusbite.com",
            "tls": True,
        }

        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        status = await smtp_provider.send(
            recipient="user@example.com",
            subject="Password Reset",
            body="Reset your password: https://campusbite.in/reset",
            notification_type=TEMPLATE_PASSWORD_RESET,
        )

        assert status == STATUS_SENT
        mock_smtp_cls.assert_called_once_with("smtp.resend.com", 587, timeout=30)
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("resend", "re_123456789_testApiKey")
        assert mock_server.send_message.called


@pytest.mark.asyncio
async def test_notification_service_handles_dispatch_exception_gracefully():
    """Verify NotificationService.send catches exceptions, captures to sentry, and logs failure."""
    mock_provider = MagicMock()
    mock_provider.name = "smtp"
    mock_provider.send = AsyncMock(side_effect=RuntimeError("SMTP connection dropped"))
    service = NotificationService(mock_provider)

    with patch("app.services.notification_service.log_notification", new_callable=AsyncMock) as mock_log, \
         patch("sentry_sdk.capture_exception") as mock_sentry:
        await service.send(
            notification_type=TEMPLATE_PASSWORD_RESET,
            recipient="fail@example.com",
            customer_id="cust_999",
            context={"customer_name": "User", "reset_link": "https://campusbite.in/reset"},
        )

        assert mock_log.called
        assert mock_log.call_args.kwargs["status"] == "failed"
        assert mock_log.call_args.kwargs["customer_id"] == "cust_999"
        mock_sentry.assert_called_once()


@pytest.mark.asyncio
async def test_notification_log_database_exception_graceful():
    """Verify log_notification catches DB errors without raising unhandled exceptions."""
    from app.services.notification_log import log_notification

    with patch("app.services.notification_log.notification_logs_collection.insert_one", side_effect=Exception("DB Error")), \
         patch("sentry_sdk.capture_exception") as mock_sentry:
        # Should not raise exception
        await log_notification(
            recipient="user@example.com",
            notification_type=TEMPLATE_PASSWORD_RESET,
            customer_id="cust_123",
        )
        mock_sentry.assert_called_once()


@pytest.mark.asyncio
async def test_resend_api_notification_provider_success():
    """Verify ResendApiNotificationProvider sends HTTPS request with proper headers and payload."""
    from app.services.notification_providers.resend_api import ResendApiNotificationProvider
    import httpx

    provider = ResendApiNotificationProvider(
        api_key="re_live_test_api_key_123",
        from_email="onboarding@resend.dev",
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.text = '{"id": "re_email_98765"}'

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        status = await provider.send(
            recipient="user@campusbite.com",
            subject="Reset Your Password",
            body="Click here to reset: https://campusbite.com/reset",
            notification_type=TEMPLATE_PASSWORD_RESET,
        )

        assert status == STATUS_SENT
        assert mock_post.called
        call_url = mock_post.call_args[0][0]
        call_headers = mock_post.call_args.kwargs["headers"]
        call_payload = mock_post.call_args.kwargs["json"]

        assert call_url == "https://api.resend.com/emails"
        assert call_headers["Authorization"] == "Bearer re_live_test_api_key_123"
        assert call_headers["Content-Type"] == "application/json"
        assert call_payload["from"] == "onboarding@resend.dev"
        assert call_payload["to"] == ["user@campusbite.com"]
        assert call_payload["subject"] == "Reset Your Password"
        assert "https://campusbite.com/reset" in call_payload["html"]


@pytest.mark.asyncio
async def test_resend_api_notification_provider_http_error():
    """Verify ResendApiNotificationProvider handles HTTP 4xx/5xx responses gracefully."""
    from app.services.notification_providers.resend_api import ResendApiNotificationProvider
    from app.services.notification_log import STATUS_FAILED
    import httpx

    provider = ResendApiNotificationProvider(
        api_key="re_invalid_api_key",
        from_email="onboarding@resend.dev",
    )

    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 401
    mock_resp.text = '{"name": "validation_error", "message": "Invalid API Key"}'

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp

        status = await provider.send(
            recipient="user@campusbite.com",
            subject="Welcome",
            body="Hello world",
            notification_type=TEMPLATE_CUSTOMER_ORDER_PLACED,
        )

        assert status == STATUS_FAILED


@pytest.mark.asyncio
async def test_resend_api_notification_provider_network_exception():
    """Verify ResendApiNotificationProvider catches network timeouts and logs to sentry."""
    from app.services.notification_providers.resend_api import ResendApiNotificationProvider
    from app.services.notification_log import STATUS_FAILED
    import httpx

    provider = ResendApiNotificationProvider(
        api_key="re_api_key_test",
        from_email="noreply@campusbite.com",
    )

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectTimeout("Connection timed out")), \
         patch("sentry_sdk.capture_exception") as mock_sentry:
        status = await provider.send(
            recipient="user@campusbite.com",
            subject="Timeout test",
            body="Body text",
            notification_type=TEMPLATE_PASSWORD_RESET,
        )

        assert status == STATUS_FAILED
        mock_sentry.assert_called_once()


@pytest.mark.asyncio
async def test_resend_api_notification_provider_missing_key():
    """Verify provider returns STATUS_FAILED immediately if API key is missing."""
    from app.services.notification_providers.resend_api import ResendApiNotificationProvider
    from app.services.notification_log import STATUS_FAILED

    provider = ResendApiNotificationProvider(api_key="")
    status = await provider.send(
        recipient="user@campusbite.com",
        subject="No key",
        body="Body",
        notification_type=TEMPLATE_PASSWORD_RESET,
    )
    assert status == STATUS_FAILED


def test_provider_selection_priority():
    """Verify provider selection priority: Resend API > SMTP > Mock."""
    from app.core.config import Settings

    # 1. Resend API Key present -> Resend Provider
    with patch("app.services.notification_config.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            RESEND_API_KEY="re_test_key_123",
            SMTP_HOST="smtp.example.com",
            SMTP_USER="smtp_user",
            SMTP_PASSWORD="smtp_pass",
            SMTP_FROM_EMAIL="orders@campusbite.com",
        )
        svc = get_notification_service()
        assert svc.provider_name == "resend"

    # 2. Resend API Key empty, but SMTP configured -> SMTP Provider
    with patch("app.services.notification_config.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            RESEND_API_KEY="",
            SMTP_HOST="smtp.example.com",
            SMTP_USER="smtp_user",
            SMTP_PASSWORD="smtp_pass",
            SMTP_FROM_EMAIL="orders@campusbite.com",
        )
        svc = get_notification_service()
        assert svc.provider_name == "smtp"

    # 3. Neither configured -> Mock Provider
    with patch("app.services.notification_config.get_settings") as mock_settings:
        mock_settings.return_value = Settings(
            RESEND_API_KEY="",
            SMTP_HOST="",
            SMTP_USER="",
            SMTP_PASSWORD="",
            SMTP_FROM_EMAIL="",
        )
        svc = get_notification_service()
        assert svc.provider_name == "mock"


