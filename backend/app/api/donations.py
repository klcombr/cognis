import asyncio
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.models import Donation

log = logging.getLogger("cognis.donations")

router = APIRouter()

SHARPIFY_BASE = "https://api.sharpify.com.br"

PAYMENT_STATUS_MAP = {
    "PENDING": "PENDING",
    "APPROVED": "APPROVED",
    "CANCELLED": "CANCELLED",
}

LOCAL_WEBHOOK_POLL_SECONDS = 45


def _sharpify_headers() -> dict[str, str]:
    return {
        "x-sharpify-client-id": settings.sharpify_client_id,
        "x-sharpify-client-secret": settings.sharpify_client_secret,
        "Content-Type": "application/json",
    }


class DonationCreate(BaseModel):
    amount: float
    name: str = ""


class DonationResponse(BaseModel):
    id: int
    payment_link_id: str
    amount: float
    status: str
    payment_url: str | None = None
    qr_code: str | None = None
    pix_copy_paste: str | None = None


async def create_payment_link(client: httpx.AsyncClient, data: DonationCreate) -> dict:
    resp = await client.post(
        f"{SHARPIFY_BASE}/api/v1/checkout/payment-link/create",
        json={
            "name": data.name or f"Doação Cognis - R$ {data.amount:.2f}",
            "description": "Apoio ao projeto Cognis - plataforma de estudos adaptativa",
            "amount": data.amount,
            "gatewayMethod": "PIX",
        },
        headers=_sharpify_headers(),
        timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Sharpify error: {resp.text}")
    return resp.json().get("data", {})


async def get_payment_link(client: httpx.AsyncClient, payment_link_id: str) -> dict:
    resp = await client.get(
        f"{SHARPIFY_BASE}/api/v1/checkout/payment-link/get",
        params={"paymentLinkId": payment_link_id},
        headers=_sharpify_headers(),
        timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Sharpify error: {resp.text}")
    return resp.json().get("data", {})


def _to_response(donation: Donation, payment: dict | None = None) -> DonationResponse:
    pay_data = payment.get("payment", {}) if payment else {}
    gateway = pay_data.get("gateway", {}) if pay_data else {}
    return DonationResponse(
        id=donation.id,
        payment_link_id=donation.payment_link_id or "",
        amount=donation.amount,
        status=donation.status,
        payment_url=gateway.get("paymentLink"),
        qr_code=gateway.get("qrCode"),
        pix_copy_paste=gateway.get("code"),
    )


@router.post("/donations", response_model=DonationResponse)
async def create_donation(data: DonationCreate, db: AsyncSession = Depends(get_db)):
    if not settings.sharpify_client_id or not settings.sharpify_client_secret:
        raise HTTPException(status_code=503, detail="Doações indisponíveis no momento")
    if data.amount < 1.0:
        raise HTTPException(status_code=400, detail="Valor mínimo de R$ 1,00")

    async with httpx.AsyncClient() as client:
        payment = await create_payment_link(client, data)

    payment_id = payment.get("id")
    if not payment_id:
        raise HTTPException(status_code=502, detail="Sharpify não retornou um link de pagamento")

    donation = Donation(
        amount=data.amount,
        status=PAYMENT_STATUS_MAP.get(payment.get("status", "PENDING"), "PENDING"),
        payment_link_id=payment_id,
        short_reference=payment.get("shortReference"),
    )
    db.add(donation)
    await db.commit()
    await db.refresh(donation)

    return _to_response(donation, payment)


@router.get("/donations/{donation_id}", response_model=DonationResponse)
async def get_donation(donation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Donation).where(Donation.id == donation_id))
    donation = result.scalar_one_or_none()
    if not donation:
        raise HTTPException(status_code=404, detail="Doação não encontrada")

    async with httpx.AsyncClient() as client:
        payment = await get_payment_link(client, donation.payment_link_id)

    status = PAYMENT_STATUS_MAP.get(payment.get("status"), donation.status)
    if status != donation.status:
        donation.status = status
        await db.commit()
        await db.refresh(donation)

    return _to_response(donation, payment)


def is_donations_enabled() -> bool:
    return bool(settings.sharpify_client_id and settings.sharpify_client_secret)


async def poll_local_webhooks() -> None:
    if not is_donations_enabled():
        return
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SHARPIFY_BASE}/api/v1/commom-services/local-webhook/list-all-pending-events",
                params={"limit": 100},
                headers=_sharpify_headers(),
                timeout=30,
            )
            if resp.status_code != 200:
                log.warning("Sharpify local webhook list falhou: %s %s", resp.status_code, resp.text[:200])
                return
            events = resp.json().get("events", [])
            if not events:
                return

            processed_ids: list[str] = []
            for event in events:
                event_meta = event.get("event", {})
                event_id = event_meta.get("id")
                event_name = event_meta.get("name")
                data = event.get("data", {})
                if event_name == "PAYMENT_LINK_APPROVED" and event_id:
                    await _mark_payment_approved(data.get("id"), data.get("shortReference"))
                    processed_ids.append(event_id)

            if processed_ids:
                await client.post(
                    f"{SHARPIFY_BASE}/api/v1/commom-services/local-webhook/mark-as-received",
                    json={"ids": processed_ids},
                    headers=_sharpify_headers(),
                    timeout=30,
                )
    except Exception:
        log.exception("Erro no polling do Local Webhook Sharpify")


async def _mark_payment_approved(payment_link_id: str | None, short_reference: str | None) -> None:
    if not payment_link_id:
        return
    from app.core.database import async_session

    async with async_session() as db:
        result = await db.execute(
            select(Donation).where(Donation.payment_link_id == payment_link_id)
        )
        donation = result.scalar_one_or_none()
        if donation and donation.status != "APPROVED":
            donation.status = "APPROVED"
            await db.commit()


async def local_webhook_loop() -> None:
    while True:
        await poll_local_webhooks()
        await asyncio.sleep(LOCAL_WEBHOOK_POLL_SECONDS)