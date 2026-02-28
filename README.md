# 步数定时任务系统 (Flask版)

基于 Python + Flask 的步数自动提交系统，支持多账号管理，每个账号可自定义步数和定时时间。

## ✨ 功能特点

- 🕐 **独立定时任务**：每个账号有独立的定时任务，互不干扰
- 📊 **自定义配置**：每个账号可设置不同的步数和提交时间
- 📝 **提交记录**：记录每天的提交情况，支持查询统计
- 🧪 **账号测试**：支持测试账号而不保存
- 📜 **系统日志**：完整的操作日志记录
- 🌐 **北京时间**：所有定时任务基于北京时间

## 🚀 部署到 Render

### 方法一：使用 Blueprint（推荐）

1. Fork 或上传代码到 GitHub/GitLab
2. 登录 [Render](https://render.com)
3. 点击 "Blueprints" → "New Blueprint Instance"
4. 选择你的代码仓库
5. Render 会自动识别 `render.yaml` 配置并部署

### 方法二：手动创建 Web Service

1. 登录 [Render](https://render.com)
2. 点击 "New" → "Web Service"
3. 选择 "Build and deploy from a Git repository"
4. 配置如下：
   - **Name**: `bushu-flask`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4`
   - **Plan**: Free
5. 点击 "Create Web Service"

## 🛠️ 本地开发

### 环境要求

- Python 3.8+
- pip

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行应用

```bash
python app.py
```

访问 http://localhost:5000

## 📁 项目结构

```
bushu-flask/
├── app.py                 # Flask 主应用
├── models.py              # 数据库模型
├── scheduler.py           # 定时任务调度器
├── bushu_service.py       # 步数提交服务
├── requirements.txt       # Python 依赖
├── render.yaml            # Render 部署配置
├── Procfile               # 进程文件
├── runtime.txt            # Python 版本
├── templates/
│   └── index.html         # 前端页面
├── static/
│   └── js/
│       └── app.js         # 前端脚本
└── README.md              # 说明文档
```

## 🔌 API 接口

### 账号管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/accounts` | 获取所有账号 |
| POST | `/api/accounts` | 创建账号 |
| PUT | `/api/accounts/<id>` | 更新账号 |
| DELETE | `/api/accounts/<id>` | 删除账号 |
| POST | `/api/accounts/<id>/toggle` | 切换启用状态 |
| POST | `/api/accounts/<id>/execute` | 立即执行 |
| POST | `/api/accounts/execute-all` | 执行所有账号 |

### 提交记录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/records` | 获取记录 |
| GET | `/api/records/today` | 获取今日记录 |
| GET | `/api/records/statistics` | 获取统计 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/test` | 测试账号 |
| GET | `/api/logs` | 获取系统日志 |
| GET | `/api/scheduler/status` | 调度器状态 |
| GET | `/api/health` | 健康检查 |

## 📝 使用说明

1. 打开网站后，默认已配置好你提供的账号
2. 在"账号管理"页面可以：
   - 添加更多账号
   - 修改每个账号的步数和定时时间
   - 启用/禁用账号
   - 手动立即执行
3. 在"提交记录"页面查看历史提交情况
4. 在"测试账号"页面测试新账号

## ⚠️ 注意事项

- 数据保存在 SQLite 数据库中
- Render 免费版会定期重启，数据可能丢失（建议定期备份）
- 所有定时任务基于北京时间 (Asia/Shanghai)
- 每个账号每天只会自动提交一次

## 🔧 技术栈

- **后端**: Flask + Flask-SQLAlchemy + APScheduler
- **前端**: HTML + Tailwind CSS + Vanilla JS
- **数据库**: SQLite
- **部署**: Render
