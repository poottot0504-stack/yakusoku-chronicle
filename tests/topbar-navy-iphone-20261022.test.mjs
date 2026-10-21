import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('app topbar has a luminous navy background instead of a near-black strip',()=>{
 const match=css.match(/\.topbar\{([^}]*)\}/);
 assert.ok(match,'topbar rule exists');
 const rule=match[1];
 assert.match(rule,/background:linear-gradient\(/);
 assert.doesNotMatch(rule,/background:rgba\(7,11,19/);
 assert.match(rule,/-webkit-backdrop-filter:none;backdrop-filter:none/);
 assert.match(rule,/border-bottom:1px solid #4a6281/);
});
test('money and level pills match the new header without losing contrast or layout',()=>{
 const pill=css.match(/\.top-resources span\{([^}]*)\}/)?.[1]??'';
 assert.match(pill,/background:rgba\(47,70,108/);
 assert.match(pill,/color:#f8f2df/);
 assert.match(main,/class=\"topbar\"/);
 assert.match(main,/class=\"brand\"/);
 assert.match(main,/class=\"top-resources\"/);
 assert.match(main,/state\.gold\?\?0/);
});
test('header css is refreshed in browsers with previous cached styles',()=>{
 assert.match(html,/main\.css\?v=[^\" ]*topbar-navy-20261022/);
 assert.match(css,/@media \(max-width:520px\)\{\.topbar\{height:48px\}/);
});
