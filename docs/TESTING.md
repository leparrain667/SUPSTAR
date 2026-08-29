# Stratégie de tests SUPSTAR

## Vérification automatique

Avec PostgreSQL/PostGIS démarré sur le port configuré :

```bash
cd backend
npm test
cd ../frontend
npm test
npm run build
```

Le parcours d'intégration crée des comptes isolés puis les supprime. Il vérifie l'authentification, les listes, les lieux, la recherche géographique, l'isolation entre listes, les rôles, les avis, les statuts, l'import/export et les paramètres utilisateur.

Les tests unitaires vérifient le CSV, la validation complète des lignes importées, la normalisation des coordonnées et le traitement uniforme des erreurs API. Le build Vite vérifie la compilation de l'interface et de ses dépendances.

## Recette manuelle

1. Créer deux comptes dans deux fenêtres privées.
2. Créer une liste avec le premier compte et inviter le second successivement comme lecteur, commentateur et éditeur.
3. Vérifier que les boutons visibles et les réponses API correspondent à chaque rôle.
4. Ajouter un lieu par clic sur la carte, avec catégorie, horaires, prix, tags et photo.
5. Vérifier le marqueur, la fiche, la recherche combinée et le filtre à 25 km.
6. Ajouter deux avis et contrôler la moyenne après création, modification et suppression.
7. Exporter en JSON et CSV, puis réimporter dans une liste vide.
8. Tester un import invalide et vérifier qu'aucun lieu partiel n'a été créé.
9. Modifier profil, préférences et mot de passe, puis se reconnecter.
10. Vérifier l'affichage mobile et le refus de géolocalisation.

## Contrôles avant rendu

- `npm test` et `npm run build` réussissent ;
- `npm audit --omit=dev` ne signale aucune vulnérabilité ;
- les trois conteneurs démarrent depuis un volume neuf ;
- aucun `.env`, secret, `node_modules`, `dist` ou journal n'est inclus dans l'archive ;
- les liens et commandes de la documentation correspondent au rendu final.
