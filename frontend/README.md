# Sana Frontend

Application frontend React pour le projet Sana.

## Description

Cette application fournit l’interface de gestion des colis, des sacs, des envois, du suivi et des notifications.

## Installation

```bash
cd frontend
npm install
npm run dev
```

## Scripts

- `npm run dev` : démarre l’application en développement
- `npm run build` : génère le build de production
- `npm run preview` : prévisualise le build
- `npm run lint` : vérifie le code avec ESLint
- `npm run lint:fix` : corrige automatiquement les problèmes ESLint
- `npm run format` : formate le code avec Prettier

## Notes

- Le serveur backend est proxifié via `vite.config.js` : `/api` et `/qrcodes` sont redirigés vers `http://localhost:3000`.
- Le point d’entrée réel est `src/main.jsx`.
- Le routeur principal se trouve dans `src/router/index.jsx`.
- Les composants UI réutilisables sont dans `src/components/ui`.

## Ressources utiles

- API HTTP : `src/api/axios.js`
- Authentification : `src/context/AuthContext.jsx`
- Gestion des données : `@tanstack/react-query`
