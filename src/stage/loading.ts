/*
 * Animation de la fausse barre de chargement (champ `chargement` d'une slide).
 * La courbe de progression est dans logic/loading.ts.
 *
 * Le temps ne s'écoule que quand la slide est vraiment visible : il s'arrête menu ouvert,
 * écran noir, ou app en arrière-plan, pour ne jamais changer de slide dans le dos de l'artiste.
 */

import { LOADING, loadingProgress, percentLabel } from '../logic/loading.ts';
import { $ } from '../system/dom.ts';

const menu = $('#menu');
const black = $('#black');

/**
 * Écart maximal compté entre deux images. Assez large pour qu'un téléphone qui rame garde la bonne durée,
 * assez court pour qu'un gel (retour d'arrière-plan, appel) ne fasse pas sauter la barre.
 */
const MAX_FRAME_MS = 500;

let frame = 0;
let finishTimer = 0;

/** Arrête le chargement en cours, s'il y en a un. */
export function stopLoading(): void {
	cancelAnimationFrame(frame);
	clearTimeout(finishTimer);
	frame = 0;
	finishTimer = 0;
}

const isPaused = (): boolean => !menu.hidden || !black.hidden || document.visibilityState !== 'visible';

/** Lance le chargement de `section` depuis 0 ; `onDone` est appelé à 100 %, après une courte pause. */
export function startLoading(section: HTMLElement, seconds: number, onDone: () => void): void {
	stopLoading();
	const bar = section.querySelector<HTMLElement>('.chargement-bar');
	const percent = section.querySelector<HTMLElement>('.chargement-pourcent');
	if (!bar || !percent) return;

	const durationMs = seconds * 1000;
	let elapsed = 0;
	let last = performance.now();

	const draw = (): void => {
		const progress = loadingProgress(elapsed / durationMs);
		bar.style.transform = `scaleX(${progress})`;
		percent.textContent = percentLabel(progress);
	};

	const tick = (now: number): void => {
		if (!isPaused()) elapsed += Math.min(MAX_FRAME_MS, Math.max(0, now - last));
		last = now;
		draw();
		if (elapsed < durationMs) {
			frame = requestAnimationFrame(tick);
			return;
		}
		frame = 0;
		finishTimer = window.setTimeout(function finish() {
			// Menu ouvert ou écran noir à la dernière seconde : on attend qu'ils soient fermés.
			if (isPaused()) finishTimer = window.setTimeout(finish, 200);
			else onDone();
		}, LOADING.holdFullMs);
	};

	draw();
	frame = requestAnimationFrame(tick);
}
