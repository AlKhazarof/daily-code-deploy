说明：此文件为 `README.md` 的中文翻译，文件名按你的要求为 `README-ZN.md`。通常中文的语言代码使用 `zh` 或 `zh-CN`。

# DailyCodeDeploy — 入门（示例）

这是关于“DailyCodeDeploy”想法的最小示例仓库：一个以订阅为基础的 CI/CD 服务骨架。它提供了一个简单的订阅端点，并将订阅数据持久化到本地 JSON 文件。如果你配置了 Stripe 密钥，它会尝试创建真实的 Stripe 客户/订阅。

## 快速开始（本地）

1. 从示例创建 .env：
   cp backend/.env.example backend/.env
   # 如果需要使用真实的 Stripe，请编辑 backend/.env 添加 STRIPE_SECRET_KEY

2. 安装依赖：
   cd /workspaces/daily-code-deploy
   npm install
   cd backend && npm install
   # 前端为静态页面（无构建），因此无需安装依赖

3. 启动应用：
   node backend/server.js
   # 或从项目根目录运行：
   npm start

4. 打开演示页面：
   http://localhost:5000

## 开发说明
- 在模拟模式下（未设置 STRIPE_SECRET_KEY），向 POST /api/subscribe 发送请求会将用户存储在 `backend/data/users.json` 中。
- 列出用户：GET /api/users
- 若要启用真实的 Stripe 流程：在 `backend/.env` 中设置 STRIPE_SECRET_KEY 和 STRIPE_PRICE_ID 并重启服务。

## 使用 curl 测试
```
curl -s -X POST http://localhost:5000/api/subscribe -H "Content-Type: application/json" -d '{"email":"alice@example.com"}'
curl -s http://localhost:5000/api/users
```

## Runner（队列 + 工作进程）

此示例包含一个使用 BullMQ + Redis 的最小 CI runner。

### 本地（不使用 Docker）
1) 启动 Redis（此步骤需要 Docker）：
   docker run --rm -p 6379:6379 redis:7-alpine

2) 在不同终端分别启动 API 和 Runner：
   # 终端 A
   npm start
   # 终端 B
   npm --prefix backend run runner
   # 或：cd backend && npm run runner

3) 入队一个示例作业：
   curl -s -X POST http://localhost:5000/api/pipeline/run \
     -H "Content-Type: application/json" \
     -d '{"steps":["echo hi","node -v","npm -v"]}'

4) 轮询状态与日志：
   curl -s http://localhost:5000/api/pipeline/job/<JOB_ID>
   curl -s http://localhost:5000/api/pipeline/logs/<JOB_ID>

### 使用 Docker Compose
1) docker compose up --build
2) 打开 http://localhost:5000 → 点击 “Run pipeline” 或按上文的 curl 命令调用。

### 克隆仓库
- 如果你已通过登录页使用 GitHub 登录（Landing page → Login with GitHub），输入 owner/name 和可选分支，然后点击 “Run pipeline”。私有仓库需要已保存的 OAuth 令牌（登录后会保存）。
- 公共仓库如果对外公开，则无需登录即可使用。

### 注意事项
- 这是一个演示用的 runner；它会执行请求中提供的 shell 命令。在生产环境中，请务必加以限制：
  - 仅运行为每个仓库配置的白名单步骤。
  - 将作业执行放在沙箱中（临时容器、用户命名空间）。
  - 资源限制与超时控制。
- 日志会写入 `backend/tmp/jobs/<jobId>/log.txt`

## 下一步（建议）
- 为推送触发的构建添加 GitHub webhook。
- 用持久化数据库替换本地存储（Postgres/Mongo）。
- 实现用户面板、流水线历史与计费分析。
- 添加推荐计划与营销落地页。

## 商业化说明
- 如果你定价为 $10/月，要达到每天 $100（≈每月 $3k）的收入，需要大约 300 名月付用户。考虑企业计划、附加功能或基于使用量的计费来提高每用户收入（ARPU）并降低所需的用户数量。
