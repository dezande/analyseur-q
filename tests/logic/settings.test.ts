import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, sanitizeSettings } from '../../src/logic/settings.ts';

test('données absentes ou abîmées : réglages par défaut', () => {
	for (const raw of [null, undefined, 'texte', 42, []]) assert.deepEqual(sanitizeSettings(raw), DEFAULTS);
});

test('réglages valides conservés', () => {
	const settings = { transition: 'glisse', showNotes: false, showHoldRing: false };
	assert.deepEqual(sanitizeSettings(settings), settings);
});

test('champ invalide : sa valeur par défaut, les autres conservés ; champs inconnus retirés', () => {
	assert.deepEqual(
		sanitizeSettings({ transition: 'zoom', showNotes: false, ancien: 1 }),
		{ ...DEFAULTS, showNotes: false },
	);
});
