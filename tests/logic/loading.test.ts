import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadingProgress, percentLabel, stepIndex } from '../../src/logic/loading.ts';

test('loadingProgress : de 0 à 1, bornée', () => {
	assert.equal(loadingProgress(0), 0);
	assert.equal(loadingProgress(1), 1);
	assert.equal(loadingProgress(-2), 0);
	assert.equal(loadingProgress(3), 1);
	assert.equal(loadingProgress(NaN), 0);
});

test('loadingProgress : ne recule jamais, et reste irrégulière (pas une droite)', () => {
	let previous = 0;
	let maxGap = 0;
	for (let i = 1; i <= 1000; i++) {
		const t = i / 1000;
		const p = loadingProgress(t);
		assert.ok(p >= previous, `recul à ${t} : ${p} < ${previous}`);
		assert.ok(p <= 1);
		previous = p;
		maxGap = Math.max(maxGap, Math.abs(p - t));
	}
	assert.ok(maxGap > 0.05, 'progression visiblement différente d\'une droite');
});

test('percentLabel : 100 % seulement à la fin', () => {
	assert.equal(percentLabel(0), '0 %');
	assert.equal(percentLabel(0.999), '99 %');
	assert.equal(percentLabel(loadingProgress(0.999)), '99 %');
	assert.equal(percentLabel(1), '100 %');
});

test('stepIndex : les étapes se partagent la progression, la dernière tient jusqu\'à 100 %', () => {
	assert.equal(stepIndex(0, 4), 0);
	assert.equal(stepIndex(0.24, 4), 0);
	assert.equal(stepIndex(0.25, 4), 1);
	assert.equal(stepIndex(0.99, 4), 3);
	assert.equal(stepIndex(1, 4), 3, 'à 100 %, la dernière étape reste affichée');
	assert.equal(stepIndex(2, 4), 3, 'progression hors bornes');
	assert.equal(stepIndex(-1, 4), 0);
	assert.equal(stepIndex(0.5, 1), 0);
});

test('stepIndex : sans étape, rien à afficher', () => {
	assert.equal(stepIndex(0.5, 0), -1);
	assert.equal(stepIndex(0.5, -3), -1);
});
