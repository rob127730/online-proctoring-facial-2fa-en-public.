# Online Proctoring with Facial 2FA

Online exam proctoring system combining **facial-recognition two-factor authentication** and **real-time attention monitoring**. Students log in with a password, then verify their identity with their face; during the exam, the webcam stream is analysed to detect loss of attention.

> Projet de veille technologique — ESMT / INGC-India, Dakar.

## Features

- **Facial 2FA**: password login followed by face verification (RetinaFace detection + ArcFace embeddings via InsightFace, cosine-similarity threshold).
- **Attention monitoring**: MediaPipe Face Mesh (eye aspect ratio, blinks, iris/gaze) to score the student's attention frame by frame.
- **Student space**: dashboard, live monitoring session with webcam, session history.
- **Admin space**: dashboard, user management, validation of pending registrations, face update.
- **Secure API**: JWT authentication, hashed passwords (bcrypt), role-based access (admin / student).

## Architecture

```
survaillance_en_ligne_project/   Backend, FastAPI (Python)
  main.py               REST API (auth, users, monitoring, dashboards)
  face_recognition.py   Face detection + embeddings (InsightFace)
  attention_monitor.py  Attention analysis (MediaPipe)
  auth.py, models.py, storage.py, create_admin.py
surveillance-frontend/           Frontend, Next.js + Tailwind
  pages/                login, register, admin/*, student/*
Robert_Dakoiuo(surveillance_en_ligne).pptx   Presentation slides
```

Main endpoints: `POST /api/auth/login`, `POST /api/auth/face-verify`, `POST /api/monitoring/start`, `POST /api/monitoring/analyze-frame`, `POST /api/monitoring/end`, `GET /api/dashboard/admin`, `GET /api/dashboard/student/{matricule}`.

## Tech stack

Python · FastAPI · InsightFace (RetinaFace + ArcFace) · MediaPipe · OpenCV · ONNX Runtime · JWT/bcrypt · Next.js 14 · React · Tailwind CSS · Recharts

## Getting started

**Backend**
```bash
cd survaillance_en_ligne_project
python -m venv venv && venv\Scripts\activate     # Python 3.11
pip install -r requirements.txt
python create_admin.py        # create the first admin
uvicorn main:app --reload     # http://localhost:8000/docs
```
Create a `.env` file (not committed) with your secret key, e.g. `SECRET_KEY=...` and optionally `COSINE_THRESHOLD=0.6`.

**Frontend**
```bash
cd surveillance-frontend
npm install
npm run dev                   # http://localhost:3000
```

## Privacy

Face data is sensitive: no biometric data or personal images are stored in this repository (`data/` is git-ignored).

## Author

Robert Dakouo — Data & AI engineering student · [GitHub](https://github.com/rob127730)
