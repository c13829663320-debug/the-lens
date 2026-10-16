function createPlatform() {
  const canvas=document.querySelector('canvas'); let pointer={};
  const coords=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointer.down&&pointer.down(...coords(e));});
  canvas.addEventListener('pointermove',e=>pointer.move&&pointer.move(...coords(e)));
  canvas.addEventListener('pointerup',()=>pointer.up&&pointer.up());
  canvas.addEventListener('pointercancel',()=>pointer.up&&pointer.up());
  return {canvas,kind:'browser',now:()=>Date.now(),
    size:()=>{const dpr=Math.min(devicePixelRatio||1,2),width=innerWidth,height=innerHeight;canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);return{width,height,dpr,safe:{left:0,top:0,right:width,bottom:height}};},
    createImage:()=>new Image(),requestFrame:fn=>requestAnimationFrame(fn),onPointer:fn=>{pointer=fn;},
    onResize:fn=>addEventListener('resize',fn),onHide:fn=>document.addEventListener('visibilitychange',()=>{if(document.hidden)fn();}),onShow:fn=>document.addEventListener('visibilitychange',()=>{if(!document.hidden)fn();}),
    storage:{get:k=>localStorage.getItem(k),set:(k,v)=>localStorage.setItem(k,v),remove:k=>localStorage.removeItem(k)},
    audio:()=>{const a=new Audio();return {set src(v){a.src=v;},set loop(v){a.loop=v;},set volume(v){a.volume=v;},play:()=>a.play().catch(()=>{}),pause:()=>a.pause(),stop:()=>{a.pause();a.currentTime=0;},onError:fn=>a.addEventListener('error',fn)};},
    vibrate:()=>navigator.vibrate&&navigator.vibrate(15),
    video:(url,onEnd,onError,onReady,options={})=>{
      const v=document.createElement('video');
      const close=document.createElement('button');
      let finished=false,ready=false,loadingTimer=null,playbackTimer=null;
      const settle=(result,error)=>{
        if(finished)return;
        finished=true;clearTimeout(loadingTimer);clearTimeout(playbackTimer);
        v.onended=v.onerror=v.onplaying=null;
        v.pause();v.remove();close.remove();
        if(result==='end'&&typeof onEnd==='function')onEnd();
        if(result==='error'&&typeof onError==='function')onError(error);
      };
      v.src=url;v.controls=true;v.playsInline=true;v.preload='auto';
      v.muted=options.muted===true;
      v.volume=typeof options.volume==='number'&&Number.isFinite(options.volume)?Math.max(0,Math.min(1,options.volume)):1;
      const requestedInset=typeof options.topInset==='number'&&Number.isFinite(options.topInset)?Math.max(0,options.topInset):60;
      const viewportHeight=typeof innerHeight==='number'&&Number.isFinite(innerHeight)?innerHeight:0;
      const topInset=viewportHeight>0?Math.min(Math.max(0,viewportHeight-1),requestedInset):requestedInset;
      v.style.cssText=`position:fixed;left:0;top:${topInset}px;width:100%;height:calc(100% - ${topInset}px);background:#000;z-index:9`;
      close.textContent='跳过';close.style.cssText=`position:fixed;right:20px;top:${Math.max(8,topInset-52)}px;z-index:10;min-height:44px;padding:10px 18px`;
      v.onended=()=>settle('end');v.onerror=error=>settle('error',error);
      v.onplaying=()=>{if(finished||ready)return;ready=true;clearTimeout(loadingTimer);if(typeof onReady==='function')onReady();};
      close.onclick=()=>settle('end');document.body.append(v,close);
      loadingTimer=setTimeout(()=>settle('error',new Error('CG loading timed out after 30 seconds')),30000);
      playbackTimer=setTimeout(()=>settle('error',new Error('CG playback timed out after 120 seconds')),120000);
      // Autoplay may be denied; visible native controls and skip remain usable.
      v.play().catch(()=>{});
      return ()=>settle('cancel');
    },
    fetchJson:url=>fetch(url).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();})};
}
module.exports={createPlatform};
