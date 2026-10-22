# 🎨 Frontend Next.js - Système de Surveillance

Interface web complète pour le système de surveillance en ligne avec authentification 2FA faciale.

## 📋 Structure du projet

```
frontend/
├── pages/
│   ├── _app.js                    # Configuration Next.js
│   ├── index.js                   # Redirection
│   ├── login.js                   # Connexion 2FA
│   ├── setup.js                   # Setup premier admin
│   ├── admin/
│   │   ├── dashboard.js           # Dashboard admin
│   │   └── users.js               # Gestion utilisateurs
│   └── student/
│       ├── dashboard.js           # Dashboard étudiant
│       └── monitoring.js          # Surveillance temps réel
├── components/
│   └── Layout.jsx                 # Layout avec navigation
├── lib/
│   ├── api.js                     # Client API
│   └── auth.js                    # Gestion authentification
├── styles/
│   └── globals.css                # Styles globaux
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── next.config.js
└── .env.local                     # Configuration
```

## 📦 Installation

### 1. Installer Node.js
Assurez-vous d'avoir Node.js 18+ installé.

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
Créer `.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```

Le frontend sera accessible sur **http://localhost:3000**

## 🎯 Fonctionnalités

### 🔐 Authentification
- **Login 2FA** : Mot de passe + reconnaissance faciale
- **Setup initial** : Création du premier admin avec visage
- **Tokens JWT** : Gestion automatique des tokens

### 👨‍💼 Interface Admin
- **Dashboard** : Vue d'ensemble (stats, top étudiants, activité récente)
- **Gestion utilisateurs** :
  - Créer utilisateur avec photo obligatoire
  - Modifier nom/mot de passe
  - Mettre à jour le visage
  - Supprimer utilisateur
- **Navigation** : Sidebar avec menu responsive

### 🎓 Interface Étudiant
- **Dashboard** : Statistiques personnelles avec graphiques
  - Sessions totales
  - Heures de surveillance
  - Attention moyenne
  - Évolution graphique
  - Meilleure/pire session
  - Historique des 5 dernières sessions
- **Surveillance temps réel** :
  - Webcam en direct
  - Analyse toutes les 2 secondes
  - Affichage du statut en temps réel (concentré/distrait/somnolent)
  - Métriques live (EAR, clignements, etc.)
  - Statistiques cumulées
  - Timer de session

## 🎨 Design

