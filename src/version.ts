/*
 * Numéro de version de l'app (semver) : celui du journal des versions (CHANGELOG.md) et des
 * étiquettes git. Il se change dans le commit « Version X.Y.Z », en même temps que le journal —
 * tests/logic/version.test.ts refuse un écart entre les deux.
 *
 * À ne pas confondre avec BUILD.version (kit/web/build.ts) : le nombre de commits, calculé au
 * build, qui dit exactement ce qui est installé sur un téléphone. Le menu affiche le numéro de
 * version ; le détail (build et commit) reste en bas, dans les informations.
 */

export const APP_VERSION = '1.4.0';
