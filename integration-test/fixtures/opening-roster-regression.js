/* OpeningSetup 真实页面解析与提交，写入既有 harness 的内存 chat 变量后由真实引擎读回。 */
window.runOpeningRosterRegression = async function ({ w, check, eq, mock, mountFrame }) {
  const frame = document.createElement('iframe');
  frame.id = 'opening-duration-test';
  frame.title = 'OpeningSetup 标签回合测试';
  frame.style.cssText = 'width:640px;height:420px;';
  document.getElementById('frames').appendChild(frame);
  const previousVars = mock.api.getVariables({ type: 'chat' });
  w.eval('window.__odState = { heroesData, enemiesData, initialHeroesCache, initialEnemiesCache, itemBindingKnowledge, battleHistory, state: {...state}, editorLiveHeroes, editorLiveEnemies };');
  try {
    mock.resetVars();
    mock.api.createChatMessages = async () => {};
    await mountFrame(frame.id, '../../OpeningSetup/OpeningSetup-公开版.html', '../../OpeningSetup/',
      s => !!s.__OPENING_DEBUG__ && s.__OPENING_DEBUG__.state.stage !== 'boot');
    const ow = frame.contentWindow;
    const os = ow.__OPENING_DEBUG__;
    const combat = os.COMBAT;
    const skill = combat.classes['狂战士'].skills.find(s => s.data.name === '战意激增').data;
    eq([skill.slotTurns, skill.slotTurns2], [3, 2], '向导真实解析：战意激增增攻3回合、自盲2回合');
    const defaultSkill = combat.classes['隐匿者'].skills.find(s => s.data.name === '烟尘迷眼').data;
    eq([defaultSkill.turns, defaultSkill.type2, defaultSkill.type3], [null, '[无]', '[无]'], '向导真实解析：默认轮数null、空槽[无]');
    const stage = os.state;
    os.instant = true;
    stage.hero1Class = '狂战士';
    stage.hero2Class = '圣职者';
    stage.heroIskandarClass = '征伐者';
    stage.hero3.classType = '狂战士';
    stage.hero3.name = '回合验收';
    stage.hero3.skills = ['战意激增'];
    stage.autoFullscreen = false;
    stage.soundOn = false;
    const submit = ow.document.createElement('button');
    submit.dataset.action = 'confirm-submit';
    ow.document.getElementById('app').appendChild(submit);
    submit.click();
    // 确认动作内部只含本地异步 mock，不等待视频或动画装载。
    while (stage.stage === 'loading') await new Promise(r => setTimeout(r, 20));
    check(stage.stage === 'done', '向导真实提交完成（未写真实聊天）', stage.stage + ': ' + (stage.errorMsg || ''));
    const roster = mock.api.getVariables({ type: 'chat' }).rpg_combat_roster;
    const saved = roster.heroes.find(h => h.name === '回合验收').skills.find(s => s.name === '战意激增');
    eq([saved.slotTurns, saved.slotTurns2], [3, 2], '向导 buildPartySave/TH.writeChatVars 透传标签回合');
    const yaml = '战斗数据栏:\n  我方列表:\n    - 角色:\n        名字: "回合验收"\n        属性: "[HP:200/200][MP:100/100][Atk:20][Armor:5][Speed:50]"\n  敌方列表:\n    - 角色:\n        名字: "回合测试敌"\n        属性: "[HP:500/500][MP:0/0][Atk:10][Armor:0][Speed:20]"';
    w.onCombatDataReceived(yaml);
    const read = w.eval('heroesData[0].skills.find(s => s.name === "战意激增")');
    eq([read.slotTurns, read.slotTurns2], [3, 2], '引擎真实读取向导roster：增攻3、自盲2');
    w.eval('state.isGameStarted=false;');
    w.openEditor();
    const dom = w.document;
    const sIndex = w.eval('heroesData[0].skills.findIndex(s => s.name === "战意激增")');
    const slot2 = dom.getElementById('edit-h-0-s-' + sIndex + '-slot-turns2');
    eq(slot2.value, '2', '技能编辑器自盲回合框真实显示2，而非占位默认');
    w.syncEditorDataToMemory();
    w.persistHeroesRoster();
    w.closeEditor();
    w.onCombatDataReceived(yaml);
    eq(w.eval('heroesData[0].skills.find(s=>s.name==="战意激增").slotTurns2'), 2, '编辑器同步、保存、再次读回后自盲仍2回合');
    await w.eval('(async()=>{ const h=heroesData[0];h.buffs=[];h.skills.find(s=>s.name==="战意激增").fxTag="audit-no-fx";await executeSkillAction(h,h,h.skills.find(s=>s.name==="战意激增"),1);})()');
    eq(w.eval('heroesData[0].buffs.filter(b=>b.type==="hit").map(b=>[b.value,b.duration])'), [[-10, 2]], '真实施法：自盲-10、持续2回合');
    eq(w.eval('heroesData[0].buffs.filter(b=>b.type==="atk").map(b=>[b.value,b.duration])'), [[50, 3]], '真实施法：增攻50、持续3回合');

    const legacy = structuredClone(roster);
    const lh = legacy.heroes.find(h => h.name === '回合验收');
    lh.skills = [{ name: '旧档默认', type: '[单增]', power: 10, type2: null, type3: null, turns: 0, hit: 100, cost: 0 },
      { name: '显式回合', type: '[自盲]', power: 5, turns: 5, slotTurns: 2, hit: 100, cost: 0 }];
    lh.items = [{ name: '旧道具', category: '道具', count: 1, type: null, type2: null, type3: null, turns: 0,
      children: [{ name: '旧用法', type: '[单防]', type2: null, turns: 0 }] }];
    mock.api.insertOrAssignVariables({ rpg_combat_roster: legacy }, { type: 'chat' });
    w.onCombatDataReceived(yaml);
    eq(w.eval('(()=>{const h=heroesData[0],s=h.skills[0],it=h.items[0];return [s.turns,s.type2,it.type,it.turns,it.children[0].type2,it.children[0].turns]})()'),
      [null, '[无]', '[无]', null, '[无]', null], '旧roster：技能、物品及子用法一次归一，默认回合不再是0');
    await w.eval('(async()=>{const h=heroesData[0];h.buffs=[];const s=h.skills[0];s.fxTag="audit-no-fx";await executeSkillAction(h,h,s,1);})()');
    eq(w.eval('heroesData[0].buffs.find(b=>b.type==="atk").duration'), 3, '旧档默认效果实际执行3回合');
    eq(w.eval('(()=>{const s=heroesData[0].skills[1];return [s.turns,s.slotTurns]})()'), [5,2], '旧档显式正数技能级/槽位级回合保留');
  } finally {
    delete mock.api.createChatMessages;
    mock.api.replaceVariables(previousVars, { type: 'chat' });
    w.eval('({heroesData,enemiesData,initialHeroesCache,initialEnemiesCache,itemBindingKnowledge,battleHistory,editorLiveHeroes,editorLiveEnemies}=window.__odState);Object.assign(state,window.__odState.state);delete window.__odState;');
    frame.remove();
  }
};
