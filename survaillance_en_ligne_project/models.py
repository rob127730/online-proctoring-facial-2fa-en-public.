from pydantic import BaseModel
from typing import Optional, List, Dict
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    STUDENT = "student"

class AccountStatus(str, Enum):
    PENDING = "pending"      # En attente de validation admin
    VALIDATED = "validated"  # Validé par un admin
    REJECTED = "rejected"    # Rejeté par un admin

class AttentionLevel(str, Enum):
    FOCUSED = "focused"
    DISTRACTED = "distracted"
    DROWSY = "drowsy"
    EYES_CLOSED = "eyes_closed"

# AUTH
class LoginRequest(BaseModel):
    matricule: str
    password: str

class FaceAuthRequest(BaseModel):
    matricule: str
    image_base64: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    matricule: str

# USERS
class StudentRegisterRequest(BaseModel):
    """Utilisé par les étudiants pour s'inscrire eux-mêmes (sans image, via JSON)"""
    matricule: str
    password: str
    name: str

class UserCreate(BaseModel):
    matricule: str
    password: str
    name: str
    role: Role = Role.STUDENT

class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    matricule: str
    name: str
    role: str
    account_status: str = AccountStatus.PENDING
    created_at: str
    has_face_registered: bool = False

# DASHBOARD
class StudentDashboard(BaseModel):
    matricule: str
    name: str
    total_sessions: int
    total_hours: float
    average_attention: float
    best_session: Optional[Dict] = None
    worst_session: Optional[Dict] = None
    recent_sessions: List[Dict]

class AdminDashboard(BaseModel):
    total_students: int
    total_sessions: int
    total_hours: float
    average_attention_global: float
    students_without_face: List[Dict]
    top_students: List[Dict]
    recent_activity: List[Dict]

# FACE REGISTRATION
class FaceRegistrationRequest(BaseModel):
    matricule: str
    image_base64: str

# MONITORING SESSION
class MonitoringFrame(BaseModel):
    session_id: str
    frame_base64: str
    timestamp: float

class AttentionScore(BaseModel):
    timestamp: float
    attention_level: AttentionLevel
    eye_aspect_ratio: float
    head_pose: Dict[str, float]
    gaze_direction: Dict[str, float]
    blink_detected: bool

class SessionCreate(BaseModel):
    matricule: str

class SessionEnd(BaseModel):
    session_id: str

class SessionResponse(BaseModel):
    session_id: str
    matricule: str
    start_time: str
    end_time: Optional[str]
    attention_scores: List[AttentionScore]
    average_attention: float
    total_duration_seconds: float