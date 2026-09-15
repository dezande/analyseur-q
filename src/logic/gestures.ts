/*
 * Décision de chaque geste sur la scène, sans DOM : testée sous Node (tests/logic/gestures.test.ts).
 *
 *   tap à droite (70 % de la largeur)   → slide suivante
 *   tap à gauche (30 % de la largeur)   → slide précédente
 *   glisser vers la gauche / la droite  → suivante / précédente
 *   appui de 3 s n'importe où           → menu
 *
 * Réglé pour un vrai doigt, pas pour un robot : un tap peut durer, trembler de quelques dizaines
 * de pixels ; un glissement peut être lent. Un appui relâché entre le tap et les 3 s ne fait rien,
 * ce qui permet d'abandonner un appui long sans changer de slide.
 */

export const GESTURE = {
	/** Mouvement toléré pendant un tap ou un appui long, en pixels. */
	slopPx: 40,
	/** Au-delà de cette durée, un appui relâché n'est plus un tap (et ne fait rien). */
	tapMaxMs: 800,
	/** Durée de l'appui qui ouvre le menu. */
	holdMs: 3000,
	/** Distance horizontale minimale d'un glissement, en pixels. */
	swipeMinPx: 50,
	/** Part de la largeur, à gauche, où un tap revient en arrière. */
	prevZone: 0.3,
} as const;

export type Tap = 'next' | 'prev' | 'none';

interface Contact {
	id: number;
	x: number;
	y: number;
	at: number;
	/** Le doigt s'est trop déplacé : plus un tap ni un appui long. */
	moved: boolean;
	/** Un second doigt s'est posé : le geste est abandonné. */
	cancelled: boolean;
	/** L'appui long a ouvert le menu : le relâcher ne fait rien. */
	held: boolean;
}

/** Suit un seul doigt à la fois ; un second doigt annule le geste en cours. */
export class GestureTracker {
	#contact: Contact | null = null;

	/** Doigt posé. Renvoie true si ce contact peut devenir un appui long (lancer la minuterie). */
	press(id: number, x: number, y: number, now: number): boolean {
		if (this.#contact) {
			this.#contact.cancelled = true;
			return false;
		}
		this.#contact = { id, x, y, at: now, moved: false, cancelled: false, held: false };
		return true;
	}

	/** Doigt déplacé. Renvoie true si le mouvement vient d'annuler l'appui long. */
	move(id: number, x: number, y: number): boolean {
		const c = this.#contact;
		if (!c || c.id !== id || c.moved) return false;
		if (Math.hypot(x - c.x, y - c.y) > GESTURE.slopPx) {
			c.moved = true;
			return true;
		}
		return false;
	}

	/** La minuterie de l'appui long est arrivée à terme : true si le menu doit s'ouvrir. */
	holdCompleted(id: number): boolean {
		const c = this.#contact;
		if (!c || c.id !== id || c.moved || c.cancelled || c.held) return false;
		c.held = true;
		return true;
	}

	/** Doigt levé, à la position (x, y), sur une scène de largeur `width`. */
	release(id: number, x: number, y: number, now: number, width: number): Tap {
		const c = this.#contact;
		if (!c || c.id !== id) return 'none';
		this.#contact = null;
		if (c.cancelled || c.held) return 'none';

		const dx = x - c.x;
		const dy = y - c.y;
		if (Math.abs(dx) >= GESTURE.swipeMinPx && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'next' : 'prev';
		if (c.moved || Math.hypot(dx, dy) > GESTURE.slopPx) return 'none';
		if (now - c.at > GESTURE.tapMaxMs) return 'none';
		return c.x < width * GESTURE.prevZone ? 'prev' : 'next';
	}

	/** Contact interrompu par le système (appel, notification…) : rien ne se déclenche. */
	cancel(id: number): void {
		if (this.#contact?.id === id) this.#contact = null;
	}

	/** Oublie tout (menu ouvert, app en arrière-plan). */
	reset(): void {
		this.#contact = null;
	}
}
