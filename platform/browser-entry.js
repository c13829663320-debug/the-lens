const {createPlatform}=require('./browser');
const {Game}=require('../ui/game');
const app=new Game(createPlatform());
// Read-only inspection for automated QA; all mutations still use the real pointer UI.
window.__lens={snapshot:()=>app.snapshot()};
app.start();
