#!/bin/bash

echo "==================================="
echo "  步数定时任务系统 - 部署脚本"
echo "==================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

echo "1. 安装依赖..."
npm install

echo ""
echo "2. 构建前端..."
npm run build

echo ""
echo "3. 测试服务器启动..."
echo "   按 Ctrl+C 停止测试"
echo ""
timeout 5 npm start || true

echo ""
echo "==================================="
echo "  构建完成！"
echo "==================================="
echo ""
echo "部署到 Render 的方法:"
echo ""
echo "方法1 - Blueprint (推荐):"
echo "  1. 将代码推送到 GitHub"
echo "  2. 在 Render 控制台点击 'Blueprints' -> 'New Blueprint Instance'"
echo "  3. 选择你的仓库"
echo ""
echo "方法2 - 手动创建:"
echo "  1. 在 Render 控制台点击 'New' -> 'Web Service'"
echo "  2. 连接你的 Git 仓库"
echo "  3. 设置:"
echo "     - Runtime: Node"
echo "     - Build Command: npm install && npm run build"
echo "     - Start Command: npm start"
echo ""
echo "==================================="
