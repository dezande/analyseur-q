// Mise en valeur, paragraphes, vérification des slides… et vérification du vrai contenu (content/slides.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SLIDES } from '../../src/content/slides.ts';
import { checkSlides, paragraphs, parseInline } from '../../src/logic/slides.ts';

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

test('checkSlides : erreurs lisibles', () => {
	const none = (): boolean => false;
	assert.deepEqual(checkSlides([], none), ['aucune slide']);
	assert.deepEqual(checkSlides([{ note: 'seulement une note' }], none), ['slide 1 : rien à afficher (titre, grand, texte, image ou chargement)']);
	assert.deepEqual(checkSlides([{ titre: 'ok' }, { titre: '   ' }], none), ['slide 2 : rien à afficher (titre, grand, texte, image ou chargement)']);
	const typo = checkSlides([{ titre: 'x', txte: 'faute' } as never], none);
	assert.equal(typo.length, 1);
	assert.match(typo[0], /champ inconnu « txte »/);
	assert.deepEqual(checkSlides([{ image: 'carte.png' }], none), ['slide 1 : l\'image doit être dans images/ (reçu « carte.png »)']);
	assert.deepEqual(checkSlides([{ image: 'images/carte.png' }], none), ['slide 1 : image introuvable public/images/carte.png']);
	assert.deepEqual(checkSlides([{ image: 'images/carte.png' }], () => true), []);
});

test('checkSlides : chargement', () => {
	const none = (): boolean => false;
	assert.deepEqual(checkSlides([{ chargement: 5 }, { titre: 'suite' }], none), [], 'un chargement seul suffit');
	assert.deepEqual(checkSlides([{ titre: 'x', chargement: 0 }, { titre: 'suite' }], none), ['slide 1 : chargement en secondes, entre 1 et 120 (reçu « 0 »)']);
	assert.deepEqual(checkSlides([{ titre: 'x', chargement: '5' as never }, { titre: 'suite' }], none), ['slide 1 : chargement en secondes, entre 1 et 120 (reçu « 5 »)']);
	assert.equal(checkSlides([{ titre: 'x', chargement: NaN }, { titre: 'suite' }], none).length, 1);
	assert.deepEqual(checkSlides([{ titre: 'x' }, { titre: 'fin', chargement: 5 }], none), ['slide 2 : chargement sur la dernière slide, il n\'y a pas de slide suivante']);
});

test('contenu du diaporama (src/content/slides.ts) : sans erreur', () => {
	const errors = checkSlides(SLIDES, (path) => existsSync(join('public', path)));
	assert.deepEqual(errors, [], `Slides à corriger :\n- ${errors.join('\n- ')}`);
});
