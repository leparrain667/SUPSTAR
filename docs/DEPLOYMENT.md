# Guide de déploiement SUPSTAR

## Préparation

Prérequis : Docker Desktop ou Docker Engine avec Docker Compose v2, ports 8080 et 5433 disponibles, et accès HTTPS pour un déploiement public.

1. Copier `.env.example` vers `.env` à la racine.
2. Générer un `JWT_SECRET` aléatoire d'au moins 32 caractères.
3. Remplacer `POSTGRES_PASSWORD` par un mot de passe unique.
4. Pour Google OAuth, créer un client Web et renseigner les trois variables `GOOGLE_*`.
5. Adapter `CLIENT_URL` et `GOOGLE_CALLBACK_URL` au domaine HTTPS final.

Ne jamais placer le fichier `.env` dans Git ou dans l'archive de rendu.

## Démarrage et vérification

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:8080/health
```

Les services `db`, `api` et `web` doivent être démarrés, et les deux premiers doivent être déclarés sains. Le healthcheck API vérifie également une requête réelle vers PostgreSQL. L'application est accessible sur `http://localhost:8080`.

## Architecture réseau

Seul Nginx expose l'application Web. Il relaie `/api/` vers Express et `/health` vers le healthcheck API. PostgreSQL est lié uniquement à `127.0.0.1` sur le port de développement 5433 ; en production, son bloc `ports` peut être retiré entièrement.

## Données et mises à jour

Le volume `supstar_pgdata` conserve les données entre redémarrages. `schema.sql` initialise uniquement un volume neuf. Toute évolution future du schéma doit utiliser une migration versionnée ; ne pas supprimer le volume de production pour appliquer une modification.

Sauvegarde PostgreSQL :

```bash
docker compose exec -T db pg_dump -U supstar -d supstar -Fc > supstar.backup
```

La restauration doit d'abord être testée dans un environnement séparé.

## Exploitation

- terminer TLS sur un reverse proxy ou une plateforme d'hébergement ;
- limiter les origines CORS à l'URL publique exacte ;
- renouveler les secrets compromis ;
- sauvegarder le volume régulièrement ;
- surveiller les healthchecks et les journaux sans enregistrer les jetons ;
- exécuter `npm audit` et les tests avant chaque livraison.

## Arrêt

```bash
docker compose down
```

Ne pas ajouter `-v` sauf si la suppression définitive de la base est volontaire.

## Archive de rendu

Sous Windows, `.\scripts\create-release.ps1` crée `SUPSTAR-rendu.zip` à côté du dossier du projet. Le script exclut automatiquement les fichiers `.env`, dépendances installées, builds, journaux, métadonnées Git et archives existantes.
