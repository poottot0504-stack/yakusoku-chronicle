// Pointer Events work with iPhone/Android touch and desktop mouse.
// Keep each dock card tappable; only a deliberate horizontal drag reorders.
export function wirePartyDockDrag({root,onReorder}){
 if(!root||typeof onReorder!=='function')throw new Error('並び替えを初期化できません');
 let pointer=null,suppressClickUntil=0;
 const members=()=>[...root.querySelectorAll('.party-dock [data-dock-member]')];
 const hit=(x,y)=>members().find(button=>{
  const rect=button.getBoundingClientRect();
  return x>=rect.left&&x<=rect.right&&y>=rect.top-14&&y<=rect.bottom+14;
 })??null;
 const clear=()=>{
  root.querySelector('.party-dock')?.classList.remove('is-reordering');
  for(const button of members())button.classList.remove('is-dragging','is-drop-target');
 };
 root.addEventListener('pointerdown',event=>{
  const member=event.target.closest?.('.party-dock [data-dock-member]');
  if(!member||(event.pointerType==='mouse'&&event.button!==0))return;
  pointer={id:member.dataset.dockMember,number:event.pointerId,startX:event.clientX,startY:event.clientY,dragging:false};
 });
 root.addEventListener('pointermove',event=>{
  const p=pointer;
  if(!p||event.pointerId!==p.number)return;
  const dx=Math.abs(event.clientX-p.startX),dy=Math.abs(event.clientY-p.startY);
  if(!p.dragging){
   if(dx<14||dx<=dy)return;
   p.dragging=true;
   root.querySelector('.party-dock')?.classList.add('is-reordering');
   members().find(x=>x.dataset.dockMember===p.id)?.classList.add('is-dragging');
  }
  const over=hit(event.clientX,event.clientY);
  for(const button of members())button.classList.toggle('is-drop-target',button===over);
 });
 function finish(event,cancel=false){
  const p=pointer;if(!p||p.number!==event.pointerId)return;
  pointer=null;
  const drop=!cancel&&p.dragging?hit(event.clientX,event.clientY):null;
  clear();
  if(!p.dragging)return;
  suppressClickUntil=Date.now()+650;
  if(!drop||drop.dataset.dockMember===p.id)return;
  onReorder(p.id,drop.dataset.dockMember);
 }
 root.addEventListener('pointerup',event=>finish(event));
 root.addEventListener('pointercancel',event=>finish(event,true));
 // Prevent a drag releasing on another member from also selecting them.
 root.addEventListener('click',event=>{
  if(Date.now()>suppressClickUntil||!event.target.closest?.('.party-dock'))return;
  suppressClickUntil=0;event.preventDefault();event.stopImmediatePropagation();
 },true);
 return ()=>{pointer=null;clear();};
}
