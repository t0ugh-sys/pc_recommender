# 规则细化与选型策略

## 1. 预算拆分与档位
- 档位取自 `rules.json:budgets`。
- 每个场景定义部件权重（GPU/CPU/主板/内存/存储/电源/机箱/散热）。
- 预算拆分公式：`部件预算 = 总预算 * 权重`。
- 价格区间采用 `pricing.rangeTolerance` 容忍度，允许在预算上下浮动匹配。

## 2. 选型评分
- 综合评分：`finalScore = score * performanceWeight + priceScore * priceWeight`。
- `score` 为配件性能评分（人工维护）。
- `priceScore` 由价格区间中位数与部件预算的接近度计算。
- 模式影响：
  - 性价比：priceWeight 高
  - 性能：performanceWeight 高
  - 静音：priceWeight 中等 + 低功耗偏好

## 3. CPU/GPU 搭配策略
- 游戏：GPU 性能优先，CPU 至少主流档（`score >= 70`）。
- 设计/剪辑：GPU 与 CPU 平衡，避免 GPU 明显过低（`gpuScore >= 70`）。
- 轻度 AI：优先 NVIDIA，显存下限 12GB；若 AMD 则显存下限 16GB。
- 办公/开发：允许无独显或入门卡（`score <= 70`）。

## 4. 显存下限（按场景）
- 游戏：>= 8GB
- 设计/剪辑：>= 8GB
- 轻度 AI：>= 12GB（NVIDIA）或 >= 16GB（AMD）
- 办公/开发：可选无独显

## 5. 兼容性规则
- CPU/主板平台必须匹配（LGA1700/AM4/AM5）。
- 内存代际必须匹配主板支持（DDR4/DDR5）。
- 机箱与主板规格匹配（ATX / mATX）。

## 6. 功耗估算与电源选择
- 估算功耗：`CPU TDP + GPU Power + 120W（其他部件）`。
- 电源额定功率 >= 估算功耗 * `psuHeadroom`（默认 1.4）。
- 静音模式优先更高效率与更低功耗组合。

## 7. 散热选择
- `cooler.tdpSupport` >= `cpu.tdp * coolerTdpRatio`（默认 1.2）。
- 静音模式优先更高等级散热。

## 8. 兜底策略
- 若预算不足，按顺序降级：机箱 -> 散热 -> 存储容量 -> 内存容量 -> 主板档位。
- 若预算超额，按顺序升级：GPU -> CPU -> 内存 -> 存储 -> 散热。