### Palette de couleurs
- **Fond** : Noir profond (#0a0a0a, #121212)
- **Éléments** : Gris foncé (#1a1a1a, #242424)
- **Accents** : Bleu foncé (#0f172a, #1e293b)
- **Success** : Vert sombre
- **Warning** : Jaune/Orange
- **Error** : Rouge sombre

### Composants
- Design sombre et sobre
- Bordures subtiles
- Animations fluides
- Responsive (mobile, tablet, desktop)
- Icons Lucide React

## 📡 Routes Frontend

| Route | Accès | Description |
|-------|-------|-------------|
| `/` | Public | Redirection automatique |
| `/login` | Public | Connexion 2FA |
| `/setup` | Public | Setup premier admin |
| `/admin/dashboard` | Admin | Dashboard admin |
| `/admin/users` | Admin | Gestion utilisateurs |
| `/student/dashboard` | Student | Dashboard étudiant |
| `/student/monitoring` | Student | Surveillance temps réel |

## 🔒 Sécurité

### Protection des routes
- Vérification token dans `useEffect`
- Redirection automatique si non authentifié
- Contrôle des rôles (admin vs student)

### Gestion des tokens
- Stockage dans `localStorage`
- Ajout automatique dans les headers (axios interceptor)
- Logout = suppression de tous les tokens

## 🚀 Utilisation

### Première utilisation
1. Backend démarré sur `http://localhost:8000`
2. Accéder à `http://localhost:3000`
3. Redirection vers `/setup` (si aucun utilisateur)
4. Créer le premier admin avec photo
5. Se connecter avec login 2FA

### En tant qu'Admin
1. **Login** avec matricule + password
2. **Vérification faciale**
3. Accès au dashboard admin
4. Créer des étudiants avec leurs photos
5. Gérer les utilisateurs

### En tant qu'Étudiant
1. **Login** avec matricule + password
2. **Vérification faciale**
3. Accès au dashboard personnel
4. Voir ses statistiques
5. Démarrer une session de surveillance :
   - Cliquer sur "Démarrer une session"
   - Webcam activée
   - Analyse temps réel toutes les 2 secondes
   - Affichage du statut actuel
   - Statistiques mises à jour en direct
   - Cliquer sur "Terminer" pour finir

## 🎥 Surveillance temps réel

### Fonctionnement
1. Click "Démarrer la session" → Appel API `/api/monitoring/start`
2. Capture automatique toutes les 2 secondes via webcam
3. Envoi frame → API `/api/monitoring/analyze-frame`
4. Réception analyse en temps réel :
   - Niveau d'attention (focused/distracted/drowsy/eyes_closed)
   - EAR (Eye Aspect Ratio)
   - Head pose (pitch, yaw, roll)
   - Gaze direction
   - Clignements
5. Affichage immédiat des résultats
6. Click "Terminer" → Appel API `/api/monitoring/end`
7. Redirection vers dashboard avec résumé

### Métriques affichées
- **Temps réel** :
  - Statut actuel (avec couleur)
  - EAR courant
  - Nombre de clignements total
  - Pourcentage d'attention actuel
- **Statistiques cumulées** :
  - Frames analysées
  - Frames concentré/distrait/somnolent/yeux fermés
  - Timer de durée

## 📊 Graphiques et Visualisations

### Dashboard Étudiant
- **Graphique d'évolution** : Line chart (Recharts)
  - Attention par session (5 dernières)
  - Tendance visible
- **Cards statistiques** : Total sessions, heures, attention moyenne
- **Meilleure/pire session** : Cards avec détails

### Dashboard Admin
- **Cards statistiques** : Total étudiants, sessions, heures, attention globale
- **Top 10 étudiants** : Classement avec emojis
- **Activité récente** : Timeline des dernières sessions
- **Alertes** : Étudiants sans visage

## 🛠️ Technologies utilisées

- **Next.js 14** : Framework React
- **React 18** : Library UI
- **Tailwind CSS 3** : Styling
- **Axios** : Requêtes HTTP
- **react-webcam** : Capture webcam
- **Recharts** : Graphiques
- **Lucide React** : Icons
- **date-fns** : Formatage dates

## 🧪 Tests manuels

### Test complet du flux
1. **Setup** : Créer admin via `/setup`
2. **Login Admin** : Tester 2FA
3. **Créer étudiant** : Via `/admin/users`
4. **Login Étudiant** : Tester 2FA
5. **Session surveillance** : Démarrer + analyser + terminer
6. **Vérifier dashboard** : Voir statistiques

## 📝 Scripts disponibles

```bash
# Développement
npm run dev

# Build production
npm run build

# Lancer production
npm start

# Lint
npm run lint
```

## 🐛 Résolution de problèmes

### Erreur CORS
Vérifier que le backend autorise `http://localhost:3000` dans CORS.

### Webcam ne s'affiche pas
- Autoriser l'accès caméra dans le navigateur
- HTTPS requis en production (localhost OK en dev)

### Token expiré
- Se reconnecter
- Vérifier durée token backend (24h)

### Images ne s'envoient pas
- Vérifier format (JPEG/PNG)
- Taille max : 5MB
- Format base64 → Blob → File

## 🚀 Déploiement

### Production
1. Build : `npm run build`
2. Déployer sur Vercel/Netlify
3. Configurer variables d'environnement
4. HTTPS obligatoire pour webcam

### Variables d'environnement production
```env
NEXT_PUBLIC_API_URL=https://votre-backend.com
```

## 📞 Support

Pour toute question :
- Vérifier les logs navigateur (F12)
- Vérifier les logs backend
- Tester avec curl les endpoints API

---

**Frontend 100% fonctionnel avec surveillance temps réel ! 🎉**