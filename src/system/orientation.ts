/*
 * Verrou portrait. L'app installée sur Android le demande au système (manifest.json) ;
 * sur iPhone, une page web ne peut pas verrouiller l'orientation : quand le téléphone passe en
 * paysage, toute l'app (#app) pivote pour rester dans l'axe du téléphone.
 * Calculs : logic/orientation.ts.
 */

import { appSize, portraitRotation, toAppPoint, type Rotation, type Viewport } from '../logic/orientation.ts';
import { $ } from './dom.ts';

const app = $('#app');
const coarse = matchMedia('(pointer: coarse)');

let rotation: Rotation = 0;

function viewport(): Viewport {
	const legacy = (window as { orientation?: number }).orientation;
	return {
		width: window.innerWidth,
		height: window.innerHeight,
		angle: screen.orientation?.angle ?? legacy ?? 0,
		touch: coarse.matches,
	};
}

/** Recalcule la rotation. Appelé avant l'ajustement du texte, qui attend l'image suivante (stage/deck.ts). */
function update(): void {
	const v = viewport();
	rotation = portraitRotation(v);
	const size = appSize(v, rotation);
	app.dataset.rotation = String(rotation);
	app.style.setProperty('--app-w', `${size.width}px`);
	app.style.setProperty('--app-h', `${size.height}px`);
}

/** Point de l'écran (clientX, clientY) dans le repère de l'app, pivotée ou non. */
export function appPoint(clientX: number, clientY: number): { x: number; y: number } {
	return toAppPoint(clientX, clientY, viewport(), rotation);
}

window.addEventListener('resize', update);
screen.orientation?.addEventListener('change', () => {
	update();
	// Certains navigateurs changent l'angle sans redimensionner : le texte est réajusté quand même.
	window.dispatchEvent(new Event('resize'));
});
coarse.addEventListener('change', update);
update();
