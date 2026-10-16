(function(){const modules={
"platform/browser-entry.js":function(module,exports,__require){
const {createPlatform}=__require("platform/browser.js");
const {Game}=__require("ui/game.js");
const app=new Game(createPlatform());
// Read-only inspection for automated QA; all mutations still use the real pointer UI.
window.__lens={snapshot:()=>app.snapshot()};
app.start();

},
"platform/browser.js":function(module,exports,__require){
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

},
"ui/game.js":function(module,exports,__require){
const {SCENES,CLUES}=__require("data/chapter.js");
const {GameModel,createState}=__require("systems/model.js");
const {SaveStore}=__require("systems/storage.js");
const {Assets}=__require("systems/assets.js");
const {AudioSystem}=__require("systems/audio.js");
const MEDIA=__require("data/media.js");
const {COLORS:C,rect,text,wrap,cover,contain,containFrame,circle}=__require("ui/draw.js");
const Strokes=__require("ui/strokes.js");

class Game {
  constructor(platform){
    this.p=platform;this.ctx=platform.canvas.getContext('2d');this.assets=new Assets(platform);
    this.store=new SaveStore(platform.storage);const loaded=this.store.load();this.hasSave=!!loaded.state;
    this.model=new GameModel(loaded.state||createState(),()=>{this.dirty=true;});
    this.audio=new AudioSystem(platform,m=>this.toast(m));this.screen='title';this.modal=null;this.mode='reality';
    this.hits=[];this.notices=[];this.loadedWarning=loaded.warning;this.lastTime=0;this.lastSave=0;this.savedTime=null;
    this.hidden=false;this.dirty=false;this.fade=0;this.drag=null;this.drawings=[];this.bookPage=0;this.epilogue=0;
    this.player={x:.16,y:.76,targetX:.16,targetY:.76,sceneId:null};this.walkTime=0;this.lensTime=0;
    this.titlePath='assets/scenes/scene_S01_reality_1280_v1.jpg';this.assets.load(this.titlePath);
    this.assets.load('assets/scenes/scene_S01_memory_1280_v1.jpg');
    this.remoteClips={};this.mediaReady=this.loadMedia();
    this.resize();platform.onResize(()=>this.resize());
    platform.onPointer({down:(x,y)=>this.down(x,y),move:(x,y)=>this.move(x,y),up:()=>this.up()});
    platform.onHide(()=>{this.hidden=true;this.save();this.audio.pause();});
    platform.onShow(()=>{this.hidden=false;this.lastTime=0;if(this.screen==='explore')this.audio.environment(this.mode);});
  }
  start(){this.p.requestFrame(t=>this.frame(t));if(this.loadedWarning)this.toast(this.loadedWarning,9000);}
  resize(){const previous=this.W&&Strokes.bounds(this.W,this.H);this.size=this.p.size();const size=this.size||{};const width=Math.max(1,Number(size.width)||1),height=Math.max(1,Number(size.height)||1),raw=size.safe||{};const clamp=(value,fallback,max)=>{const number=Number(value);return Number.isFinite(number)?Math.max(0,Math.min(max,number)):fallback;};const left=clamp(raw.left,0,width),top=clamp(raw.top,0,height),rightCandidate=clamp(raw.right,width,width),bottomCandidate=clamp(raw.bottom,height,height),right=rightCandidate>left?rightCandidate:width,bottom=bottomCandidate>top?bottomCandidate:height;const aw=Math.max(1,right-left),ah=Math.max(1,bottom-top);this.portrait=aw/ah<1.25;this.W=this.portrait?600:1000;this.H=this.portrait?1050:600;this.scale=Math.min(aw/this.W,ah/this.H);this.ox=left+(aw-this.W*this.scale)/2;this.oy=top+(ah-this.H*this.scale)/2;if(previous&&this.modal&&this.modal.type==='draw'){this.up();this.modal.strokes=Strokes.resizeStrokes(this.modal.strokes,previous,Strokes.bounds(this.W,this.H));}this.drag=null;}
  snapshot(){return {screen:this.screen,modal:this.modal&&this.modal.type,mode:this.mode,state:JSON.parse(JSON.stringify(this.model.state)),savedTime:this.savedTime,notices:this.notices.map(n=>n.text),hits:this.hits.map(h=>({label:h.label,x:this.ox+(h.x+h.w/2)*this.scale,y:this.oy+(h.y+h.h/2)*this.scale,w:h.w*this.scale,h:h.h*this.scale}))};}
  toast(value,duration=5000){this.notices=[...this.notices.slice(-1),{text:value,until:this.p.now()+duration}];}
  save(){if(!this.dirty&&!this.hasSave)return;const r=this.store.save(this.model.state);if(r.ok){this.dirty=false;this.hasSave=true;this.savedTime=this.p.now();}else if(this.saveError!==r.error){this.saveError=r.error;this.toast('本地存档未成功：'+r.error,12000);}this.lastSave=this.p.now();}
  begin(){this.model.restartChapter();this.screen='explore';this.mode='reality';this.dirty=true;this.enter(true);this.save();}
  resume(){this.screen='explore';this.mode='reality';if(this.model.state.completed){this.startEpilogue();return;}this.enter(false);}
  async loadMedia(){if(!MEDIA.baseUrl)return;try{const base=MEDIA.baseUrl.replace(/\/$/,'');const manifest=await this.p.fetchJson(base+MEDIA.manifestPath);if(manifest.version!==1||!Array.isArray(manifest.assets))throw Error('清单格式异常');for(const a of manifest.assets){if(a.type==='video/mp4'&&typeof a.id==='string'&&typeof a.url==='string'&&a.url.startsWith('/media/'))this.remoteClips[a.id]={url:base+a.url};}}catch{this.toast('CG服务暂不可用，将使用包内场景。');}}
  async enter(intro=true){
    this.mode='reality';this.fade=this.model.state.settings.lowMotion?0:0.8;this.modal=null;this.sceneImage=null;const s=this.model.scene;this.resetPlayer(s.id);
    this.assets.retain([s.reality,s.memory,this.titlePath,'assets/scenes/scene_S01_memory_1280_v1.jpg']);
    await Promise.all([this.assets.load(s.reality),this.assets.load(s.memory)]);
    this.audio.apply(this.model.state.settings);this.audio.environment(s.id==='S08'||s.id==='S09'?'cave':'reality');
    if(intro&&s.intro&&s.intro.length)this.dialogue(s.intro,()=>this.optionalCG(s.id));
  }
  optionalCG(sceneId){const id=(MEDIA.sceneClips||{})[sceneId],clip=MEDIA.clips[sceneId]||this.remoteClips[id];if(!clip||!clip.url)return;this.modal={type:'cg'};this.audio.pause();const settings=this.model.state.settings;this.closeVideo=this.p.video(clip.url,()=>{this.modal=null;this.audio.environment(this.mode);},()=>{this.modal=null;this.toast('CG加载失败，已恢复场景。');this.audio.environment(this.mode);},()=>{}, {muted:!settings.audio,volume:settings.volume,topInset:this.oy+60*this.scale});}
  dialogue(lines,done){if(!lines||!lines.length){if(done)done();return;}this.modal={type:'dialogue',lines,index:0,done};}
  nextDialogue(){const m=this.modal;if(++m.index>=m.lines.length){this.modal=null;if(m.done)m.done();}}
  observe(object){
    if(object.id==='drawing'&&!this.model.state.clues.includes(object.clue.id)){this.modal={type:'draw',object,strokes:[],current:null};return;}
    if(object.id==='starAlignment'&&!this.model.state.clues.includes(object.clue.id)){this.modal={type:'stars',object,cx:this.W*.43,cy:this.H*.52};return;}
    const r=this.model.observe(object.id,this.mode);if(!r.ok){this.toast(r.message);return;}
    if(this.model.scene.id==='S10'){this.sceneImage=object.id==='sleeper'?'assets/scenes/scene_S10_sleeper_1280_v1.jpg':'assets/scenes/scene_S10_elite_1280_v1.jpg';this.assets.load(this.sceneImage);}
    if(r.newClue)this.toast('线索已记录 · '+object.clue.title,3000);
    this.save();this.dialogue(r.dialogue||object.dialogue);if(this.model.state.settings.vibration)this.p.vibrate();
  }
  toggleLens(){if(!this.model.canLens){this.toast(this.model.state.battery<=0?'透镜已断电。镜缘的刻点仍在。':'在旧终端中寻找透镜。');return;}if(!this.model.scene.memory){this.toast('这里没有可复现的影像。');return;}this.mode=this.mode==='reality'?'memory':'reality';this.fade=this.model.state.settings.lowMotion?0:0.28;this.audio.environment(this.mode);this.audio.cue('switch');}
  puzzle(){this.modal={type:'puzzle',feedback:''};}
  attempt(id){const r=this.model.attempt(id,this.mode);if(r.ok){this.audio.cue('success');this.save();this.modal={type:'success',message:r.message};}else{this.modal.feedback=r.message;if(this.model.state.settings.vibration)this.p.vibrate();}}
  proceed(){const s=this.model.scene;this.dialogue(s.outro||[],()=>{if(!this.model.advance()){this.toast('先完成当前场景。');return;}this.save();if(this.model.state.completed)this.startEpilogue();else this.enter(true);});}
  startEpilogue(){this.screen='epilogue';this.modal=null;this.mode='reality';this.epilogue=0;this.assets.load('assets/scenes/scene_S09_reality_1280_v1.jpg');this.audio.environment('reality');}
  finish(){this.screen='ending';this.modal=null;this.endingTime=this.p.now();this.fade=0;this.audio.environment('ending');}
  frame(time){const dt=this.lastTime?Math.min((time-this.lastTime)/1000,.1):0;this.lastTime=time;
    this.lensTime+=dt;
    if(!this.hidden&&this.screen==='explore'&&!this.modal)this.updatePlayer(dt);
    if(!this.hidden&&this.screen==='explore'&&!this.modal){this.model.tick(dt,this.mode);if(this.model.state.battery<=0&&this.mode==='memory'){this.mode='reality';this.toast('透镜的光熄灭了。');this.audio.environment(this.model.scene.id==='S08'||this.model.scene.id==='S09'?'cave':'reality');}}
    if(this.dirty&&this.p.now()-this.lastSave>3000)this.save();
    this.fade=Math.max(0,this.fade-dt*1.5);if(!this.model.state.settings.lowMotion||!this.lastRender||time-this.lastRender>=32){this.render();this.lastRender=time;}this.p.requestFrame(t=>this.frame(t));}
  resetPlayer(sceneId){
    const starts={S10:[.18,.74],S01:[.18,.76],S02:[.16,.78],S06:[.22,.76],S03:[.2,.76],S04:[.2,.76],S05:[.18,.74],S07:[.18,.76],S08:[.18,.76],S09:[.16,.76]};
    const p=starts[sceneId]||starts.S01;this.player={x:p[0],y:p[1],targetX:p[0],targetY:p[1],sceneId};this.walkTime=0;
  }
  updatePlayer(dt){
    if(!this.player||this.player.sceneId!==this.model.scene.id)return;
    const dx=this.player.targetX-this.player.x,dy=this.player.targetY-this.player.y,d=Math.hypot(dx,dy);
    if(d<.002){this.player.x=this.player.targetX;this.player.y=this.player.targetY;return;}
    const step=Math.min(d,dt*.7);this.player.x+=dx/d*step;this.player.y+=dy/d*step;this.walkTime+=dt;
  }
  movePlayerTo(x,y){
    const stage=this.stage();this.player.targetX=Math.max(.08,Math.min(.92,(x-stage.x)/stage.w));this.player.targetY=Math.max(.16,Math.min(.9,(y-stage.y)/stage.h));
  }
  interactAt(object,x,y){
    const stage=this.stage(),tx=Math.max(0,Math.min(1,(x-stage.x)/stage.w)),ty=Math.max(0,Math.min(1,(y-stage.y)/stage.h));
    const distance=Math.hypot(this.player.x-tx,this.player.y-ty);
    if(distance>.2){this.movePlayerTo(x,y);this.toast('阿迟走近了 '+object.label+'。',1200);return;}
    this.observe(object);
  }
  drawActor(stage,x,y,label,color,primary=false){
    const c=this.ctx,px=stage.x+x*stage.w,py=stage.y+y*stage.h,walk=Math.sin(this.walkTime*8)*1.5;
    c.save();c.globalAlpha=primary?1:.82;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=2;
    c.beginPath();c.arc(px,py-15,6,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(px,py-8);c.lineTo(px,py+10);c.moveTo(px,py-2);c.lineTo(px-7,py+5);c.moveTo(px,py-2);c.lineTo(px+7,py+5);c.moveTo(px,py+10);c.lineTo(px-6,py+20+walk);c.moveTo(px,py+10);c.lineTo(px+6,py+20-walk);c.stroke();
    text(c,label,px,py+34,13,color,'center');c.restore();
  }
  drawActors(stage){
    this.drawActor(stage,this.player.x,this.player.y,'阿迟',C.accent,true);
    const id=this.model.scene.id;
    if(id==='S02'||id==='S06')this.drawActor(stage,.76,.65,'小花','#d2c5a1');
    if(id==='S05')this.drawActor(stage,.27,.59,'小花','#d2c5a1');
    if(id==='S05'||id==='S07')this.drawActor(stage,.72,.52,'族长','#a9b3aa');
  }
  drawLensOverlay(stage,state){
    if(this.mode!=='memory')return;
    const c=this.ctx,W=this.W,H=this.H,low=state.battery<18,alpha=low?.16:.08;
    c.save();c.strokeStyle=low?'#d27b62':'#cbb98c';c.lineWidth=2;c.strokeRect(stage.x+5,stage.y+5,stage.w-10,stage.h-10);
    const g=c.createRadialGradient(stage.x+stage.w/2,stage.y+stage.h/2,Math.min(stage.w,stage.h)*.18,stage.x+stage.w/2,stage.y+stage.h/2,Math.max(stage.w,stage.h)*.68);g.addColorStop(0,'rgba(203,185,140,0)');g.addColorStop(1,`rgba(203,185,140,${alpha})`);c.fillStyle=g;c.fillRect(stage.x,stage.y,stage.w,stage.h);
    const jitter=low?Math.sin(this.lensTime*18)*2:0;c.globalAlpha=.8;c.strokeStyle=low?'#d27b62':'#cbb98c';c.beginPath();c.moveTo(stage.x+18+jitter,stage.y+18);c.lineTo(stage.x+52+jitter,stage.y+18);c.moveTo(stage.x+18,stage.y+18);c.lineTo(stage.x+18,stage.y+42);c.moveTo(stage.x+stage.w-18-jitter,stage.y+stage.h-18);c.lineTo(stage.x+stage.w-52-jitter,stage.y+stage.h-18);c.moveTo(stage.x+stage.w-18,stage.y+stage.h-18);c.lineTo(stage.x+stage.w-18,stage.y+stage.h-42);c.stroke();
    text(c,low?'影像失真 · 低电':'影像层 · 非实体',stage.x+stage.w-20,stage.y+24,13,low?'#d27b62':'#cbb98c','right');c.restore();
  }
  hitAt(x,y,min){let selected=null,best=Infinity;for(let i=0;i<this.hits.length;i++){const h=this.hits[i],ex=Math.max(0,(min-h.w)/2),ey=Math.max(0,(min-h.h)/2);if(x<h.x-ex||x>h.x+h.w+ex||y<h.y-ey||y>h.y+h.h+ey)continue;const distance=Math.hypot(x-(h.x+h.w/2),y-(h.y+h.h/2));if(distance<best||(distance===best&&selected&&i>selected.index)){selected={hit:h,index:i};best=distance;}}if(selected){selected.hit.fn();return true;}return false;}
  down(px,py){const x=(px-this.ox)/this.scale,y=(py-this.oy)/this.scale;
    const min=44/this.scale;
    if(this.hitAt(x,y,min))return;
    const m=this.modal;
    if(m&&m.type==='draw'&&x>50&&x<this.W-50&&y>155&&y<this.H-155){if(m.current)this.up();if(m.strokes.length>=Strokes.MAX_STROKES){this.toast('已留下80笔。可以保留画痕，或擦去后重画。');return;}m.current=[[x,y]];m.strokes.push(m.current);this.drag='draw';}
    if(m&&m.type==='stars'&&y>150&&y<this.H-150){this.drag='stars';this.dragOffset=[x-m.cx,y-m.cy];}
    if(this.screen==='explore'&&!this.modal){const stage=this.stage();if(x>=stage.x&&x<=stage.x+stage.w&&y>=stage.y&&y<=stage.y+stage.h){this.movePlayerTo(x,y);return;}}
    if(this.screen==='ending'&&this.p.now()-this.endingTime>4500){this.screen='title';this.audio.pause();}
  }
  move(px,py){const x=(px-this.ox)/this.scale,y=(py-this.oy)/this.scale,m=this.modal;if(!this.drag||!m)return;
    if(this.drag==='draw'&&m.current&&x>50&&x<this.W-50&&y>155&&y<this.H-155)Strokes.appendPoint(m.current,[x,y]);
    if(this.drag==='stars'){m.cx=Math.max(90,Math.min(this.W-90,x-this.dragOffset[0]));m.cy=Math.max(190,Math.min(this.H-170,y-this.dragOffset[1]));}}
  up(){if(this.modal&&this.modal.current){if(this.modal.type==='draw')Strokes.finishStroke(this.modal.strokes,this.modal.current);this.modal.current=null;}this.drag=null;}
  hit(label,x,y,w,h,fn){this.hits.push({label,x,y,w,h,fn});}
  button(label,x,y,w,fn,primary=false,h=48){const c=this.ctx;rect(c,x,y,w,h,primary?C.paper:'#111a18e8',primary?C.paper:'#69736a',4);text(c,label,x+w/2,y+h/2,20,primary?'#17221d':C.paper,'center');this.hit(label,x,y,w,h,fn);}
  line(x,y,w,color=C.line){const c=this.ctx;c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.strokeStyle=color;c.lineWidth=1;c.stroke();}
  render(){const c=this.ctx;c.setTransform(this.size.dpr,0,0,this.size.dpr,0,0);c.fillStyle='#080b0a';c.fillRect(0,0,this.size.width,this.size.height);c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);this.hits=[];
    if(this.screen==='title')this.renderTitle();else if(this.screen==='explore')this.renderExplore();else if(this.screen==='epilogue')this.renderEpilogue();else this.renderEnding();
    if(this.modal)this.renderModal();
    if(this.fade>0){c.fillStyle=`rgba(4,8,6,${this.fade})`;c.fillRect(0,0,this.W,this.H);}
    this.notices=this.notices.filter(n=>n.until>this.p.now());if(this.notices.length&&this.screen!=='ending'){const n=this.notices[this.notices.length-1];rect(c,24,this.H-105,this.W-48,48,'#0a1410f5',C.line,4);wrap(c,n.text,40,this.H-81,this.W-80,17,C.paper,22,2);}
  }
  renderTitle(){const c=this.ctx,W=this.W,H=this.H;cover(c,this.assets.get(this.titlePath),0,0,W,H);
    const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'#07100df5');g.addColorStop(.6,'#07100d9a');g.addColorStop(1,'#07100d35');c.fillStyle=g;c.fillRect(0,0,W,H);
    const x=this.portrait?44:74,cy=this.portrait?310:160;
    text(c,'交 互 叙 事  /  一 百 年 后',x,cy-64,16,C.muted);text(c,'透 镜',x,cy+10,this.portrait?94:88,C.paper,'left','serif');
    text(c,'T H E   L E N S',x+5,cy+82,23,C.accent);this.line(x,cy+118,280,C.accent);
    wrap(c,'风穿过废墟。\n一枚透镜，仍留着过去的光。',x,cy+156,this.portrait?480:370,21,C.paper,34);
    const by=this.portrait?660:cy+252;this.button('开始旅程  →',x,by,250,()=>{if(this.hasSave)this.modal={type:'confirm',message:'开始新旅程将替换现有本地进度。',action:()=>this.begin()};else this.begin();},true);
    this.button(this.hasSave?'继续旅程':'继续旅程 · 暂无存档',x,by+62,250,()=>{if(this.hasSave)this.resume();else this.toast('尚无本地旅程，先选择开始旅程。');});
    const ey=this.portrait?H-108:H-54;this.button('设置',x,ey,105,()=>this.modal={type:'settings'},false,42);this.button('制作信息',x+120,ey,136,()=>this.modal={type:'credits'},false,42);
    if(!this.portrait){const mx=W-250,my=H*.46,r=155;c.save();circle(c,mx,my,r);c.clip();cover(c,this.assets.get('assets/scenes/scene_S01_memory_1280_v1.jpg'),W-475,80,450,420);c.restore();circle(c,mx,my,r,C.accent);circle(c,mx,my,r+8,'#a7996b50');text(c,'MEMORY / 001',mx,my+r+36,14,C.accent,'center');}
    text(c,'原作最终剧本改编 · 本地存档',W-32,H-22,13,C.muted,'right');
  }
  // Reserve a dedicated HUD band below the artwork. Keeping this boundary in
  // one place prevents objective/status copy from being painted over the scene
  // on short landscape viewports and in the WeChat simulator. The compact
  // landscape header leaves more of the artwork visible while keeping a fixed
  // band for controls below it.
  stage(){return this.portrait?{x:0,y:142,w:this.W,h:420}:{x:128,y:76,w:744,h:420};}
  renderExplore(){const c=this.ctx,s=this.model.scene,W=this.W,H=this.H,stage=this.stage(),state=this.model.state;
    rect(c,0,0,W,H,C.bg);const active=this.sceneImage||(this.mode==='memory'&&s.memory?s.memory:s.reality);
    // Keep the source artwork's full 16:9 composition visible inside the
    // reserved scene band; cover() used to crop important upper/lower detail.
    const activeImage=this.assets.get(active),imageFrame=containFrame(activeImage,stage.x,stage.y,stage.w,stage.h);
    contain(c,activeImage,stage.x,stage.y,stage.w,stage.h,C.bg);
    // Reality remains visible in a thin comparison strip. Source images aren't perfectly registered.
    if(this.mode==='memory'){const realityStrip=Math.min(stage.w*.13,120);c.save();c.beginPath();c.rect(stage.x,stage.y,realityStrip,stage.h);c.clip();cover(c,this.assets.get(s.reality),stage.x,stage.y,stage.w,stage.h);c.restore();c.beginPath();c.moveTo(stage.x+realityStrip,stage.y);c.lineTo(stage.x+realityStrip,stage.y+stage.h);c.strokeStyle=C.accent;c.lineWidth=1;c.stroke();this.line(stage.x,stage.y+stage.h,stage.w,C.accent);}
    const grad=c.createLinearGradient(0,stage.y+stage.h-90,0,stage.y+stage.h);grad.addColorStop(0,'#0c101000');grad.addColorStop(1,C.bg);c.fillStyle=grad;c.fillRect(0,stage.y,stage.w,stage.h);
    this.drawLensOverlay(stage,state);
    const header=this.portrait?{brand:24,title:62,goal:108}:{brand:20,title:48,goal:70};
    text(c,'T H E   L E N S',24,header.brand,15,C.accent);text(c,s.subtitle||s.title,24,header.title,25,C.paper,'left','serif');
    const idx=SCENES.findIndex(sc=>sc.id===s.id);text(c,`${String(idx+1).padStart(2,'0')} / ${SCENES.length}`,W-160,22,15,C.muted,'right');this.button('暂停',W-128,8,102,()=>{this.save();this.modal={type:'settings'};},false,44);
    if(this.portrait)wrap(c,s.goal,24,header.goal,W-48,19,C.muted,26,2);else text(c,s.goal,24,header.goal,17,C.muted);
    // Keep the scene image clear. Mode/status text belongs to the HUD below it;
    // drawing it at stage.y used to cover the artwork near the top edge.
    if(s.id==='S04'&&this.mode==='memory'){const cx=136,cy=stage.y+145;rect(c,44,stage.y+55,184,185,'#111a18e8',C.line,3);text(c,'旧档案 / 五颗星',136,stage.y+78,16,C.accent,'center');this.starPoints(cx,cy).forEach(([x,y])=>circle(c,x,y,3.2,null,C.paper));text(c,'留给还想知道的人',136,stage.y+219,14,C.muted,'center');}
    if(this.assets.error(active)){rect(c,40,stage.y+60,W-80,110,'#0a1210e8',C.line);text(c,'场景图片加载失败，观察条目仍可使用。',W/2,stage.y+94,20,C.paper,'center');this.button('重试加载',W/2-80,stage.y+115,160,()=>this.assets.load(active,true));}
    const objects=s.objects.filter(o=>o.mode==='both'||o.mode===this.mode);
    for(const [i,o] of objects.entries()){
      let x=imageFrame.x+o.x*imageFrame.w,y=imageFrame.y+o.y*imageFrame.h;x=Math.max(stage.x+32,Math.min(stage.x+stage.w-32,x));y=Math.max(stage.y+65,Math.min(stage.y+stage.h-54,y));
      const seen=state.clues.includes(o.clue.id),distance=Math.hypot(this.player.x-o.x,this.player.y-o.y),near=distance<.2;
      circle(c,x,y,seen?16:near?15:11,seen?C.accent:near?C.paper:'#9ba49a88','#0c1712cc');text(c,seen?'✓':near?String(i+1):'·',x,y,15,C.paper,'center');
      const tw=Math.min(210,Math.max(115,o.label.length*17));rect(c,x-tw/2,y+22,tw,34,'#0c1712e8',null,3);text(c,o.label,x,y+39,16,C.paper,'center');
      this.hit(o.label,x-28,y-28,56,56,()=>this.interactAt(o,x,y));
    }
    this.drawActors(stage);
    if(!objects.length)text(c,'这一层影像没有新的观察点。',W/2,stage.y+stage.h*.65,19,C.paper,'center');
    const hudTop=stage.y+stage.h;rect(c,0,hudTop,W,H-hudTop,C.bg);this.line(0,hudTop,W,C.line);
    const gy=this.portrait?Math.max(596,hudTop+28):hudTop+28;const required=s.puzzle.required;const count=required.filter(id=>state.clues.includes(id)).length;
    text(c,`观察记录  ${count} / ${required.length}`,24,gy,17,C.muted);this.button('观察条目',W-165,gy-20,140,()=>this.modal={type:'objects'},false,42);
    text(c,this.mode==='memory'?'透镜影像  ·  左侧为现实':'现实  ·  观察可触摸的事物',24,gy+34,15,C.muted);
    if(this.portrait){wrap(c,'透镜只能显现影像。判断与行动，仍在现实之中。',24,654,W-48,18,C.muted,28);this.button('线索册',24,740,160,()=>{this.bookPage=0;this.modal={type:'notebook'};});this.button('章节地图',200,740,160,()=>this.modal={type:'map'});}
    // Keep the action row and the lens status inside the logical canvas. The
    // previous landscape baseline was y=601 on a 600px canvas, which clipped
    // the battery label in the WeChat simulator.
    const by=this.portrait?Math.min(860,H-190):Math.min(510,H-90);
    if(!this.portrait){this.button('线索册',24,by,110,()=>{this.bookPage=0;this.modal={type:'notebook'};});this.button('章节',146,by,94,()=>this.modal={type:'map'});}
    const lx=this.portrait?24:270;this.button(this.mode==='memory'?'收起透镜':'举起透镜',lx,by,160,()=>this.toggleLens(),this.mode==='memory');
    const power=state.lensAcquired?(state.battery<=0?'断电':state.battery<1?'<1%':`${Math.ceil(state.battery)}%`):'未取得';
    const powerY=Math.min(by+63,H-27);
    text(c,`透镜 · ${power}`,lx+80,powerY,15,C.muted,'center');
    this.button(state.brightness===2?'亮度 · 高':'亮度 · 低',lx+176,by,130,()=>{if(this.model.canLens){this.model.setBrightness(state.brightness===1?2:1);this.save();}else this.toast('透镜当前不可启动。');});
    const solved=state.solved.includes(s.puzzle.id);this.button(solved?'继续  →':'采取行动  →',W-220,by,196,()=>solved?this.proceed():this.puzzle(),true);
    if(this.portrait)text(c,this.savedTime?'进度已保存到本机':'进度将在行动后保存',24,H-38,15,C.muted);
  }
  panel(title,subtitle){const c=this.ctx;rect(c,0,0,this.W,this.H,'#030806df');const x=24,y=24,w=this.W-48,h=this.H-48;rect(c,x,y,w,h,'#101a17f8',C.line,5);text(c,title,x+28,y+36,28,C.paper,'left','serif');if(subtitle)text(c,subtitle,x+28,y+74,16,C.muted);this.button('返回',this.W-144,38,94,()=>{this.modal=null;this.drag=null;},false,42);this.line(50,122,this.W-100);}
  renderModal(){const m=this.modal,c=this.ctx,W=this.W,H=this.H;
    // Modal controls must fully replace exploration hit regions.
    this.hits=[];
    if(m.type==='cg'){this.button('跳过 CG',this.W-160,8,140,()=>{if(this.closeVideo)this.closeVideo();this.modal=null;this.audio.environment(this.mode);},false,44);return;}
    if(m.type==='dialogue'){
      rect(c,0,0,W,H,'#02060455');const y=H-(this.portrait?300:218);rect(c,20,y,W-40,H-y-20,'#0c1512f7',C.line,4);const l=m.lines[m.index];
      text(c,l.speaker||'观察',44,y+32,17,C.accent);if(this.model.state.settings.subtitles)wrap(c,l.text,44,y+76,W-88,23,C.paper,34,this.portrait?5:3);else text(c,'叙事字幕已关闭',44,y+76,18,C.muted);
      text(c,`${m.index+1} / ${m.lines.length}`,44,H-56,16,C.muted);this.button(m.index===m.lines.length-1?'继续  →':'下一页  →',W-192,H-88,146,()=>this.nextDialogue(),true);return;
    }
    if(m.type==='settings'){
      this.panel('暂停 / 设置','设置与进度只保存在本机。');const st=this.model.state.settings;let y=150;const gap=this.portrait?87:62;
      const toggle=(name,key)=>{text(c,name,54,y+24,20,C.paper);this.button(st[key]?'开启':'关闭',W-200,y,142,()=>{this.model.setSetting(key,!st[key]);this.audio.apply(this.model.state.settings);this.save();});y+=gap;};
      toggle('声音','audio');text(c,`音量  ${Math.round(st.volume*100)}%`,54,y+24,20,C.paper);this.button('−',W-200,y,64,()=>{this.model.setSetting('volume',Math.max(0,st.volume-.1));this.audio.apply(this.model.state.settings);this.save();});this.button('+',W-125,y,64,()=>{this.model.setSetting('volume',Math.min(1,st.volume+.1));this.audio.apply(this.model.state.settings);this.save();});y+=gap;
      toggle('叙事字幕','subtitles');toggle('震动','vibration');toggle('简化动画 / 低性能','lowMotion');
      const bottom=this.portrait?H-180:H-104;this.button('重新开始章节',54,bottom,205,()=>this.modal={type:'confirm',message:'重新开始整个章节？设置会保留，当前进度会被替换。',action:()=>this.begin()});
      this.button('隐私与制作',this.portrait?280:276,bottom,190,()=>this.modal={type:'credits'});
      if(this.screen==='explore')this.button('回到标题',this.portrait?54:W-229,this.portrait?bottom+65:bottom,175,()=>{this.save();this.screen='title';this.modal=null;this.audio.pause();});return;
    }
    if(m.type==='credits'){
      this.panel('制作 / 隐私','THE LENS · 最终剧本改编开发版');
      const copy='原作与原始美术：用户提供。\n程序、交互与基础合成音效：本次工程。\n人物素材“小花”作为角色外观参考，未增加人物关系。\n存档与设置保存在设备本地，清除小游戏数据会移除存档。\n当前版本不收集个人信息，没有广告、支付或云端存档。\n可选CG：仅在配置实际视频后请求已配置的媒体域名；失败可跳过。\n角色图为美术档案，没有将三视图当作独立角色精灵。';
      wrap(c,copy,54,160,W-108,this.portrait?21:19,C.paper,this.portrait?39:34,16);return;
    }
    if(m.type==='confirm'){
      this.panel('重新开始');wrap(c,m.message,54,180,W-108,24,C.paper,38);this.button('取消',54,H-110,160,()=>this.modal=null);this.button('确认开始',W-238,H-110,184,()=>{const fn=m.action;this.modal=null;fn();},true);return;
    }
    if(m.type==='map'){
      this.panel('旅程地图','已抵达的场景可以在这里回看进度。');const curr=SCENES.findIndex(s=>s.id===this.model.state.sceneId);const cols=this.portrait?1:2,rowH=this.portrait?76:76;
      SCENES.forEach((s,i)=>{const x=54+(i%cols)*(W-108)/cols,y=152+Math.floor(i/cols)*rowH;const done=this.model.state.solved.includes(s.puzzle.id);text(c,`${done?'✓':i===curr?'◉':'○'}  ${String(i+1).padStart(2,'0')}  ${s.title}`,x,y+17,20,i<=curr?C.paper:C.muted);text(c,done?'已完成':i===curr?'当前场景':'尚未抵达',x+34,y+44,14,C.muted);});return;
    }
    if(m.type==='objects'){
      this.panel('观察条目','这里只回看已经记录的线索；新的发现需要回到场景中靠近物件。');const obs=this.model.scene.objects.filter(o=>this.model.state.clues.includes(o.clue.id));const gap=this.portrait?110:67;
      if(!obs.length){text(c,'还没有记录。回到场景，走近可见的标记。',54,170,20,C.muted);return;}
      obs.forEach((o,i)=>{const y=147+i*gap,allowed=o.mode==='both'||o.mode===this.mode;this.button(`✓  ${o.label}`,54,y,W-108,()=>{if(!allowed){this.toast(o.mode==='memory'?'先返回场景举起透镜。':'先收起透镜，观察现实。');return;}this.modal=null;this.observe(o);},false,50);});return;
    }
    if(m.type==='notebook'){
      const clues=this.model.state.clues.map(id=>CLUES[id]).filter(Boolean);const per=this.portrait?5:3,pages=Math.max(1,Math.ceil(clues.length/per));this.bookPage=Math.min(this.bookPage,pages-1);this.panel('线索册',`已记录 ${clues.length} 条 · ${this.bookPage+1} / ${pages}`);
      if(!clues.length)text(c,'观察场景中的物件，记录会保存在这里。',54,180,20,C.muted);
      clues.slice(this.bookPage*per,(this.bookPage+1)*per).forEach((cl,i)=>{const y=154+i*(this.portrait?145:112);text(c,cl.title,54,y,22,C.accent);wrap(c,cl.text,54,y+36,W-108,19,C.paper,29,this.portrait?4:2);});
      this.button('上一页',54,H-100,145,()=>{this.bookPage=Math.max(0,this.bookPage-1);});this.button('下一页',W-199,H-100,145,()=>{this.bookPage=Math.min(pages-1,this.bookPage+1);});return;
    }
    if(m.type==='puzzle'){
      const p=this.model.scene.puzzle;this.panel(p.title,'行动发生在现实。线索不足时，可以返回继续观察。');wrap(c,p.prompt,54,157,W-108,22,C.paper,33,3);
      const yy=this.portrait?340:266,gap=this.portrait?100:66;p.options.forEach((o,i)=>this.button(o.label,54,yy+i*gap,W-108,()=>this.attempt(o.id),false,52));
      if(m.feedback)wrap(c,m.feedback,54,this.portrait?730:485,W-108,20,C.accent,30,3);return;
    }
    if(m.type==='success'){
      this.panel('行动完成');wrap(c,m.message,54,180,W-108,25,C.paper,42,8);this.button('继续旅程  →',W-276,H-108,222,()=>this.proceed(),true);return;
    }
    if(m.type==='draw'){this.renderDrawing(m);return;}
    if(m.type==='stars'){this.renderStars(m);return;}
  }
  renderDrawing(m){const c=this.ctx,W=this.W,H=this.H;this.panel('画下那个瞬间','用手指留下线条：一只手，抓住另一只手。可以擦去、重画。');
    rect(c,50,155,W-100,H-310,'#292b25','#5f6456',2);c.strokeStyle='#bdb8a5';c.lineWidth=4;c.lineCap='round';c.lineJoin='round';for(const stroke of m.strokes){if(stroke.length<2)continue;c.beginPath();c.moveTo(...stroke[0]);for(const p of stroke.slice(1))c.lineTo(...p);c.stroke();}
    const amount=m.strokes.reduce((sum,s)=>sum+s.slice(1).reduce((a,p,i)=>a+Math.hypot(p[0]-s[i][0],p[1]-s[i][1]),0),0);
    text(c,'线条不必完美。至少留下两笔，再回头看。',54,H-128,18,C.muted);this.button('擦去重画',54,H-98,165,()=>{m.strokes=[];m.current=null;this.drag=null;});
    this.button('留下画痕',W-245,H-98,191,()=>{this.up();if(m.strokes.length<2||amount<100){this.toast('试着留下至少两笔可辨认的线条。');return;}const normalized=Strokes.normalize(m.strokes,Strokes.bounds(W,H));if(!this.model.setArtwork(normalized)){this.toast('再留一些线条。画迹需要能被重新看见。');return;}const r=this.model.observe(m.object.id,'reality');if(!r.ok){this.toast(r.message);return;}this.modal=null;this.save();this.dialogue(r.dialogue||m.object.dialogue);},true);
  }
  starPoints(cx,cy){return [[-56,-27],[-19,-53],[24,-15],[59,24],[-5,47]].map(([x,y])=>[cx+x,cy+y]);}
  renderStars(m){const c=this.ctx,W=this.W,H=this.H;this.panel('五颗真实的星','透镜已经断电。拖动镜缘，让五个刻点与真实星光重合。');
    rect(c,50,155,W-100,H-310,'#090f11');const tx=W*.58,ty=H*.48;const points=this.starPoints(tx,ty);
    for(let i=0;i<36;i++){const x=65+((i*83)%Math.floor(W-130)),y=170+((i*53)%Math.max(1,Math.floor(H-345)));circle(c,x,y,.8,null,'#858c8960');}
    points.forEach(([x,y])=>{circle(c,x,y,3.4,null,'#e5e2d3');circle(c,x,y,8,'#e5e2d330');});
    circle(c,m.cx,m.cy,94,'#8b8c7a');circle(c,m.cx,m.cy,88,'#8b8c7a50');this.starPoints(m.cx,m.cy).forEach(([x,y])=>{c.strokeStyle=C.accent;c.lineWidth=1.8;c.beginPath();c.moveTo(x-6,y);c.lineTo(x+6,y);c.moveTo(x,y-6);c.lineTo(x,y+6);c.stroke();});
    const delta=Math.hypot(m.cx-tx,m.cy-ty);text(c,delta<12?'五处刻点与星光重合。':'缓慢移动。星星不会替你改变位置。',54,H-128,19,C.muted);
    this.button('记住这片星空',W-286,H-98,232,()=>{if(delta>=12){this.toast('继续微调镜缘的位置，让五处刻点都与星光重合。');return;}const r=this.model.observe(m.object.id,'reality');this.modal=null;this.save();this.dialogue(r.dialogue||m.object.dialogue);},true);
  }
  renderEpilogue(){const c=this.ctx,W=this.W,H=this.H;cover(c,this.assets.get('assets/scenes/scene_S09_reality_1280_v1.jpg'),0,0,W,H);rect(c,0,0,W,H,'#0b100dc8');
    const cards=[['清晨','小花端着陶碗，打开木栅。洞中没有回应。'],['新画','她认出墙上那只抓住手腕的手。指尖沾上炭灰，她没有擦掉。'],['五个点','画旁，一个小人朝外迈步。地上有拖动的碎石，断电的透镜不在原处。'],['晨光','她停在裂隙前。风吹过脸，洞外传来鸟鸣。']];const [label,copy]=cards[this.epilogue];
    text(c,label,54,H*.25,35,C.paper,'left','serif');if(this.model.state.settings.subtitles)wrap(c,copy,54,H*.25+70,W-108,25,C.paper,40,5);
    if(this.epilogue===1||this.epilogue===2){const box=this.portrait?{x:54,y:490,w:W-108,h:270}:{x:W*.52,y:H*.53,w:W*.42,h:135};rect(c,box.x,box.y,box.w,box.h,'#32362dee',C.line,3);c.lineWidth=2.5;c.lineCap='round';c.strokeStyle='#c4bea9';for(const stroke of this.model.state.artwork){c.beginPath();stroke.forEach(([x,y],i)=>{const xx=box.x+x*box.w,yy=box.y+y*box.h;if(i===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);});c.stroke();}}
    // A narrow strip of neutral natural light; the real world stays desaturated.
    if(this.epilogue===3){const g=c.createLinearGradient(W*.72,0,W,0);g.addColorStop(0,'#d7dcce00');g.addColorStop(1,'#d7dcce65');c.fillStyle=g;c.fillRect(W*.7,0,W*.3,H);}
    this.button(this.epilogue===3?'看向晨光':'继续',W-224,H-106,170,()=>{if(this.epilogue===3)this.finish();else this.epilogue++;},true);
  }
  renderEnding(){const c=this.ctx;c.fillStyle='#000';c.fillRect(0,0,this.W,this.H);const elapsed=this.p.now()-this.endingTime;if(elapsed<2000){if(this.audio.amb)this.audio.amb.volume=this.model.state.settings.audio?this.model.state.settings.volume*(1-elapsed/2000):0;}else{this.audio.pause();text(c,'《透镜》',this.W/2,this.H/2,50,C.paper,'center','serif');}}
}
module.exports={Game};

},
"data/chapter.js":function(module,exports,__require){
'use strict';

// 主线顺序依据用户提供的最终剧本；交互谜题和可观察热点是游戏化改编标记。
function img(id, state) { return 'assets/scenes/scene_' + id + '_' + state + '_1280_v1.jpg'; }
function action(text) { return { speaker: '动作', text: text }; }
function makeObject(scene, id, label, x, y, title, text, mode, extra) {
  var result = { id: id, label: label, x: x, y: y, mode: mode || 'reality', clue: { id: scene + '_' + id, title: title, text: text }, dialogue: [action(text)] };
  if (extra) Object.keys(extra).forEach(function (key) { result[key] = extra[key]; });
  return result;
}
function real(s, id, l, x, y, t, text, extra) { return makeObject(s, id, l, x, y, t, text, 'reality', extra); }
function mem(s, id, l, x, y, t, text) { return makeObject(s, id, l, x, y, t, text, 'memory'); }
function option(id, label, feedback) { return { id: id, label: label, feedback: feedback }; }
function puzzle(id, title, prompt, required, options, answer, success) {
  return { id: id, title: title, prompt: prompt, required: required, options: options, answer: answer, success: success, adaptation: true };
}
function scene(id, title, subtitle, goal, reality, memory, intro, objects, p, outro) {
  return { id: id, title: title, subtitle: subtitle, adaptation: true, goal: goal, reality: reality, memory: memory, intro: intro, objects: objects, puzzle: p, outro: outro };
}

const SCENES = [
  scene('S10', '安睡舱', '序 / 旧时代的回声', '观察旧广告与两具安睡舱的状态。', img('S10', 'elite'), null, [
    { speaker: 'AI 广告', text: '你不必工作，不必思考，甚至不必开口。一切交给 AI。' }, action('精致生活在广告里循环，安睡舱里的人始终没有动作。')
  ], [
    real('S10', 'elite', '精英男性安睡舱', .3, .56, '被服务的生活', '精英男性在舱中安睡，系统替他维持生活。'),
    real('S10', 'sleeper', '另一具安睡舱', .7, .58, '另一种沉睡', '另一名男性同样安睡，不同外表依靠相同系统。'),
    real('S10', 'advert', '循环广告', .52, .24, '自动完成的承诺', '广告把观察、判断和创造接连交给自动化服务。')
  ], puzzle('S10_montage', '观看旧时代', '观察完广告与安睡者，顺着画面进入衰败后的世界。', ['S10_elite', 'S10_sleeper', 'S10_advert'], [
    option('watch', '看完广告，进入废墟', '服务的余音逐渐消失。'), option('wake', '等待广告唤醒他们', '广告只在循环。'), option('touch', '把承诺当作回应', '安睡舱没有回应。')
  ], 'watch', '画面从旧广告切到无人维护的城市。'), [action('广告声远去，只剩风声。')]),

  scene('S01', '商场外景', '01 / 旧终端', '检查旧终端，拾起透镜，比较现实与文明影像。', img('S01', 'reality'), img('S01', 'memory'), [action('阿迟在废弃商场前停下，目光落在旧终端上。')], [
    real('S01', 'terminal', '旧终端与透镜', .63, .66, '拾得透镜', '阿迟从旧终端旁拾起透镜，装置亮起微光。'),
    real('S01', 'ruins', '商场残墙', .32, .49, '现实的废墟', '残墙与空门洞没有变化，完整人流无法填补缺口。'),
    real('S01', 'entrance', '食品区入口标记', .48, .6, '通往食品区', '旧标记指向食品区，现实门洞仍可通行。'),
    mem('S01', 'crowd', '往日人流', .52, .4, '文明影像', '人群和橱窗重新浮现，放下透镜后影像消失。')
  ], puzzle('S01_lens', '透镜与现实', '旧影像显现后，怎样继续探索？', ['S01_terminal', 'S01_ruins', 'S01_entrance', 'S01_crowd'], [
    option('enter', '沿现实畅通门洞进入', '看清现实入口，再向前走。'), option('follow', '跟随影像人流', '人流属于过去。'), option('wait', '等终端代替行动', '终端没有替阿迟迈步。')
  ], 'enter', '阿迟握住透镜，走进食品区。'), [action('透镜抬起，旧日色彩再次浮现。')]),

  scene('S02', '食品区内景', '02 / 影像与罐头', '用陈列关系定位现实中的罐头，留意身后的来人。', img('S02', 'reality'), img('S02', 'memory'), [action('空柜台在透镜中重新摆满食物。阿迟伸手，却穿过影像。')], [
    real('S02', 'empty', '空置柜台', .28, .59, '不能拿取的盛宴', '手落在灰尘柜台上，影像中的食物没有实体。'),
    real('S02', 'can', '货架下的罐头', .66, .73, '现实中的罐头', '货架下藏着罐头，位置与陈列格位对应。'),
    real('S02', 'trace', '格位与拖痕', .45, .66, '定位依据', '旧格位与拖痕指向货架下沿，断电也能检查。'),
    mem('S02', 'display', '完整食品陈列', .53, .4, '旧陈列关系', '影像显示罐装食品原本摆在下层。')
  ], puzzle('S02_supply', '定位实物', '影像提供陈列关系。阿迟真正能拿到什么？', ['S02_empty', 'S02_can', 'S02_trace', 'S02_display'], [
    option('can', '取出现实货架下的罐头', '格位和拖痕对应真实物品。'), option('feast', '拿走影像食物', '手再次穿过影像。'), option('refill', '等待自动补货', '柜台没有回应。')
  ], 'can', '阿迟取出罐头。小花出现在身后。'), [action('小花抓住他的手腕，指向部落。'), {speaker:'手势 · 小花',text:'回去。爹看见会生气。'}, {speaker:'手势 · 阿迟',text:'有吃的就行。'}, action('阿迟护住透镜，继续朝商城深处走去。小花犹豫片刻，跟了上去。')]),

  scene('S06', '卢浮宫外景', '03 / 地标', '比较地标与现实路径，抵达画廊。', img('S06', 'reality'), img('S06', 'memory'), [action('废墟中的卢浮宫展现在两人面前。')], [
    real('S06', 'landmark', '地标轮廓', .5, .42, '仍在的轮廓', '地标轮廓清晰，破损覆盖了曾经表面。'),
    real('S06', 'path', '通向画廊的路径', .39, .7, '现实路径', '通往画廊的地面仍相连。'),
    real('S06', 'companion', '小花的身影', .76, .65, '同行目光', '小花望向阿迟，又看向同一个入口。'),
    mem('S06', 'facade', '完整旧外墙', .63, .31, '旧日地标', '外墙恢复完整，放下装置后脚下道路仍在。')
  ], puzzle('S06_entry', '走向画廊', '建筑影像与废墟重叠。沿哪条路前进？', ['S06_landmark', 'S06_path', 'S06_companion'], [
    option('gallery', '沿现实路径走入画廊', '确认脚下连续地面。'), option('facade', '穿过影像旧外墙', '旧外墙属于影像。'), option('remain', '等待自动导览', '没有自动导览回应。')
  ], 'gallery', '两人走入画廊。'), [action('光从高处落下，照见画廊墙面。')]),

  scene('S03', '卢浮宫画廊', '04 / 观看的时间', '观察画迹与画师影像，选择停留过程或跳到成品。', img('S03', 'reality'), img('S03', 'memory'), [action('透镜显现画师的创作过程。')], [
    real('S03', 'canvas', '留存的画面', .4, .45, '图像痕迹', '细微笔触仍在墙上，完成图像背后有动作。'),
    real('S03', 'pigment', '颜料与笔触', .65, .63, '过程材料', '颜料与覆盖笔触保留制作次序。'),
    real('S03', 'gesture', '透镜快进手势', .26, .72, '可跳过的时间', '可继续看过程，也可滑动到完成画面。'),
    mem('S03', 'painter', '画师创作影像', .53, .4, '画师过程', '画师试探、覆盖又重新落笔，成品逐渐出现。')
  ], Object.assign(puzzle('S03_art', '观看的选择', '看见一幅画，需要多少时间？选择会被记录。', ['S03_canvas', 'S03_pigment', 'S03_gesture', 'S03_painter'], [
    option('process', '留下来看画师过程', '阿迟继续观看。'), option('skip', '滑动透镜跳到成品', '过程略过，成品出现。'), option('erase', '让透镜替画师创作', '透镜不能替代落笔的手。')
  ], 'process', '阿迟的观看方式被记录。'), { answers: ['process', 'skip'] }), [action('阿迟的手指最终滑过透镜，创作过程跳到完成的画面。'), action('脚步声穿过画廊。')]),

  scene('S04', '科技展厅', '05 / 五颗星', '查看五颗星的旧档案，记下相对位置。', img('S04', 'reality'), img('S04', 'memory'), [action('旧展厅的图示蒙着灰尘，一段档案仍保留。')], [
    real('S04', 'stars', '五颗星图示', .54, .37, '五点位置', '五颗星组成不规则排列，残存图示足以记录相对位置。'),
    real('S04', 'archive', '旧档案标记', .24, .55, '留给还想知道的人', '档案旁保留这句话。'),
    real('S04', 'record', '镜缘五个刻点', .7, .66, '被忽略的刻痕', '阿迟翻转透镜，五个浅刻点从镜缘掠过。他仍只想看更明亮的影像。'),
    mem('S04', 'oldArchive', '天文档案影像', .5, .45, '旧人的好奇', '人类的手指向五颗星，AI记录下排列。星点与镜缘刻点短暂重合，最后留下：“留给还想知道的人。”')
  ], puzzle('S04_archive', '带走什么', '旧人的手曾指向五颗星。哪一处细节与它们相应？', ['S04_stars', 'S04_archive', 'S04_record', 'S04_oldArchive'], [
    option('remember', '镜缘五个浅刻点', '星点和刻点短暂重合。'), option('discard', '破碎地面的纹理', '相对位置与镜缘相应。'), option('delegate', '等待装置替自己画出出口', '影像没有现实出口的答案。')
  ], 'remember', '五点排列与留言收入线索册。'), [action('阿迟抬眼望向连廊另一端。')]),

  scene('S05', '高架连廊', '06 / 踩空', '踩空之后，配合小花和族长完成救援。', img('S05', 'reality'), img('S05', 'memory'), [action('透镜里旧连廊完整伸向前方。阿迟追随桥影迈步，脚下骤然落空。'), action('小花抓住他的手腕，被边缘划伤；族长赶来伸手。')], [
    real('S05', 'gap', '脚下断口', .52, .67, '影像没有承重', '桥面已断。踩空无法倒回，现实边缘承受两人重量。'),
    real('S05', 'wrist', '小花受伤手腕', .27, .59, '抓住他的手', '小花紧抓阿迟，乱动会增加伤势。'),
    real('S05', 'rescue', '族长伸来的手', .72, .52, '救援支点', '族长伏在完整桥面，伸手提供支点。'),
    mem('S05', 'bridge', '完整连廊影像', .63, .38, '没有实体的旧桥', '人流仍在旧桥上行走，影像不因险情停下。')
  ], puzzle('S05_rescue', '配合救援', '小花手腕受伤。先对照透镜中的旧连廊，再回应正在发生的救援。', ['S05_gap', 'S05_wrist', 'S05_rescue', 'S05_bridge'], [
    option('cooperate', '收住挣扎，抓稳族长的手', '稳住重心，配合两人拉拽。'), option('struggle', '摆动并独自攀回', '摆动加重小花负担。'), option('image', '踩向影像桥面', '影像无法承重。')
  ], 'cooperate', '族长与小花把阿迟拉回桥面。'), [action('族长带着两人返回部落。')]),

  scene('S07', '部落生活区', '07 / 被保护的人', '观察焚画、伤口与族长动作，理解冲突后果。', img('S07', 'reality'), null, [action('火堆吞没旧画。族长握着透镜，看向小花包扎的手腕。')], [
    real('S07', 'fire', '焚烧旧画的火', .35, .61, '火中的画', '旧画边缘卷起，颜色和形状在火中消失。'),
    real('S07', 'wound', '小花包扎手腕', .72, .64, '险情留下的伤', '包扎仍在，族长看向伤口与透镜。'),
    real('S07', 'chief', '旧布袋中的碎镜', .55, .44, '阻止再次失足', '族长将布袋里破裂、烧黑的旧透镜倒在地上。他指向断层，又指向小花的伤口。')
  ], puzzle('S07_conflict', '看见冲突', '观察三处线索后，跟随原作中的处置继续。', ['S07_fire', 'S07_wound', 'S07_chief'], [
    option('follow', '看向伤口与碎镜，随族长离开', '族长的目光先落在女儿的伤口上。'), option('villain', '只把族长看成破坏者', '族长的恐惧也属于冲突。'), option('restore', '让影像复原画和伤口', '影像无法复原现实。')
  ], 'follow', '阿迟伸手试图夺回透镜，族长将他推开，带往洞口。'), [{speaker:'手势 · 族长',text:'这种巫术，害死过人。'}, {speaker:'手势 · 族长',text:'不许再碰。'}, action('火光退到身后，洞口阴影逼近。')]),

  scene('S08', '囚禁洞口', '08 / 木栅', '观察木栅与洞内环境，带着余电进入洞穴。', img('S08', 'reality'), null, [action('阿迟被留在洞中。透镜只剩微弱的光。族长皱起眉，将它扔回阿迟脚边。'), {speaker:'手势 · 族长',text:'和你一样的，都关在这儿。'}, {speaker:'手势 · 族长',text:'醒了，再出来。'}, action('族长关上木栅，转身离开。')], [
    real('S08', 'bars', '封洞木栅', .5, .47, '受限出口', '木栅隔开洞口，伸手试探也没有让路。'),
    real('S08', 'battery', '低电透镜', .27, .7, '将尽电量', '微光断续亮起，叙事时间里电量已经不多。'),
    real('S08', 'cave', '洞穴深处墙面', .76, .6, '洞内痕迹', '墙上有旧痕迹，阿迟转身走向墙面。')
  ], puzzle('S08_cave', '转向洞内', '出口被木栅隔开，透镜将耗尽。阿迟观察什么？', ['S08_bars', 'S08_battery', 'S08_cave'], [
    option('inside', '转身靠近洞壁痕迹', '从仍可观察的事物开始。'), option('recharge', '等木栅替透镜充电', '木栅没有服务功能。'), option('through', '把木栅看成影像', '木栅真实挡在洞口。')
  ], 'inside', '阿迟转身走进洞穴。透镜最后的微光熄灭。'), [action('装置透明下来，阿迟放下它。')]),

  scene('S09', '洞穴内景', '09 / 留在墙上的光', '观察旧画，画下救援；对照五点与风尘，用木枝撬石。', img('S09', 'reality'), null, [action('透镜彻底耗尽。普罗米修斯旧画从岩壁显露，阿迟伸手。'), action('残像熄灭，洞穴只剩岩画与风尘。')], [
    real('S09', 'mural', '普罗米修斯旧岩画', .36, .46, '人的旧画', '岩壁旧画留着曾经行动的手。'),
    real('S09', 'wind', '风与浮尘', .75, .38, '风从缝隙穿过', '尘粒沿石块旁缝隙偏移，风向来自现实。'),
    real('S09', 'branch', '木枝与石块支点', .63, .74, '可以借力的支点', '木枝抵住石块缝隙，以小石作支点压下另一端。'),
    real('S09', 'drawing', '亲手画下救援', .49, .55, '新画：抓住的手', '阿迟画下小花抓住自己的那一刻。', { interaction: 'drawing' }),
    Object.assign(real('S09', 'starAlignment', '对照五点与夜空', .22, .28, '五点与头顶的星', '旧档案五点对准真实夜空，阿迟用眼睛确认位置。'), { interaction: 'starAlignment', dialogue: [{ speaker: '阿迟', text: '那里……有什么？' }] })
  ], puzzle('S09_exit', '向外迈步', '透镜熄灭。根据风尘、木枝和支点，怎样打开现实中的路？', ['S09_mural', 'S09_wind', 'S09_branch', 'S09_drawing', 'S09_starAlignment'], [
    option('lever', '沿风的缝隙放木枝，用支点撬石', '风指出缝隙，木枝和支点把判断变成动作。'), option('lens', '等待透镜给答案', '透镜已无电。'), option('push', '只对整块岩石用力推', '用木枝、缝隙与支点改变用力方式。')
  ], 'lever', '木枝撬动石块，一线自然光从缝隙透进来。阿迟停下来，继续确认宽度与脚下地形。'), [action('他在墙上添下五个小点和一个朝外迈步的小人。'), action('阿迟拿起断电的透镜，转身朝裂隙走去。镜头留在洞壁，脚步声逐渐远去。')])
];

const CLUES = {};
SCENES.forEach(function (s) { s.objects.forEach(function (o) { CLUES[o.clue.id] = Object.assign({ sceneId: s.id }, o.clue); }); });
module.exports = { SCENES: SCENES, CLUES: CLUES };

},
"systems/model.js":function(module,exports,__require){
'use strict';

const data = __require("data/chapter.js");
const SCENES = data.SCENES;
const DEFAULT_SETTINGS = { audio: true, volume: 0.35, subtitles: true, vibration: true, lowMotion: false };
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
const STATE_KEYS = ['version', 'chapter', 'sceneId', 'clues', 'solved', 'choices', 'completed', 'settings', 'updatedAt', 'battery', 'brightness', 'lensAcquired', 'artwork'];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function now() { return new Date().toISOString(); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, keys) { return isObject(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)); }
function validSetting(key, value) { return key === 'volume' ? typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 : SETTING_KEYS.indexOf(key) !== -1 && typeof value === 'boolean'; }
function validSettings(settings) { return exactKeys(settings, SETTING_KEYS) && SETTING_KEYS.every((key) => validSetting(key, settings[key])); }
function puzzleAnswers(puzzle) { return Array.isArray(puzzle.answers) ? puzzle.answers : [puzzle.answer]; }
function validBattery(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100; }
function validArtwork(strokes) {
  if (!Array.isArray(strokes) || strokes.length > 80) return false;
  for (let i = 0; i < strokes.length; i += 1) {
    const stroke = strokes[i];
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length > 1000) return false;
    for (let j = 0; j < stroke.length; j += 1) {
      const point = stroke[j];
      if (!Array.isArray(point) || point.length !== 2) return false;
      for (let axis = 0; axis < 2; axis += 1) {
        const coordinate = point[axis];
        if (typeof coordinate !== 'number' || !Number.isFinite(coordinate) || coordinate < 0 || coordinate > 1) return false;
      }
    }
  }
  return true;
}
function meaningfulArtwork(strokes) {
  if (!validArtwork(strokes) || strokes.length < 2) return false;
  return strokes.reduce((total, stroke) => total + stroke.slice(1).reduce((distance, point, i) => distance + Math.hypot(point[0] - stroke[i][0], point[1] - stroke[i][1]), 0), 0) > 0.15;
}

function createState(settings) {
  const preferences = settings === undefined ? clone(DEFAULT_SETTINGS) : clone(settings);
  if (!validSettings(preferences)) throw new TypeError('Invalid settings');
  return { version: 2, chapter: 'ch01', sceneId: SCENES[0].id, clues: [], solved: [], choices: {}, completed: false, settings: preferences, updatedAt: now(), battery: 100, brightness: 1, lensAcquired: false, artwork: [] };
}

function validateState(state) {
  if (!exactKeys(state, STATE_KEYS) || state.version !== 2 || state.chapter !== 'ch01' || typeof state.completed !== 'boolean') return false;
  const current = SCENES.findIndex((scene) => scene.id === state.sceneId);
  if (current < 0 || !validSettings(state.settings) || !validBattery(state.battery) || (state.brightness !== 1 && state.brightness !== 2) || typeof state.lensAcquired !== 'boolean' || !validArtwork(state.artwork)) return false;
  if (typeof state.updatedAt !== 'string' || !Number.isFinite(Date.parse(state.updatedAt)) || new Date(state.updatedAt).toISOString() !== state.updatedAt) return false;
  if (!Array.isArray(state.clues) || !Array.isArray(state.solved) || !isObject(state.choices)) return false;
  if (new Set(state.clues).size !== state.clues.length || new Set(state.solved).size !== state.solved.length) return false;
  const permittedClues = SCENES.slice(0, current + 1).reduce((all, scene) => all.concat(scene.objects.map((item) => item.clue.id)), []);
  if (!Array.from(state.clues).every((id) => typeof id === 'string' && permittedClues.indexOf(id) !== -1)) return false;
  if (!Array.from(state.solved).every((id) => SCENES.slice(0, current + 1).some((scene) => scene.puzzle.id === id))) return false;
  for (let i = 0; i < SCENES.length; i += 1) {
    const p = SCENES[i].puzzle;
    const solved = state.solved.indexOf(p.id) !== -1;
    if (i < current && !solved) return false;
    if (solved && (!p.required.every((id) => state.clues.indexOf(id) !== -1) || puzzleAnswers(p).indexOf(state.choices[p.id]) === -1)) return false;
    if (!solved && Object.prototype.hasOwnProperty.call(state.choices, p.id)) return false;
  }
  if (Object.keys(state.choices).length !== state.solved.length) return false;
  if (state.lensAcquired !== (state.clues.indexOf('S01_terminal') !== -1)) return false;
  if (!state.lensAcquired && state.battery !== 100) return false;
  if (current < SCENES.findIndex((scene) => scene.id === 'S08') && state.lensAcquired && state.battery <= 0) return false;
  if (current >= SCENES.findIndex((scene) => scene.id === 'S08') && state.battery > 10) return false;
  if (current >= SCENES.findIndex((scene) => scene.id === 'S09') && state.battery !== 0) return false;
  if (state.sceneId !== 'S09' && state.artwork.length !== 0) return false;
  if (state.clues.indexOf('S09_drawing') !== -1 && !meaningfulArtwork(state.artwork)) return false;
  if (state.completed && (current !== SCENES.length - 1 || state.solved.length !== SCENES.length)) return false;
  return true;
}

class GameModel {
  constructor(state, onChange) {
    if (state !== undefined && state !== null && !validateState(state)) throw new TypeError('Invalid game state');
    this._state = state ? clone(state) : createState();
    this.onChange = typeof onChange === 'function' ? onChange : function () {};
  }
  get state() { return clone(this._state); }
  get scene() { return SCENES.find((scene) => scene.id === this._state.sceneId); }
  get canLens() { return this._state.lensAcquired && this._state.battery > 0; }
  _changed() { this._state.updatedAt = now(); this.onChange(this.state); }
  observe(objectId, mode) {
    const item = this.scene.objects.find((object) => object.id === objectId);
    if (!item) return { ok: false, newClue: false, dialogue: [], message: '这里没有这个可交互物件。' };
    if ((mode !== 'reality' && mode !== 'memory') || (item.mode !== 'both' && mode !== item.mode)) return { ok: false, newClue: false, dialogue: [], message: item.mode === 'memory' ? '切换到透镜影像，再观察这里。' : '回到现实，再检查这件物品。' };
    if (mode === 'memory' && !this.canLens && this._state.clues.indexOf(item.clue.id) === -1) return { ok: false, newClue: false, dialogue: [], message: '透镜已经没有电，仍可回看已记录的影像线索。' };
    if (item.id === 'drawing' && this.scene.id === 'S09' && !meaningfulArtwork(this._state.artwork)) return { ok: false, newClue: false, dialogue: [], message: '先亲手留下至少两笔可辨认的画痕，再记录这幅新画。' };
    const isNew = this._state.clues.indexOf(item.clue.id) === -1;
    if (isNew) { this._state.clues.push(item.clue.id); if (item.id === 'terminal' && this.scene.id === 'S01') this._state.lensAcquired = true; this._changed(); }
    return { ok: true, newClue: isNew, dialogue: clone(item.dialogue), message: isNew ? '线索已记录：' + item.clue.title : '已记录这条线索，可以在线索册中回看。' };
  }
  attempt(optionId, mode) {
    const activeMode = mode === undefined ? 'reality' : mode;
    const p = this.scene.puzzle;
    if (activeMode !== 'reality') return { ok: false, message: '影像无法代替行动。先回到现实，再作出选择。' };
    if (this._state.solved.indexOf(p.id) !== -1) return { ok: true, message: p.success };
    if (!p.required.every((id) => this._state.clues.indexOf(id) !== -1)) return { ok: false, message: '证据还不完整。先完成当前场景的观察与对照。' };
    const choice = p.options.find((item) => item.id === optionId);
    if (!choice) return { ok: false, message: '请选择当前可用的行动。' };
    if (puzzleAnswers(p).indexOf(optionId) === -1) return { ok: false, message: choice.feedback };
    this._state.solved.push(p.id); this._state.choices[p.id] = optionId; this._changed();
    return { ok: true, message: p.success };
  }
  advance() {
    if (this._state.solved.indexOf(this.scene.puzzle.id) === -1 || this._state.completed) return false;
    const index = SCENES.findIndex((scene) => scene.id === this._state.sceneId);
    if (index === SCENES.length - 1) this._state.completed = true;
    else { this._state.sceneId = SCENES[index + 1].id; if (this._state.sceneId === 'S08') this._state.battery = Math.min(this._state.battery, 10); if (this._state.sceneId === 'S09') this._state.battery = 0; }
    this._changed(); return true;
  }
  restartChapter() { this._state = createState(this._state.settings); this._changed(); return this.state; }
  setSetting(key, value) { if (!validSetting(key, value)) return false; if (this._state.settings[key] === value) return true; this._state.settings[key] = value; this._changed(); return true; }
  setBrightness(value) { if (value !== 1 && value !== 2) return false; if (this._state.brightness === value) return true; this._state.brightness = value; this._changed(); return true; }
  setArtwork(strokes) {
    if (this.scene.id !== 'S09' || !validArtwork(strokes)) return false;
    if (this._state.clues.indexOf('S09_drawing') !== -1 && !meaningfulArtwork(strokes)) return false;
    this._state.artwork = clone(strokes); this._changed(); return true;
  }
  tick(seconds, mode, paused) {
    if (paused === true || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0 || !this._state.lensAcquired || this._state.battery <= 0) return this._state.battery;
    const activeMode = mode === 'memory' ? 'memory' : 'reality';
    const rate = activeMode === 'memory' ? (this._state.brightness === 2 ? 0.1 : 0.035) : 0.015;
    // 游戏化耗电曲线：S08 前持续指数衰减；有限探索保留正电，绝不回充。
    // S08 开始线性耗电，S09 以叙事时间流逝归零；并非真实装置的测量值。
    const beforeCave = SCENES.findIndex((scene) => scene.id === this._state.sceneId) < SCENES.findIndex((scene) => scene.id === 'S08');
    const next = beforeCave ? Math.max(Number.MIN_VALUE, this._state.battery * Math.exp(-seconds * rate / 100)) : Math.max(0, this._state.battery - seconds * rate);
    if (next !== this._state.battery) { this._state.battery = next; this._changed(); }
    return this._state.battery;
  }
}

module.exports = { createState, validateState, GameModel };

},
"systems/storage.js":function(module,exports,__require){
'use strict';

const validateState = __require("systems/model.js").validateState;
const PRIMARY_KEY = 'the-lens.save.v1';
const BACKUP_KEY = 'the-lens.save.v1.backup';

// FNV-1a 检测传输/写入损坏，不是防作弊签名；无需 Node 专属模块。
function checksum(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}
function pack(state) {
  const payload = JSON.stringify(state);
  return JSON.stringify({ format: 1, payload: payload, checksum: checksum(payload) });
}
function unpack(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') throw new Error('存档格式异常');
  const envelope = JSON.parse(raw);
  if (!envelope || envelope.format !== 1 || typeof envelope.payload !== 'string' || envelope.checksum !== checksum(envelope.payload)) throw new Error('存档校验失败');
  const state = JSON.parse(envelope.payload);
  if (!validateState(state)) throw new Error('存档版本或进度数据不兼容');
  return state;
}

class SaveStore {
  constructor(adapter) {
    if (!adapter || typeof adapter.get !== 'function' || typeof adapter.set !== 'function' || typeof adapter.remove !== 'function') throw new TypeError('Storage adapter requires get, set and remove');
    this.adapter = adapter;
  }
  load() {
    let primary = null;
    let backup = null;
    let primaryError = null;
    let backupError = null;
    try { primary = unpack(this.adapter.get(PRIMARY_KEY)); } catch (error) { primaryError = error; }
    try { backup = unpack(this.adapter.get(BACKUP_KEY)); } catch (error) { backupError = error; }
    if (primary) {
      // 写主槽途中被中断时，校验完成的备份候选可能更新。
      if (backup && Date.parse(backup.updatedAt) > Date.parse(primary.updatedAt)) return { state: backup, warning: '上次主存档写入可能中断，已从较新的校验备份恢复。请继续游戏后重试保存。' };
      return { state: primary, warning: null };
    }
    if (backup) return { state: backup, warning: '主存档不可用，已从校验通过的备份恢复。请继续游戏后重试保存。' };
    if (primaryError && backupError) return { state: null, warning: '本地存档和备份均无法读取。可以开始新旅程；原数据未被自动删除。' };
    if (primaryError || backupError) return { state: null, warning: '本地存档无法读取，且没有可用备份。可以开始新旅程；原数据未被自动删除。' };
    return { state: null, warning: null };
  }
  save(state) {
    if (!validateState(state)) return { ok: false, error: '进度数据校验失败，未写入存档。' };
    try {
      const encoded = pack(state);
      // 先写备份候选并读回。主槽写入失败时，下次仍能恢复已校验候选。
      this.adapter.set(BACKUP_KEY, encoded);
      const candidateRaw = this.adapter.get(BACKUP_KEY);
      if (candidateRaw !== encoded || !unpack(candidateRaw)) throw new Error('备份写入校验失败');
      this.adapter.set(PRIMARY_KEY, encoded);
      const primaryRaw = this.adapter.get(PRIMARY_KEY);
      if (primaryRaw !== encoded || !unpack(primaryRaw)) throw new Error('主存档写入校验失败');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: '本次本地保存未完成：' + (error && error.message ? error.message : String(error)) + '。当前游戏进度仍保留在内存中。' };
    }
  }
}

