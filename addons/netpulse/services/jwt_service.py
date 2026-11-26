"""Servicio de emisión y validación de tokens JWT de NetPulse.

Este módulo mantiene la lógica criptográfica fuera de los controladores HTTP.
La clave se obtiene exclusivamente del entorno y nunca se almacena en la base
de datos ni se devuelve al cliente.
"""
import os
import time

import jwt

from odoo.exceptions import AccessDenied, UserError

ISSUER = "netpulse"
TOKEN_TTL_SECONDS = 30 * 60
ALGORITHM = "HS256"


class NetpulseJwtService:
    """Emite y valida tokens de acceso firmados con HS256."""

    @staticmethod
    def _secret():
        secret = os.environ.get("NETPULSE_JWT_SECRET", "")
        if len(secret.encode("utf-8")) < 32:
            raise UserError(
                "NETPULSE_JWT_SECRET debe tener al menos 32 bytes."
            )
        return secret

    @classmethod
    def issue_token(cls, user):
        now = int(time.time())
        payload = {
            "sub": str(user.id),
            "iss": ISSUER,
            "iat": now,
            "exp": now + TOKEN_TTL_SECONDS,
        }
        return jwt.encode(payload, cls._secret(), algorithm=ALGORITHM)

    @classmethod
    def authenticate_token(cls, token, user_model):
        try:
            payload = jwt.decode(
                token,
                cls._secret(),
                algorithms=[ALGORITHM],
                issuer=ISSUER,
                options={"require": ["sub", "iss", "iat", "exp"]},
            )
            user_id = int(payload["sub"])
        except (jwt.InvalidTokenError, TypeError, ValueError) as exc:
            raise AccessDenied("Token inválido o expirado.") from exc

        user = user_model.sudo().browse(user_id).exists()
        if not user or not user.active:
            raise AccessDenied("La cuenta asociada al token no está activa.")
        return user
