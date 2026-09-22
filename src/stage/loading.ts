/*
 * Animation du faux chargement (champ `chargement` d'une slide) : cadran qui se remplit,
 * pourcentage et étapes annoncées l'une après l'autre (champ `etapes`).
 * La courbe de progression est dans logic/loading.ts.
 *
 * Le temps ne s'écoule que quand la slide est vraiment visible : il s'arrête menu ouvert,
 * écran noir, ou app en arrière-plan, pour ne jamais changer de slide dans le dos de l'artiste.
 */

import { LOADING, loadingProgress, percentLabel, stepIndex } from '../logic/loading.ts';
import { $ } from '../kit/web/dom.ts';

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

/**
 * Lance le chargement de `section` depuis 0 ; `onDone` est appelé à 100 %, après une courte pause.
 * `steps` : les étapes à annoncer sous le cadran, dans l'ordre (vide s'il n'y en a pas).
 */
export function startLoading(section: HTMLElement, seconds: number, steps: readonly string[], onDone: () => void): void {
	stopLoading();
	const dial = section.querySelector<HTMLElement>('.chargement-cadran');
	const arc = section.querySelector<SVGCircleElement>('.chargement-arc');
	const percent = section.querySelector<HTMLElement>('.chargement-pourcent');
	const step = section.querySelector<HTMLElement>('.chargement-etape');
	if (!dial || !arc || !percent) return;

	const durationMs = seconds * 1000;
	let elapsed = 0;
	let last = performance.now();
	let shownStep = -1;

	const draw = (): void => {
		const progress = loadingProgress(elapsed / durationMs);
		// L'anneau se règle en pour-cent (pathLength = 100), le camembert par --part.
		arc.style.strokeDasharray = `${progress * 100} 100`;
		dial.style.setProperty('--part', `${progress * 100}%`);
		// Le texte ne change qu'une centaine de fois : inutile de le réécrire à chaque image.
		const label = percentLabel(progress);
		if (percent.textContent !== label) percent.textContent = label;
		const index = stepIndex(progress, steps.length);
		if (step && index !== shownStep) {
			shownStep = index;
			step.textContent = steps[index] ?? '';
			// Relance le fondu d'apparition de la nouvelle étape.
			step.classList.remove('apparait');
			void step.offsetWidth;
			step.classList.add('apparait');
		}
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
