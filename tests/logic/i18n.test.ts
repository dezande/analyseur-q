// Les deux langues : textes traduits, forme des traductions, langue de départ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviceLang, isTexte, LANGS, t } from '../../src/logic/i18n.ts';
import { INTERFACE, ui } from '../../src/content/interface.ts';

test('t : texte commun aux deux langues, ou traduit', () => {
	assert.equal(t('AQ-52', 'fr'), 'AQ-52');
	assert.equal(t('AQ-52', 'en'), 'AQ-52');
	assert.equal(t({ fr: 'Résultat', en: 'Result' }, 'fr'), 'Résultat');
	assert.equal(t({ fr: 'Résultat', en: 'Result' }, 'en'), 'Result');
	assert.equal(t(undefined, 'fr'), undefined);
});

test('isTexte : une chaîne, ou les deux langues remplies', () => {
	assert.ok(isTexte(''));
	assert.ok(isTexte({ fr: 'a', en: 'b' }));
	assert.ok(!isTexte({ fr: 'a' }), 'traduction manquante');
	assert.ok(!isTexte({ fr: 'a', en: '  ' }), 'traduction vide');
	assert.ok(!isTexte({ fr: 'a', en: 'b', de: 'c' }), 'langue inconnue');
	assert.ok(!isTexte({ fr: 'a', en: 2 }), 'traduction qui n\'est pas du texte');
	for (const value of [null, undefined, 42, ['a', 'b']]) assert.ok(!isTexte(value), String(value));
});

test('deviceLang : anglais si le téléphone est en anglais, français sinon', () => {
	assert.equal(deviceLang(['en-US', 'fr-FR']), 'en');
	assert.equal(deviceLang(['fr-CA']), 'fr');
	assert.equal(deviceLang(['EN']), 'en');
	assert.equal(deviceLang(['es-ES', 'en']), 'en', 'la première langue connue l\'emporte');
	assert.equal(deviceLang(['es-ES']), 'fr', 'langue inconnue : français');
	assert.equal(deviceLang([]), 'fr');
	assert.equal(deviceLang(undefined), 'fr');
	assert.equal(deviceLang([null as never, 'en']), 'en', 'liste abîmée');
});

test('textes de l\'interface (src/content/interface.ts) : les deux langues partout', () => {
	for (const [cle, value] of Object.entries(INTERFACE)) {
		assert.ok(isTexte(value), `${cle} : texte incomplet`);
		for (const lang of LANGS) assert.ok(ui(cle as keyof typeof INTERFACE, lang).trim(), `${cle} (${lang}) : vide`);
	}
});
