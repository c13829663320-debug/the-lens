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
  ], puzzle('S06_entry', '走向画廊', '建筑影像与废墟重叠。沿哪条路前进？', ['S06_landmark', 'S06_path', 'S06_companion', 'S06_facade'], [
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

  scene('S05', '高架连廊', '06 / 旧桥影', '观察完整桥影，再确认现实断口。', img('S05', 'reality'), img('S05', 'memory'), [action('透镜中的旧连廊完整地伸向前方。阿迟停在断口前，目光追随着那条路。')], [
    real('S05', 'gap', '脚下断口', .52, .67, '影像没有承重', '桥面已断。踩空无法倒回，现实边缘承受两人重量。'),
    real('S05', 'wrist', '小花受伤手腕', .27, .59, '抓住他的手', '小花紧抓阿迟，乱动会增加伤势。'),
    real('S05', 'rescue', '族长伸来的手', .72, .52, '救援支点', '族长伏在完整桥面，伸手提供支点。'),
    mem('S05', 'bridge', '完整连廊影像', .63, .38, '没有实体的旧桥', '人流仍在旧桥上行走，影像不因险情停下。')
  ], puzzle('S05_rescue', '配合救援', '小花手腕受伤。先对照透镜中的旧连廊，再回应正在发生的救援。', ['S05_bridge', 'S05_gap', 'S05_wrist', 'S05_rescue'], [
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
