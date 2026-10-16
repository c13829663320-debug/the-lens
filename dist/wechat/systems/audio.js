class AudioSystem {
  constructor(platform,onError){this.p=platform;this.error=onError;this.settings={audio:true,volume:.35};this.amb=null;this.fx=null;this.mode=null;this.modeGain=1;this.failed=new Set();this.states={reality:1,memory:.58,cave:.72,ending:1};}
  setup(a,path){a.src=path;if(a.onError)a.onError(()=>{if(!this.failed.has(path)){this.failed.add(path);this.error('声音加载失败，可继续游玩。');}});return a;}
  apply(settings){this.settings=settings;if(this.amb){this.amb.volume=settings.audio?settings.volume*this.modeGain:0;if(!settings.audio)this.amb.pause();else this.amb.play();}}
  environment(mode){const next=this.states[mode]===undefined?'reality':mode;if(this.mode===next){this.apply(this.settings);return;}this.mode=next;this.modeGain=this.states[next];if(this.amb)this.amb.stop();this.amb=this.setup(this.p.audio(),'assets/audio/ambient_wind_8s_v1.wav');this.amb.loop=true;this.apply(this.settings);}
  cue(type){if(!this.settings.audio)return;if(this.fx)this.fx.stop();const path=type==='success'?'assets/audio/puzzle_success_v1.wav':'assets/audio/lens_switch_v1.wav';this.fx=this.setup(this.p.audio(),path);this.fx.volume=this.settings.volume*(type==='accident'?.8:1);this.fx.play();}
  pause(){if(this.amb)this.amb.pause();if(this.fx)this.fx.stop();}
}
module.exports={AudioSystem};
