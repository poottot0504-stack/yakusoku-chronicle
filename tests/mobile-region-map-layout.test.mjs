import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewGame} from '../src/state/game-state.js';
import {createDefaultRoster} from '../src/data/characters.js';
import {ensureAdventureState} from '../src/core/adventure.js';
import {adventureMarkup} from '../src/ui/adventure.js';

test('world map keeps mining counter as an explicit separate grid row',()=>{
 const s=ensureAdventureState(createNewGame(createDefaultRoster()));
 s.gathering={miningCharges:{field:2,forest:4,volcano:3}};
 const markup=adventureMarkup(s);
 assert.match(markup,/data-region="field"/);
 assert.match(markup,/class="region-mining-count">⛏️ 採掘 残り2回/);
 assert.match(markup,/class="region-mining-count">⛏️ 採掘 残り4回/);
 assert.equal((markup.match(/class="region-mining-count"/g)||[]).length,10);
});

test('mobile CSS gives Japanese names a non-collapsing second grid column',()=>{
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.match(css,/\.region-card\{display:grid;grid-template-columns:2rem minmax\(0,1fr\)/);
 assert.match(css,/\.region-card>strong\{grid-column:2;grid-row:1;min-width:0/);
 assert.match(css,/\.region-card>\.region-mining-count\{grid-column:1\/-1;grid-row:3/);
 assert.match(css,/\.region-card \.stage-lock-note\{grid-column:1\/-1;grid-row:4/);
 assert.doesNotMatch(css,/\.region-card\{display:grid;grid-template-columns:auto 1fr/);
});

test('production HTML invalidates old stylesheet cache after the layout fix',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/styles\/main\.css\?v=mobile-region-map-20261018-v2/);
});
