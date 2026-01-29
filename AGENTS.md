# AGENTS 指南

本文档用于快速接续开发：记录项目结构、关键文件、已知问题、以及 UI 设计规范。

## 1. 项目概览
- 技术栈：Vue 3 + Vite / FastAPI / PostgreSQL
- 前端能力：预算/场景/模式选择、推荐计算、结果展示、DIY 调整、兼容性与功耗提示
- 数据源：优先后端 `/configs/rules` 与 `/configs/components`，本地 JSON 兜底
- 后端能力：配置库/规则 JSON 存储、读写接口、同步任务、初始化脚本
- 文档位置：`docs/`

## 2. 关键文件
- 前端入口：`app/src/App.vue`
- 推荐视图：`app/src/components/RecommendationView.vue`
- 配件库视图：`app/src/components/CatalogView.vue`
- 管理视图：`app/src/components/AdminView.vue`
- 推荐逻辑：`app/src/composables/useRecommendation.js`
- 规则/组件配置：`data/rules.json`、`data/components.json`
- 后端入口/路由：`backend/app/main.py`、`backend/app/api/routes.py`
- 同步逻辑：`backend/app/services/sync.py`
- 发布脚本：`backend/app/scripts/publish_public.py`

## 3. 已发现问题与处理结论
### 访问与路由
- 生产环境 `/admin` 访问失败：需服务端做 SPA 回退（指回 `index.html`）
- 前端不得暴露管理入口：用户侧仅“推荐/配件库”，管理页 `/admin` 直达
- 管理接口鉴权：`ADMIN_TOKEN` + `X-Admin-Token`

### 结构与布局
- 功能不应堆在一页：拆分“推荐页 / 配件库页”
- 导航固定在最左侧：使用固定悬浮侧栏
- 多余提示影响体验：移除侧栏“当前页面”卡片

### 配件库与筛选
- 用户端需查看全量配置：提供独立“配件库”页面
- 支持分类/品牌筛选；主板支持 CPU 型号与主板型号搜索
- 主板“芯片组≠品牌”：避免通用项误导，改为具体型号

### 数据与规则
- 50 系显卡：已用占位型号补齐（5050/5060/5060 Ti/5070/5070 Ti/5080/5090）
- 内存条数：支持 2/4 根与自动策略；DDR5 四根提示风险
- DDR4/DDR5：CPU/主板/内存联动过滤

### 文件与编码
- 文档乱码问题：统一 UTF-8

## 4. 常见问题
### Git / 推送
- `fatal: not a git repository`：在根目录执行 `git init`
- `Author identity unknown`：
  - `git config user.name "<name>"`
  - `git config user.email "<email>"`
- `Host key verification failed`：执行 `ssh -T git@github.com` 写入指纹
- `Permission denied (publickey)`：
  - `ssh-keygen -t ed25519 -C "<email>"`
  - 将 `~/.ssh/id_ed25519.pub` 添加到 GitHub
- `rejected (fetch first)`：
  - 保留远端：`git pull --rebase` → `git push`
  - 覆盖远端：`git push --force`
- `LF will be replaced by CRLF`：Windows 行尾转换提示，正常现象

### npm / 前端开发
- `npm run dev` 超时退出：开发服务需保持常驻，请在本地终端手动执行

### SSH/网络限制
- `ssh-keyscan` 报 `unsupported KEX method`：改用 `ssh -T git@github.com` 触发指纹信任

### 安全提醒
- 明文 GitHub Token：立即撤销；不要在聊天中提供密钥，建议在本地终端输入

## 5. UI 设计规范（Web）
### 角色
- 资深前端设计师，关注像素级间距、字体与颜色
- UI 实现任务：先思考设计风格，再逐位实现

### 输出与迭代流程
- 每次设计同时输出 3 个变体（除非明确只要一个）
- 每个变体为单屏 HTML 页面
- 输出目录：`.superdesign/design_iterations`
- 命名：新设计 `{设计名称}_{n}.html`；迭代 `{当前文件名}_{n}.html`

### 组件 / 线框 / 图标
- 组件：单页面仅一个组件，不添加多余元素或文本
- 线框：黑白线框风格，无图片，仅用 CSS 占位
- 图标/徽标：先复制原 SVG 到 `.superdesign/design_iterations` 再编辑

### 设计系统提取（截图）
- 仅提取通用样式：调色板、排版、间距、布局、组件、圆角、阴影
- 输出 `design_system/design-system.json`，已存在则用 `design-system_{n}.json`
- 不包含具体内容（文本/标志/图像）；APP 界面需 1px 描边模拟机身

### UI 设计与实现指南
- 风格：优雅极简 + 功能性；轻盈沉浸；卡片层级；精致圆角与微交互
- 响应式：移动/平板/桌面均良好
- 技术：仅用 Tailwind CDN；优先 Tailwind 类；必要时 `!important`；禁止图片
- 文本：仅黑/白；不显示状态栏
- 间距：4/8 点系统；与字/行高对齐；触控区域 ≥ 48×48
- 色彩：黑白灰中性；60/30/10；单一柔和强调色；对比度 ≥ 4.5:1
- 排版：至少 H1/H2/正文三级；H1/H2/正文差异明显；正文 ≥ 16px
