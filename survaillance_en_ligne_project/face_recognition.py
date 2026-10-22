import cv2
import numpy as np
from insightface.app import FaceAnalysis
import base64
from typing import Optional, Tuple
import os
from dotenv import load_dotenv

load_dotenv()

COSINE_THRESHOLD = float(os.getenv("COSINE_THRESHOLD", "0.6"))

class FaceRecognitionSystem:
    def __init__(self):
        print("🔄 Initialisation du système de reconnaissance faciale...")
        # InsightFace inclut déjà RetinaFace pour la détection ET ArcFace pour les embeddings
        self.face_app = FaceAnalysis(
            providers=['CPUExecutionProvider'],
            allowed_modules=['detection', 'recognition']  # Detection = RetinaFace, Recognition = ArcFace
        )
        self.face_app.prepare(ctx_id=0, det_size=(640, 640))
        print("✅ Système de reconnaissance faciale initialisé (RetinaFace + ArcFace)")
    
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
    
    def detect_and_extract_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Détecte le visage avec RetinaFace (inclus dans InsightFace)
        ET extrait l'embedding avec ArcFace en une seule opération
        """
        if image is None:
            return None
        
        try:
            faces = self.face_app.get(image)
            
            if len(faces) == 0:
                return None
            
            # Prendre le visage le plus grand (plus proche de la caméra)
            face = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
            embedding = face.embedding
            
            # Normaliser l'embedding
            embedding = embedding / np.linalg.norm(embedding)
            
            return embedding
        except Exception as e:
            print(f"❌ Erreur extraction embedding: {e}")
            return None
    
    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calcule la similarité cosinus entre deux embeddings"""
        return float(np.dot(embedding1, embedding2))
    
    def verify_face(self, image_base64: str, stored_embedding: list) -> Tuple[bool, float]:
        """
        Vérifie si le visage correspond à l'embedding stocké
        Returns: (match, similarity_score)
        """
        # Convertir l'image
        image = self.base64_to_image(image_base64)
        
        if image is None:
            return False, 0.0
        
        # Détecter et extraire l'embedding
        embedding = self.detect_and_extract_embedding(image)
        
        if embedding is None:
            return False, 0.0
        
        # Comparer avec l'embedding stocké
        stored_embedding_np = np.array(stored_embedding)
        similarity = self.cosine_similarity(embedding, stored_embedding_np)
        
        match = similarity >= COSINE_THRESHOLD
        
        return match, float(similarity)
    
    def verify_face_from_bytes(self, image_bytes: bytes, stored_embedding: list) -> Tuple[bool, float]:
        """
        Vérifie si le visage correspond à l'embedding stocké (depuis bytes)
        Returns: (match, similarity_score)
        """
        # Convertir l'image
        image = self.bytes_to_image(image_bytes)
        
        if image is None:
            return False, 0.0
        
        # Détecter et extraire l'embedding
        embedding = self.detect_and_extract_embedding(image)
        
        if embedding is None:
            return False, 0.0
        
        # Comparer avec l'embedding stocké
        stored_embedding_np = np.array(stored_embedding)
        similarity = self.cosine_similarity(embedding, stored_embedding_np)
        
        match = similarity >= COSINE_THRESHOLD
        
        return match, float(similarity)
    
    def register_face(self, image_base64: str) -> Optional[list]:
        """
        Enregistre un nouveau visage et retourne son embedding
        Returns: embedding en liste ou None si échec
        """
        # Convertir l'image
        image = self.base64_to_image(image_base64)
        
        if image is None:
            return None
        
        # Détecter et extraire l'embedding
        embedding = self.detect_and_extract_embedding(image)
        
        if embedding is None:
            return None
        
        return embedding.tolist()
    
    def register_face_from_bytes(self, image_bytes: bytes) -> Optional[list]:
        """
        Enregistre un nouveau visage depuis des bytes et retourne son embedding
        Returns: embedding en liste ou None si échec
        """
        # Convertir l'image
        image = self.bytes_to_image(image_bytes)
        
        if image is None:
            return None
        
        # Détecter et extraire l'embedding
        embedding = self.detect_and_extract_embedding(image)
        
        if embedding is None:
            return None
        
        return embedding.tolist()

# Instance globale
face_system = FaceRecognitionSystem()