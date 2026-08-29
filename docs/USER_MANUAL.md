# Manuel utilisateur SUPSTAR

## Créer un compte

Ouvrez SUPSTAR, choisissez **Créer un compte**, puis renseignez votre nom, votre email et un mot de passe d'au moins huit caractères. Une liste personnelle **Mes lieux** est automatiquement créée.

Si Google OAuth est configuré, le bouton **Continuer avec Google** permet de créer ou retrouver le compte sans mot de passe SUPSTAR.

## Gérer ses listes

La page **Mes listes** affiche les listes personnelles et partagées accessibles. Utilisez le formulaire supérieur pour créer une liste. Cliquez sur une carte de liste pour l'ouvrir.

Le compteur indique le nombre de lieux et de membres.

Le créateur peut ouvrir une liste puis utiliser **Modifier la liste** pour changer son nom ou sa description. Une liste partagée peut être supprimée ; la liste personnelle **Mes lieux** est protégée contre la suppression.

## Inviter des membres

Dans une liste dont vous êtes créateur, utilisez la section des membres. La personne invitée doit déjà avoir un compte SUPSTAR.

- **Éditeur** : gère lieux et avis.
- **Commentateur** : consulte les lieux et publie son propre avis.
- **Lecteur** : consulte et exporte uniquement.

Le créateur peut changer le rôle d'un membre ou le retirer. Son propre rôle ne peut pas être supprimé.

## Ajouter un lieu

Cliquez sur **Ajouter un lieu**. Renseignez au minimum le nom, la latitude et la longitude. Vous pouvez également fournir adresse, ville, pays, catégorie, description, horaires, fourchette de prix, tags, URL de photos ou importer des images depuis votre appareil (JPEG, PNG, WebP ou GIF, 8 Mo maximum par image).

Un clic sur la carte du formulaire peut servir à choisir les coordonnées. Vérifiez que la latitude se trouve entre -90 et 90 et la longitude entre -180 et 180.

## Rechercher et filtrer

La barre au-dessus de la carte permet de combiner :

- texte libre sur nom, ville et tags ;
- catégorie ;
- ville ;
- note minimale ;
- prix maximal ;
- statut personnel.

Les résultats filtrent simultanément la liste et les marqueurs cartographiques.

## Utiliser la carte

Autorisez la géolocalisation du navigateur pour centrer la carte près de votre position. Les marqueurs proches sont regroupés automatiquement. Cliquez sur un groupe pour zoomer, puis sur un marqueur pour consulter sa fiche.

Dans la fiche, **Démarrer la navigation** ouvre OpenStreetMap avec le lieu comme destination et, si elle est disponible, votre position comme départ.

Le bouton **Lieux à moins de 25 km** utilise votre position pour limiter les résultats proches. **Choisir comme départ** permet aussi de mémoriser un lieu de la liste comme origine avant d'ouvrir un autre lieu comme destination.

## Statuts et avis

Dans la fiche d'un lieu, choisissez **À visiter**, **Visité** ou **Favori**. Le statut vous appartient et ne modifie pas celui des autres membres.

Les créateurs, éditeurs et commentateurs peuvent attribuer une note entière de 1 à 5 et ajouter un commentaire. Un seul avis est autorisé par utilisateur et par lieu ; il peut ensuite être modifié ou supprimé selon les permissions.

## Importer et exporter

Les boutons **Export JSON** et **Export CSV** téléchargent les lieux et les données associées. Tous les membres peuvent exporter.

Les créateurs et éditeurs peuvent cliquer sur **Importer**, puis sélectionner un fichier `.json` ou `.csv`. Un import est limité à 500 lieux. Corrigez le fichier si SUPSTAR signale une ligne sans nom ou des coordonnées invalides.

Le format CSV attendu utilise les colonnes :

```text
name,address,city,country,category,description,openingHours,priceMin,priceMax,lat,lon,tags,photos,status,rating,comment
```

Séparez plusieurs tags ou URL de photos avec `|`.

## Paramètres

Dans la navigation, ouvrez **Paramètres** pour modifier :

- votre nom et l'URL de votre avatar ;
- vos catégories et votre budget préférés ;
- vos notifications. Les invitations, changements de rôle et retraits d’une liste apparaissent dans la cloche de notification de l’en-tête ;
- votre mot de passe.

## Résolution des problèmes

- **La carte ne me localise pas** : autorisez la localisation dans le navigateur ou utilisez la carte sans géolocalisation.
- **Google ne fonctionne pas** : le propriétaire du déploiement doit configurer les identifiants OAuth.
- **Import refusé** : contrôlez le format, le nom et les coordonnées de chaque lieu.
- **Action indisponible** : vérifiez votre rôle dans la liste.
- **Session expirée** : reconnectez-vous.
