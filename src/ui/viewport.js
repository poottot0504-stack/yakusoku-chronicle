// iOS browser bars can change the visible viewport without a page reload.
let viewportFrame;
function updateGameViewport(){
 cancelAnimationFrame(viewportFrame);
 viewportFrame=requestAnimationFrame(()=>{
  const height=window.visualViewport?.height??window.innerHeight;
  // Preserve pinch zoom; only resize the game at the normal page scale.
  if(height>0&&(!window.visualViewport||Math.abs(window.visualViewport.scale-1)<.01)){
   document.documentElement.style.setProperty('--game-viewport-height',`${Math.floor(height)}px`);
  }
 });
}
window.addEventListener('resize',updateGameViewport,{passive:true});
window.addEventListener('pageshow',updateGameViewport,{passive:true});
window.visualViewport?.addEventListener('resize',updateGameViewport,{passive:true});
updateGameViewport();
