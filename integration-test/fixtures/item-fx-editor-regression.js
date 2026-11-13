/* 物品特效编辑器：真实表单选择 → 保存应用 → chat roster → 重开回填，不复制编辑器逻辑。 */
(function () {
  'use strict';
  window.runItemFxEditorRegression = async function ({ w, check, eq, mock }) {
    const ev = code => w.eval(code);
    const doc = w.document;
    const saved = ev(`({heroesData,enemiesData,initialHeroesCache,initialEnemiesCache,editorLiveHeroes,editorLiveEnemies,
      state:{...state},defend:{...defendSettings},token:combatToken,frozen:_pipelineFrozen,
      battleHistory,_historyRawCache,itemBindingKnowledge,particles:fxEngine.particles.slice(),
      tab:window.__editorFactionTab})`);
    const chat = mock.api.getVariables({type:'chat'});
    const storage = Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{
      const key=w.localStorage.key(i);return [key,w.localStorage.getItem(key)];
    }));
    const gen0 = mock.genCount();
    try {
      w.clearArcaneFx();
      ev('state.isGameStarted=false;editorLiveHeroes=null;editorLiveEnemies=null;');
      const item=w.parseItem('【蝎眼钥匙】[召唤:幻梦行军兽][单防;power:10][MP:20][高阶][延迟:0][道具][次数:1][特效:蝎眼钥匙]');
      const parent=w.parseItem('【化尘者之瓶】[道具][次数:3]');
      parent.children=[w.parseSkill('【飞沙化甲】[单防;power:50][单瞄:30][再动;power:1][MP:8][Turns:5][法术][他人][特效:飞沙化甲]')];
      item.isExpanded=parent.isExpanded=parent.children[0].isExpanded=true;
      w.__itemFxProbe={id:'h_item_fx',name:'物品特效验证',hp:200,maxHp:200,mp:100,maxMp:100,tp:0,maxTp:100,
        atk:20,def:5,spd:50,actCount:1,isAlive:true,isExpanded:true,skills:[],buffs:[],items:[item,parent]};
      ev('heroesData=[window.__itemFxProbe];enemiesData=[];');
      const ids=['edit-h-0-it-0-fxTag','edit-h-0-it-1-c-0-fxTag'];
      w.openEditor();w.switchPartyTab('hero');
      const selects=ids.map(id=>doc.getElementById(id));
      check(selects.every(Boolean),'普通物品与物品子技能都有特效选择框');
      if (!selects.every(Boolean)) return;
      check(selects.every(el=>el.getBoundingClientRect().width>0),'展开后两处特效选择框实际可见');
      eq(selects.map(el=>el.value),['蝎眼钥匙','飞沙化甲'],'YAML原始特效标签正确回填');
      for (const tag of ['飞沙化甲','蝎眼钥匙','灵风术']) {
        check(selects.every(el=>Array.from(el.options).some(option=>option.value===tag)),'两处下拉包含注册特效：'+tag);
      }
      const choose=values=>ids.forEach((id,i)=>{
        const el=doc.getElementById(id);el.value=values[i];el.dispatchEvent(new w.Event('change',{bubbles:true}));
      });
      const rosterFx=()=>{
        const h=mock.api.getVariables({type:'chat'}).rpg_combat_roster.heroes[0];
        return [h.items[0].fxTag,h.items[1].children[0].fxTag];
      };
      choose(['灵风术','蝎眼钥匙']);
      w.saveEditor();
      eq(rosterFx(),['灵风术','蝎眼钥匙'],'保存应用将物品和子技能特效写入真实roster序列化');
      w.openEditor();
      eq(ids.map(id=>doc.getElementById(id).value),['灵风术','蝎眼钥匙'],'保存后重开选择框保持修改值');
      choose(['','']);w.saveEditor();
      eq(rosterFx(),[null,null],'选择特效无后保存为null');
      w.openEditor();
      eq(ids.map(id=>doc.getElementById(id).value),['',''],'清空后重开保持特效无');
      eq(mock.genCount(),gen0,'物品特效编辑未调用LLM');
    } finally {
      w.closeEditor();w.clearArcaneFx();
      mock.api.replaceVariables(chat,{type:'chat'});
      w.localStorage.clear();Object.entries(storage).forEach(([key,value])=>w.localStorage.setItem(key,value));
      w.__itemFxRestore=saved;
      ev(`(()=>{const s=window.__itemFxRestore;
        ({heroesData,enemiesData,initialHeroesCache,initialEnemiesCache,editorLiveHeroes,editorLiveEnemies,battleHistory,_historyRawCache,itemBindingKnowledge}=s);
        for(const key of Object.keys(state))delete state[key];Object.assign(state,s.state);
        for(const key of Object.keys(defendSettings))delete defendSettings[key];Object.assign(defendSettings,s.defend);
        combatToken=s.token;_pipelineFrozen=s.frozen;fxEngine.particles=s.particles;window.__editorFactionTab=s.tab;
        delete window.__itemFxRestore;delete window.__itemFxProbe;initUI();
      })()`);
    }
  };
})();
