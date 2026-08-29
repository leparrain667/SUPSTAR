# Référence API REST

URL locale : `http://localhost:4000/api`. Les routes protégées attendent `Authorization: Bearer <token>`.

## Authentification

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/register` | Inscription `{email,password,displayName}` |
| POST | `/auth/login` | Connexion `{email,password}` |
| GET | `/auth/me` | Utilisateur courant |
| PUT | `/auth/password` | Changer le mot de passe |
| GET | `/auth/google` | Démarrer OAuth Google |
| GET | `/auth/google/callback` | Callback OAuth |

Le démarrage Google crée un paramètre anti-CSRF `state` conservé temporairement dans un cookie `HttpOnly`. Après validation, le callback redirige le navigateur vers `/oauth/callback#token=...`.

## Utilisateur

| Méthode | Route | Description |
|---|---|---|
| GET | `/users/me/settings` | Profil, préférences et fournisseurs OAuth |
| PUT | `/users/me/profile` | Modifier nom et avatar |
| PUT | `/users/me/preferences` | Modifier les préférences de voyage |

## Notifications

| Méthode | Route | Description |
|---|---|---|
| GET | `/notifications` | Notifications récentes et compteur non lu |
| PATCH | `/notifications/:id/read` | Marquer une notification comme lue |
| PATCH | `/notifications/read-all` | Marquer toutes les notifications comme lues |

## Listes et membres

| Méthode | Route | Rôle minimal | Description |
|---|---|---|---|
| POST | `/lists` | Authentifié | Créer une liste |
| GET | `/lists` | Authentifié | Listes accessibles |
| GET | `/lists/:listId` | Membre | Détail et membres |
| PUT | `/lists/:listId` | Créateur | Renommer/modifier |
| DELETE | `/lists/:listId` | Créateur | Supprimer une liste non personnelle |
| GET | `/lists/:listId/search` | Membre | Rechercher et filtrer les lieux |
| POST | `/lists/:listId/members` | Créateur | Ajouter par email |
| PUT | `/lists/:listId/members/:userId` | Créateur | Modifier le rôle |
| DELETE | `/lists/:listId/members/:userId` | Créateur | Retirer le membre |
| GET | `/lists/:listId/export?format=json|csv` | Membre | Exporter |
| POST | `/lists/:listId/import` | Créateur/éditeur | Importer `{format,content}` |

Paramètres de recherche : `q`, `category`, `city`, `minRating`, `maxPrice`, `status`.

## Lieux

| Méthode | Route | Rôle minimal | Description |
|---|---|---|---|
| GET | `/places/categories` | Authentifié | Catégories |
| GET | `/places/nearby` | Authentifié | Recherche dans un rayon |
| POST | `/places` | Créateur/éditeur | Créer un lieu |
| GET | `/places/:id` | Membre | Fiche complète |
| PUT | `/places/:id` | Créateur/éditeur | Modifier un lieu |
| DELETE | `/places/:id` | Créateur/éditeur | Supprimer |
| PUT | `/places/:id/status` | Membre | Statut personnel |

Exemple de création :

```json
{
  "listId": "uuid",
  "categoryId": 1,
  "name": "Restaurant SUPSTAR",
  "address": "1 rue Exemple",
  "city": "Paris",
  "country": "France",
  "description": "Cuisine locale",
  "openingHours": { "mon": "09:00-18:00" },
  "priceMin": 15,
  "priceMax": 40,
  "lat": 48.8566,
  "lon": 2.3522,
  "tags": ["terrasse", "local"],
  "photos": ["https://example.com/photo.jpg"]
}
```

La recherche de proximité accepte `lat`, `lon`, `radius` (100 à 100 000 mètres), `listId`, `category`, `city`, `minRating`, `maxPrice`, `status` et `search`.

Même sans `listId`, les résultats sont toujours limités aux listes dont l'utilisateur authentifié est membre.

## Photos

| Méthode | Route | Description |
|---|---|---|
| POST | `/places/:id/photos` | Importer jusqu’à 10 photos (8 Mo chacune) |
| DELETE | `/places/:id/photos/:photoId` | Supprimer une photo |

Les photos sont envoyées en `multipart/form-data` avec le champ `photos`. Les formats JPEG, PNG, WebP et GIF sont acceptés.

## Avis

| Méthode | Route | Description |
|---|---|---|
| GET | `/places/:placeId/reviews` | Lire les avis |
| POST | `/places/:placeId/reviews` | Créer `{rating,comment}` |
| PUT | `/places/:placeId/reviews/:reviewId` | Modifier |
| DELETE | `/places/:placeId/reviews/:reviewId` | Supprimer |

`rating` doit être un entier de 1 à 5 et `comment` est limité à 2 000 caractères.

## Codes HTTP

- `200` succès ; `201` création ; `204` suppression sans contenu ;
- `400` entrée invalide ; `401` non authentifié ; `403` permission insuffisante ;
- `404` ressource absente ; `409` conflit ; `429` trop de tentatives ;
- `500` erreur interne ; `503` OAuth non configuré.
