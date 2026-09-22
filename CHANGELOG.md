# Journal des versions

Toutes les versions de l'Analyseur Q, de la plus récente à la plus ancienne.

Les numéros suivent [semver](https://semver.org/lang/fr/) : `MAJEUR.MINEUR.CORRECTIF`. Chaque version correspond à un tag git et à une [Release GitHub](https://github.com/dezande/analyseur-q/releases). Les versions `0.x` sont l'histoire du développement, avant que l'app soit complète et jouable en scène.

**Chaque changement s'écrit ici**, sous « Non publié », dans le même commit que le changement lui-même : la vérification du kit (`npm run check:changelog`) contrôle la forme du journal et refuse un changement qui ne s'explique pas, en pull request comme sur `main`. Publier une version, c'est renommer « Non publié » en numéro de version et poser le tag.

À ne pas confondre avec le **numéro affiché dans le menu de l'app** : celui-là est le nombre de commits, calculé au build, qui identifie précisément la version installée sur un téléphone. Le tableau ci-dessous donne la correspondance.

| Version | Commits | Date | En une phrase |
| --- | --- | --- | --- |
| [1.3.0] | 32 | 2026-09-22 | L'app en français et en anglais, ouverture toujours sur la première slide |
| [1.2.0] | 26 | 2026-09-16 | Numéro de slide et barre retirés, journal des versions et règles de branche |
| [1.1.1] | 22 | 2026-09-16 | Corrections d'affichage : texte et bouton qui ne débordent plus |
| [1.1.0] | 19 | 2026-09-16 | Bouton « Recommencer » et délai d'activation |
| [1.0.0] | 17 | 2026-09-15 | Prête pour la scène : tous les cas testés |
| [0.9.0] | 16 | 2026-09-15 | Résultats de la routine et habillage d'appareil |
| [0.8.0] | 12 | 2026-09-15 | Boutons et fausse analyse |
| [0.7.0] | 9 | 2026-09-15 | Code commun déplacé dans le kit kit-scene |
| [0.6.0] | 8 | 2026-09-15 | Renommage en analyseur-q, caches des autres apps préservés |
| [0.5.0] | 7 | 2026-09-15 | Toujours en portrait, réglages conservés |
| [0.4.0] | 6 | 2026-09-15 | Analyseur Q : nom, logo et couleur |
| [0.3.0] | 4 | 2026-09-15 | Démarrage et rotations instantanés |
| [0.2.0] | 3 | 2026-09-15 | Écran allumé plus fiable et mises à jour sûres |
| [0.1.0] | 2 | 2026-09-15 | Première version : diaporama PWA hors-ligne |

---

## [1.3.0] — 2026-09-22

Commits [`f0ad04f`](https://github.com/dezande/analyseur-q/commit/f0ad04f), [`db899b7`](https://github.com/dezande/analyseur-q/commit/db899b7), [`d0fbc5d`](https://github.com/dezande/analyseur-q/commit/d0fbc5d) — 32 commits

L'app se joue maintenant en français comme en anglais, et s'ouvre toujours prête à démarrer.

- **L'app parle français et anglais.** Tout est traduit : les slides, le menu, l'aide, le cadre de l'appareil, et jusqu'aux figures des cartes (`R D V` en français, `K Q J` en anglais, deux images). Seul le nom de l'app ne change pas. La langue se choisit sur la première slide, avec deux petits boutons `FR` / `EN` en haut à droite : tout bascule aussitôt sans quitter la slide, un appui dessus n'avance pas le diaporama, et le choix est enregistré comme les autres réglages. À la première ouverture, l'app suit la langue du téléphone.
- **Le texte s'écrit une fois par langue** : dans `src/content/slides.ts`, chaque champ accepte `{ fr: '…', en: '…' }` (ou un seul texte quand il est commun aux deux) ; le texte du menu est réuni dans le nouveau `src/content/interface.ts`, et `public/index.html` ne porte plus que des clés. Une traduction oubliée ou vide fait échouer `npm test`, dans les deux langues, images comprises. Les tests dans Chrome règlent la langue du « téléphone » page par page (l'option `--lang` de Chrome ne fait rien sous Linux, donc sur la CI), et vérifient le changement de langue, le menu traduit et la langue du téléphone à la première ouverture.
- **Ouverture toujours sur la première slide** : la slide en cours n'est plus enregistrée sur l'appareil, seulement gardée le temps de la session (sessionStorage). L'app est donc prête à jouer à chaque ouverture, même après une routine laissée en cours, alors qu'un rechargement de la page (mise à jour installée, onglet rouvert par le système) reprend toujours la slide affichée : jamais de retour au début en pleine routine. Les réglages, eux, restent enregistrés comme avant.
- **« Cartes à points »** au lieu de « cartes numérotées » sur la slide des cartes noires.
- **Journal des versions aligné sur le kit** : la vérification vient de `src/kit/node/check-changelog.ts` au lieu d'un script local (supprimé, ainsi que ses tests), et le fichier prend le format du kit — sections `## [1.2.0] — 2026-09-16`, « Non publié » en tête, liens vers les publications en bas. Les trois dépôts (kit, Analyseur Q, boule de cristal) tiennent donc leur journal de la même façon.

## [1.2.0] — 2026-09-16

Commits [`eb78c69`](https://github.com/dezande/analyseur-q/commit/eb78c69), [`be0423e`](https://github.com/dezande/analyseur-q/commit/be0423e), [`8d9633d`](https://github.com/dezande/analyseur-q/commit/8d9633d) — 26 commits

L'écran ne montre plus que la slide, et le projet se dote d'un journal des versions et de règles de branche.

- **`main` protégée** : aucun push direct, historique linéaire (fusion en rebase seulement), CI verte obligatoire pour fusionner, branche supprimée après fusion. `npm run deploy` ouvre désormais une pull request et attend sa fusion automatique (kit mis à jour).
- **Kit accroché à sa version `v1.1.0`**, une version nommée et publiée plutôt qu'un commit quelconque : le kit tient maintenant son propre journal, donc on sait ce qu'on prend en le mettant à jour. Rien ne change dans l'app — types, tests, build et les 47 tests dans Chrome passent à l'identique.
- **Numéro de slide et barre de progression retirés** de l'écran et du menu : l'écran ne montre plus que la slide et le cadre de l'appareil.
- **Version de Node figée** (`.nvmrc`, Node 24) pour les machines de développement comme pour la CI.
- **Ce journal**, avec la règle qui le tient à jour : `scripts/check-changelog.ts` refuse un changement qui ne le met pas à jour, la CI le lance avant toute autre étape (`npm run check:changelog` en local), et la règle est testée dans `tests/tools/`.
- Tags git et Releases GitHub posés rétroactivement sur les commits d'origine, de `v0.1.0` à `v1.1.1`.
## [1.1.1] — 2026-09-16

Commits [`0a6bcd5`](https://github.com/dezande/analyseur-q/commit/0a6bcd5), [`1af2742`](https://github.com/dezande/analyseur-q/commit/1af2742), [`cdbe5c1`](https://github.com/dezande/analyseur-q/commit/cdbe5c1) — 22 commits

Aucun changement dans le déroulé : deux débordements repérés par la CI sous Linux, où les polices sont plus larges.

- **Ajustement du texte** : une marge de 4 px, pour qu'une slide « tout juste » ne déborde pas sur un appareil aux polices différentes.
- **Bouton** : jamais plus large que la slide, son texte passe à la ligne. Son apparition ne joue plus que sur l'opacité, une mise à l'échelle faussant la mesure de l'ajustement.
- Les tests affichent les dimensions mesurées quand une slide déborde.

## [1.1.0] — 2026-09-16

Commits [`bbf73da`](https://github.com/dezande/analyseur-q/commit/bbf73da), [`c59d557`](https://github.com/dezande/analyseur-q/commit/c59d557) — 19 commits

Deux réponses à des essais sur scène : revenir au début sans quitter l'app, et ne plus traverser une slide sans la voir.

- **Bouton « Recommencer »** sur la dernière slide, qui ramène à la première (champ `boutonVers`). Un bouton qui ramène en arrière ne réagit qu'à un vrai appui : tap à droite, glissement et télécommande ne le déclenchent pas.
- **Délai d'activation** : un bouton ne s'active qu'après 0,7 s sur sa slide, et jamais tant qu'un doigt est posé. Le tap qui amène sur la slide, souvent suivi d'un autre, ne la fait plus traverser d'un coup. Le bouton apparaît en fondu pendant ce délai.
- Tests du délai, du doigt posé et du bouton pendant le fondu.

## [1.0.0] — 2026-09-15

Commit [`dc6ff3e`](https://github.com/dezande/analyseur-q/commit/dc6ff3e) — 17 commits

Première version jouable : le déroulé complet, l'habillage d'appareil, et des tests qui couvrent chaque cas.

- **Diaporama de test** (`tests/e2e/fixture.e2e.ts`) : chaque type de slide reste couvert même s'il disparaît du vrai déroulé — bouton et chargement, chargement automatique, zappé, en pause sur écran noir, arrêté par le menu, message de fin, notes, transition, image, étiquette, texte long, souris, raccourcis ignorés, jauge, doigt qui glisse, toucher interrompu.
- **Bug corrigé** : pendant le fondu, la slide qui disparaît interceptait l'appui sur le bouton de la nouvelle.
- Vrai diaporama : informations du menu et images vérifiées hors-ligne.

## [0.9.0] — 2026-09-15

Commits [`3359f8f`](https://github.com/dezande/analyseur-q/commit/3359f8f), [`5b1936a`](https://github.com/dezande/analyseur-q/commit/5b1936a), [`fbad3fe`](https://github.com/dezande/analyseur-q/commit/fbad3fe), [`e19afae`](https://github.com/dezande/analyseur-q/commit/e19afae) — 16 commits

Le déroulé prend sa forme : les sept résultats de l'analyse, illustrés, dans un cadre d'appareil de mesure.

- Slides des résultats : 24 cartes face en bas, 13 cartes rouges, royal flush à cœur, carreaux, aucune figure, cartes paires, sauf le 3 de pique, puis un remerciement.
- Images vectorielles dessinées pour l'app : main de royal flush, 3 de pique, figure barrée, carreau, cartes paires.
- **Cadre d'instrument** sur toutes les slides, étiquette « Résultat » toujours au même endroit, texte plus grand quand la slide n'a que du texte.

## [0.8.0] — 2026-09-15

Commits [`3881929`](https://github.com/dezande/analyseur-q/commit/3881929), [`13d63a1`](https://github.com/dezande/analyseur-q/commit/13d63a1), [`94f7602`](https://github.com/dezande/analyseur-q/commit/94f7602) — 12 commits

La mécanique du tour : on lance l'analyse, une barre progresse, les résultats s'affichent.

- Champ `bouton` : la slide attend un appui. Tant qu'il attend, « slide suivante » appuie dessus au lieu de sauter la slide ; sa zone de toucher déborde de 24 px.
- Champ `chargement` : fausse barre de progression irrégulière, en pause quand le menu est ouvert, l'écran noir ou l'app en arrière-plan.
- Champ `termine` : message affiché à 100 % sans changer de slide.

## [0.7.0] — 2026-09-15

Commit [`22912a8`](https://github.com/dezande/analyseur-q/commit/22912a8) — 9 commits

Écran allumé, portrait, hors-ligne, build, déploiement et pilotage de Chrome deviennent communs aux accessoires de scène.

- Sous-module `src/kit` : une correction du kit profite à toutes les apps.
- `package.json` décrit l'app au kit (préfixe de cache, ancien nom, fichiers requis).

## [0.6.0] — 2026-09-15

Commit [`c5600e4`](https://github.com/dezande/analyseur-q/commit/c5600e4) — 8 commits

Nouvelle adresse, et un bug qui cassait le mode hors-ligne des autres apps.

- Adresse `dezande.github.io/analyseur-q/` ; les réglages enregistrés sous l'ancien nom sont repris.
- **Bug corrigé** : à chaque mise à jour, l'app supprimait tous les caches du domaine, donc ceux de la boule de cristal.

## [0.5.0] — 2026-09-15

Commit [`c6c8c47`](https://github.com/dezande/analyseur-q/commit/c6c8c47) — 7 commits

L'app reste dans l'axe du téléphone, même tourné, et garde ses réglages d'une version à l'autre.

- Verrou portrait : sur iPhone, l'affichage pivote de ±90° ; gestes, marges et défilement du menu suivent le téléphone.
- Stockage persistant demandé au navigateur ; tests des réglages conservés après une mise à jour.
- **Bug corrigé** : le doigt de l'appui long cliquait dans le menu qui venait de s'ouvrir.

## [0.4.0] — 2026-09-15

Commits [`9731ca5`](https://github.com/dezande/analyseur-q/commit/9731ca5), [`bb95a5a`](https://github.com/dezande/analyseur-q/commit/bb95a5a) — 6 commits

L'habillage pseudo-scientifique : nom complet, nom court sous l'icône, logo et orange.

- Nom « Analyseur d'ondes quantiques des cartes à jouer », modèle AQ-52, « Analyseur Q » sous l'icône.
- Logo vectoriel (cadran, orbites, carte, onde), repris en icône ; couleur d'accent orange.

## [0.3.0] — 2026-09-15

Commit [`759f38b`](https://github.com/dezande/analyseur-q/commit/759f38b) — 4 commits

Le démarrage ne dépend plus du nombre de slides : seules la slide courante et ses voisines sont rendues.

- Téléphone simulé, 200 slides : démarrage 745 → 110 ms, rotation 300 → 1 ms.
- Le texte d'une slide est ajusté à sa première apparition.

## [0.2.0] — 2026-09-15

Commit [`b447e81`](https://github.com/dezande/analyseur-q/commit/b447e81) — 3 commits

Deux défauts qui se voyaient en scène.

- La vidéo muette reste active avec le Wake Lock : sur iPhone avant iOS 18.4, l'API seule ne garde pas l'écran allumé dans l'app installée.
- Une app ouverte pour la première fois se recharge aussi pour la version suivante ; nom du cache affiché dans le menu.

## [0.1.0] — 2026-09-15

Commits [`47d4c9d`](https://github.com/dezande/analyseur-q/commit/47d4c9d), [`0da74c8`](https://github.com/dezande/analyseur-q/commit/0da74c8) — 2 commits

Le système de slides, avant tout contenu de routine.

- Slides écrites dans `src/content/slides.ts` ; texte ajusté automatiquement à l'écran.
- Tap à droite ou à gauche, glissements, appui de 3 s pour le menu, clavier et télécommandes.
- Position et réglages enregistrés, écran toujours allumé, fonctionnement hors-ligne, tests et déploiement automatique.

---

### Publier une nouvelle version

À chaque changement, décrivez-le sous **« Non publié »**, dans le commit qui le porte. `npm run check:changelog` (la vérification du kit) contrôle la forme du journal et, en pull request comme sur `main`, refuse un changement qui ne s'explique pas. Un commit qui ne touche vraiment à rien (espaces, renommage sans effet) peut porter `[sans journal]` dans son message pour en être dispensé.

Le déploiement, lui, reste automatique : **chaque fusion sur `main` met l'app à jour** (voir le README). Le tag et la Release sont un geste à part, quand le contenu de « Non publié » mérite d'être nommé. La version se prépare dans une pull request comme le reste ; le tag se pose ensuite sur `main`, où la protection ne s'applique pas aux tags.

```sh
git switch -c version-1.3.0
# dans CHANGELOG.md : renommer « ## [Non publié] » en « ## [1.3.0] — 2026-09-16 »,
# ajouter la ligne au tableau du haut (nombre de commits : git rev-list --count HEAD)
# et le lien « [1.3.0]: …/releases/tag/v1.3.0 » en bas du fichier, puis :
git commit -am "Version 1.3.0"
git push -u origin version-1.3.0 && gh pr create --fill
gh pr merge --auto --rebase   # part dès que la CI est verte

git switch main && git pull
git tag -a v1.3.0 -m "Titre de la version"
git push origin v1.3.0
gh release create v1.3.0 --title "v1.3.0 — Titre" --notes-file notes.md
```

- **Correctif** (`1.0.x`) : corrections, tests, rien de visible dans le déroulé.
- **Mineur** (`1.x.0`) : nouvelle slide, nouveau champ, nouveau geste, sans rien casser.
- **Majeur** (`x.0.0`) : le déroulé ou les gestes changent au point de devoir réapprendre la routine.



[1.3.0]: https://github.com/dezande/analyseur-q/releases/tag/v1.3.0
[1.2.0]: https://github.com/dezande/analyseur-q/releases/tag/v1.2.0
[1.1.1]: https://github.com/dezande/analyseur-q/releases/tag/v1.1.1
[1.1.0]: https://github.com/dezande/analyseur-q/releases/tag/v1.1.0
[1.0.0]: https://github.com/dezande/analyseur-q/releases/tag/v1.0.0
[0.9.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.9.0
[0.8.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.8.0
[0.7.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.7.0
[0.6.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.6.0
[0.5.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.5.0
[0.4.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.4.0
[0.3.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.3.0
[0.2.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.2.0
[0.1.0]: https://github.com/dezande/analyseur-q/releases/tag/v0.1.0
