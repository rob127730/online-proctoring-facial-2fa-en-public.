from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import uuid
from datetime import datetime

from models import (
    LoginRequest, FaceAuthRequest, Token, UserCreate, UserUpdate, UserResponse,
    StudentRegisterRequest, FaceRegistrationRequest, MonitoringFrame, SessionCreate,
    SessionEnd, SessionResponse, AttentionScore, Role, AccountStatus,
    StudentDashboard, AdminDashboard
)
from storage import storage
from auth import (
    hash_password, verify_password, create_temp_token, create_access_token,
    get_temp_user, get_current_user, require_admin
)
from face_recognition import face_system
from attention_monitor import attention_monitor

app = FastAPI(title="Système de Surveillance en Ligne", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Stockage temporaire des sessions actives
active_sessions = {}

# ========== ROOT ==========

@app.get("/")
async def root():
    return {
        "message": "Système de Surveillance en Ligne - API",
        "version": "1.0.0",
        "status": "online",
        "setup": {
            "note": "Si aucun admin n'existe, utilisez le script create_admin.py"
        },
        "auth_flow": {
            "step_0": "POST /api/auth/register → Créer un compte étudiant (en attente de validation)",
            "step_1": "POST /api/auth/login → Token temporaire (15 min) — compte validé requis",
            "step_2": "POST /api/auth/face-verify → Token complet (24h)",
            "note": "Seul le token complet permet d'accéder aux autres routes"
        }
    }


# ========== AUTHENTIFICATION ==========

@app.post("/api/auth/register", response_model=dict)
async def register_student(
    matricule: str = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    image: UploadFile = File(...)
):
    """
    Inscription d'un étudiant (sans authentification requise).
    Le compte est créé avec le statut 'pending' jusqu'à validation par un admin.
    L'enregistrement facial est obligatoire dès l'inscription.
    """
    # Vérifier que le matricule n'existe pas déjà
    existing = storage.get_user_by_matricule(matricule)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un compte avec ce matricule existe déjà"
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir au moins 6 caractères"
        )

    # Lire et enregistrer le visage
    try:
        image_bytes = await image.read()
        embedding = face_system.register_face_from_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de la lecture de l'image: {str(e)}"
        )

    if embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun visage détecté dans l'image. L'enregistrement facial est obligatoire."
        )

    # Créer le compte étudiant en attente
    user_data = {
        "matricule": matricule,
        "password": hash_password(password),
        "name": name,
        "role": Role.STUDENT,
        "account_status": AccountStatus.PENDING  # En attente de validation
    }

    created_user = storage.create_user(user_data)
    storage.save_embedding(matricule, embedding)

    return {
        "message": "Compte créé avec succès. En attente de validation par un administrateur.",
        "matricule": created_user["matricule"],
        "name": created_user["name"],
        "account_status": AccountStatus.PENDING
    }


@app.post("/api/auth/login", response_model=dict)
async def login(request: LoginRequest):
    """
    Étape 1 : Authentification par matricule et mot de passe.
    Bloqué si le compte est en attente (pending) ou rejeté (rejected).
    Retourne un TOKEN TEMPORAIRE (15 min) pour le 2FA facial.
    """
    user = storage.get_user_by_matricule(request.matricule)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matricule ou mot de passe incorrect"
        )

    if not verify_password(request.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matricule ou mot de passe incorrect"
        )

    # Vérifier le statut du compte (les admins sont toujours validated)
    account_status = user.get("account_status", AccountStatus.VALIDATED)

    if account_status == AccountStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte est en attente de validation par un administrateur."
        )

    if account_status == AccountStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Votre compte a été rejeté. Contactez un administrateur."
        )

    # Vérifier si l'utilisateur a enregistré son visage
    embedding = storage.get_embedding_by_matricule(request.matricule)
    if not embedding:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucun visage enregistré pour cet utilisateur. Contactez un administrateur."
        )

    # Créer le TOKEN TEMPORAIRE pour le 2FA
    temp_token = create_temp_token({
        "sub": user["matricule"],
        "role": user["role"],
        "name": user["name"]
    })

    return {
        "message": "Première étape validée",
        "temp_token": temp_token,
        "token_type": "bearer",
        "expires_in_minutes": 15,
        "matricule": user["matricule"],
        "name": user["name"],
        "role": user["role"],
        "next_step": "/api/auth/face-verify"
    }


