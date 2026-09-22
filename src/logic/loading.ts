/*
 * Fausse barre de chargement : progression irrégulière, comme un vrai chargement.
 * Fonction pure : testée sous Node (tests/logic/loading.test.ts).
 */

export const LOADING = {
	/** Durées acceptées pour le champ `chargement`, en secondes. */
	minSeconds: 1,
	maxSeconds: 120,
	/** Pause à 100 % avant de passer à la slide suivante, pour qu'on voie la barre pleine. */
	holdFullMs: 600,
} as const;

/**
 * Points de passage (temps écoulé, progression affichée), entre 0 et 1.
 * Démarrage rapide, deux paliers où « ça bloque », une accélération, puis un dernier pour-cent qui traîne.
 */
const KEYFRAMES: readonly (readonly [number, number])[] = [
	[0, 0],
	[0.12, 0.18],
	[0.22, 0.24],
	[0.3, 0.26],
	[0.42, 0.51],
	[0.55, 0.58],
	[0.64, 0.6],
	[0.78, 0.88],
	[0.9, 0.97],
	[0.97, 0.99],
	[1, 1],
];

/** Progression affichée (0 à 1, jamais en recul) pour une part `fraction` (0 à 1) de la durée écoulée. */
export function loadingProgress(fraction: number): number {
	if (!(fraction > 0)) return 0;
	if (fraction >= 1) return 1;
	for (let i = 1; i < KEYFRAMES.length; i++) {
		const [t1, p1] = KEYFRAMES[i];
		if (fraction <= t1) {
			const [t0, p0] = KEYFRAMES[i - 1];
			const local = (fraction - t0) / (t1 - t0);
			// Adouci dans chaque segment : la barre ralentit avant chaque point de passage.
			return p0 + (p1 - p0) * (1 - (1 - local) ** 2);
		}
	}
	return 1;
}

/** Pourcentage affiché, arrondi vers le bas : 100 % seulement quand c'est vraiment fini. */
export const percentLabel = (progress: number): string => `${Math.floor(progress * 100)} %`;

/**
 * Étape affichée (0 à count-1) pour une progression donnée : les étapes se partagent la barre
 * en parts égales, la dernière tient jusqu'à 100 %. -1 quand la slide n'a pas d'étapes.
 */
export function stepIndex(progress: number, count: number): number {
	if (count <= 0) return -1;
	const clamped = Math.min(1, Math.max(0, progress));
	return Math.min(count - 1, Math.floor(clamped * count));
}
