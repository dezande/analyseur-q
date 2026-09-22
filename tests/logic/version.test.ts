// Le numéro de version de l'app (src/version.ts) et le journal des versions doivent dire la même
// chose : sinon le menu annonce une version qui n'existe pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_VERSION } from '../../src/version.ts';

/** Dernière version publiée du journal (« Non publié », sans numéro, est ignorée). */
function lastReleased(): string {
	const changelog = readFileSync('CHANGELOG.md', 'utf8');
	const match = changelog.match(/^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$/m);
	assert.ok(match, 'aucune version dans CHANGELOG.md');
	return match[1];
}

test('APP_VERSION suit le journal des versions', () => {
	assert.match(APP_VERSION, /^\d+\.\d+\.\d+$/);
	assert.equal(
		APP_VERSION,
		lastReleased(),
		'src/version.ts et la dernière version de CHANGELOG.md doivent correspondre (à changer ensemble, dans le commit « Version X.Y.Z »)',
	);
});
