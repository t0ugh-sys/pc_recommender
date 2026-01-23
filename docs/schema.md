# 配置库与规则结构

## 配置库（data/components.json）
- `meta`: 元数据（币种、来源、更新时间）。
- `cpus/gpus/motherboards/memory/storage/psu/cases/coolers`: 各部件清单。

通用字段
- `id`: 唯一标识
- `name`: 显示名称
- `priceRange.min/max`: 价格区间
- `score`: 相对性能分（用于排序）
- `notes`: 简短备注

关键兼容字段
- CPU：`platform`, `memoryType`, `tdp`
- 主板：`platform`, `memoryType`, `formFactor`
- 内存：`memoryType`, `size`
- 电源：`watt`
- 散热：`tdpSupport`

## 规则库（data/rules.json）
- `budgets`: 预算档位
- `scenarios`: 场景与各部件预算权重
- `modes`: 模式偏好（价格/性能权重，功耗偏好）
- `constraints`: 兼容性与安全边界（如电源裕量）
- `selection`: 选型策略（显存下限、品牌偏好、兜底顺序）
- `pricing`: 价格区间策略

## 选型策略说明
- 先按场景权重拆分预算。
- 过滤兼容项（平台、内存代际）。
- 在预算范围内用 `score` + 价格策略排序。
- 根据模式调整“价格/性能”的排序权重。
- 计算整机功耗，选择满足裕量的电源与散热。

## 后端存储
- 后端使用 `config_store` 表（JSONB）。
- 键名约定：`components`、`rules`。
