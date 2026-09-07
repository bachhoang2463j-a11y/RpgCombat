/** Tailwind v3 静态构建配置——由 build-tailwind.cjs 调用（npx tailwindcss@3.4.17）。
 *  content 扫描 index.html 全文（含 JS 模板字符串里的字面量类名）；
 *  safelist 兜住「运行时才知道的类名」（静态扫描器看不到的取值）。 */
module.exports = {
  content: ['./index.html'],
  safelist: [
    // enemy.size 通道（index.html 敌人 sprite visualClass）：类名来自 LLM/世界书产出的战斗数据，
    // 实际取值是 text-* 字号档；safelist 全档 + sm: 变体，防外部数据给出未预编译变体
    { pattern: /^text-[4-9]xl$/ },
    { pattern: /^text-[4-9]xl$/, variants: ['sm'] },
    // 运行时高亮态类（classList/三元分支字面量，全文扫描已覆盖，双保险防提取器边缘情况）
    'bg-amber-400',
    'shadow-[0_0_10px_rgba(251,191,36,0.8)]',
    'bg-rose-600/80',
    'border-rose-500',
    'from-emerald-600',
    'to-emerald-500',
    'bg-gradient-to-r',
    'text-rose-400',
    'text-rose-500',
    'text-emerald-400',
    'text-amber-300',
    'text-orange-400',
    'text-purple-400',
    'text-cyan-300',
    'text-violet-300',
    'blur-[1px]',
    'animate-pulse',
  ],
};
