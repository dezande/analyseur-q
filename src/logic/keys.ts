/*
 * Touches du clavier, et des télécommandes de présentation (qui envoient les mêmes touches).
 * Fonction pure : testée sous Node (tests/logic/keys.test.ts).
 */

import type { Move } from './deck.ts';

export type KeyAction = Move | 'menu' | 'black' | null;

const KEYS: Record<string, KeyAction> = {
	ArrowRight: 'next',
	ArrowDown: 'next',
	PageDown: 'next',
	' ': 'next',
	Enter: 'next',
	ArrowLeft: 'prev',
	ArrowUp: 'prev',
	PageUp: 'prev',
	Backspace: 'prev',
	Home: 'first',
	End: 'last',
	Escape: 'menu',
	m: 'menu',
	M: 'menu',
	// Bouton « écran noir » des télécommandes de présentation.
	b: 'black',
	B: 'black',
	'.': 'black',
};

export function keyAction(key: string): KeyAction {
	return Object.hasOwn(KEYS, key) ? KEYS[key] : null;
}
