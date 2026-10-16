export function captureHorizontalScroll(root,selector){
  const el=root?.querySelector?.(selector);
  return el?el.scrollLeft:null;
}

export function restoreHorizontalScroll(root,selector,saved,selectedSelector=''){
  const el=root?.querySelector?.(selector);
  if(!el)return;
  if(saved!==null&&saved!==undefined){el.scrollLeft=saved;return;}
  if(!selectedSelector)return;
  const selected=el.querySelector?.(selectedSelector);
  if(!selected)return;
  const left=selected.offsetLeft??0;
  const right=left+(selected.offsetWidth??0);
  const visibleLeft=el.scrollLeft??0;
  const visibleRight=visibleLeft+(el.clientWidth??0);
  if(left<visibleLeft)el.scrollLeft=left;
  else if(right>visibleRight)el.scrollLeft=Math.max(0,right-(el.clientWidth??0));
}
