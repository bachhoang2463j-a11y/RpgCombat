/* 四Demo共同生命周期回归：直接操作真实模块与独立DOM，不复制战斗实现。 */
(function () {
  'use strict';
  window.runFeedbackCoexistRegression = async function ({ w,check,eq,mock }) {
    const mod=w.eval('arcaneVfxModule'),doc=w.document,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const saved=w.eval('({heroesData,enemiesData,token:combatToken,frozen:_pipelineFrozen})');
    const gen0=mock.genCount();
    const root=doc.createElement('div');root.id='feedback-coexist-stage';
    root.style.cssText='position:fixed;left:20px;top:240px;width:650px;height:260px;pointer-events:none';
    root.innerHTML='<div id="hero-wrap-h_co_g" style="position:absolute;left:0;top:0;width:140px;height:160px"><div id="hero-card-h_co_g" class="hero-card-inner" style="width:140px;height:160px"><div class="bg-gray-900" style="position:absolute;inset:0;background:#334155"><span>守护者</span></div><div id="h_co_g-buffs"></div></div></div>'
      +'<div id="hero-wrap-h_co_t" style="position:absolute;left:240px;top:0;width:140px;height:160px"><div id="hero-card-h_co_t" class="hero-card-inner" style="width:140px;height:160px"><div class="bg-gray-900" style="position:absolute;inset:0;background:#334155">目标</div><div id="h_co_t-buffs"></div></div></div>'
      +'<div id="enemy-box-e_co" style="position:absolute;left:440px;top:0;width:150px;height:150px;transform:scale(0.72)"><div id="e_co-sprite" class="enemy-sprite" style="position:relative;width:150px;height:130px;font-size:72px">👾</div><div class="arcane-hit-track"><div id="e_co-hp-bar"></div></div><div id="e_co-buffs"></div></div>';
    doc.body.appendChild(root);
    const entity=(id,extra)=>Object.assign({id,name:id,hp:500,maxHp:500,mp:100,maxMp:100,tp:0,maxTp:100,atk:10,def:0,spd:1,shield:0,isAlive:true,buffs:[],skills:[],items:[],tags:[],classType:null},extra);
    const guardian=entity('h_co_g'),target=entity('h_co_t'),enemy=entity('e_co',{explode:{type:'群火',power:50},buffs:[{type:'poison',value:5,duration:2},{type:'paralyze',value:-5,duration:2}]});
    try {
      w.eval('combatToken={};_pipelineFrozen=false');mod.setIdentitySfx(false);w.setVariantSfx(false);w.setSelfDestructSfx(false);w.setStatusSfx(false);
      w.eval('heroesData='+JSON.stringify([guardian,target])+';enemiesData='+JSON.stringify([enemy])+';');
      const e=w.eval('enemiesData[0]');
      mod.syncStatusLayers(e);mod.syncSelfDestructWarning(e);
      eq(doc.querySelectorAll('[data-arcane-status-persist]').length,2,'毒与麻痹常驻并存');
      eq(doc.querySelectorAll('[data-arcane-selfdestruct-warning]').length,1,'自爆预警与状态常驻并存');
      const resist=mod.playVariantResistFx({entity:e,layers:['fluid','vital'],from:guardian});
      check(!w.isEntityVariantLocked(e),'两层抗性不占用变种锁');
      await sleep(160);
      const clones=doc.querySelectorAll('.arcane-resist-ghost');
      check(clones.length>0,'缩放emoji生成抗性残影');
      eq([...clones].reduce((n,node)=>n+node.querySelectorAll('[data-arcane-status-persist],[data-arcane-selfdestruct-warning],.arcane-hit-track,[id*="buff"]').length,0),0,'残影不复制毒泡、火花、预警、血条或徽章');
      w.clearVariantState(e.id);
      eq(doc.querySelectorAll('[data-resist-fx]').length,0,'只清变种句柄即可取消抗性');
      eq(doc.querySelectorAll('[data-arcane-status-persist]').length,2,'取消抗性不误清持续状态');
      const sheshen=mod.playRescueSheshen(guardian,target,{incomingType:'近战'});
      await sheshen.ready;
      const grit=mod.playRescueGrit(guardian);
      check(!sheshen.owner.finished && !grit.finished,'同一舍身者触发毅力不取消外层停驻');
      const windup=mod.playSelfDestructWindup(e,{form:'群毒'});
      mod.playStatusTickFx({event:'paraProc',entity:e});
      await sleep(130);
      eq(doc.querySelectorAll('[data-arcane-selfdestruct-warning]').length,0,'尸体三幕接管时移除存活预警');
      check(!!doc.querySelector('.arcane-selfdestruct-stage'),'尸体舞台与救场/状态反馈并存');
      const clone=doc.querySelector('.arcane-selfdestruct-stage .arcane-sd-body');
      eq(clone.querySelectorAll('[data-arcane-status-persist],[data-arcane-selfdestruct-warning]').length,0,'尸体快照不携带持久层');
      mod.clearArcaneFx();
      await sleep(30);
      eq(doc.querySelectorAll('[data-resist-fx],[data-arcane-status-persist],[data-arcane-selfdestruct-warning],.arcane-selfdestruct-stage,.arcane-rescue-blood-wrap,[data-rescue]').length,0,'四模块全局清理零残留');
      eq(await sheshen.done,false,'清场终止舍身并释放等待');eq(await windup.done,false,'清场终止自爆聚能并释放等待');
      eq(doc.getElementById('hero-wrap-h_co_g').style.transform,'','清场恢复舍身外层transform');
      const oldDom=doc.getElementById('e_co-sprite');mod.syncStatusLayers(e);mod.syncSelfDestructWarning(e);
      const replacement=oldDom.cloneNode(false);replacement.textContent='👾';oldDom.replaceWith(replacement);
      mod.syncStatusLayers(e);mod.syncSelfDestructWarning(e);
      check(!oldDom.querySelector('[data-arcane-status-persist],[data-arcane-selfdestruct-warning]'),'DOM重建清理离线旧常驻与预警');
      eq(doc.querySelectorAll('[data-arcane-status-persist]').length,2,'重建后仅新DOM持有两层状态');
      eq(doc.querySelectorAll('[data-arcane-selfdestruct-warning]').length,1,'重建后仅新DOM持有一层预警');
      mod.clearArcaneFx();
      eq(mock.genCount(),gen0,'四模块共存回归不调用LLM');
    } finally {
      mod.clearArcaneFx();mod.setIdentitySfx(true);w.setVariantSfx(true);w.setSelfDestructSfx(true);w.setStatusSfx(true);root.remove();
      w.__coexistSaved=saved;w.eval('heroesData=window.__coexistSaved.heroesData;enemiesData=window.__coexistSaved.enemiesData;combatToken=window.__coexistSaved.token;_pipelineFrozen=window.__coexistSaved.frozen;delete window.__coexistSaved;');
    }
    return {pending:[]};
  };
})();