@app.post("/api/auth/face-verify", response_model=Token)
async def face_verify(
    matricule: str = Form(...),
    image: UploadFile = File(...),
    temp_user: dict = Depends(get_temp_user)
):
    """
    Étape 2 : Vérification faciale (2FA).
    Nécessite le token temporaire de l'étape 1.
    Retourne le TOKEN COMPLET qui donne accès à toutes les routes.
    """
    if temp_user["sub"] != matricule:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token ne correspond pas au matricule"
        )

    user = storage.get_user_by_matricule(matricule)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable"
        )

    embedding_data = storage.get_embedding_by_matricule(matricule)
    if not embedding_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun visage enregistré. Utilisez /api/face/register d'abord."
        )

    try:
        image_bytes = await image.read()
        match, similarity = face_system.verify_face_from_bytes(
            image_bytes,
            embedding_data["embedding"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de la lecture de l'image: {str(e)}"
        )

    if not match:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Visage non reconnu (similarité: {similarity:.2f})"
        )

    full_token = create_access_token({
        "sub": user["matricule"],
        "role": user["role"],
        "name": user["name"]
    })

    return Token(
        access_token=full_token,
        token_type="bearer",
        role=user["role"],
        matricule=user["matricule"]
    )


# ========== GESTION UTILISATEURS (ADMIN) ==========

@app.get("/api/users", response_model=List[UserResponse], dependencies=[Depends(require_admin)])
async def get_all_users():
    """Récupérer tous les utilisateurs (Admin uniquement)"""
    users = storage.get_all_users()
    embeddings = storage.get_all_embeddings()
    embedding_matricules = {e["matricule"] for e in embeddings}

    return [
        UserResponse(
            matricule=u["matricule"],
            name=u["name"],
            role=u["role"],
            account_status=u.get("account_status", AccountStatus.VALIDATED),
            created_at=u["created_at"],
            has_face_registered=u["matricule"] in embedding_matricules
        )
        for u in users
    ]


@app.delete("/api/users/{matricule}", dependencies=[Depends(require_admin)])
async def delete_user(matricule: str):
    """Supprimer un utilisateur (Admin uniquement)"""
    deleted = storage.delete_user(matricule)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable"
        )

    return {"message": "Utilisateur supprimé avec succès"}


@app.put("/api/users/{matricule}", dependencies=[Depends(require_admin)])
async def update_user(
    matricule: str,
    name: Optional[str] = Form(None),
    password: Optional[str] = Form(None)
):
    """Modifier le profil d'un utilisateur (Admin uniquement)"""
    user = storage.get_user_by_matricule(matricule)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable"
        )

    update_data = {}
    if name:
        update_data["name"] = name
    if password:
        update_data["password"] = hash_password(password)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune donnée à modifier"
        )

    storage.update_user(matricule, update_data)

    return {
        "message": "Utilisateur modifié avec succès",
        "matricule": matricule,
        "updated_fields": list(update_data.keys())
    }


