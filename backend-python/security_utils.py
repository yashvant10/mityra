import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Load environment variables
JWT_SECRET = os.getenv("JWT_SECRET", "tryonx-super-secret-jwt-key-2026-xyz")
JWT_ALGORITHM = "HS256"

# Default fallback credentials hash (for Look.ai@2026#)
DEFAULT_ADMIN_PASSWORD_HASH = os.getenv(
    "ADMIN_PASSWORD_HASH",
    "$2b$12$RptkFf49KkR1gQ2xHh0Hbe47j/UqjZ7D4j6r0H.q4wVptXz27oG7q"
)
DEFAULT_ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "yashvant_admin")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hashed password."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as e:
        print(f"[SECURITY] Password verification failed: {e}")
        return False

def get_password_hash(password: str) -> str:
    """Generate bcrypt hash of a password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT access token expiring after 24 hours by default."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
        
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(data: dict) -> str:
    """Generate a JWT refresh token expiring after 7 days."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token. Raises PyJWTError on failure."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