module.exports = { SaveStore: SaveStore };

},
"systems/assets.js":function(module,exports,__require){
class Assets {
  constructor(platform){this.p=platform;this.cache=new Map();}
  load(path,retry=false){
    if(!path)return Promise.resolve(null);
    if(retry)this.cache.delete(path);
    if(this.cache.has(path))return this.cache.get(path).promise;
    const entry={image:null,error:null,promise:null};
    entry.promise=new Promise(resolve=>{const i=this.p.createImage();i.onload=()=>{entry.image=i;resolve(i);};i.onerror=()=>{entry.error='图片加载失败';resolve(null);};i.src=path;});
    this.cache.set(path,entry);return entry.promise;
  }
  get(path){const e=this.cache.get(path);return e&&e.image;}
  error(path){const e=this.cache.get(path);return e&&e.error;}
  retain(paths){const set=new Set(paths);for(const k of this.cache.keys())if(!set.has(k))this.cache.delete(k);}
}
module.exports={Assets};

},
"systems/audio.js":function(module,exports,__require){
class AudioSystem {
  constructor(platform,onError){this.p=platform;this.error=onError;this.settings={audio:true,volume:.35};this.amb=null;this.fx=null;this.mode=null;this.modeGain=1;this.failed=new Set();this.states={reality:1,memory:.58,cave:.72,ending:1};}
  setup(a,path){a.src=path;if(a.onError)a.onError(()=>{if(!this.failed.has(path)){this.failed.add(path);this.error('声音加载失败，可继续游玩。');}});return a;}
  apply(settings){this.settings=settings;if(this.amb){this.amb.volume=settings.audio?settings.volume*this.modeGain:0;if(!settings.audio)this.amb.pause();else this.amb.play();}}
  environment(mode){const next=this.states[mode]===undefined?'reality':mode;if(this.mode===next){this.apply(this.settings);return;}this.mode=next;this.modeGain=this.states[next];if(this.amb)this.amb.stop();this.amb=this.setup(this.p.audio(),'assets/audio/ambient_wind_8s_v1.wav');this.amb.loop=true;this.apply(this.settings);}
  cue(type){if(!this.settings.audio)return;if(this.fx)this.fx.stop();const path=type==='success'?'assets/audio/puzzle_success_v1.wav':'assets/audio/lens_switch_v1.wav';this.fx=this.setup(this.p.audio(),path);this.fx.volume=this.settings.volume*(type==='accident'?.8:1);this.fx.play();}
  pause(){if(this.amb)this.amb.pause();if(this.fx)this.fx.stop();}
}
module.exports={AudioSystem};

},
"data/media.js":function(module,exports,__require){
// Keep empty until an actual generated clip has passed narrative and visual review.
// Use your Aliyun HTTPS domain and enable request/download legal domains in WeChat.
module.exports={baseUrl:'',clips:{},sceneClips:{S01:'cg_s01_reveal'},manifestPath:'/api/media-manifest'};

},
"ui/draw.js":function(module,exports,__require){
const COLORS={bg:'#0c1010',paper:'#e9e3d5',muted:'#a7aaa0',accent:'#cbb98c',line:'#53605b'};
function rect(ctx,x,y,w,h,fill,stroke,r=0){ctx.beginPath();if(r&&ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}}
function text(ctx,value,x,y,size=16,color=COLORS.paper,align='left',font='sans-serif'){ctx.font=`${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(String(value),x,y);}
function wrap(ctx,value,x,y,maxWidth,size=17,color=COLORS.paper,line=27,maxLines=20){ctx.font=`${size}px sans-serif`;let out='',row=0;for(const ch of String(value)){if(ch==='\n'||ctx.measureText(out+ch).width>maxWidth){text(ctx,out,x,y+row*line,size,color);out=ch==='\n'?'':ch;row++;if(row>=maxLines)return row*line;}else out+=ch;}if(out)text(ctx,out,x,y+row++*line,size,color);return row*line;}
function cover(ctx,img,x,y,w,h){if(!img)return;const ratio=Math.max(w/img.width,h/img.height),sw=w/ratio,sh=h/ratio;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);}
function containFrame(img,x,y,w,h){if(!img||!img.width||!img.height)return{x,y,w,h};const ratio=Math.min(w/img.width,h/img.height),dw=img.width*ratio,dh=img.height*ratio;return{x:x+(w-dw)/2,y:y+(h-dh)/2,w:dw,h:dh};}
function contain(ctx,img,x,y,w,h,fill){if(!img)return;const frame=containFrame(img,x,y,w,h);if(fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h);}
function circle(ctx,x,y,r,stroke,fill){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.2;ctx.stroke();}}
module.exports={COLORS,rect,text,wrap,cover,contain,containFrame,circle};

},
"ui/strokes.js":function(module,exports,__require){
'use strict';

// Match the persistent artwork schema. Sample pointer motion before it reaches
// the model, keeping the exact first and latest points of each stroke.
const MAX_STROKES = 80;
const MAX_POINTS = 1000;
const MIN_STEP = 1.5;

function distanceToSegmentSquared(point, start, end) {
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const length = dx * dx + dy * dy;
  const ratio = length === 0 ? 0 : Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length));
  const x = point[0] - start[0] - ratio * dx, y = point[1] - start[1] - ratio * dy;
  return x * x + y * y;
}

// Iterative Douglas-Peucker preserves corners instead of keeping every nth event.
function simplify(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]], threshold = tolerance * tolerance;
  while (stack.length) {
    const segment = stack.pop(), start = segment[0], end = segment[1];
    let farthest = -1, maximum = threshold;
    for (let i = start + 1; i < end; i += 1) {
      const distance = distanceToSegmentSquared(points[i], points[start], points[end]);
      if (distance > maximum) { maximum = distance; farthest = i; }
    }
    if (farthest !== -1) { keep[farthest] = 1; stack.push([start, farthest], [farthest, end]); }
  }
  return points.filter((point, i) => keep[i]);
}

function appendPoint(stroke, point) {
  const next = [point[0], point[1]], count = stroke.length;
  if (!count) stroke.push(next);
  else if (count === 1) {
    if (next[0] !== stroke[0][0] || next[1] !== stroke[0][1]) stroke.push(next);
  } else {
    const anchor = stroke[count - 2], tail = stroke[count - 1];
    if (Math.hypot(tail[0] - anchor[0], tail[1] - anchor[1]) < MIN_STEP) stroke[count - 1] = next;
    else stroke.push(next);
  }
  if (stroke.length > MAX_POINTS) {
    let tolerance = .75, compact = simplify(stroke, tolerance);
    while (compact.length > 750) { tolerance *= 1.5; compact = simplify(stroke, tolerance); }
    stroke.splice(0, stroke.length, ...compact);
  }
}

function finishStroke(strokes, current) {
  if (!current || current.length >= 2) return;
  const index = strokes.indexOf(current);
  if (index !== -1) strokes.splice(index, 1);
}

function bounds(width, height) { return { x: 50, y: 155, w: width - 100, h: height - 310 }; }
function clamp(value) { return Math.max(0, Math.min(1, value)); }
function normalize(strokes, area) {
  return strokes.filter((stroke) => stroke.length >= 2).map((stroke) => stroke.map(([x, y]) => [clamp((x - area.x) / area.w), clamp((y - area.y) / area.h)]));
}
function resizeStrokes(strokes, previous, next) {
  return normalize(strokes, previous).map((stroke) => stroke.map(([x, y]) => [next.x + x * next.w, next.y + y * next.h]));
}

module.exports = { MAX_STROKES, MAX_POINTS, appendPoint, finishStroke, bounds, normalize, resizeStrokes };

},
};const cache={};function __require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,__require);return m.exports;}__require("platform/browser-entry.js");})();
