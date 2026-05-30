# Sana Backend

API backend Node.js pour le projet Sana.

## Description

Ce backend expose une API REST pour gérer les utilisateurs, agences, envois, sacs, colis et notifications.
Il utilise Express, Sequelize et une base SQLite pour le développement.

## Installation

```bash
cd backend
npm install
cp .env.example .env
```

## Variables d'environnement

- `PORT` : port du serveur backend (par défaut `3000`)
- `NODE_ENV` : `development` ou `production`
- `JWT_SECRET` : clé secrète pour signer les tokens JWT
- `JWT_EXPIRES_IN` : durée de vie du token JWT (ex. `7d`)
- `GMAIL_USER` : adresse email utilisée par Nodemailer
- `GMAIL_APP_PASS` : mot de passe applicatif SMTP
- `APP_URL` : URL du frontend pour les liens de suivi QR

## Scripts

- `npm run dev` : démarre l'application avec `nodemon`
- `npm start` : démarre le serveur en production

## Structure

- `src/app.js` : configuration de l'application Express
- `src/server.js` : point d'entrée serveur
- `src/routes` : définition des routes API
- `src/controllers` : logique métier des endpoints
- `src/models` : définitions des modèles Sequelize
- `src/services` : utilitaires et services partagés (QR, email, etc.)
- `src/middlewares` : middlewares Express pour auth et erreurs
- `src/config` : configuration de la base de données
- `backend/storage/qrcodes` : fichiers QR code générés

## Notes

- La base utilise SQLite pour le développement.
- `backend/.env.example` fournit un modèle de configuration env.
- La production devrait utiliser un moteur SQL plus robuste et des migrations formelles.
