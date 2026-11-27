import { skillSlots } from './effect-definitions.mjs';

export function skillActionKind(skill) {
  return skillSlots(skill).some(slot => slot.attack) ? 'main' : 'aux';
}

export function actionBalance(r, kind, skillOnly = false) {
  return r[kind] + (r.universal || 0) + (skillOnly && kind === 'main' ? r.skillMain || 0 : 0);
}

export function actionPayment(r, kind, amount = 1, skillOnly = false) {
  const skillMainCost = skillOnly && kind === 'main' ? Math.min(r.skillMain || 0, amount) : 0;
  const own = Math.min(r[kind], amount - skillMainCost);
  const universalCost = amount - skillMainCost - own;
  if (universalCost > (r.universal || 0)) return { ok: false, reason: kind === 'main' ? '主行动已用完' : '辅助行动不足' };
  return { ok: true, mainCost: kind === 'main' ? own : 0, auxCost: kind === 'aux' ? own : 0, universalCost, skillMainCost };
}

export function spendAction(r, payment) {
  r.main -= payment.mainCost;
  r.aux -= payment.auxCost;
  if (payment.universalCost) r.universal -= payment.universalCost;
  if (payment.skillMainCost) r.skillMain -= payment.skillMainCost;
}
