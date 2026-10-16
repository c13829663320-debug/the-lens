const { createPlatform } = require('./platform/wechat');
const { Game } = require('./ui/game');
const app = new Game(createPlatform());
app.start();
