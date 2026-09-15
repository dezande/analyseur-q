/*
 * Gestes sur la scène (doigt, ou souris pour répéter sur ordinateur) et touches du clavier.
 * Les décisions sont prises par logic/gestures.ts et logic/keys.ts (testés sous Node) ;
 * ce module relaie les événements du navigateur et applique les effets.
 */

import { $ } from '../kit/web/dom.ts';
import { appPoint } from '../kit/web/orientation.ts';
import { keepScreenAwake } from '../kit/web/wake-lock.ts';
import { GESTURE, GestureTracker } from '../logic/gestures.ts';
import { keyAction } from '../logic/keys.ts';
import { closeMenu, holdReleased, isMenuOpen, openMenu } from '../settings/panel.ts';
import { settings } from '../settings/store.ts';
import { isBlack, move, setBlack } from './deck.ts';

const stage = $('#stage');
const ring = $('#hold-ring');

const gestures = new GestureTracker();
let holdTimer = 0;
let touchedSinceShown = false;

/**
 * Un toucher ou une touche depuis l'ouverture de l'app ou son retour au premier plan.
 * Tant que c'est le cas, une nouvelle version n'est pas chargée automatiquement (app.ts).
 */
export const wasTouchedSinceShown = (): boolean => touchedSinceShown;
export function forgetTouches(): void {
	touchedSinceShown = false;
}

/* ---------- Jauge de l'appui long ---------- */

/** La jauge n'apparaît qu'après un court instant : un tap normal ne la montre jamais. */
const RING_DELAY_MS = GESTURE.tapMaxMs;

function showRing(x: number, y: number): void {
	if (!settings.showHoldRing) return;
	ring.style.left = `${x}px`;
	ring.style.top = `${y}px`;
	ring.style.setProperty('--ring-delay', `${RING_DELAY_MS}ms`);
	ring.style.setProperty('--ring-duration', `${GESTURE.holdMs - RING_DELAY_MS}ms`);
	ring.hidden = false;
	// Relance l'animation CSS depuis le début.
	ring.classList.remove('run');
	void ring.offsetWidth;
	ring.classList.add('run');
}

function stopHold(): void {
	clearTimeout(holdTimer);
	holdTimer = 0;
	ring.hidden = true;
	ring.classList.remove('run');
}

/* ---------- Toucher ---------- */

// Coordonnées dans le repère de l'app, qui peut être pivotée (kit/web/orientation.ts).

stage.addEventListener('pointerdown', (event) => {
	if (event.pointerType === 'mouse' && event.button !== 0) return;
	void keepScreenAwake();
	touchedSinceShown = true;
	const { x, y } = appPoint(event.clientX, event.clientY);
	if (!gestures.press(event.pointerId, x, y, performance.now())) {
		stopHold();
		return;
	}
	const id = event.pointerId;
	// La souris qui sort de la scène ne perd pas son relâchement.
	try {
		stage.setPointerCapture(id);
	} catch {
		// Contact déjà terminé.
	}
	showRing(x, y);
	holdTimer = window.setTimeout(() => {
		stopHold();
		if (gestures.holdCompleted(id)) openMenu(true);
	}, GESTURE.holdMs);
});

stage.addEventListener('pointermove', (event) => {
	const { x, y } = appPoint(event.clientX, event.clientY);
	if (gestures.move(event.pointerId, x, y)) stopHold();
});

stage.addEventListener('pointerup', (event) => {
	stopHold();
	holdReleased();
	const { x, y } = appPoint(event.clientX, event.clientY);
	const tap = gestures.release(event.pointerId, x, y, performance.now(), stage.clientWidth);
	if (tap !== 'none') move(tap);
});

stage.addEventListener('pointercancel', (event) => {
	stopHold();
	holdReleased();
	gestures.cancel(event.pointerId);
});

// Pas de menu contextuel ni de loupe sur appui long.
stage.addEventListener('contextmenu', (event) => event.preventDefault());

/* ---------- Clavier et télécommande ---------- */

document.addEventListener('keydown', (event) => {
	if (event.metaKey || event.ctrlKey || event.altKey) return;
	const action = keyAction(event.key);
	if (!action) return;
	if (isMenuOpen()) {
		if (action === 'menu') {
			event.preventDefault();
			closeMenu();
		}
		return;
	}
	event.preventDefault();
	touchedSinceShown = true;
	void keepScreenAwake();
	if (action === 'menu') openMenu();
	else if (action === 'black') setBlack(!isBlack());
	else move(action);
});

// App en arrière-plan : aucun geste commencé ne doit se terminer plus tard.
document.addEventListener('visibilitychange', () => {
	stopHold();
	gestures.reset();
});