@app.put("/api/users/{matricule}/face")
async def update_user_face(
    matricule: str,
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Mettre à jour l'embedding facial d'un utilisateur
    (Admin ou l'utilisateur lui-même)
    """
    if current_user["role"] != "admin" and current_user["sub"] != matricule:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )

    user = storage.get_user_by_matricule(matricule)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable"
        )

    try:
        image_bytes = await image.read()
        embedding = face_system.register_face_from_bytes(image_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de la lecture de l'image: {str(e)}"
        )

    if embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun visage détecté dans l'image"
        )

    storage.save_embedding(matricule, embedding)

    return {
        "message": "Visage mis à jour avec succès",
        "matricule": matricule
    }


# ========== VALIDATION DES COMPTES (ADMIN) ==========

@app.get("/api/users/pending", dependencies=[Depends(require_admin)])
async def get_pending_accounts():
    """
    Récupérer tous les comptes étudiants en attente de validation (Admin uniquement)
    """
    pending = storage.get_pending_users()
    embeddings = storage.get_all_embeddings()
    embedding_matricules = {e["matricule"] for e in embeddings}

    return {
        "total": len(pending),
        "pending_accounts": [
            {
                "matricule": u["matricule"],
                "name": u["name"],
                "created_at": u["created_at"],
                "has_face_registered": u["matricule"] in embedding_matricules
            }
            for u in pending
        ]
    }


@app.put("/api/users/{matricule}/validate", dependencies=[Depends(require_admin)])
async def validate_account(matricule: str, action: str = Form(...)):
    """
    Valider ou rejeter un compte étudiant (Admin uniquement).
    action: 'validate' ou 'reject'
    """
    user = storage.get_user_by_matricule(matricule)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable"
        )

    if user["role"] == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de modifier le statut d'un administrateur"
        )

    if action == "validate":
        new_status = AccountStatus.VALIDATED
        message = f"Compte de {user['name']} validé avec succès"
    elif action == "reject":
        new_status = AccountStatus.REJECTED
        message = f"Compte de {user['name']} rejeté"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action invalide. Utilisez 'validate' ou 'reject'"
        )

    storage.validate_user(matricule, new_status)

    return {
        "message": message,
        "matricule": matricule,
        "account_status": new_status
    }


# ========== ENREGISTREMENT FACIAL ==========

@app.get("/api/face/status/{matricule}")
async def get_face_status(
    matricule: str,
    current_user: dict = Depends(get_current_user)
):
    """Vérifier si un utilisateur a enregistré son visage (Token complet requis)"""
    embedding = storage.get_embedding_by_matricule(matricule)

    return {
        "matricule": matricule,
        "has_face_registered": embedding is not None
    }


# ========== SURVEILLANCE (TOKEN COMPLET REQUIS) ==========

@app.post("/api/monitoring/start", response_model=dict)
async def start_monitoring(
    session: SessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Démarrer une session de surveillance (Token complet requis)"""
    if current_user["sub"] != session.matricule:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )

    session_id = str(uuid.uuid4())

    session_data = {
        "session_id": session_id,
        "matricule": session.matricule,
        "start_time": datetime.utcnow().isoformat(),
        "end_time": None,
        "attention_scores": [],
        "status": "active"
    }

    active_sessions[session_id] = session_data
    storage.create_session(session_data)

    return {
        "session_id": session_id,
        "message": "Session de surveillance démarrée",
        "start_time": session_data["start_time"]
    }


@app.post("/api/monitoring/analyze-frame")
async def analyze_frame(
    session_id: str = Form(...),
    timestamp: float = Form(...),
    frame: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Analyser une frame en temps réel (Token complet requis)"""
    if session_id not in active_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session introuvable ou expirée"
        )

    try:
        frame_bytes = await frame.read()
        analysis = attention_monitor.analyze_frame_from_bytes(frame_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur lors de la lecture de la frame: {str(e)}"
        )

    if not analysis["face_detected"]:
        return {
            "session_id": session_id,
            "face_detected": False,
            "message": "Aucun visage détecté"
        }

    attention_score = {
        "timestamp": timestamp,
        "attention_level": analysis["attention_level"],
        "eye_aspect_ratio": analysis["ear"],
        "head_pose": analysis["head_pose"],
        "gaze_direction": analysis["gaze_direction"],
        "blink_detected": analysis["blink_detected"]
    }

    active_sessions[session_id]["attention_scores"].append(attention_score)

    return {
        "session_id": session_id,
        "face_detected": True,
        "attention_level": analysis["attention_level"],
        "ear": analysis["ear"],
        "head_pose": analysis["head_pose"],
        "gaze_direction": analysis["gaze_direction"],
        "blink_detected": analysis["blink_detected"],
        "total_blinks": analysis["total_blinks"]
    }


@app.post("/api/monitoring/end")
async def end_monitoring(
    session_end: SessionEnd,
    current_user: dict = Depends(get_current_user)
):
    """Terminer une session de surveillance (Token complet requis)"""
    if session_end.session_id not in active_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session introuvable"
        )

    session = active_sessions[session_end.session_id]
    attention_scores = session["attention_scores"]

    if len(attention_scores) == 0:
        average_attention = 0.0
    else:
        focused_count = sum(
            1 for score in attention_scores
            if score["attention_level"] == "focused"
        )
        average_attention = (focused_count / len(attention_scores)) * 100

    start = datetime.fromisoformat(session["start_time"])
    end = datetime.utcnow()
    duration = (end - start).total_seconds()

    update_data = {
        "end_time": end.isoformat(),
        "attention_scores": attention_scores,
        "average_attention": average_attention,
        "total_duration_seconds": duration,
        "status": "completed"
    }

    storage.update_session(session_end.session_id, update_data)
    del active_sessions[session_end.session_id]

    return {
        "session_id": session_end.session_id,
        "message": "Session terminée",
        "average_attention": average_attention,
        "total_duration_seconds": duration,
        "total_frames": len(attention_scores)
    }


@app.get("/api/monitoring/sessions/{matricule}")
async def get_user_sessions(
    matricule: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupérer toutes les sessions d'un utilisateur (Token complet requis)"""
    if current_user["role"] != "admin" and current_user["sub"] != matricule:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )

    sessions = storage.get_sessions_by_matricule(matricule)

    return {
        "matricule": matricule,
        "total_sessions": len(sessions),
        "sessions": sessions
    }


# ========== DASHBOARDS ==========

@app.get("/api/dashboard/student/{matricule}")
async def get_student_dashboard(
    matricule: str,
    current_user: dict = Depends(get_current_user)
):
    """Dashboard étudiant avec statistiques personnelles (Étudiant lui-même ou Admin)"""
    if current_user["role"] != "admin" and current_user["sub"] != matricule:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé"
        )

    user = storage.get_user_by_matricule(matricule)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable"
        )

    sessions = storage.get_sessions_by_matricule(matricule)
    completed_sessions = [s for s in sessions if s.get("status") == "completed"]

    if len(completed_sessions) == 0:
        return {
            "matricule": matricule,
            "name": user["name"],
            "total_sessions": 0,
            "total_hours": 0.0,
            "average_attention": 0.0,
            "best_session": None,
            "worst_session": None,
            "recent_sessions": []
        }

    total_hours = sum(s.get("total_duration_seconds", 0) for s in completed_sessions) / 3600
    average_attention = sum(s.get("average_attention", 0) for s in completed_sessions) / len(completed_sessions)

    best_session = max(completed_sessions, key=lambda s: s.get("average_attention", 0))
    worst_session = min(completed_sessions, key=lambda s: s.get("average_attention", 0))

    recent_sessions = sorted(
        completed_sessions,
        key=lambda s: s.get("start_time", ""),
        reverse=True
    )[:5]

    return {
        "matricule": matricule,
        "name": user["name"],
        "total_sessions": len(completed_sessions),
        "total_hours": round(total_hours, 2),
        "average_attention": round(average_attention, 2),
        "best_session": {
            "session_id": best_session["session_id"],
            "date": best_session["start_time"],
            "attention": best_session.get("average_attention", 0),
            "duration_minutes": round(best_session.get("total_duration_seconds", 0) / 60, 2)
        },
        "worst_session": {
            "session_id": worst_session["session_id"],
            "date": worst_session["start_time"],
            "attention": worst_session.get("average_attention", 0),
            "duration_minutes": round(worst_session.get("total_duration_seconds", 0) / 60, 2)
        },
        "recent_sessions": [
            {
                "session_id": s["session_id"],
                "date": s["start_time"],
                "attention": s.get("average_attention", 0),
                "duration_minutes": round(s.get("total_duration_seconds", 0) / 60, 2)
            }
            for s in recent_sessions
        ]
    }


