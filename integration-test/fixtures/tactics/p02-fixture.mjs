// ==========================================
// P02 测试夹具：默认 YAML / 站位 与 main.mjs 同源 re-export，避免第二份夹具数据
// 头像无外链：夹具单位不依赖 MMS（resolveAvatarUrl 无 MMS 时自动本地首字 SVG）
// ==========================================

export {
  DEFAULT_YAML_A, DEFAULT_YAML_B, DEFAULT_YAML_C, DEFAULT_PLACEMENTS,
  deriveUnitId, buildViewData,
} from '../../../tactics/src/main.mjs';
