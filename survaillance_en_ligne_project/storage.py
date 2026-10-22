import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

class Storage:
    def __init__(self):
        self.data_dir = "data"
        self.users_file = os.path.join(self.data_dir, "users.json")
        self.embeddings_file = os.path.join(self.data_dir, "embeddings.json")
        self.sessions_file = os.path.join(self.data_dir, "sessions.json")
        self._ensure_data_dir()
        self._init_files()
    
    def _ensure_data_dir(self):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
    
    def _init_files(self):
        """Initialise les fichiers JSON s'ils n'existent pas"""
        if not os.path.exists(self.users_file):
            self._write_json(self.users_file, [])
        if not os.path.exists(self.embeddings_file):
            self._write_json(self.embeddings_file, [])
        if not os.path.exists(self.sessions_file):
            self._write_json(self.sessions_file, [])
    
    def _read_json(self, filepath: str) -> List[Dict]:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def _write_json(self, filepath: str, data: List[Dict]):
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    
    # USERS
    def get_all_users(self) -> List[Dict]:
        return self._read_json(self.users_file)
    
    def get_user_by_matricule(self, matricule: str) -> Optional[Dict]:
        users = self.get_all_users()
        return next((u for u in users if u['matricule'] == matricule), None)
    
    def create_user(self, user_data: Dict) -> Dict:
        users = self.get_all_users()
        user_data['created_at'] = datetime.utcnow().isoformat()
        users.append(user_data)
        self._write_json(self.users_file, users)
        return user_data
    
    def delete_user(self, matricule: str) -> bool:
        users = self.get_all_users()
        filtered = [u for u in users if u['matricule'] != matricule]
        if len(filtered) < len(users):
            self._write_json(self.users_file, filtered)
            # Supprimer aussi l'embedding
            self.delete_embedding(matricule)
            return True
        return False
    
    def update_user(self, matricule: str, update_data: Dict):
        """Mettre à jour les données d'un utilisateur"""
        users = self.get_all_users()
        for user in users:
            if user['matricule'] == matricule:
                user.update(update_data)
                user['updated_at'] = datetime.utcnow().isoformat()
                break
        self._write_json(self.users_file, users)
    
    def get_pending_users(self) -> List[Dict]:
        """Récupérer tous les comptes étudiants en attente de validation"""
        users = self.get_all_users()
        return [u for u in users if u.get('account_status') == 'pending']
    
    def validate_user(self, matricule: str, status: str) -> bool:
        """Valider ou rejeter un compte étudiant (status: 'validated' ou 'rejected')"""
        users = self.get_all_users()
        found = False
        for user in users:
            if user['matricule'] == matricule:
                user['account_status'] = status
                user['validated_at'] = datetime.utcnow().isoformat()
                found = True
                break
        if found:
            self._write_json(self.users_file, users)
        return found
    
    # EMBEDDINGS
    def get_all_embeddings(self) -> List[Dict]:
        return self._read_json(self.embeddings_file)
    
    def get_embedding_by_matricule(self, matricule: str) -> Optional[Dict]:
        embeddings = self.get_all_embeddings()
        return next((e for e in embeddings if e['matricule'] == matricule), None)
    
    def save_embedding(self, matricule: str, embedding: List[float]):
        embeddings = self.get_all_embeddings()
        # Supprimer l'ancien s'il existe
        embeddings = [e for e in embeddings if e['matricule'] != matricule]
        embeddings.append({
            'matricule': matricule,
            'embedding': embedding,
            'created_at': datetime.utcnow().isoformat()
        })
        self._write_json(self.embeddings_file, embeddings)
    
    def delete_embedding(self, matricule: str):
        embeddings = self.get_all_embeddings()
        filtered = [e for e in embeddings if e['matricule'] != matricule]
        self._write_json(self.embeddings_file, filtered)
    
    # SESSIONS
    def get_all_sessions(self) -> List[Dict]:
        return self._read_json(self.sessions_file)
    
    def get_sessions_by_matricule(self, matricule: str) -> List[Dict]:
        sessions = self.get_all_sessions()
        return [s for s in sessions if s['matricule'] == matricule]
    
    def create_session(self, session_data: Dict) -> Dict:
        sessions = self.get_all_sessions()
        session_data['created_at'] = datetime.utcnow().isoformat()
        sessions.append(session_data)
        self._write_json(self.sessions_file, sessions)
        return session_data
    
    def update_session(self, session_id: str, update_data: Dict):
        sessions = self.get_all_sessions()
        for s in sessions:
            if s['session_id'] == session_id:
                s.update(update_data)
                s['updated_at'] = datetime.utcnow().isoformat()
                break
        self._write_json(self.sessions_file, sessions)

# Instance globale
storage = Storage()