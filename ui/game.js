const {SCENES,CLUES}=require('../data/chapter');
const {GameModel,createState}=require('../systems/model');
const {SaveStore}=require('../systems/storage');
const {Assets}=require('../systems/assets');
const {AudioSystem}=require('../systems/audio');
const MEDIA=require('../data/media');
const {COLORS:C,rect,text,wrap,cover,contain,containFrame,circle}=require('./draw');
const Strokes=require('./strokes');

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
  startEpilogue(){this.screen='epilogue';this.modal=null;this.mode='reality';this.epilogue=0;this.assets.load('assets/scenes/scene_S09_reality_1280_v1.jpg');this.audio.apply(this.model.state.settings);this.audio.environment('reality');}
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
  sceneFrame(stage=this.stage()){
    const scene=this.model&&this.model.scene;
    const active=scene&&(this.sceneImage||(this.mode==='memory'&&scene.memory?scene.memory:scene.reality));
    const image=this.assets&&this.assets.get&&active?this.assets.get(active):null;
    return containFrame(image,stage.x,stage.y,stage.w,stage.h);
  }
  movePlayerTo(x,y){
    const frame=this.sceneFrame();this.player.targetX=Math.max(.08,Math.min(.92,(x-frame.x)/frame.w));this.player.targetY=Math.max(.16,Math.min(.9,(y-frame.y)/frame.h));
  }
  interactAt(object,x,y){
    const frame=this.sceneFrame(),tx=Math.max(0,Math.min(1,(x-frame.x)/frame.w)),ty=Math.max(0,Math.min(1,(y-frame.y)/frame.h));
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
  drawActors(frame){
    this.drawActor(frame,this.player.x,this.player.y,'阿迟',C.accent,true);
    const id=this.model.scene.id;
    if(id==='S02'||id==='S06')this.drawActor(frame,.76,.65,'小花','#d2c5a1');
    if(id==='S05')this.drawActor(frame,.27,.59,'小花','#d2c5a1');
    if(id==='S05'||id==='S07')this.drawActor(frame,.72,.52,'族长','#a9b3aa');
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
  stage(){return this.portrait?{x:0,y:142,w:this.W,h:420}:{x:128,y:76,w:744,h:390};}
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
      let x=imageFrame.x+o.x*imageFrame.w,y=imageFrame.y+o.y*imageFrame.h;x=Math.max(imageFrame.x+32,Math.min(imageFrame.x+imageFrame.w-32,x));y=Math.max(imageFrame.y+65,Math.min(imageFrame.y+imageFrame.h-54,y));
      const seen=state.clues.includes(o.clue.id),distance=Math.hypot(this.player.x-o.x,this.player.y-o.y),near=distance<.2;
      circle(c,x,y,seen?16:near?15:11,seen?C.accent:near?C.paper:'#9ba49a88','#0c1712cc');text(c,seen?'✓':near?String(i+1):'·',x,y,15,C.paper,'center');
      const tw=Math.min(210,Math.max(115,o.label.length*17));rect(c,x-tw/2,y+22,tw,34,'#0c1712e8',null,3);text(c,o.label,x,y+39,16,C.paper,'center');
      this.hit(o.label,x-28,y-28,56,56,()=>this.interactAt(o,x,y));
    }
    this.drawActors(imageFrame);
    if(!objects.length)text(c,'这一层影像没有新的观察点。',W/2,stage.y+stage.h*.65,19,C.paper,'center');
    const hudTop=stage.y+stage.h;rect(c,0,hudTop,W,H-hudTop,C.bg);this.line(0,hudTop,W,C.line);
    const gy=this.portrait?Math.max(596,hudTop+28):hudTop+16;const required=s.puzzle.required;const count=required.filter(id=>state.clues.includes(id)).length;
    text(c,`观察记录  ${count} / ${required.length}`,24,gy,17,C.muted);
    if(this.portrait)this.button('观察条目',W-165,gy-20,140,()=>this.modal={type:'objects'},false,42);
    if(this.portrait)text(c,this.mode==='memory'?'透镜影像  ·  左侧为现实':'现实  ·  观察可触摸的事物',24,gy+30,15,C.muted);
    if(this.portrait){wrap(c,'透镜只能显现影像。判断与行动，仍在现实之中。',24,654,W-48,18,C.muted,28);this.button('线索册',24,740,160,()=>{this.bookPage=0;this.modal={type:'notebook'};});this.button('章节地图',200,740,160,()=>this.modal={type:'map'});}
    // Keep the action row and the lens status inside the logical canvas. The
    // previous landscape baseline was y=601 on a 600px canvas, which clipped
    // the battery label in the WeChat simulator.
    const actionH=this.portrait?48:44;
    const by=this.portrait?Math.min(860,H-190):H-actionH-16;
    if(!this.portrait){this.button('线索册',24,by,110,()=>{this.bookPage=0;this.modal={type:'notebook'};},false,actionH);this.button('章节',146,by,94,()=>this.modal={type:'map'},false,actionH);}
    const lx=this.portrait?24:270;this.button(this.mode==='memory'?'收起透镜':'举起透镜',lx,by,160,()=>this.toggleLens(),this.mode==='memory',actionH);
    const power=state.lensAcquired?(state.battery<=0?'断电':state.battery<1?'<1%':`${Math.ceil(state.battery)}%`):'未取得';
    if(this.portrait){const powerY=Math.min(by+63,H-27);text(c,`透镜 · ${power}`,lx+80,powerY,15,C.muted,'center');}
    else text(c,`透镜 · ${power}`,W-24,gy,14,C.muted,'right');
    this.button(state.brightness===2?'亮度 · 高':'亮度 · 低',lx+176,by,130,()=>{if(this.model.canLens){this.model.setBrightness(state.brightness===1?2:1);this.save();}else this.toast('透镜当前不可启动。');},false,actionH);
    const solved=state.solved.includes(s.puzzle.id);this.button(solved?'继续  →':'采取行动  →',W-220,by,196,()=>solved?this.proceed():this.puzzle(),true,actionH);
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
