为防守者新增【强力反击】被动：闪避成功时50%概率触发（便于测试，最终可调回5%）无视伤害类型限制的双倍攻击力反击，带独立红色圆锥冲击波特效与专属音效。

## 改动文件
- `战斗前端-爬塔 V4.3.html`（主要）
- `LOG.md`、`LOG-INDEX.md`（施工日志）
- README.md 待用户确认后更新

## 实现细节
1. 在闪避成功分支（行4586后、常规反击前）emit ON_DODGE 事件（该事件已定义于行4047，首次启用）
2. 防守者 CLASS_PASSIVES 新增 async onDodge 钩子：50%概率 → 2×atk 伤害经 calculateDamage 正常结算 → 扣血/飘字/历史/UI
3. 事件适配层新增 ON_DODGE 订阅，过滤防守者
4. 新增 playPowerCounterEffect()（参照 playKanpoEffect 分幕模板，约1秒）：
   - 蓄力（0-200ms）：防守者处红色聚焦光点 + 暗红压暗
   - 冲击波射出（~200ms）：播放专属音效 shot01.mp3，同时红色圆锥冲击波从防守者冲向目标 + 红色锥形粒子流
   - 命中绽开血花（600-1000ms）：红/暗红爆散粒子 + 红色冲击波圆环 + 全屏红色脉冲 flash + 震屏 + 目标受击抖动
   - 音效在「冲击波射出」瞬间（约200ms）播放，非命中时
5. 新增红色粒子函数 spawnPowerConeStream()/spawnPowerBurst() 与红系 CSS keyframes
6. 音效：playCustomAudio 播放 https://cdn.jsdelivr.net/gh/bachhoang2463j-a11y/test1@main/shot01.mp3
7. 验证：Node 提取 script 语法校验 + 手操实测

## 关键约束
- 音效在冲击波射出瞬间（约200ms）播放，非命中时
- 伤害正常结算（受防御减免），不触发嘲讽+20
- 与常规反击独立，可同时触发
- 无视"仅近战"限制