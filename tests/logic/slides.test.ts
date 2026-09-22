// Mise en valeur, paragraphes, vérification des slides… et vérification du vrai contenu (content/slides.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SLIDES } from '../../src/content/slides.ts';
import { checkSlides, paragraphs, parseInline, slideLabel } from '../../src/logic/slides.ts';

test('parseInline : **mises en valeur**', () => {
	assert.deepEqual(parseInline('un **mot** ici'), [
		{ text: 'un ', strong: false },
		{ text: 'mot', strong: true },
		{ text: ' ici', strong: false },
	]);
	assert.deepEqual(parseInline('**tout**'), [{ text: 'tout', strong: true }]);
	assert.deepEqual(parseInline('rien'), [{ text: 'rien', strong: false }]);
});

test('parseInline : un ** sans partenaire reste visible', () => {
	assert.deepEqual(parseInline('a **b'), [{ text: 'a **b', strong: false }]);
	assert.deepEqual(parseInline('**a** et **b'), [
		{ text: 'a', strong: true },
		{ text: ' et **b', strong: false },
	]);
});

test('parseInline : jamais de HTML interprété (le texte est gardé tel quel)', () => {
	assert.deepEqual(parseInline('<b>x</b>'), [{ text: '<b>x</b>', strong: false }]);
});

test('paragraphs : ligne vide = paragraphe, retour à la ligne conservé', () => {
	assert.deepEqual(paragraphs('\n  un\ndeux  \n\n\n trois \n'), [['un', 'deux'], ['trois']]);
	assert.deepEqual(paragraphs('a\r\n\r\nb'), [['a'], ['b']]);
	assert.deepEqual(paragraphs('a\n  \nb'), [['a'], ['b']]);
	assert.deepEqual(paragraphs('   '), []);
});

test('slideLabel : titre court pour le menu', () => {
	assert.equal(slideLabel({ titre: 'Rain **Man**', texte: 'x' }, 'fr'), 'Rain Man');
	assert.equal(slideLabel({ grand: '52', texte: 'x' }, 'fr'), '52');
	assert.equal(slideLabel({ texte: 'une\n\n  ligne' }, 'fr'), 'une ligne');
	const long = slideLabel({ texte: 'mot '.repeat(40) }, 'fr');
	assert.equal(long.length, 60);
	assert.ok(long.endsWith('…'));
});

test('slideLabel : dans la langue demandée, chargement compris', () => {
	const slide = { titre: { fr: 'Analyse en cours', en: 'Analysis in progress' } };
	assert.equal(slideLabel(slide, 'fr'), 'Analyse en cours');
	assert.equal(slideLabel(slide, 'en'), 'Analysis in progress');
	assert.equal(slideLabel({ chargement: 5 }, 'fr'), 'Chargement');
	assert.equal(slideLabel({ chargement: 5 }, 'en'), 'Loading');
});

test('checkSlides : erreurs lisibles', () => {
	const none = (): boolean => false;
	assert.deepEqual(checkSlides([], none), ['aucune slide']);
	assert.deepEqual(checkSlides([{ note: 'seulement une note' }], none), ['slide 1 : rien à afficher (titre, grand, texte, image, chargement ou bouton)']);
	assert.deepEqual(checkSlides([{ titre: 'ok' }, { titre: '   ' }], none), ['slide 2 : champ « titre » vide']);
	const typo = checkSlides([{ titre: 'x', txte: 'faute' } as never], none);
	assert.equal(typo.length, 1);
	assert.match(typo[0], /champ inconnu « txte »/);
	assert.deepEqual(checkSlides([{ image: 'carte.png' }], none), ['slide 1 : l\'image doit être dans images/ (reçu « carte.png »)']);
	assert.deepEqual(checkSlides([{ image: 'images/carte.png' }], none), ['slide 1 : image introuvable public/images/carte.png']);
	assert.deepEqual(checkSlides([{ image: 'images/carte.png' }], () => true), []);
});

