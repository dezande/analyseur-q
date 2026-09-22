import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, sanitizeSettings } from '../../src/logic/settings.ts';

test('données absentes ou abîmées : réglages par défaut', () => {
	for (const raw of [null, undefined, 'texte', 42, []]) assert.deepEqual(sanitizeSettings(raw), DEFAULTS);
});

test('réglages valides conservés', () => {
	const settings = { langue: 'en', transition: 'glisse', showNotes: false, showHoldRing: false };
	assert.deepEqual(sanitizeSettings(settings), settings);
});

test('champ invalide : sa valeur par défaut, les autres conservés ; champs inconnus retirés', () => {
	assert.deepEqual(
		sanitizeSettings({ transition: 'zoom', showNotes: false, ancien: 1 }),
		{ ...DEFAULTS, showNotes: false },
	);
});

test('langue : celle enregistrée, sinon celle du téléphone passée en second argument', () => {
	assert.deepEqual(sanitizeSettings(null, 'en'), { ...DEFAULTS, langue: 'en' }, 'rien d\'enregistré');
	assert.equal(sanitizeSettings({ langue: 'de' }, 'en').langue, 'en', 'langue inconnue');
	assert.equal(sanitizeSettings({ langue: 'fr' }, 'en').langue, 'fr', 'le choix enregistré l\'emporte');
	assert.equal(sanitizeSettings({ langue: 'en' }, 'fr').langue, 'en');
});
