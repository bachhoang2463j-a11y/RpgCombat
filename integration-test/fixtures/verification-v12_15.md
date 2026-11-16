# v12.15 三项定稿特效移植验收

日期：2026-11-17。

## 核心目的

把实机预览定稿的【芭斯特的猫眼石】【奇异海螺】【砷弹射击】三项特效、灵风术真音 A 组与近战点后排无字阻挡动效接入主工程，除清单内条目外不动任何既有技能与逻辑。

## 定稿要点（源自 demo-bastet-conch-arsenic-vfx.html，SHA256 e610f6ac…）

- 猫眼石 L2+ 1450ms：贴卡猫眼竖瞳收束 → 双螺旋贝塞尔流光（SVG 光轨与 Canvas histOrb 共享控制点）→ 金翠圣环；三段真音 20/380/880ms。
- 奇异海螺 L2+ 1600ms：古铜海螺蓄压 + 420ms hitStop 80 → 三道青紫虹彩声波环 + 眼部致盲迷雾；音轨仅 conchCharge（20ms，无 durCap）+ conchMist（850ms）+ conchFog（880ms，复用 mx_stygian_whoosh）；禁用 conchHorn。
- 砷弹射击 L1+ 1180ms：104px 枪口凝聚 → 黑曜石穿甲弹 → 196px 爆轰朵 + 三层有机毒液溅斑 + source-over droplet + 毒泡 + 脚底毒烟；全程唯一 gunshot_pierce（260ms 起，无 durCap）；无虚线菱形、无 347/249。
- 灵风术：视觉演出原样保留，内部振荡器合成音全部移除，改 A 组五拍真音（windHum/crystalChime×2/aoe_wind_spin_fs772867/dodgeWind），参数逐拍锁定。
- 近战点后排：选敌态后排立绘虚暗 + 无字 SVG 锁盾 + 前排护卫弧（syncRowTargetingCues 覆盖 attack/skill/item/grouped_item/release_charge 五入口，ignoreRow 与征伐者放行）；点击拦截改 playRowBlockImpact 顶盾动效（parryShield + defUp），取消 showLog 文字且不耗回合。远程掩护（rowDeflect 等）与 B/C 切换、对比 UI 一律不移植。

## 实现范围

- `index.html`：三新函数（fixedItemSkillRun owner 生命周期 + playBastetOpal/playStrangeConch/playArsenicShot）、ARCANE_TAGS/ITEM_SKILL_FX/WEBM_FX_REGISTRY/audioUrls 注册、playItemSample 增 fadeIn 参数、灵风函数改真音、近战四接口 + 五入口同步 + handleTargetClick 拦截分支、clearArcaneFx 扩充清理（rowAimLayers/arsenic 闪色与震屏）。
- 测试：harness 第 62 组 + 新夹具 `bastet-conch-arsenic-regression.js` + 新产物专项 `bastet-conch-arsenic-artifact-check.cjs`；test21 JS 动画定位标记补入豁免表。
- 版本断言动态化（用户指示）：九个产物专项的 scriptName 断言全部改为从文件名推导（`regex-前端战斗vN_M.json ↔ 前端战斗vN.M`），默认产物路径改为自动探测根目录唯一维护版 JSON——升版后裸跑不再失败，仅 scriptName 与文件名真实失配才报错。
- 打包：v12.14 → v12.15（git mv），scriptName 同步，正则 ID 保持 `98df0348-59ec-4ab9-a750-d5e2e3eb9b8b`。

## 验证结果（如实记录）

| 阶段 | 结果 |
| --- | --- |
| 源码/夹具/harness 语法、自围栏、函数边界比对 | 通过；809 段既有唯一函数体零改动 |
| 源码相关 36/42/43/44/48/51/52/58 | 739/0 |
| 新专项 62（首轮 → 修正夹具三处误断言后） | 153/3 → 155/0 |
| 唯一源码全量（IAB 首跑） | 被宿主重置中断（1235/1 时上下文清空），不计 |
| 获准 Chrome 补跑（第一轮） | 3404/6；六项均为新夹具粒子基线断言错误（前序组遗留 75 个非 arcane 粒子） |
| 夹具改为记录进入时粒子基线 + 不误删他组粒子后 21+62 | 201/0 |
| 获准 Chrome 最终全量 | **3423/0** |
| 产物专项（bastet/skill-items/variant-grant） | 130/0、143/0、23/0 |
| 版本断言动态化后九个产物专项裸跑 | 全绿（另含 summon-moments 74/0、battle-atmosphere 68/0、enemy-group 61/0、attack-identity 98/0、feedback-demo 87/0、arcane-variant 89/0） |
| 真实压缩产物相关 21/38/44/48/51/52/58/62 | 900/0 |

未跑产物全量。900/0 的运行先于 test62 断言名去版本号（纯文案改名，不影响断言内容）。

## 环境备注

- IAB 曾把新标签页地址回退到旧 URL 并疑似宿主重置运行上下文；以真实 location/RPG_SOURCE 与页面汇总核对，不把未执行分组计为通过。
- 经用户批准用排障模式（真 Chrome）补跑两次全量：第一轮暴露夹具粒子基线缺陷，修正后最终 3423/0。生产代码在两次补跑之间零改动（函数边界比对复核）。
- 定稿 Demo 未入库（与仓库当前 Demo 清理方向一致），SHA256 已记录于本文件与 LOG。
- 有限本地服务到期后同端口恢复；无无界循环，无重跑全量超出获批次数。

## 构建产物

- `regex-前端战斗v12_15.json`，`scriptName=前端战斗v12.15`。
- 压缩前 2180463 → 1512395 字符（约 31%）；replaceString 1512407 字符。
- 围栏、实体免疫、捕获组替换免疫、内网/静态 Tailwind 隔离、三新标签与真音/WebM 路径入包、砷弹禁项均通过；monsterAttack 恰 3 处。

## 目的 vs 现状

三项定稿演出、灵风真音 A 组与无字近战阻挡已接入主工程并通过源码/产物双层回归；其余技能与结算逻辑未动。等待用户在酒馆导入确认后才更新 README。
