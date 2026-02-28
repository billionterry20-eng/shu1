import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'data.json');

// 中间件
app.use(cors());
app.use(express.json());

// 初始化数据文件
function initDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      tasks: [],
      logs: [],
      settings: {
        defaultSteps: 89888,
        scheduleTime: '0 5 0 * * *' // 每天凌晨0点5分 (秒 分 时 日 月 周)
      }
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// 读取数据
function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取数据文件失败:', error);
    return { tasks: [], logs: [], settings: { defaultSteps: 89888, scheduleTime: '0 5 0 * * *' } };
  }
}

// 保存数据
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('保存数据文件失败:', error);
    return false;
  }
}

// 添加日志
function addLog(message, type = 'info', details = null) {
  const data = readData();
  const log = {
    id: Date.now(),
    message,
    type,
    details,
    timestamp: new Date().toISOString()
  };
  data.logs.unshift(log);
  // 只保留最近100条日志
  if (data.logs.length > 100) {
    data.logs = data.logs.slice(0, 100);
  }
  saveData(data);
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// 提交步数任务
async function submitStepsTask(task) {
  try {
    const formData = new URLSearchParams();
    formData.append('account', task.account);
    formData.append('password', task.password);
    formData.append('steps', task.steps.toString());

    const response = await axios.post('http://8.140.250.130/bushu/', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    return {
      success: response.status === 200,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 执行所有定时任务
async function executeScheduledTasks() {
  const data = readData();
  const tasks = data.tasks.filter(t => t.enabled);
  
  if (tasks.length === 0) {
    addLog('没有启用的任务需要执行', 'warning');
    return;
  }

  addLog(`开始执行 ${tasks.length} 个定时任务`, 'info');

  for (const task of tasks) {
    const result = await submitStepsTask(task);
    if (result.success) {
      addLog(`任务执行成功: ${task.account}`, 'success', { steps: task.steps });
      // 更新任务最后执行时间
      task.lastExecuted = new Date().toISOString();
    } else {
      addLog(`任务执行失败: ${task.account}`, 'error', { error: result.error });
    }
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  saveData(data);
  addLog('所有定时任务执行完成', 'info');
}

// 设置定时任务
let scheduledJob = null;

function setupScheduledJob() {
  // 取消现有任务
  if (scheduledJob) {
    scheduledJob.stop();
  }

  const data = readData();
  const scheduleTime = data.settings.scheduleTime || '0 5 0 * * *';
  
  // 使用 node-cron 的格式: 秒 分 时 日 月 周
  scheduledJob = cron.schedule(scheduleTime, () => {
    const now = new Date();
    const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    addLog(`定时任务触发 - 北京时间: ${beijingTime.toLocaleString()}`, 'info');
    executeScheduledTasks();
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });

  addLog(`定时任务已设置: 每天北京时间 00:05:00`, 'info');
}

// API 路由

// 获取所有任务
app.get('/api/tasks', (req, res) => {
  const data = readData();
  res.json(data.tasks);
});

// 添加任务
app.post('/api/tasks', (req, res) => {
  const { account, password, steps, enabled = true } = req.body;
  
  if (!account || !password) {
    return res.status(400).json({ error: '账号和密码不能为空' });
  }

  const data = readData();
  const newTask = {
    id: Date.now(),
    account,
    password,
    steps: steps || data.settings.defaultSteps || 89888,
    enabled,
    createdAt: new Date().toISOString(),
    lastExecuted: null
  };

  data.tasks.push(newTask);
  saveData(data);
  addLog(`添加新任务: ${account}`, 'info');
  
  res.json({ success: true, task: newTask });
});

// 更新任务
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { account, password, steps, enabled } = req.body;
  
  const data = readData();
  const taskIndex = data.tasks.findIndex(t => t.id == id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }

  if (account !== undefined) data.tasks[taskIndex].account = account;
  if (password !== undefined) data.tasks[taskIndex].password = password;
  if (steps !== undefined) data.tasks[taskIndex].steps = steps;
  if (enabled !== undefined) data.tasks[taskIndex].enabled = enabled;

  saveData(data);
  addLog(`更新任务: ${data.tasks[taskIndex].account}`, 'info');
  
  res.json({ success: true, task: data.tasks[taskIndex] });
});

// 删除任务
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  const data = readData();
  const taskIndex = data.tasks.findIndex(t => t.id == id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const deletedTask = data.tasks[taskIndex];
  data.tasks.splice(taskIndex, 1);
  saveData(data);
  addLog(`删除任务: ${deletedTask.account}`, 'info');
  
  res.json({ success: true });
});

// 获取日志
app.get('/api/logs', (req, res) => {
  const data = readData();
  const limit = parseInt(req.query.limit) || 50;
  res.json(data.logs.slice(0, limit));
});

// 获取设置
app.get('/api/settings', (req, res) => {
  const data = readData();
  res.json(data.settings);
});

// 更新设置
app.put('/api/settings', (req, res) => {
  const { defaultSteps, scheduleTime } = req.body;
  
  const data = readData();
  if (defaultSteps !== undefined) data.settings.defaultSteps = defaultSteps;
  if (scheduleTime !== undefined) data.settings.scheduleTime = scheduleTime;
  
  saveData(data);
  
  // 重新设置定时任务
  if (scheduleTime) {
    setupScheduledJob();
  }
  
  addLog('更新设置', 'info');
  res.json({ success: true, settings: data.settings });
});

// 手动执行任务
app.post('/api/execute', async (req, res) => {
  const { taskId } = req.body;
  
  const data = readData();
  
  if (taskId) {
    // 执行单个任务
    const task = data.tasks.find(t => t.id == taskId);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    
    addLog(`手动执行任务: ${task.account}`, 'info');
    const result = await submitStepsTask(task);
    
    if (result.success) {
      task.lastExecuted = new Date().toISOString();
      saveData(data);
      addLog(`手动任务执行成功: ${task.account}`, 'success');
    } else {
      addLog(`手动任务执行失败: ${task.account}`, 'error', { error: result.error });
    }
    
    res.json(result);
  } else {
    // 执行所有启用的任务
    executeScheduledTasks();
    res.json({ success: true, message: '已开始执行所有任务' });
  }
});

// 测试任务（不保存，仅测试）
app.post('/api/test', async (req, res) => {
  const { account, password, steps } = req.body;
  
  if (!account || !password) {
    return res.status(400).json({ error: '账号和密码不能为空' });
  }

  addLog(`测试任务: ${account}`, 'info');
  const result = await submitStepsTask({ account, password, steps: steps || 89888 });
  
  res.json(result);
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    beijingTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
  });
});

// 静态文件服务（生产环境）
app.use(express.static(path.join(__dirname, 'dist')));

// 所有其他路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 初始化
initDataFile();
setupScheduledJob();

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  addLog('服务器启动', 'info');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM 信号收到，正在关闭服务器...');
  if (scheduledJob) {
    scheduledJob.stop();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT 信号收到，正在关闭服务器...');
  if (scheduledJob) {
    scheduledJob.stop();
  }
  process.exit(0);
});
