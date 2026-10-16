// Presentation timing only: combat calculations and turn ordering stay synchronous.
export function frameDuration(frame={},last=false){
 const events=frame.visualEvents??[];
 const magic=events.some(e=>e.kind==='magic'&&e.amount>0)||frame.visualAction?.kind==='magic';
 const heal=events.some(e=>e.amount<0);
 const duration=magic?950:heal?760:events.some(e=>e.amount>0)?650:420;
 return last?Math.max(1100,duration):duration;
}
// Keep only the previous action's numbers. No game state or effect is replayed.
export function captureNumberTails(root){
 const stage=root?.querySelector('[data-battle-stage]');if(!stage)return [];
 const bounds=stage.getBoundingClientRect();if(!bounds.width||!bounds.height)return [];
 return [...stage.querySelectorAll('.scene-actor > .scene-number')].map(node=>{
  const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
  return {text:node.textContent,heal:node.classList.contains('is-heal'),x:(rect.left-bounds.left)/bounds.width*100,y:(rect.top-bounds.top)/bounds.height*100,fontSize:style.fontSize,opacity:Number(style.opacity)};
 }).filter(n=>n.opacity>.05);
}
export function appendNumberTails(root,tails){
 const stage=root?.querySelector('[data-battle-stage]');if(!stage)return;
 for(const tail of tails){const node=document.createElement('span');node.className=`scene-number scene-number-tail${tail.heal?' is-heal':''}`;node.textContent=tail.text;node.setAttribute('aria-hidden','true');Object.assign(node.style,{left:`${tail.x}%`,top:`${tail.y}%`,fontSize:tail.fontSize,'--tail-opacity':String(Math.min(.65,tail.opacity))});stage.append(node);setTimeout(()=>node.remove(),300);}
}
export function renderMotionFrame(root,markup){const tails=captureNumberTails(root);root.innerHTML=markup;appendNumberTails(root,tails);}
