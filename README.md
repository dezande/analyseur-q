# Analyseur Q

Analyseur d'ondes quantiques des cartes à jouer, modèle AQ-52.

Diaporama plein écran pour accompagner la routine Rain Man de Leonard Green, en français, dans l'habillage d'un faux appareil pseudo-scientifique.
Projet anciennement nommé `rain-man` (adresse `dezande.github.io/rain-man/`, qui ne fonctionne plus) : les réglages enregistrés sous l'ancien nom sont repris.
Une PWA mono-page, 100 % hors-ligne, pilotée au doigt, au clavier ou avec une télécommande de présentation.

## Écrire les slides

Tout le texte est dans **[`src/content/slides.ts`](src/content/slides.ts)** : une entrée par slide, dans l'ordre.

```ts
{
	titre: '**Analyseur Q**',
	grand: '52',
	texte: 'Un paragraphe.\n\nUn autre, avec un **mot mis en valeur**.',
	image: 'images/carte.png',
	note: 'Ce que je dis ou fais à ce moment-là.',
},
```

| Champ | Rôle |
| --- | --- |
| `etiquette` | Petite étiquette orange, toujours au même endroit en haut de l'écran, ex. `'Résultat'` |
| `titre` | En haut de la slide ; seul sur la slide, il est affiché plus grand. `**titre**` : en orange |
| `grand` | Un mot ou un nombre en très grand |
| `texte` | Texte courant. Retour à la ligne conservé, ligne vide = nouveau paragraphe, `**mots**` = mis en valeur. Affiché plus grand sur une slide sans titre ni grand nombre |
| `image` | Fichier placé dans `public/images/` (le logo : `images/logo.svg`). Plus petite quand la slide contient aussi du texte |
| `chargement` | Fausse barre de chargement de cette durée, en secondes (1 à 120), lancée à l'arrivée sur la slide. À 100 %, passe seule à la slide suivante, sauf avec un message `termine` |
| `termine` | Message affiché sous la barre à 100 %, ex. `'Analyse quantique terminée'` ; la slide reste alors affichée jusqu'au tap suivant |
| `bouton` | Texte d'un gros bouton, ex. `'Lancer l\'analyse'` : l'appui passe à la slide suivante. Avec un chargement sur la même slide, c'est la barre qui démarre à l'appui |
| `boutonVers` | Numéro de la slide où mène le bouton, ex. `1` pour « Recommencer ». Par défaut la suivante. Un bouton qui ramène en arrière ne réagit qu'à un vrai appui : tap à droite, glissement et télécommande ne le déclenchent pas |
| `note` | Note pour l'artiste, visible seulement si « Notes pour l'artiste » est activé dans le menu |

Tous les champs sont facultatifs, mais chaque slide doit afficher quelque chose (titre, grand, texte, image, chargement ou bouton).

Tant que le bouton d'une slide n'est pas appuyé, « slide suivante » (tap à droite, glissement, télécommande) appuie dessus au lieu de sauter la slide : impossible de passer l'analyse par erreur. Sa zone de toucher déborde de 24 px autour de lui, pour un doigt imprécis. Revenir sur la slide remet le bouton.

Un bouton ne s'active qu'**0,7 s après l'arrivée sur sa slide**, et jamais tant qu'un doigt est posé sur l'écran : le tap qui amène sur la slide, souvent suivi d'un autre, ne la fait pas traverser sans qu'on la voie. Le bouton apparaît en fondu pendant ce délai.

La barre de chargement avance de façon irrégulière, comme un vrai chargement (paliers, accélérations, dernier pour-cent qui traîne). Elle se met en pause tant que le menu est ouvert, que l'écran est noir ou que l'app est en arrière-plan : elle ne change jamais de slide dans votre dos. Un tap pendant le chargement change de slide normalement ; revenir sur la slide relance le chargement depuis 0. Elle ne peut pas être sur la dernière slide.
Toutes les slides sont entourées d'un cadre d'instrument décoratif (coins de viseur, graduations, « Analyseur Q · AQ-52 » en haut, voyant « Mesure quantique » en bas), qui laisse passer les touchers.

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

Le **menu** permet d'aller directement à une slide, de recommencer au début, de choisir la transition (fondu, glisse, aucune) et de masquer les aides visuelles : numéro de slide, barre de progression, notes, jauge de l'appui long. Toutes sont visibles par défaut : masquez-les avant de jouer si le public voit l'écran. Le numéro de version (nombre de commits) est affiché sous le titre du menu, pour vérifier que le téléphone a bien la dernière version ; le bas du menu détaille le commit, l'état du maintien de l'écran allumé et le nom du cache hors-ligne.

### Écran toujours allumé

Deux moyens actifs en même temps, relancés à chaque toucher et à chaque retour au premier plan : l'API Screen Wake Lock et une vidéo muette invisible jouée en boucle. La vidéo reste active même quand l'API répond : sur iPhone avant iOS 18.4, dans l'app installée sur l'écran d'accueil, l'API accepte la demande sans garder l'écran allumé. Le menu indique « Screen Wake Lock API + vidéo muette en boucle » quand les deux tournent.

La slide en cours et les réglages sont enregistrés sur l'appareil : si l'app est fermée par erreur, elle reprend là où elle en était. **Ils sont conservés quand l'app se met à jour** : une mise à jour ne remplace que le cache hors-ligne. L'app demande aussi au navigateur un stockage persistant, pour qu'il ne les efface pas de lui-même ; le menu en affiche l'état (« Stockage »).

### Toujours en portrait

Sur Android, l'app installée verrouille l'orientation. Sur iPhone, une page web ne peut pas le faire : quand le téléphone passe en paysage, l'app pivote tout son affichage pour rester dans l'axe du téléphone. Taps, glissements, appui long et défilement du menu suivent le téléphone, pas l'écran. Sur ordinateur, rien ne pivote.

Juste après l'ouverture du menu par l'appui long, les touchers dans le menu sont ignorés un court instant : le doigt qui se relève ne clique pas sur le bouton placé dessous.

## Installation

L'app doit être servie en HTTPS (GitHub Pages convient ; tous les chemins sont relatifs). Ouvrez la page une fois en ligne pour que le service worker mette tout en cache, puis :

- **iOS** : Safari → Partager → *Sur l'écran d'accueil*.
- **Android** : Chrome → menu → *Installer l'application*.

Sur iPhone, l'app installée a son propre stockage, séparé de Safari : **ouvrez-la une fois depuis l'écran d'accueil avec du réseau**, pour qu'elle se mette en cache. Ensuite elle démarre sans réseau.

### Vérifier sur le téléphone avant de jouer

1. **Hors-ligne** : ouvrir l'app installée avec du réseau, ouvrir le menu (appui de 3 s) et vérifier que « Cache hors-ligne » affiche un nom `analyseur-q-…`. Fermer l'app (la faire glisser vers le haut dans le sélecteur d'apps), passer en mode avion, la rouvrir, faire défiler toutes les slides.
2. **Écran allumé** : dans Réglages → Luminosité et affichage → Verrouillage automatique, choisir 30 secondes. Ouvrir l'app, toucher une fois l'écran, puis ne plus y toucher pendant 2 minutes : l'écran ne doit ni baisser ni s'éteindre. Refaire le test en mode économie d'énergie, qui peut couper la vidéo. Remettre ensuite le verrouillage automatique habituel.
3. **Portrait** : tourner le téléphone dans les deux sens : l'affichage reste dans l'axe du téléphone, les taps à droite (côté droit du téléphone) avancent toujours.
4. **Version** : après une publication, rouvrir l'app avec du réseau, la fermer et la rouvrir : le menu doit afficher le nouveau numéro de version et un nouveau nom de cache, et les réglages (transition, aides masquées) doivent être restés les mêmes.

## Publication

**Chaque push sur `main` met l'app à jour** (https://dezande.github.io/analyseur-q/). GitHub Actions vérifie les types, lance les tests unitaires, compile, puis teste l'app compilée dans Chrome. Si tout passe, il déploie sur GitHub Pages ; sinon, rien n'est publié.

Le nom du cache hors-ligne est une empreinte de tous les fichiers de `dist/`, **numéro de version compris** : chaque nouvelle version change ce nom, même si seul le numéro a changé, et les téléphones retéléchargent tout ; l'ancien cache est supprimé. Seuls les caches de cette app sont supprimés : les autres apps publiées sur `dezande.github.io` (même origine, donc mêmes caches) ne sont pas touchées. Sans changement, le nom reste le même et rien n'est retéléchargé. La liste des fichiers mis en cache est elle aussi calculée au build : rien à mettre à jour à la main, même en ajoutant une image.

Une nouvelle version s'installe dès que l'app est ouverte avec du réseau. Si personne n'a touché l'écran depuis l'ouverture, l'app se recharge aussitôt ; sinon elle garde la version en cours jusqu'à l'ouverture suivante : jamais de rechargement en pleine routine.

```sh
npm run deploy              # vérifie en local, pousse, suit GitHub Actions et contrôle le site
npm run deploy -- --dry-run # vérifications, build et tests seulement, sans push
```

## Journal des versions

Chaque changement se note dans le [journal des versions](CHANGELOG.md), sous « À venir », dans le commit qui le porte : la CI refuse un push qui touche au projet sans toucher à ce fichier, et rien n'est publié. Les versions nommées (tags git `vX.Y.Z` et Releases GitHub) y sont décrites une par une.

## Développement

Il faut Node 24 (version figée dans `.nvmrc` : `nvm use`). TypeScript et Sass servent uniquement au build : l'app publiée n'a aucune dépendance.

Le code commun aux accessoires de scène (écran allumé, portrait, hors-ligne et mises à jour, build, déploiement, pilotage de Chrome) vient du kit **[kit-scene](https://github.com/dezande/kit-scene)**, sous-module git monté dans `src/kit/`. L'app utilise une version précise du kit ; pour prendre la dernière, voir le README du kit.

```sh
git submodule update --init   # après un clone : récupère le kit
npm install
npm run serve       # build puis serveur local sur http://localhost:8000
npm test            # tests unitaires (quelques secondes)
npm run test:e2e    # tests dans Chrome de l'app compilée (environ 30 s, après npm run build)
npm run typecheck   # vérification des types
npm run check:changelog # le journal des versions a-t-il été mis à jour ?
npm run build       # génère dist/
```

Organisation de `src/` : voir le commentaire en tête de [`src/app.ts`](src/app.ts).

### Tests

- **Tests unitaires** (`tests/logic/`) : la logique pure de `src/logic/` sous Node (gestes avec des rythmes lents et hésitants, navigation, touches, réglages, mise en valeur du texte) et la validité du contenu de `src/content/slides.ts`.
- **Tests dans Chrome sur le vrai diaporama** (`tests/e2e/app.e2e.ts`) : l'app compilée dans Chrome sans interface, sur un écran de téléphone simulé, avec de vrais événements tactiles et clavier. Taps, tap lent, glissements, appui de 3 s et appui abandonné, deux doigts, clavier et écran noir, menu (informations comprises), réglages et position enregistrés, données abîmées, ancien nom rain-man, aucune slide qui déborde en portrait comme téléphone tourné, étiquettes au même endroit, écran allumé (verrou et vidéo), nouvelle version publiée (nouveau cache, cache d'une autre app intact, réglages et position conservés, rechargement seulement si l'écran n'a pas été touché), téléphone tourné dans les deux sens, appui long sans clic parasite dans le menu, fonctionnement et images hors-ligne.
- **Tests dans Chrome sur un diaporama de test** (`tests/e2e/fixture.e2e.ts`) : chaque type de slide reste couvert quel que soit le vrai contenu. Notes, compteur et progression ; transition « aucune » ; bouton seul ; délai d'activation et doigt posé ; bouton Recommencer (`boutonVers`) ; bouton et chargement (attente, appui, tap à droite, glissement, télécommande, retour sur la slide, appui pendant le fondu, téléphone tourné) ; chargement automatique, avec message, zappé, en pause sur écran noir, arrêté par le menu ; étiquette, grand nombre, image et texte long ; souris ; raccourcis clavier ignorés ; jauge de l'appui long ; doigt qui glisse ; toucher interrompu par le système.
- Les outils communs aux deux fichiers sont dans `tests/e2e/helpers.ts`. Il faut Google Chrome, trouvé automatiquement (sinon, indiquez son chemin dans `CHROME_PATH`).
- Le calcul du nom de cache au build, la vérification du build, le serveur local et les calculs de rotation sont testés dans le kit.
