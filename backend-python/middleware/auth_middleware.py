import asyncio

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from firebase_config import auth


security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: No token provided",
        )

    token = credentials.credentials

    try:
        decoded_token = await asyncio.to_thread(
            auth.verify_id_token,
            token,
        )

        uid = decoded_token.get("uid")

        if not uid:
            raise HTTPException(
                status_code=401,
                detail="Unauthorized: Invalid token",
            )

        return {
            "uid": uid,
            "email": decoded_token.get("email", ""),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Auth token verification failed: {e}")

        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Invalid token",
        )