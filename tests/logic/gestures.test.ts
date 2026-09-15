// Gestes : taps, glissements et appui long, avec des rythmes de vrai doigt (lents, hésitants, tremblants).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GESTURE, GestureTracker, type Tap } from '../../src/logic/gestures.ts';

const WIDTH = 390;
const RIGHT = { x: 300, y: 400 };
const LEFT = { x: 40, y: 400 };

/** Doigt posé en `from` à t=0, déplacé par étapes, levé en `to` au bout de `ms`. */
function gesture(from: { x: number; y: number }, to: { x: number; y: number }, ms: number, tracker = new GestureTracker()): Tap {
	tracker.press(1, from.x, from.y, 0);
	for (let step = 1; step <= 4; step++) {
		tracker.move(1, from.x + ((to.x - from.x) * step) / 4, from.y + ((to.y - from.y) * step) / 4);
	}
	return tracker.release(1, to.x, to.y, ms, WIDTH);
}

test('tap à droite : suivante ; tap sur le tiers gauche : précédente', () => {
	assert.equal(gesture(RIGHT, RIGHT, 80), 'next');
	assert.equal(gesture(LEFT, LEFT, 80), 'prev');
	assert.equal(gesture({ x: WIDTH * GESTURE.prevZone - 1, y: 10 }, { x: WIDTH * GESTURE.prevZone - 1, y: 10 }, 80), 'prev');
	assert.equal(gesture({ x: WIDTH * GESTURE.prevZone + 1, y: 10 }, { x: WIDTH * GESTURE.prevZone + 1, y: 10 }, 80), 'next');
});

test('tap humain : lent et qui tremble un peu, il compte quand même', () => {
	assert.equal(gesture(RIGHT, { x: RIGHT.x + 25, y: RIGHT.y - 20 }, 650), 'next');
	assert.equal(gesture(LEFT, { x: LEFT.x + 30, y: LEFT.y + 15 }, 700), 'prev');
});

test('tap : c’est la zone où le doigt s’est posé qui compte', () => {
	// Posé à gauche, roulé de 35 px vers la droite : toujours « précédente ».
	assert.equal(gesture({ x: 100, y: 400 }, { x: 135, y: 400 }, 200), 'prev');
});

test('appui relâché après la durée d’un tap mais avant le menu : rien', () => {
	assert.equal(gesture(RIGHT, RIGHT, GESTURE.tapMaxMs + 1), 'none');
	assert.equal(gesture(RIGHT, RIGHT, 2500), 'none');
});

test('glissement vers la gauche : suivante ; vers la droite : précédente, même lentement', () => {
	assert.equal(gesture({ x: 300, y: 400 }, { x: 180, y: 420 }, 150), 'next');
	assert.equal(gesture({ x: 100, y: 400 }, { x: 260, y: 380 }, 150), 'prev');
	assert.equal(gesture({ x: 300, y: 400 }, { x: 200, y: 430 }, 1800), 'next');
});

test('glissement surtout vertical ou trop court : rien', () => {
	assert.equal(gesture({ x: 200, y: 200 }, { x: 140, y: 500 }, 200), 'none');
	assert.equal(gesture({ x: 200, y: 400 }, { x: 155, y: 400 }, 200), 'none');
});

test('appui long : ouvre le menu une seule fois, et le relâcher ne change pas de slide', () => {
	const tracker = new GestureTracker();
	assert.equal(tracker.press(1, RIGHT.x, RIGHT.y, 0), true);
	tracker.move(1, RIGHT.x + 20, RIGHT.y + 20); // doigt qui bouge un peu pendant 3 s
	assert.equal(tracker.holdCompleted(1), true);
	assert.equal(tracker.holdCompleted(1), false);
	assert.equal(tracker.release(1, RIGHT.x, RIGHT.y, 3400, WIDTH), 'none');
});

test('appui long annulé par un mouvement franc', () => {
	const tracker = new GestureTracker();
	tracker.press(1, RIGHT.x, RIGHT.y, 0);
	assert.equal(tracker.move(1, RIGHT.x, RIGHT.y + GESTURE.slopPx + 5), true);
	assert.equal(tracker.holdCompleted(1), false);
});

test('second doigt : le geste est abandonné', () => {
	const tracker = new GestureTracker();
	tracker.press(1, RIGHT.x, RIGHT.y, 0);
	assert.equal(tracker.press(2, LEFT.x, LEFT.y, 50), false);
	assert.equal(tracker.holdCompleted(1), false);
	assert.equal(tracker.release(2, LEFT.x, LEFT.y, 100, WIDTH), 'none');
	assert.equal(tracker.release(1, RIGHT.x, RIGHT.y, 120, WIDTH), 'none');
	// Le geste suivant fonctionne normalement.
	assert.equal(gesture(RIGHT, RIGHT, 80, tracker), 'next');
});

test('contact interrompu par le système ou remise à zéro : rien ne se déclenche', () => {
	const tracker = new GestureTracker();
	tracker.press(1, RIGHT.x, RIGHT.y, 0);
	tracker.cancel(1);
	assert.equal(tracker.release(1, RIGHT.x, RIGHT.y, 80, WIDTH), 'none');
	tracker.press(1, RIGHT.x, RIGHT.y, 0);
	tracker.reset();
	assert.equal(tracker.holdCompleted(1), false);
	assert.equal(tracker.release(1, RIGHT.x, RIGHT.y, 80, WIDTH), 'none');
});
