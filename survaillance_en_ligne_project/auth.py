from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "secret_key_super_securise_changez_moi")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
TEMP_TOKEN_EXPIRE_MINUTES = 15  # Token temporaire pour 2FA

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,
    bcrypt__default_ident="2b"
)
security = HTTPBearer()

def hash_password(password: str) -> str:
    # Tronquer le mot de passe à 72 bytes pour bcrypt
    if isinstance(password, str):
        password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_temp_token(data: dict) -> str:
    """Token temporaire (15 min) pour étape 1 - permet seulement 2FA"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=TEMP_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "token_type": "temp_2fa"  # Marqueur pour identifier le type
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Token permanent après 2FA complet"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": expire,
        "token_type": "full_access"  # Marqueur pour token complet
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré"
        )

async def get_temp_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Vérifie le token temporaire (après login password)"""
    token = credentials.credentials
    payload = decode_token(token)
    
    # Vérifier que c'est bien un token temporaire
    if payload.get("token_type") != "temp_2fa":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token non valide pour cette opération. Connectez-vous d'abord."
        )
    
    matricule = payload.get("sub")
    if matricule is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )
    return payload

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Vérifie le token complet (après 2FA facial)"""
    token = credentials.credentials
    payload = decode_token(token)
    
    # Vérifier que c'est bien un token complet
    if payload.get("token_type") != "full_access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification 2FA requise. Veuillez vérifier votre visage."
        )
    
    matricule = payload.get("sub")
    if matricule is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )
    return payload

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Nécessite un token complet ET rôle admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès admin requis"
        )
    return current_user