# SUPSTAR — Backend

API REST Node.js / Express / PostgreSQL + PostGIS.

## Setup

```bash
npm ci
cp .env.example .env
npm run db:apply-schema
npm run prisma:generate
npm start
```

Le schéma SQL gère les extensions PostGIS, les index géographiques, le trigger de recalcul des notes et les notifications. Ne pas lancer `prisma migrate dev` : la colonne `geography` et les triggers sont gérés par `schema.sql`.

## Fonctionnalités

- authentification JWT et OAuth2 Google ;
- listes, membres et rôles ;
- lieux, avis, filtres et recherche PostGIS ;
- import/export JSON/CSV ;
- notifications in-app ;
- upload de photos sécurisé (JPEG, PNG, WebP, GIF, 8 Mo maximum) dans `/uploads`.

## Tests

```bash
npm test
```
