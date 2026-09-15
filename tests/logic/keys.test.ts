import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyAction } from '../../src/logic/keys.ts';

test('touches des télécommandes de présentation et du clavier', () => {
	for (const key of ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']) assert.equal(keyAction(key), 'next', key);
	for (const key of ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']) assert.equal(keyAction(key), 'prev', key);
	assert.equal(keyAction('Home'), 'first');
	assert.equal(keyAction('End'), 'last');
	for (const key of ['Escape', 'm', 'M']) assert.equal(keyAction(key), 'menu', key);
	for (const key of ['b', 'B', '.']) assert.equal(keyAction(key), 'black', key);
});

test('autres touches : ignorées', () => {
	for (const key of ['a', 'Tab', 'Shift', 'toString', '__proto__']) assert.equal(keyAction(key), null, key);
});
