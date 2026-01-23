# PC 配置推荐系统

一个面向国内用户的电脑主机推荐与 DIY 配置系统，支持多场景、预算档位与偏好模式，前端可视化展示，后端提供配置库/规则的存储与同步能力。

## 项目结构
- `app/` 前端（Vue 3 + Vite）
- `backend/` 后端（FastAPI + PostgreSQL）
- `data/` 配置库与规则源数据
- `docs/` 调研、规则与架构文档

## 快速开始

### 前端
```bash
cd app
npm install
# 设置 API（可选）
cp .env.example .env
npm run dev
```

### 后端
```bash
cd backend
docker compose up -d
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 初始化配置库（可选）
```bash
cd backend
python -m app.scripts.seed
```

## 使用说明
- 默认前端会优先请求后端 `/configs/rules` 与 `/configs/components`。
- 若后端不可用，会自动回退到 `app/public/data/` 本地 JSON。
- 勾选 DIY 模式可手动替换部件并实时查看兼容性提示。

## 维护建议
- 更新价格区间与新型号：编辑 `data/components.json`。
- 规则调整：编辑 `data/rules.json`。
- 同步到运行时：更新后同步到 `app/public/data/` 或使用后端写入接口。

## 文档
- 架构：`docs/architecture.md`
- 规则细化：`docs/rules-detail.md`
- 数据来源与维护：`docs/data-sources.md`
