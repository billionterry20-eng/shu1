# 步数定时任务系统

每天北京时间凌晨 00:05 自动提交步数任务。

## 功能特点

- 🕐 定时自动提交：每天北京时间凌晨 0点5分自动执行
- 📊 默认步数：89888 步
- 📝 任务管理：添加、编辑、删除、启用/禁用任务
- 🧪 账号测试：测试账号是否可以正常提交
- 📜 执行日志：查看任务执行记录
- ⚙️ 系统设置：自定义默认步数

## 部署到 Render

### 方法一：使用 Blueprint（推荐）

1. Fork 或上传代码到 GitHub/GitLab
2. 登录 [Render](https://render.com)
3. 点击 "Blueprints" → "New Blueprint Instance"
4. 选择你的代码仓库
5. Render 会自动识别 `render.yaml` 配置并部署

### 方法二：手动创建 Web Service

1. 登录 [Render](https://render.com)
2. 点击 "New" → "Web Service"
3. 连接你的 Git 仓库
4. 配置如下：
   - **Name**: `bushu-scheduler`（或其他名称）
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. 点击 "Create Web Service"

### 方法三：使用 Docker

1. 登录 [Render](https://render.com)
2. 点击 "New" → "Web Service"
3. 连接你的 Git 仓库
4. 选择 Runtime 为 `Docker`
5. 点击 "Create Web Service"

## 本地开发

```bash
# 安装依赖
npm install

# 开发模式（仅前端）
npm run dev

# 构建
npm run build

# 启动生产服务器
npm start
```

## 使用说明

1. 打开网站后，进入 "任务管理" 页面
2. 点击 "添加新任务" 输入账号、密码和步数
3. 任务默认启用，会在每天凌晨 00:05 自动执行
4. 可以在 "测试账号" 页面先测试账号是否正常
5. 在 "执行日志" 页面查看任务执行情况

## 技术栈

- 前端：React + TypeScript + Tailwind CSS + shadcn/ui
- 后端：Express + Node.js
- 定时任务：node-cron
- 部署：Render

## 注意事项

- 数据保存在 `data.json` 文件中（Render 免费版会定期重启，数据可能丢失）
- 如需持久化存储，建议连接数据库（如 MongoDB Atlas 免费版）
- 服务器时区已设置为 Asia/Shanghai（北京时间）
