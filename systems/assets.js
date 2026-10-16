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
