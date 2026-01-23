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
- 默认前端会优先请求后端 `/configs/rules` 与 `/configs/components`。
- 可通过 `.env` 设置 `VITE_API_BASE=http://127.0.0.1:8000`。

## 初始化配置库（可选）
```bash
python -m app.scripts.seed
```

## 主要接口
- `GET /health` 健康检查
- `GET /configs` 获取全部配置
- `GET /configs/{key}` 获取指定配置（如 `components`/`rules`）
- `PUT /configs/{key}` 写入配置
- `POST /sync/run` 手动触发同步
- `GET /sync/status` 查看同步状态

## 数据说明
- 配置存储在 `config_store` 表，使用 JSONB 保存。
- 同步任务为占位实现，后续替换为真实爬取逻辑。
