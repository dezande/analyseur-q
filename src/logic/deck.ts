/*
 * Position dans le diaporama. Fonctions pures : testées sous Node (tests/logic/deck.test.ts).
 */

/** Ce que l'on demande au diaporama : un geste, une touche ou le menu. */
export type Move = 'next' | 'prev' | 'first' | 'last';

/** Index de slide valide pour `count` slides, à partir de n'importe quelle valeur (position relue sur l'appareil…). */
export function clampIndex(raw: unknown, count: number): number {
	if (count <= 0) return 0;
	const index = typeof raw === 'number' && Number.isFinite(raw) ? Math.trunc(raw) : 0;
	return Math.min(count - 1, Math.max(0, index));
}

/** Nouvel index après un déplacement. On s'arrête aux extrémités : pas de retour au début par erreur. */
export function applyMove(index: number, move: Move, count: number): number {
	switch (move) {
		case 'next': return clampIndex(index + 1, count);
		case 'prev': return clampIndex(index - 1, count);
		case 'first': return 0;
		case 'last': return clampIndex(count - 1, count);
	}
}

/** Texte du compteur, ex. « 3 / 12 ». */
export const counterLabel = (index: number, count: number): string => `${index + 1} / ${count}`;
