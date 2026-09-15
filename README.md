# Rain Man

Diaporama plein écran pour accompagner la routine Rain Man de Leonard Green, en français.
Une PWA mono-page, 100 % hors-ligne, pilotée au doigt, au clavier ou avec une télécommande de présentation.

## Écrire les slides

Tout le texte est dans **[`src/content/slides.ts`](src/content/slides.ts)** : une entrée par slide, dans l'ordre.

```ts
{
	titre: 'Rain Man',
	grand: '52',
	texte: 'Un paragraphe.\n\nUn autre, avec un **mot mis en valeur**.',
	image: 'images/carte.png',
	note: 'Ce que je dis ou fais à ce moment-là.',
},
```

| Champ | Rôle |
| --- | --- |
| `titre` | En haut de la slide ; seul sur la slide, il est affiché plus grand |
| `grand` | Un mot ou un nombre en très grand |
| `texte` | Texte courant. Retour à la ligne conservé, ligne vide = nouveau paragraphe, `**mots**` = mis en valeur |
| `image` | Fichier placé dans `public/images/` |
| `chargement` | Fausse barre de chargement de cette durée, en secondes (1 à 120). À 100 %, passe seule à la slide suivante |
| `note` | Note pour l'artiste, visible seulement si « Notes pour l'artiste » est activé dans le menu |

Tous les champs sont facultatifs, mais chaque slide doit afficher quelque chose (titre, grand, texte, image ou chargement).

La barre de chargement avance de façon irrégulière, comme un vrai chargement (paliers, accélérations, dernier pour-cent qui traîne). Elle se met en pause tant que le menu est ouvert, que l'écran est noir ou que l'app est en arrière-plan : elle ne change jamais de slide dans votre dos. Un tap pendant le chargement change de slide normalement ; revenir sur la slide relance le chargement depuis 0. Elle ne peut pas être sur la dernière slide.
La taille du texte s'adapte à l'écran : il rétrécit juste ce qu'il faut pour ne jamais déborder.
`npm test` signale une slide vide, une image absente ou un champ mal orthographié.

## Utilisation

| Geste | Effet |
| --- | --- |
| **Tap** sur la droite de l'écran (70 %), ou **glisser vers la gauche** | Slide suivante |
| **Tap** sur le tiers gauche, ou **glisser vers la droite** | Slide précédente |
| **Appui de 3 s** n'importe où | Menu |

Les gestes sont réglés pour un vrai doigt : un tap peut durer jusqu'à 0,8 s et bouger de 40 px, un glissement peut être lent.
Un appui relâché entre 0,8 s et 3 s ne fait rien : on peut abandonner un appui long sans changer de slide.
On s'arrête à la dernière slide : un tap de trop ne ramène jamais au début.

| Touche (clavier ou télécommande) | Effet |
| --- | --- |
| → ↓ Espace Entrée Page suivante | Slide suivante |
| ← ↑ Retour arrière Page précédente | Slide précédente |
| Début / Fin | Première / dernière slide |
| Échap ou M | Menu |
| B ou « . » | Écran noir (un tap ou une touche le rallume, sans changer de slide) |

Le **menu** permet d'aller directement à une slide, de recommencer au début, de choisir la transition (fondu, glisse, aucune) et de masquer les aides visuelles : numéro de slide, barre de progression, notes, jauge de l'appui long. Toutes sont visibles par défaut : masquez-les avant de jouer si le public voit l'écran. Le numéro de version (nombre de commits) est affiché sous le titre du menu, pour vérifier que le téléphone a bien la dernière version ; le bas du menu détaille le commit, l'état du maintien de l'écran allumé et le cache hors-ligne.

La slide en cours et les réglages sont enregistrés sur l'appareil : si l'app est fermée par erreur, elle reprend là où elle en était.

## Installation

L'app doit être servie en HTTPS (GitHub Pages convient ; tous les chemins sont relatifs). Ouvrez la page une fois en ligne pour que le service worker mette tout en cache, puis :

- **iOS** : Safari → Partager → *Sur l'écran d'accueil*.
- **Android** : Chrome → menu → *Installer l'application*.

Pour vérifier le fonctionnement hors-ligne, relancez l'app en mode avion.

## Publication

**Chaque push sur `main` met l'app à jour** (https://dezande.github.io/rain-man/). GitHub Actions vérifie les types, lance les tests unitaires, compile, puis teste l'app compilée dans Chrome. Si tout passe, il déploie sur GitHub Pages ; sinon, rien n'est publié.

Le nom du cache hors-ligne et la liste des fichiers mis en cache sont calculés au build à partir de `dist/` : rien à mettre à jour à la main, même en ajoutant une image. Une nouvelle version s'installe à la prochaine ouverture avec du réseau, sans jamais recharger l'écran en pleine routine.

```sh
npm run deploy              # vérifie en local, pousse, suit GitHub Actions et contrôle le site
npm run deploy -- --dry-run # vérifications, build et tests seulement, sans push
```

## Développement

Il faut Node 24 ou plus récent. TypeScript et Sass servent uniquement au build : l'app publiée n'a aucune dépendance.

```sh
npm install
npm run serve       # build puis serveur local sur http://localhost:8000
npm test            # tests unitaires (quelques secondes)
npm run test:e2e    # tests dans Chrome de l'app compilée (environ 30 s, après npm run build)
npm run typecheck   # vérification des types
npm run build       # génère dist/
```

Organisation de `src/` : voir le commentaire en tête de [`src/app.ts`](src/app.ts).

### Tests

- **Tests unitaires** (`tests/logic/`) : la logique pure de `src/logic/` sous Node (gestes avec des rythmes lents et hésitants, navigation, touches, réglages, mise en valeur du texte) et la validité du contenu de `src/content/slides.ts`.
- **Tests dans Chrome** (`tests/e2e/`) : l'app compilée dans Chrome sans interface, sur un écran de téléphone simulé, avec de vrais événements tactiles et clavier. Taps, tap lent, glissements, appui de 3 s et appui abandonné, deux doigts, clavier et écran noir, menu, réglages et position enregistrés, données abîmées, aucune slide qui déborde en portrait comme en paysage, fonctionnement serveur arrêté. Il faut Google Chrome, trouvé automatiquement (sinon, indiquez son chemin dans `CHROME_PATH`).
