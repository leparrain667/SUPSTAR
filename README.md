# SUPSTAR

## Demonstration publique

Application en ligne : <https://supstar-xi.vercel.app/login>

SUPSTAR est une plateforme collaborative de découverte et d'organisation de lieux. Elle permet de créer des listes personnelles ou partagées, gérer les droits des membres, enregistrer des lieux géolocalisés, publier des avis et importer ou exporter les données.

## Fonctionnalités

- inscription, connexion JWT et OAuth2 Google configurable ;
- liste personnelle automatique et listes partagées ;
- rôles créateur, éditeur, commentateur et lecteur ;
- lieux avec adresse, catégorie, description, horaires, prix, tags, photos et GPS ;
- statuts personnels : à visiter, visité et favori ;
- avis, notes et moyenne automatique ;
- recherche texte et filtres par catégorie, ville, note, prix et statut ;
- carte OpenStreetMap, clustering, géolocalisation, fiche marqueur et navigation ;
- import et export JSON/CSV ;
- profil, mot de passe et préférences de voyage ;
- notifications in-app pour les invitations et changements de rôle ;
- upload sécurisé de photos avec galerie persistante ;
- API REST, client React et PostgreSQL/PostGIS conteneurisés.

## Démarrage avec Docker

Prérequis : Docker Desktop avec Docker Compose.

1. Copier `.env.example` vers `.env` à la racine.
2. Remplacer `JWT_SECRET` par une valeur aléatoire d'au moins 32 caractères.
3. Choisir un mot de passe PostgreSQL robuste.
4. Lancer :

```bash
docker compose up --build -d
```

L'application est disponible sur <http://localhost:8080>. La base est exposée sur le port `5433` pour le développement. Le schéma PostGIS est créé automatiquement au premier démarrage.

Pour arrêter les services :

```bash
docker compose down
```

`docker compose down -v` supprime aussi les données et ne doit être utilisé que pour réinitialiser volontairement la base.

## Développement local

La base peut être lancée seule avec `docker compose up -d db`. Dans `backend`, copier `.env.example` vers `.env`, puis :

```bash
npm ci
npm run db:apply-schema
npm run prisma:generate
npm run dev
```

Dans `frontend` :

```bash
npm ci
npm run dev
```

Le client est alors disponible sur <http://localhost:5173> et l'API sur <http://localhost:4000>.

## OAuth Google

Créer un client OAuth Web dans Google Cloud Console, puis autoriser l'URI de redirection correspondant à `GOOGLE_CALLBACK_URL`. Renseigner `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `GOOGLE_CALLBACK_URL` dans `.env`. Sans ces valeurs, la connexion classique reste disponible et l'endpoint Google répond explicitement qu'il n'est pas configuré.

## Tests

Avec PostgreSQL en fonctionnement :

```bash
cd backend
npm test
cd ../frontend
npm test
npm run build
```

Le test d'intégration crée ses propres données, teste le parcours complet, puis les supprime.

## Documentation

- [Démonstration publique](docs/PUBLIC_DEMO.md)
- [Vérification des exigences](docs/REQUIREMENTS.md)

- [Documentation technique](docs/TECHNICAL.md)
- [Manuel utilisateur](docs/USER_MANUAL.md)
- [Référence API](docs/API.md)
- [Guide de déploiement](docs/DEPLOYMENT.md)
- [Stratégie de tests](docs/TESTING.md)

## Structure

```text
supstar-fullstack/
├── backend/             API Express et client Prisma
├── frontend/            application React/Vite et Nginx
├── docs/                documentation du rendu
├── schema.sql           schéma PostgreSQL/PostGIS
└── docker-compose.yml   orchestration des trois services
```

Ne jamais inclure les fichiers `.env`, les secrets, `node_modules` ou `dist` dans l'archive remise.

Sous Windows, le script suivant crée une archive propre et refuse d'écraser un fichier existant :

```powershell
.\scripts\create-release.ps1
```
