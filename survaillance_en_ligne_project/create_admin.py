#!/usr/bin/env python
"""
Script pour créer un administrateur avec enregistrement facial obligatoire
Usage: python create_admin.py
"""

import sys
import cv2
import numpy as np
from pathlib import Path

# Importer les modules du projet
from storage import storage
from auth import hash_password
from face_recognition import face_system
from models import Role

def capture_from_webcam():
    """Capturer une photo depuis la webcam"""
    print("\n📸 Ouverture de la webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Impossible d'ouvrir la webcam")
        return None
    
    print("👀 Regardez la caméra et appuyez sur ESPACE pour prendre la photo")
    print("   Appuyez sur ESC pour annuler")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Afficher les instructions
        cv2.putText(frame, "ESPACE = Capturer | ESC = Annuler", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        cv2.imshow('Capture Admin - Appuyez sur ESPACE', frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == 27:  # ESC
            print("\n❌ Capture annulée")
            cap.release()
            cv2.destroyAllWindows()
            return None
        
        elif key == 32:  # ESPACE
            cap.release()
            cv2.destroyAllWindows()
            return frame
    
    cap.release()
    cv2.destroyAllWindows()
    return None

def load_from_file(filepath):
    """Charger une image depuis un fichier"""
    if not Path(filepath).exists():
        print(f"❌ Fichier introuvable: {filepath}")
        return None
    
    image = cv2.imread(filepath)
    if image is None:
        print(f"❌ Impossible de lire l'image: {filepath}")
        return None
    
    return image

def main():
    print("=" * 60)
    print("🔐 CRÉATION D'UN ADMINISTRATEUR")
    print("=" * 60)
    
    # Vérifier si un admin existe déjà
    users = storage.get_all_users()
    if len(users) > 0:
        print("\n⚠️  Des utilisateurs existent déjà dans le système.")
        confirm = input("Voulez-vous quand même créer un nouvel admin ? (oui/non): ")
        if confirm.lower() not in ['oui', 'o', 'yes', 'y']:
            print("❌ Opération annulée")
            sys.exit(0)
    
    # Collecter les informations
    print("\n📝 Informations de l'administrateur:")
    matricule = input("Matricule: ").strip()
    
    if not matricule:
        print("❌ Le matricule ne peut pas être vide")
        sys.exit(1)
    
    # Vérifier si le matricule existe
    existing = storage.get_user_by_matricule(matricule)
    if existing:
        print(f"❌ Un utilisateur avec le matricule '{matricule}' existe déjà")
        sys.exit(1)
    
    name = input("Nom complet: ").strip()
    if not name:
        print("❌ Le nom ne peut pas être vide")
        sys.exit(1)
    
    import getpass
    password = getpass.getpass("Mot de passe: ")
    password_confirm = getpass.getpass("Confirmer le mot de passe: ")
    
    if password != password_confirm:
        print("❌ Les mots de passe ne correspondent pas")
        sys.exit(1)
    
    if len(password) < 6:
        print("❌ Le mot de passe doit contenir au moins 6 caractères")
        sys.exit(1)
    
    # Capture du visage
    print("\n" + "=" * 60)
    print("👤 ENREGISTREMENT FACIAL (OBLIGATOIRE)")
    print("=" * 60)
    print("\nChoisissez une méthode:")
    print("1. Capturer depuis la webcam")
    print("2. Charger depuis un fichier")
    
    choice = input("\nVotre choix (1 ou 2): ").strip()
    
    image = None
    
    if choice == "1":
        image = capture_from_webcam()
    
    elif choice == "2":
        filepath = input("Chemin du fichier image: ").strip()
        image = load_from_file(filepath)
    
    else:
        print("❌ Choix invalide")
        sys.exit(1)
    
    if image is None:
        print("❌ Impossible de capturer/charger l'image")
        sys.exit(1)
    
    # Extraire l'embedding
    print("\n🔍 Détection du visage...")
    embedding = face_system.detect_and_extract_embedding(image)
    
    if embedding is None:
        print("❌ Aucun visage détecté dans l'image")
        print("   Assurez-vous que:")
        print("   - Votre visage est bien visible")
        print("   - L'éclairage est suffisant")
        print("   - Vous regardez la caméra")
        sys.exit(1)
    
    print("✅ Visage détecté avec succès!")
    
    # Créer l'admin
    print("\n💾 Création de l'administrateur...")
    
    admin_data = {
        "matricule": matricule,
        "password": hash_password(password),
        "name": name,
        "role": Role.ADMIN
    }
    
    storage.create_user(admin_data)
    storage.save_embedding(matricule, embedding.tolist())
    
    print("\n" + "=" * 60)
    print("✅ ADMINISTRATEUR CRÉÉ AVEC SUCCÈS!")
    print("=" * 60)
    print(f"\nMatricule: {matricule}")
    print(f"Nom: {name}")
    print(f"Rôle: admin")
    print(f"Visage enregistré: ✅ Oui")
    print("\n🚀 Vous pouvez maintenant vous connecter avec:")
    print(f"   1. POST /api/auth/login")
    print(f"   2. POST /api/auth/face-verify")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Opération annulée par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)