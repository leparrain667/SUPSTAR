# Verification des exigences SUPSTAR

## Fonctionnalites

| Exigence | Etat | Implementation |
|---|---|---|
| Inscription et connexion | OK | Email/mot de passe hashé avec bcrypt, JWT et OAuth2 Google |
| Listes personnelles et partagees | OK | Création, invitation et rôles créateur/éditeur/commentateur/lecteur |
| Gestion des lieux | OK | Nom, adresse, ville/pays, catégorie, description, horaires, prix, tags et GPS |
| Photos | OK | Upload validé, galerie et suppression |
| Notes et statuts | OK | Avis 1–5, moyenne, À visiter/Visité/Favori |
| Recherche et filtres | OK | Texte, catégorie, ville, note, prix et statut |
| Carte OpenStreetMap | OK | Marqueurs, clustering, géolocalisation, proximité et navigation |
| Import/export | OK | JSON et CSV avec validation et transaction atomique |
| Notifications | OK | Invitations, rôles et retraits avec lecture individuelle/globale |
| Paramètres utilisateur | OK | Profil, avatar, mot de passe et préférences catégories/budget |

## Architecture et qualite

| Exigence | Etat | Preuve |
|---|---|---|
| Trois briques séparées | OK | `frontend`, `backend`, PostgreSQL/PostGIS |
| API REST | OK | Routes Express documentées dans `docs/API.md` |
| Conteneurisation | OK | `docker-compose.yml`, Dockerfiles API et Nginx |
| Sécurité | OK | Secrets hors Git, bcrypt, validation, rôles, rate limiting et CSP |
| Données géographiques | OK | PostGIS et requêtes de proximité indexées |
| Tests | OK | 2 tests frontend, 5 tests backend, build production validé |
| Documentation | OK | Manuel, documentation technique, API, déploiement et tests |

## Bonus et limites connues

- Déploiement public Vercel : <https://supstar-xi.vercel.app/login>.
- Déploiement Render prévu via `render.yaml`.
- Navigation OpenStreetMap disponible depuis chaque fiche lieu.
- Les recommandations automatiques et heatmaps ne sont pas implémentées.
- Le stockage local des photos sur Render gratuit est éphémère ; un stockage objet est recommandé pour une exploitation durable.