test('checkSlides : bouton', () => {
	const none = (): boolean => false;
	assert.deepEqual(checkSlides([{ bouton: 'Lancer l\'analyse', chargement: 5 }, { titre: 'suite' }], none), [], 'un bouton seul suffit');
	assert.deepEqual(checkSlides([{ titre: 'x', bouton: '  ' }, { titre: 'suite' }], none), ['slide 1 : champ « bouton » vide']);
	assert.deepEqual(checkSlides([{ titre: 'x' }, { titre: 'fin', bouton: 'Suivant' }], none), ['slide 2 : bouton sur la dernière slide, il n\'y a pas de slide suivante (indiquer boutonVers)']);
});

test('checkSlides : boutonVers', () => {
	const none = (): boolean => false;
	assert.deepEqual(checkSlides([{ titre: 'x' }, { titre: 'fin', bouton: 'Recommencer', boutonVers: 1 }], none), [], 'bouton Recommencer sur la dernière slide');
	assert.deepEqual(checkSlides([{ titre: 'x', boutonVers: 2 }, { titre: 'y' }], none), ['slide 1 : boutonVers sans bouton']);
	for (const target of [0, 3, 1.5, '1']) {
		const errors = checkSlides([{ titre: 'x' }, { titre: 'fin', bouton: 'B', boutonVers: target as number }], none);
		assert.equal(errors.length, 1, String(target));
		assert.match(errors[0], /boutonVers doit être un numéro de slide entre 1 et 2/);
	}
});

test('checkSlides : message termine', () => {
	const none = (): boolean => false;
	assert.deepEqual(checkSlides([{ titre: 'x' }, { titre: 'Analyse', chargement: 5, termine: 'Terminée' }], none), [], 'avec un message, le chargement peut finir le diaporama');
	assert.deepEqual(checkSlides([{ titre: 'x', termine: 'Terminée' }, { titre: 'suite' }], none), ['slide 1 : message termine sans chargement']);
	assert.deepEqual(checkSlides([{ titre: 'x', chargement: 5, termine: ' ' }, { titre: 'suite' }], none), ['slide 1 : champ « termine » vide']);
});

test('checkSlides : chargement', () => {
	const none = (): boolean => false;
	assert.deepEqual(checkSlides([{ chargement: 5 }, { titre: 'suite' }], none), [], 'un chargement seul suffit');
	assert.deepEqual(checkSlides([{ titre: 'x', chargement: 0 }, { titre: 'suite' }], none), ['slide 1 : chargement en secondes, entre 1 et 120 (reçu « 0 »)']);
	assert.deepEqual(checkSlides([{ titre: 'x', chargement: '5' as never }, { titre: 'suite' }], none), ['slide 1 : chargement en secondes, entre 1 et 120 (reçu « 5 »)']);
	assert.equal(checkSlides([{ titre: 'x', chargement: NaN }, { titre: 'suite' }], none).length, 1);
	assert.deepEqual(checkSlides([{ titre: 'x' }, { titre: 'fin', chargement: 5 }], none), ['slide 2 : chargement sur la dernière slide, il n\'y a pas de slide suivante (ajouter un message termine)']);
});

test('checkSlides : les deux langues', () => {
	const none = (): boolean => false;
	const both = (): boolean => true;
	assert.deepEqual(checkSlides([{ titre: { fr: 'Résultat', en: 'Result' } }], none), [], 'texte traduit');

	const missing = checkSlides([{ titre: { fr: 'Résultat' } as never }], none);
	assert.equal(missing.length, 1);
	assert.match(missing[0], /champ « titre » : un texte, ou un texte par langue/);

	const empty = checkSlides([{ titre: { fr: 'Résultat', en: '  ' } }], none);
	assert.equal(empty.length, 1);
	assert.match(empty[0], /champ « titre »/);

	assert.deepEqual(
		checkSlides([{ image: { fr: 'images/figure.svg', en: 'images/figure-en.svg' } }], (path) => path.endsWith('figure.svg')),
		['slide 1 (en) : image introuvable public/images/figure-en.svg'],
		'image manquante dans une seule langue',
	);
	assert.deepEqual(checkSlides([{ image: { fr: 'images/a.svg', en: 'images/b.svg' } }], both), []);
});

test('contenu du diaporama (src/content/slides.ts) : sans erreur', () => {
	const errors = checkSlides(SLIDES, (path) => existsSync(join('public', path)));
	assert.deepEqual(errors, [], `Slides à corriger :\n- ${errors.join('\n- ')}`);
});
