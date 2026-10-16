const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
function bundle(entry){const mods=new Map();function visit(file){file=path.resolve(file);if(mods.has(file))return;let code=fs.readFileSync(file,'utf8');mods.set(file,'');code=code.replace(/require\(['"](\.[^'"]*)['"]\)/g,(_,rel)=>{let p=path.resolve(path.dirname(file),rel);if(!path.extname(p))p+='.js';visit(p);return `__require(${JSON.stringify(path.relative(root,p).replaceAll('\\','/'))})`;});mods.set(file,code);}visit(path.join(root,entry));let result='(function(){const modules={\n';for(const [p,c]of mods)result+=JSON.stringify(path.relative(root,p).replaceAll('\\','/'))+':function(module,exports,__require){\n'+c+'\n},\n';return result+'};const cache={};function __require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};modules[id](m,m.exports,__require);return m.exports;}__require('+JSON.stringify(entry)+');})();\n';}
fs.mkdirSync(dist,{recursive:true});fs.writeFileSync(path.join(dist,'browser.js'),bundle('platform/browser-entry.js'));
const gameDir=path.join(dist,'wechat');fs.mkdirSync(gameDir,{recursive:true});
for(const item of ['game.js','game.json','platform','systems','ui','data','assets'])fs.cpSync(path.join(root,item),path.join(gameDir,item),{recursive:true});
// Do not package the browser adapter or its QA entry point in the mini-game.
for(const name of ['browser.js','browser-entry.js'])fs.rmSync(path.join(gameDir,'platform',name),{force:true});
function bytes(dir){return fs.readdirSync(dir,{withFileTypes:true}).reduce((sum,d)=>sum+(d.isDirectory()?bytes(path.join(dir,d.name)):fs.statSync(path.join(dir,d.name)).size),0);}
console.log(JSON.stringify({browser:'dist/browser.js',wechat:'dist/wechat',runtimeBytes:bytes(gameDir),dependencyCount:0},null,2));
