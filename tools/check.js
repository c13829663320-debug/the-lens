const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {SCENES}=require('../data/chapter');
let count=0;for(const scene of SCENES){assert(scene.objects.length>=3,scene.id+' needs meaningful objects');for(const key of ['reality','memory'])if(scene[key]){assert(fs.existsSync(path.join(__dirname,'..',scene[key])),scene[key]);count++;}for(const id of scene.puzzle.required)assert(scene.objects.some(o=>o.clue.id===id),scene.id+' '+id);}
console.log(JSON.stringify({scenes:SCENES.length,backgroundReferences:count,missing:0}));
