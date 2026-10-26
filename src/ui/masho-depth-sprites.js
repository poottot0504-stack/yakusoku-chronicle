import {palette as treeColors,pixels as treePixels,size} from '../data/masho-depth-tree-pixels.js';
import {palette as fireColors,pixels as firePixels} from '../data/masho-depth-fire-pixels.js';
import {palette as iceColors,pixels as icePixels} from '../data/masho-depth-ice-pixels.js';

const SYMBOLS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// Compact palette pixels are derived from the three submitted illustrations,
// resized to a uniform 56×52 battle-portrait canvas. Pixelated rendering keeps
// their proportions identical to the existing cave-boss viewport.
function spriteSvg(colors,rawPixels){
 const [w,h]=size;
 const pixels=String(rawPixels).padEnd(w*h,'A').slice(0,w*h);
 let rects='';
 for(let y=0;y<h;y++){
  for(let x=0;x<w;){
   const c=pixels[y*w+x];let run=1;
   while(x+run<w&&pixels[y*w+x+run]===c)run++;
   const color=colors[SYMBOLS.indexOf(c)]??'none';
   if(color!=='none')rects+=`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${color}"/>`;
   x+=run;
  }
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${rects}</svg>`;
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
const DATA={
 'masho26-yggdravain':{palette:treeColors,pixels:treePixels},
 'masho27-volgrad':{palette:fireColors,pixels:firePixels},
 'masho28-graciel':{palette:iceColors,pixels:icePixels}
};
export const MASHO_DEPTH_BOSS_ART=Object.fromEntries(Object.entries(DATA).map(([id,d],i)=>[id,{
 sheet:'masho-depth-'+(i+26),index:0,cols:1,rows:1,aspect:size[0]/size[1],
 src:spriteSvg(d.palette,d.pixels)
}]));
