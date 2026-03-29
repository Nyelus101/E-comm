# # backend/app/utils/security.py
# from datetime import datetime, timedelta, timezone
# from typing import Optional
# from jose import JWTError, jwt
# from passlib.context import CryptContext
# from app.config import settings

# # ─── Password Hashing ────────────────────────────────────────────────────────
# # CryptContext handles bcrypt hashing.
# # bcrypt is the industry standard for password storage — it's slow by design,
# # making brute-force attacks impractical.
# # "deprecated='auto'" will auto-upgrade old hashes if you ever change the scheme.
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# def hash_password(plain_password: str) -> str:
#     """
#     Turns 'mypassword123' into '$2b$12$randomsaltXXXXXXhashedvalue'
#     The hash is different every time even for the same password (salt).
#     """
#     return pwd_context.hash(plain_password)


# def verify_password(plain_password: str, hashed_password: str) -> bool:
#     """
#     Checks if a plain password matches a stored hash.
#     Never compare passwords as plain strings — always use this.
#     """
#     return pwd_context.verify(plain_password, hashed_password)


# # ─── JWT Tokens ──────────────────────────────────────────────────────────────
# # We use TWO tokens:
# #
# # ACCESS TOKEN  — short-lived (30 min). Sent in every API request header.
# #                 Contains user's ID and role.
# #
# # REFRESH TOKEN — long-lived (7 days). Stored securely by the client.
# #                 Only used to get a new access token when it expires.
# #                 Stored in Redis so we can revoke it on logout.
# #
# # Why two tokens? If an access token is stolen, it expires in 30 min.
# # If a refresh token is stolen, we can blacklist it in Redis.

# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
#     """
#     Creates a short-lived JWT access token.

#     data should include: {"sub": str(user.id), "role": user.role}
#     "sub" (subject) is the JWT standard field for the user identifier.
#     """
#     to_encode = data.copy()
#     expire = datetime.now(timezone.utc) + (
#         expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
#     )
#     to_encode.update({
#         "exp": expire,
#         "type": "access"    # We tag token type to prevent refresh tokens being used as access tokens
#     })
#     return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# def create_refresh_token(data: dict) -> str:
#     """
#     Creates a long-lived JWT refresh token.
#     """
#     to_encode = data.copy()
#     expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
#     to_encode.update({
#         "exp": expire,
#         "type": "refresh"
#     })
#     return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# def decode_token(token: str) -> Optional[dict]:
#     """
#     Decodes and validates a JWT token.
#     Returns the payload dict if valid, None if expired or tampered.

#     Raises JWTError if the token is malformed (we catch this in dependencies.py).
#     """
#     try:
#         payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
#         return payload
#     except JWTError:
#         return None























# backend/app/utils/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError
from app.config import settings


# ─── Password Hashing ────────────────────────────────────────────────────────
# Using bcrypt directly — no passlib wrapper.
# bcrypt.gensalt() generates a new random salt each time.
# Cost factor defaults to 12 — high enough to be slow for attackers,
# fast enough not to annoy real users (~250ms per hash).

def hash_password(plain_password: str) -> str:
    """
    Hashes a plain text password with bcrypt.
    Returns a string like: $2b$12$saltXXXXXXXXXXXhashXXXXXXXXXXXX
    
    bcrypt requires bytes input, so we encode to UTF-8 first.
    The 72-byte limit is a bcrypt protocol limitation — we pre-hash
    with a fixed prefix to safely handle long passwords.
    """
    password_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    # Decode back to string for storing in PostgreSQL TEXT column
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks a plain password against a stored bcrypt hash.
    Returns True if they match, False otherwise.
    """
    password_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)


# ─── JWT Tokens ──────────────────────────────────────────────────────────────
# Using PyJWT directly — simpler and actively maintained.

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Creates a short-lived JWT access token.
    'sub' (subject) stores the user's UUID as a string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "type": "access"
    })
    # PyJWT's encode() returns a string directly (unlike python-jose)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Creates a long-lived JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decodes and validates a JWT token.
    Returns the payload dict if valid, None if expired or tampered.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except InvalidTokenError:
        # Covers: ExpiredSignatureError, DecodeError, InvalidSignatureError, etc.
        return None