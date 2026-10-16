function createPlatform() {
  const canvas = wx.createCanvas();
  let pointer = {}, resize = () => {}, hide = () => {}, show = () => {};
  function size() {
    const i = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const ratio = Math.min(i.pixelRatio || 1, 2);
    canvas.width = Math.floor(i.windowWidth * ratio); canvas.height = Math.floor(i.windowHeight * ratio);
    // Some DevTools versions expose safeArea in physical pixels while
    // windowWidth/windowHeight remain logical pixels. Normalize and clamp it
    // before layout math so the canvas cannot be scaled beyond the viewport.
    const raw=i.safeArea || {left:0,top:0,right:i.windowWidth,bottom:i.windowHeight};
    const safe={
      left:Math.max(0,Math.min(i.windowWidth,Number(raw.left)||0)),
      top:Math.max(0,Math.min(i.windowHeight,Number(raw.top)||0)),
      right:Math.max(0,Math.min(i.windowWidth,Number(raw.right)||i.windowWidth)),
      bottom:Math.max(0,Math.min(i.windowHeight,Number(raw.bottom)||i.windowHeight))
    };
    if(safe.right<=safe.left){safe.left=0;safe.right=i.windowWidth;}
    if(safe.bottom<=safe.top){safe.top=0;safe.bottom=i.windowHeight;}
    return {width:i.windowWidth,height:i.windowHeight,dpr:ratio,safe};
  }
  wx.onTouchStart(e => { if (e.touches[0] && pointer.down) pointer.down(e.touches[0].clientX,e.touches[0].clientY); });
  wx.onTouchMove(e => { if (e.touches[0] && pointer.move) pointer.move(e.touches[0].clientX,e.touches[0].clientY); });
  wx.onTouchEnd(() => pointer.up && pointer.up());
  wx.onTouchCancel(() => pointer.up && pointer.up());
  wx.onWindowResize(() => resize()); wx.onHide(() => hide()); wx.onShow(() => show());
  return {canvas,size,createImage:()=>wx.createImage(),requestFrame:fn=>requestAnimationFrame(fn),
    onPointer:fn=>{pointer=fn;},onResize:fn=>{resize=fn;},onHide:fn=>{hide=fn;},onShow:fn=>{show=fn;},
    storage:{get:k=>wx.getStorageSync(k)||null,set:(k,v)=>wx.setStorageSync(k,v),remove:k=>wx.removeStorageSync(k)},
    audio:()=>wx.createInnerAudioContext(),vibrate:()=>wx.vibrateShort({type:'light',fail:()=>{}}),
    now:()=>Date.now(),kind:'wechat',
    video:(url,onEnd,onError,onReady,options={})=>{
      const i=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();
      const muted=options.muted===true;
      const volume=typeof options.volume==='number'&&Number.isFinite(options.volume)?Math.max(0,Math.min(1,options.volume)):1;
      const topInset=typeof options.topInset==='number'&&Number.isFinite(options.topInset)?Math.max(0,Math.min(i.windowHeight-1,options.topInset)):60;
      let v=null,finished=false,ready=false,loadingTimer=null,playbackTimer=null;
      const settle=(result,error)=>{
        if(finished)return;
        finished=true;clearTimeout(loadingTimer);clearTimeout(playbackTimer);
        // Mark settled before destroy: some SDK versions emit onStop while destroying.
        if(v){try{v.destroy();}catch(_){}v=null;}
        if(result==='end'&&typeof onEnd==='function')onEnd();
        if(result==='error'&&typeof onError==='function')onError(error);
      };
      const played=()=>{if(finished||ready)return;ready=true;clearTimeout(loadingTimer);if(typeof onReady==='function')onReady();};
      try{
        // Native video overlays Canvas; caller supplies the scaled safe strip for skip UI.
        v=wx.createVideo({src:url,x:0,y:topInset,width:i.windowWidth,height:Math.max(1,i.windowHeight-topInset),controls:true,autoplay:true,objectFit:'contain',muted,volume});
        v.muted=muted;v.volume=volume;
        v.onEnded(()=>settle('end'));
        v.onError(error=>settle('error',error));
        v.onStop(()=>settle('end'));
        if(typeof v.onPlay==='function')v.onPlay(played);
        loadingTimer=setTimeout(()=>settle('error',new Error('CG loading timed out after 30 seconds')),30000);
        playbackTimer=setTimeout(()=>settle('error',new Error('CG playback timed out after 120 seconds')),120000);
      }catch(error){settle('error',error);}
      // Caller owns the skip action and modal transition; cancellation invokes no callback.
      return ()=>settle('cancel');
    },
    fetchJson:url=>new Promise((resolve,reject)=>wx.request({url,success:r=>r.statusCode===200?resolve(r.data):reject(new Error('HTTP '+r.statusCode)),fail:reject}))};
}
module.exports={createPlatform};
