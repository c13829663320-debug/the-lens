const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {SCENES}=require('../data/chapter');
let count=0;const missing=[];const missingRequiredMemoryLayers=[];
for(const scene of SCENES){
  assert(scene.objects.length>=3,scene.id+' needs meaningful objects');
  for(const key of ['reality','memory']){
    if(scene[key]){
      const file=path.join(__dirname,'..',scene[key]);
      if(!fs.existsSync(file))missing.push(scene[key]);
      else count++;
    }
  }
  // S08 is intentionally blocked from lens switching until its matching cave archive frame arrives.
  if(scene.id==='S08'&&!scene.memory)missingRequiredMemoryLayers.push('S08.memory');
  for(const id of scene.puzzle.required)assert(scene.objects.some(o=>o.clue.id===id),scene.id+' '+id);
}
assert.equal(missing.length,0,missing.join(', '));
console.log(JSON.stringify({scenes:SCENES.length,backgroundReferences:count,missing:missing.length,requiredMemoryLayers:1,missingRequiredMemoryLayers}));
