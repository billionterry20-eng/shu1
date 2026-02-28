import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Play, 
  TestTube, 
  Settings, 
  Clock, 
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  LogOut
} from 'lucide-react';

const API_URL = '';

interface Task {
  id: number;
  account: string;
  password: string;
  steps: number;
  enabled: boolean;
  createdAt: string;
  lastExecuted: string | null;
}

interface Log {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: string;
  details?: any;
}

interface Settings {
  defaultSteps: number;
  scheduleTime: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [settings, setSettings] = useState<Settings>({ defaultSteps: 89888, scheduleTime: '0 5 0 * * *' });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // 表单状态
  const [newTask, setNewTask] = useState({ account: '', password: '', steps: 89888 });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [testAccount, setTestAccount] = useState({ account: '', password: '', steps: 89888 });
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // 获取数据
  const fetchData = async () => {
    try {
      const [tasksRes, logsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/tasks`),
        fetch(`${API_URL}/api/logs`),
        fetch(`${API_URL}/api/settings`)
      ]);
      
      setTasks(await tasksRes.json());
      setLogs(await logsRes.json());
      setSettings(await settingsRes.json());
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 每30秒刷新
    return () => clearInterval(interval);
  }, []);

  // 显示提示
  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  // 添加任务
  const addTask = async () => {
    if (!newTask.account || !newTask.password) {
      showAlert('error', '请填写账号和密码');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      
      if (res.ok) {
        showAlert('success', '任务添加成功');
        setNewTask({ account: '', password: '', steps: settings.defaultSteps });
        fetchData();
      } else {
        showAlert('error', '添加失败');
      }
    } catch (error) {
      showAlert('error', '网络错误');
    }
    setLoading(false);
  };

  // 更新任务
  const updateTask = async () => {
    if (!editingTask) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTask)
      });
      
      if (res.ok) {
        showAlert('success', '任务更新成功');
        setEditingTask(null);
        fetchData();
      } else {
        showAlert('error', '更新失败');
      }
    } catch (error) {
      showAlert('error', '网络错误');
    }
    setLoading(false);
  };

  // 删除任务
  const deleteTask = async (id: number) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('success', '任务已删除');
        fetchData();
      }
    } catch (error) {
      showAlert('error', '删除失败');
    }
    setLoading(false);
  };

  // 切换任务状态
  const toggleTask = async (task: Task) => {
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !task.enabled })
      });
      fetchData();
    } catch (error) {
      showAlert('error', '操作失败');
    }
  };

  // 手动执行任务
  const executeTask = async (taskId?: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskId ? { taskId } : {})
      });
      
      if (res.ok) {
        showAlert('success', taskId ? '任务执行中...' : '所有任务执行中...');
        setTimeout(fetchData, 3000);
      }
    } catch (error) {
      showAlert('error', '执行失败');
    }
    setLoading(false);
  };

  // 测试账号
  const testTask = async () => {
    if (!testAccount.account || !testAccount.password) {
      showAlert('error', '请填写账号和密码');
      return;
    }
    
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_URL}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testAccount)
      });
      
      const result = await res.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: '网络错误' });
    }
    setTestLoading(false);
  };

  // 更新设置
  const updateSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (res.ok) {
        showAlert('success', '设置已保存');
      }
    } catch (error) {
      showAlert('error', '保存失败');
    }
    setLoading(false);
  };

  // 获取日志图标
  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">步数定时任务系统</h1>
          <p className="text-slate-400">每天北京时间凌晨 00:05 自动提交步数</p>
        </div>

        {alert && (
          <Alert className={`mb-4 ${alert.type === 'success' ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}`}>
            <AlertDescription className={alert.type === 'success' ? 'text-green-200' : 'text-red-200'}>
              {alert.message}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="tasks">任务管理</TabsTrigger>
            <TabsTrigger value="test">测试账号</TabsTrigger>
            <TabsTrigger value="logs">执行日志</TabsTrigger>
            <TabsTrigger value="settings">系统设置</TabsTrigger>
          </TabsList>

          {/* 任务管理 */}
          <TabsContent value="tasks">
            <div className="grid gap-6">
              {/* 添加任务 */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    添加新任务
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-slate-300">账号</Label>
                      <Input
                        placeholder="请输入账号"
                        value={newTask.account}
                        onChange={(e) => setNewTask({ ...newTask, account: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">密码</Label>
                      <Input
                        type="password"
                        placeholder="请输入密码"
                        value={newTask.password}
                        onChange={(e) => setNewTask({ ...newTask, password: e.target.value })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">目标步数</Label>
                      <Input
                        type="number"
                        value={newTask.steps}
                        onChange={(e) => setNewTask({ ...newTask, steps: parseInt(e.target.value) || 0 })}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={addTask} 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        添加任务
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 任务列表 */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    定时任务列表
                  </CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => executeTask()}
                    disabled={loading}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    立即执行所有
                  </Button>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      暂无任务，请添加
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={task.enabled}
                              onCheckedChange={() => toggleTask(task)}
                            />
                            <div>
                              <div className="text-white font-medium">{task.account}</div>
                              <div className="text-slate-400 text-sm">
                                步数: {task.steps.toLocaleString()} 
                                {task.lastExecuted && (
                                  <span className="ml-2">
                                    上次执行: {new Date(task.lastExecuted).toLocaleString('zh-CN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={task.enabled ? 'default' : 'secondary'}>
                              {task.enabled ? '已启用' : '已禁用'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => executeTask(task.id)}
                              disabled={loading || !task.enabled}
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/20"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingTask(task)}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-800 border-slate-700">
                                <DialogHeader>
                                  <DialogTitle className="text-white">编辑任务</DialogTitle>
                                </DialogHeader>
                                {editingTask && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label className="text-slate-300">账号</Label>
                                      <Input
                                        value={editingTask.account}
                                        onChange={(e) => setEditingTask({ ...editingTask, account: e.target.value })}
                                        className="bg-slate-700 border-slate-600 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-slate-300">密码</Label>
                                      <Input
                                        type="password"
                                        value={editingTask.password}
                                        onChange={(e) => setEditingTask({ ...editingTask, password: e.target.value })}
                                        className="bg-slate-700 border-slate-600 text-white"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-slate-300">目标步数</Label>
                                      <Input
                                        type="number"
                                        value={editingTask.steps}
                                        onChange={(e) => setEditingTask({ ...editingTask, steps: parseInt(e.target.value) || 0 })}
                                        className="bg-slate-700 border-slate-600 text-white"
                                      />
                                    </div>
                                    <Button onClick={updateTask} disabled={loading} className="w-full">
                                      保存修改
                                    </Button>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteTask(task.id)}
                              disabled={loading}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 测试账号 */}
          <TabsContent value="test">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  测试账号
                </CardTitle>
                <CardDescription className="text-slate-400">
                  测试账号是否可以正常提交步数（不会保存到任务列表）
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label className="text-slate-300">账号</Label>
                    <Input
                      placeholder="请输入账号"
                      value={testAccount.account}
                      onChange={(e) => setTestAccount({ ...testAccount, account: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">密码</Label>
                    <Input
                      type="password"
                      placeholder="请输入密码"
                      value={testAccount.password}
                      onChange={(e) => setTestAccount({ ...testAccount, password: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">目标步数</Label>
                    <Input
                      type="number"
                      value={testAccount.steps}
                      onChange={(e) => setTestAccount({ ...testAccount, steps: parseInt(e.target.value) || 0 })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={testTask} 
                      disabled={testLoading}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {testLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                      测试提交
                    </Button>
                  </div>
                </div>

                {testResult && (
                  <Alert className={testResult.success ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}>
                    <AlertDescription className={testResult.success ? 'text-green-200' : 'text-red-200'}>
                      {testResult.success ? '测试成功！账号可以正常提交步数。' : `测试失败: ${testResult.error || '未知错误'}`}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 执行日志 */}
          <TabsContent value="logs">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  执行日志
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchData}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      暂无日志
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg"
                        >
                          {getLogIcon(log.type)}
                          <div className="flex-1">
                            <div className="text-slate-200">{log.message}</div>
                            {log.details && (
                              <div className="text-slate-400 text-sm mt-1">
                                {JSON.stringify(log.details)}
                              </div>
                            )}
                          </div>
                          <div className="text-slate-500 text-sm">
                            {new Date(log.timestamp).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 系统设置 */}
          <TabsContent value="settings">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  系统设置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label className="text-slate-300">默认步数</Label>
                    <Input
                      type="number"
                      value={settings.defaultSteps}
                      onChange={(e) => setSettings({ ...settings, defaultSteps: parseInt(e.target.value) || 0 })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                    <p className="text-slate-500 text-sm mt-1">
                      添加新任务时的默认步数值
                    </p>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div>
                    <Label className="text-slate-300">定时执行时间</Label>
                    <Input
                      value="每天北京时间 00:05:00"
                      disabled
                      className="bg-slate-700/50 border-slate-600 text-slate-400 mt-2"
                    />
                    <p className="text-slate-500 text-sm mt-1">
                      定时任务执行时间（北京时间），暂不支持修改
                    </p>
                  </div>

                  <Button 
                    onClick={updateSettings} 
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    保存设置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
