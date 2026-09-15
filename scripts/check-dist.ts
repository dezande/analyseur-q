// Vérifie que le build est complet : fichiers de base, icônes du manifest, images des slides.
// La liste du cache hors-ligne est générée ensuite à partir de dist/ (scripts/stamp-build.ts).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const errors: string[] = [];
const expectFile = (file: string, reason: string): void => {
	if (!existsSync(join(DIST, file))) errors.push(`${file} manquant (${reason})`);
};

for (const file of ['index.html', 'style.css', 'app.js', 'sw.js', 'manifest.json', 'content/slides.js', 'system/build.js']) {
	expectFile(file, 'fichier de base');
}

if (existsSync(join(DIST, 'manifest.json'))) {
	const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8')) as { icons: { src: string }[] };
	for (const icon of manifest.icons) expectFile(icon.src, 'icône du manifest');
}

if (errors.length > 0) {
	console.error(`Build incomplet :\n- ${errors.join('\n- ')}`);
	process.exit(1);
}
console.log('Build complet.');
