# 后端服务（FastAPI + PostgreSQL）

## 本地启动
1. 启动数据库
   ```bash
   docker compose up -d
   ```

2. 安装依赖
   ```bash
   pip install -r requirements.txt
   ```

3. 配置环境变量
   ```bash
   cp .env.example .env
   ```

4. 启动服务
   ```bash
   uvicorn app.main:app --reload
   ```

## 前端接入
- 前端会请求后端 `/public/configs/rules` 与 `/public/configs/components`。
- 可通过前端 `.env` 设置 `VITE_API_BASE=http://127.0.0.1:8000`。
- 若前端与后端不同源，请在后端 `.env` 配置 `CORS_ORIGINS`（逗号分隔）。

## 初始化配置库（可选）
```bash
python -m app.scripts.seed
```

## 主要接口
- `GET /health` 健康检查
- `GET /public/configs/{key}` 公共读取配置（如 `components`/`rules`）
- `POST /public/recommendations` 创建分享配置
- `GET /public/recommendations/{share_id}` 获取分享配置

## 管理接口（需鉴权）
管理接口使用 `ADMIN_TOKEN` + 请求头 `X-Admin-Token`。

- `GET /configs` 获取全部配置
- `GET /configs/{key}` 获取指定配置
- `PUT /configs/{key}` 写入配置
- `POST /sync/run` 手动触发同步
- `GET /sync/status` 查看同步状态

## 数据说明
- 配置存储在 `config_store` 表，使用 JSONB 保存。
- 同步任务为占位实现，后续替换为真实爬取逻辑。

