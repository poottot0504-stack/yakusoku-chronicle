// Headless Chromium screen-and-touch checks for the unmerged arena prototype.
// Run via the arena-browser-qa GitHub Actions workflow; never deploys anything.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {arenaMarkup} from '../src/ui/arena.js';
import {createDefaultState} from '../src/core/save-schema.js';

const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
const browser=await chromium.launch({headless:true});
try{
 for(const device of [
  {name:'iPhone SE',viewport:{width:375,height:667},isMobile:true,hasTouch:true,deviceScaleFactor:2},
  {name:'iPhone 14',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3},
  {name:'PC',viewport:{width:1366,height:768},isMobile:false,hasTouch:false,deviceScaleFactor:1}
 ]){
  const page=await browser.newPage({viewport:device.viewport,isMobile:device.isMobile,hasTouch:device.hasTouch,deviceScaleFactor:device.deviceScaleFactor});
  const seen=[];
  await page.exposeFunction('recordArenaClick',name=>seen.push(name));
  const state=createDefaultState();
  const mount=async()=>page.setContent(`<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body style="margin:0"><main class="game-scroll" style="width:100%;box-sizing:border-box;padding:12px">${arenaMarkup(state)}</main><script>document.addEventListener('click',e=>{const b=e.target.closest('[data-arena-start],[data-arena-craft],[data-arena-enhance],[data-arena-back]');if(b)window.recordArenaClick(b.dataset.arenaStart??b.dataset.arenaCraft??b.dataset.arenaEnhance??'back')});</script></body></html>`);
  await mount();
  assert.equal(await page.locator('[data-arena-start]').count(),3,device.name+' quest count');
  assert.equal(await page.locator('[data-arena-craft]').count(),4,device.name+' only 4 coin products');
  assert.equal(await page.locator('[data-arena-craft]:disabled').count(),4,device.name+' zero coin balance disables orders');
  await page.locator('.arena-quest summary').first().click();
  assert.equal(await page.locator('.arena-quest details[open]').count(),1,device.name+' loadout accordion opens');
  await page.locator('[data-arena-start="arena30"]').click();
  assert.ok(seen.includes('arena30'),device.name+' quest start tap/click');
  const overflow=await page.evaluate(()=>({
   page:document.documentElement.scrollWidth,inner:window.innerWidth,
   arena:document.querySelector('.arena-view').getBoundingClientRect().width,
   linkCount:document.querySelectorAll('.arena-shop-item').length
  }));
  assert.ok(overflow.page<=overflow.inner+1,device.name+' horizontal overflow '+JSON.stringify(overflow));
  state.arena.coins=40;await mount();
  assert.equal(await page.locator('[data-arena-craft]:enabled').count(),4,device.name+' shop enabled with coins');
  await page.locator('[data-arena-craft="arena-guardian-shield"]').click();
  assert.ok(seen.includes('arena-guardian-shield'),device.name+' shop button works');
  await page.locator('[data-arena-back]').click();
  assert.ok(seen.includes('back'),device.name+' back button works');
  console.log('[arena-browser]',device.name,'PASS',JSON.stringify(overflow));
  await page.close();
 }
}finally{await browser.close();}
