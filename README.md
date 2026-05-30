# Sana

Application de gestion d’envois, de sacs et de colis avec suivi QR code.

## Architecture

- `backend/` : API Node.js + Express + Sequelize + SQLite
- `frontend/` : application React + Vite + Tailwind + React Query

## Installation

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Modifier `.env` avec vos informations :

- `PORT` : port du serveur backend (par défaut `3000`)
- `JWT_SECRET` : clé secrète JWT
- `JWT_EXPIRES_IN` : durée de validité du token (ex. `7d`)
- `GMAIL_USER` : adresse email utilisée pour l’envoi
- `GMAIL_APP_PASS` : mot de passe applicatif SMTP
- `APP_URL` : URL du frontend (`http://localhost:5173` par défaut)

Démarrage :

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

L’application frontend utilise une configuration de proxy pour rediriger `/api` et `/qrcodes` vers `http://localhost:3000`.

## Scripts utiles

### Backend

- `npm run dev` : démarre le serveur avec nodemon
- `npm start` : démarre le serveur en production

### Frontend

- `npm run dev` : démarre Vite en mode développement
- `npm run build` : génère le build de production
- `npm run preview` : prévisualise le build
- `npm run lint` : vérifie le code avec ESLint
- `npm run lint:fix` : corrige automatiquement les problèmes ESLint
- `npm run format` : formate le code avec Prettier

## Notes de nettoyage

- Le backend utilise SQLite en développement.
- `frontend/src/App.jsx` est un fichier de template Vite, la navigation se fait via `frontend/src/router/index.jsx`.
- Le dossier `backend/storage/qrcodes/` contient les QR codes générés.
