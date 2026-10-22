import cv2
import numpy as np
import mediapipe as mp
import base64
from typing import Dict, Optional
from models import AttentionLevel

class AttentionMonitor:
    def __init__(self):
        print("🔄 Initialisation du système de surveillance...")
        
        # MediaPipe Face Mesh pour détection détaillée
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        # Indices des landmarks pour les yeux
        self.LEFT_EYE = [362, 385, 387, 263, 373, 380]
        self.RIGHT_EYE = [33, 160, 158, 133, 153, 144]
        
        # Indices pour l'iris
        self.LEFT_IRIS = [474, 475, 476, 477]
        self.RIGHT_IRIS = [469, 470, 471, 472]
        
        # Seuils
        self.EAR_THRESHOLD = 0.21  # Eye Aspect Ratio pour détecter fermeture yeux
        self.BLINK_FRAMES = 3
        self.blink_counter = 0
        self.total_blinks = 0
        
        print("✅ Système de surveillance initialisé")
    
    def base64_to_image(self, base64_string: str) -> Optional[np.ndarray]:
        """Convertit une image base64 en array numpy"""
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        try:
            img_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"❌ Erreur décodage image base64: {e}")
            return None
    
    def bytes_to_image(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """Convertit des bytes d'image en array numpy"""
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"❌ Erreur décodage image bytes: {e}")
            return None
    
    def calculate_ear(self, eye_landmarks: np.ndarray) -> float:
        """Calcule l'Eye Aspect Ratio"""
        # Distances verticales
        A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        # Distance horizontale
        C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        
        ear = (A + B) / (2.0 * C)
        return ear
    
    def get_head_pose(self, landmarks, image_shape: tuple) -> Dict[str, float]:
        """Calcule la pose de la tête (pitch, yaw, roll)"""
        img_h, img_w = image_shape[:2]
        
        # Points de référence du visage
        face_2d = []
        face_3d = []
        
        # Sélection de points clés
        key_points = [1, 33, 263, 61, 291, 199]
        
        for idx in key_points:
            lm = landmarks[idx]
            x, y = int(lm.x * img_w), int(lm.y * img_h)
            face_2d.append([x, y])
            face_3d.append([x, y, lm.z])
        
        face_2d = np.array(face_2d, dtype=np.float64)
        face_3d = np.array(face_3d, dtype=np.float64)
        
        # Matrice de la caméra
        focal_length = img_w
        cam_matrix = np.array([
            [focal_length, 0, img_w / 2],
            [0, focal_length, img_h / 2],
            [0, 0, 1]
        ])
        
        dist_matrix = np.zeros((4, 1), dtype=np.float64)
        
        # Résolution PnP
        success, rot_vec, trans_vec = cv2.solvePnP(
            face_3d, face_2d, cam_matrix, dist_matrix
        )
        
        # Conversion en angles
        rmat, _ = cv2.Rodrigues(rot_vec)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
        
        pitch = angles[0] * 360
        yaw = angles[1] * 360
        roll = angles[2] * 360
        
        return {
            "pitch": float(pitch),
            "yaw": float(yaw),
            "roll": float(roll)
        }
    
    def get_gaze_direction(self, landmarks, image_shape: tuple) -> Dict[str, float]:
        """Calcule la direction du regard via l'iris"""
        img_h, img_w = image_shape[:2]
        
        # Centre de l'œil gauche
        left_eye_center = np.mean([
            [landmarks[idx].x * img_w, landmarks[idx].y * img_h]
            for idx in self.LEFT_EYE
        ], axis=0)
        
        # Centre de l'iris gauche
        left_iris_center = np.mean([
            [landmarks[idx].x * img_w, landmarks[idx].y * img_h]
            for idx in self.LEFT_IRIS
        ], axis=0)
        
        # Calculer le déplacement
        gaze_x = (left_iris_center[0] - left_eye_center[0]) / img_w
        gaze_y = (left_iris_center[1] - left_eye_center[1]) / img_h
        
        return {
            "horizontal": float(gaze_x),
            "vertical": float(gaze_y)
        }
    
    def determine_attention_level(
        self, 
        ear: float, 
        head_pose: Dict[str, float], 
        gaze: Dict[str, float]
    ) -> AttentionLevel:
        """Détermine le niveau d'attention basé sur les métriques"""
        
        # Yeux fermés
        if ear < self.EAR_THRESHOLD:
            return AttentionLevel.EYES_CLOSED
        
        # Vérifier la position de la tête
        pitch, yaw = abs(head_pose["pitch"]), abs(head_pose["yaw"])
        
        # Tête trop inclinée = distrait
        if pitch > 20 or yaw > 25:
            return AttentionLevel.DISTRACTED
        
        # Vérifier le regard
        gaze_horizontal = abs(gaze["horizontal"])
        gaze_vertical = abs(gaze["vertical"])
        
        # Regard trop dévié = distrait
        if gaze_horizontal > 0.15 or gaze_vertical > 0.15:
            return AttentionLevel.DISTRACTED
        
        # Somnolent si yeux presque fermés
        if ear < 0.25:
            return AttentionLevel.DROWSY
        
        # Sinon concentré
        return AttentionLevel.FOCUSED
    
    def analyze_frame(self, image_base64: str) -> Dict:
        """
        Analyse une frame et retourne les métriques d'attention
        """
        # Convertir l'image
        image = self.base64_to_image(image_base64)
        
        if image is None:
            return {
                "face_detected": False,
                "attention_level": AttentionLevel.DISTRACTED,
                "ear": 0.0,
                "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
                "gaze_direction": {"horizontal": 0.0, "vertical": 0.0},
                "blink_detected": False
            }
        
        return self._process_image(image)
    
    def analyze_frame_from_bytes(self, image_bytes: bytes) -> Dict:
        """
        Analyse une frame depuis des bytes et retourne les métriques d'attention
        """
        # Convertir l'image
        image = self.bytes_to_image(image_bytes)
        
        if image is None:
            return {
                "face_detected": False,
                "attention_level": AttentionLevel.DISTRACTED,
                "ear": 0.0,
                "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
                "gaze_direction": {"horizontal": 0.0, "vertical": 0.0},
                "blink_detected": False
            }
        
        return self._process_image(image)
    
    def _process_image(self, image: np.ndarray) -> Dict:
        """Traite l'image et retourne les métriques d'attention"""
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Détecter les landmarks du visage
        results = self.face_mesh.process(image_rgb)
        
        if not results.multi_face_landmarks:
            return {
                "face_detected": False,
                "attention_level": AttentionLevel.DISTRACTED,
                "ear": 0.0,
                "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
                "gaze_direction": {"horizontal": 0.0, "vertical": 0.0},
                "blink_detected": False
            }
        
        face_landmarks = results.multi_face_landmarks[0]
        landmarks = face_landmarks.landmark
        
        # Extraire les coordonnées des yeux
        left_eye = np.array([
            [landmarks[idx].x, landmarks[idx].y]
            for idx in self.LEFT_EYE
        ])
        
        right_eye = np.array([
            [landmarks[idx].x, landmarks[idx].y]
            for idx in self.RIGHT_EYE
        ])
        
        # Calculer EAR
        left_ear = self.calculate_ear(left_eye)
        right_ear = self.calculate_ear(right_eye)
        ear = (left_ear + right_ear) / 2.0
        
        # Détecter clignement
        blink_detected = False
        if ear < self.EAR_THRESHOLD:
            self.blink_counter += 1
        else:
            if self.blink_counter >= self.BLINK_FRAMES:
                self.total_blinks += 1
                blink_detected = True
            self.blink_counter = 0
        
        # Calculer pose de la tête
        head_pose = self.get_head_pose(landmarks, image.shape)
        
        # Calculer direction du regard
        gaze_direction = self.get_gaze_direction(landmarks, image.shape)
        
        # Déterminer niveau d'attention
        attention_level = self.determine_attention_level(ear, head_pose, gaze_direction)
        
        return {
            "face_detected": True,
            "attention_level": attention_level,
            "ear": float(ear),
            "head_pose": head_pose,
            "gaze_direction": gaze_direction,
            "blink_detected": blink_detected,
            "total_blinks": self.total_blinks
        }

# Instance globale
attention_monitor = AttentionMonitor()