@app.get("/api/dashboard/admin", dependencies=[Depends(require_admin)])
async def get_admin_dashboard():
    """Dashboard admin avec vue d'ensemble du système (Admin uniquement)"""
    users = storage.get_all_users()
    embeddings = storage.get_all_embeddings()
    all_sessions = storage.get_all_sessions()

    students = [u for u in users if u["role"] == "student"]
    embedding_matricules = {e["matricule"] for e in embeddings}

    students_without_face = [
        {
            "matricule": s["matricule"],
            "name": s["name"],
            "created_at": s["created_at"]
        }
        for s in students
        if s["matricule"] not in embedding_matricules
    ]

    pending_count = len([u for u in students if u.get("account_status") == "pending"])
    completed_sessions = [s for s in all_sessions if s.get("status") == "completed"]

    if len(completed_sessions) == 0:
        return {
            "total_students": len(students),
            "pending_accounts": pending_count,
            "total_sessions": 0,
            "total_hours": 0.0,
            "average_attention_global": 0.0,
            "students_without_face": students_without_face,
            "top_students": [],
            "recent_activity": []
        }

    total_hours = sum(s.get("total_duration_seconds", 0) for s in completed_sessions) / 3600
    average_attention_global = sum(s.get("average_attention", 0) for s in completed_sessions) / len(completed_sessions)

    student_stats = {}
    for session in completed_sessions:
        matricule = session["matricule"]
        if matricule not in student_stats:
            student_stats[matricule] = {"total_attention": 0, "session_count": 0}
        student_stats[matricule]["total_attention"] += session.get("average_attention", 0)
        student_stats[matricule]["session_count"] += 1

    top_students_data = []
    for matricule, stats in student_stats.items():
        user = storage.get_user_by_matricule(matricule)
        if user and user["role"] == "student":
            avg_attention = stats["total_attention"] / stats["session_count"]
            top_students_data.append({
                "matricule": matricule,
                "name": user["name"],
                "average_attention": round(avg_attention, 2),
                "total_sessions": stats["session_count"]
            })

    top_students = sorted(top_students_data, key=lambda x: x["average_attention"], reverse=True)[:10]

    recent_activity = sorted(
        completed_sessions,
        key=lambda s: s.get("start_time", ""),
        reverse=True
    )[:10]

    recent_activity_formatted = []
    for session in recent_activity:
        user = storage.get_user_by_matricule(session["matricule"])
        recent_activity_formatted.append({
            "session_id": session["session_id"],
            "matricule": session["matricule"],
            "name": user["name"] if user else "Inconnu",
            "date": session["start_time"],
            "attention": session.get("average_attention", 0),
            "duration_minutes": round(session.get("total_duration_seconds", 0) / 60, 2)
        })

    return {
        "total_students": len(students),
        "pending_accounts": pending_count,
        "total_sessions": len(completed_sessions),
        "total_hours": round(total_hours, 2),
        "average_attention_global": round(average_attention_global, 2),
        "students_without_face": students_without_face,
        "top_students": top_students,
        "recent_activity": recent_activity_formatted
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)