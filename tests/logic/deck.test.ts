import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, clampIndex, counterLabel } from '../../src/logic/deck.ts';

test('clampIndex : toute valeur relue donne un index valide', () => {
	assert.equal(clampIndex(2, 5), 2);
	assert.equal(clampIndex(9, 5), 4);
	assert.equal(clampIndex(-3, 5), 0);
	assert.equal(clampIndex(2.7, 5), 2);
	for (const raw of [null, undefined, '3', NaN, Infinity, {}]) assert.equal(clampIndex(raw, 5), 0);
	assert.equal(clampIndex(3, 0), 0);
});

test('applyMove : on s’arrête aux extrémités', () => {
	assert.equal(applyMove(0, 'next', 3), 1);
	assert.equal(applyMove(2, 'next', 3), 2);
	assert.equal(applyMove(0, 'prev', 3), 0);
	assert.equal(applyMove(2, 'prev', 3), 1);
	assert.equal(applyMove(1, 'first', 3), 0);
	assert.equal(applyMove(1, 'last', 3), 2);
});

test('counterLabel', () => {
	assert.equal(counterLabel(0, 12), '1 / 12');
});
