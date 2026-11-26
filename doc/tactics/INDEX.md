# 战棋前端文档入口

## 核心目的

让战棋前端承接酒馆已开战的剧情：单房间、开局即战，直观呈现站位、射界、掩护和技能，不发展成独立的探索型战棋游戏。原回合制前端保持独立。

## 具体任务

1. 后续按 [PLAN.md](PLAN.md) 的四阶段顺序推进，第一步迁移单房间和典型对局。
2. 已确认规则查 [SPEC.md](SPEC.md)，当前实际完成度查 [STATUS.md](STATUS.md)。计划里的能力没有实现和验收就不标记完成。
3. 优先复用现有规则、MMS 主题底图、头像和技能源；几何、预览、AI 和结算共享规则，演出不另算命中。参考 [RESOURCES.md](RESOURCES.md) 与[视觉原型](references/SOURCE.md)。

## 现行文档

| 文档 | 职责 |
| --- | --- |
| [SPEC.md](SPEC.md) / [PLAN.md](PLAN.md) | 现行规格 / 四阶段施工顺序与验收标准 |
| [STATUS.md](STATUS.md) / [LOG-INDEX.md](LOG-INDEX.md) | 当前实现进度 / 按提交定位施工记录 |
| [P01-CONTRACT.md](P01-CONTRACT.md) / [P03-CLOCK-CONTRACT.md](P03-CLOCK-CONTRACT.md) | 输入协议 / 跑圈与事件时钟契约 |
| [TYPICAL-BATTLE-CONTRACT.md](TYPICAL-BATTLE-CONTRACT.md) | 典型对局数据和交接；现有三层礼拜堂仍供旧 Demo 使用，迁移目标见新路线 |
| [P07-MIGRATION.md](P07-MIGRATION.md) / [RULES02-MIGRATION.md](RULES02-MIGRATION.md) | 规则迁移及阶段性验证边界 |
| [GUARD-BARRIER-FRONTEND-HANDOFF.md](GUARD-BARRIER-FRONTEND-HANDOFF.md) / [P06-FX-HANDOFF.md](P06-FX-HANDOFF.md) | 舍身与结界结果契约 / 技能演出接口 |
| [DEMO.md](../../tactics/DEMO.md) / [VFX-WORKBENCH.md](../../tactics/VFX-WORKBENCH.md) | 现有 Demo 操作 / 特效工作台操作 |

## 历史归档

`obsolete_documents/` 中的材料保留用于复盘，不再指导新功能或代表当前进度：

- [旧 P00—P12 总计划](obsolete_documents/PLAN.md)、[MVP 计划](obsolete_documents/MVP-PLAN.md)、[第二轮修订](obsolete_documents/REVISION-2026-11-21.md)。
- [三层礼拜堂后端计划](obsolete_documents/TYPICAL-BATTLE-BACKEND-PLAN.md)、[三层礼拜堂 Demo 计划](obsolete_documents/TYPICAL-BATTLE-DEMO-PLAN.md)。
- [P00 探针报告](obsolete_documents/P00-REPORT.md)、[初始文档校验](obsolete_documents/VERIFICATION.md)。
