// API 基础 URL
const API_BASE = '';

// 当前选中的标签页
let currentTab = 'accounts';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    loadStatistics();
    loadAccounts();
    updateBeijingTime();
    setInterval(updateBeijingTime, 1000);
    
    // 每30秒刷新统计数据
    setInterval(loadStatistics, 30000);
});

// ==================== 导航 ====================

function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;
    
    // 更新导航样式
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    // 加载对应数据
    if (tab === 'accounts') {
        loadAccounts();
    } else if (tab === 'records') {
        loadRecords('today');
    } else if (tab === 'logs') {
        loadLogs();
    }
}

// ==================== 统计 ====================

function loadStatistics() {
    fetch(`${API_BASE}/api/records/statistics`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('stat-total-accounts').textContent = data.data.accounts.total;
                document.getElementById('stat-enabled-accounts').textContent = data.data.accounts.enabled;
                document.getElementById('stat-today-success').textContent = data.data.today.success;
                document.getElementById('stat-today-failed').textContent = data.data.today.failed;
            }
        })
        .catch(err => console.error('加载统计失败:', err));
}

function updateBeijingTime() {
    const now = new Date();
    const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    const timeStr = beijingTime.toLocaleTimeString('zh-CN', { hour12: false });
    document.getElementById('beijing-time').textContent = timeStr;
}

// ==================== 账号管理 ====================

function loadAccounts() {
    fetch(`${API_BASE}/api/accounts`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderAccounts(data.data);
            }
        })
        .catch(err => {
            console.error('加载账号失败:', err);
            showToast('加载账号失败', 'error');
        });
}

function renderAccounts(accounts) {
    const container = document.getElementById('accounts-list');
    
    if (accounts.length === 0) {
        container.innerHTML = `
            <div class="glass-card rounded-xl p-8 text-center">
                <i class="fas fa-inbox text-4xl text-gray-500 mb-4"></i>
                <p class="text-gray-400">暂无账号，请点击"添加账号"按钮</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = accounts.map(acc => `
        <div class="account-card glass-card rounded-xl p-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <label class="toggle-switch">
                        <input type="checkbox" ${acc.enabled ? 'checked' : ''} onchange="toggleAccount(${acc.id})">
                        <span class="toggle-slider"></span>
                    </label>
                    <div>
                        <h3 class="font-medium text-white">${acc.account}</h3>
                        <p class="text-sm text-gray-400">
                            <i class="fas fa-shoe-prints mr-1"></i>${acc.steps.toLocaleString()} 步
                            <span class="mx-2">|</span>
                            <i class="fas fa-clock mr-1"></i>${acc.schedule_time}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="px-2 py-1 rounded text-xs ${acc.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
                        ${acc.enabled ? '已启用' : '已禁用'}
                    </span>
                    <button onclick="executeAccount(${acc.id})" class="w-8 h-8 rounded-lg bg-green-600/20 text-green-400 hover:bg-green-600/30 flex items-center justify-center transition" title="立即执行">
                        <i class="fas fa-play text-xs"></i>
                    </button>
                    <button onclick="openEditModal(${acc.id}, '${acc.account}', '${acc.password}', ${acc.steps}, ${acc.schedule_hour}, ${acc.schedule_minute})" class="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 flex items-center justify-center transition" title="编辑">
                        <i class="fas fa-edit text-xs"></i>
                    </button>
                    <button onclick="deleteAccount(${acc.id})" class="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 flex items-center justify-center transition" title="删除">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function openAddModal() {
    document.getElementById('modal-title').textContent = '添加账号';
    document.getElementById('edit-account-id').value = '';
    document.getElementById('modal-account').value = '';
    document.getElementById('modal-password').value = '';
    document.getElementById('modal-steps').value = '89888';
    document.getElementById('modal-hour').value = '0';
    document.getElementById('modal-minute').value = '5';
    document.getElementById('account-modal').classList.add('show');
}

function openEditModal(id, account, password, steps, hour, minute) {
    document.getElementById('modal-title').textContent = '编辑账号';
    document.getElementById('edit-account-id').value = id;
    document.getElementById('modal-account').value = account;
    document.getElementById('modal-password').value = password;
    document.getElementById('modal-steps').value = steps;
    document.getElementById('modal-hour').value = hour;
    document.getElementById('modal-minute').value = minute;
    document.getElementById('account-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('account-modal').classList.remove('show');
}

function saveAccount() {
    const id = document.getElementById('edit-account-id').value;
    const account = document.getElementById('modal-account').value.trim();
    const password = document.getElementById('modal-password').value;
    const steps = parseInt(document.getElementById('modal-steps').value) || 89888;
    const hour = parseInt(document.getElementById('modal-hour').value) || 0;
    const minute = parseInt(document.getElementById('modal-minute').value) || 0;
    
    if (!account || !password) {
        showToast('账号和密码不能为空', 'error');
        return;
    }
    
    const data = { account, password, steps, schedule_hour: hour, schedule_minute: minute };
    
    const url = id ? `${API_BASE}/api/accounts/${id}` : `${API_BASE}/api/accounts`;
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(id ? '账号更新成功' : '账号添加成功', 'success');
            closeModal();
            loadAccounts();
            loadStatistics();
        } else {
            showToast(data.message || '操作失败', 'error');
        }
    })
    .catch(err => {
        console.error('保存账号失败:', err);
        showToast('保存失败', 'error');
    });
}

function toggleAccount(id) {
    fetch(`${API_BASE}/api/accounts/${id}/toggle`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            loadAccounts();
            loadStatistics();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(err => {
        console.error('切换状态失败:', err);
        showToast('操作失败', 'error');
    });
}

function deleteAccount(id) {
    if (!confirm('确定要删除这个账号吗？相关的提交记录也会被删除。')) {
        return;
    }
    
    fetch(`${API_BASE}/api/accounts/${id}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('账号删除成功', 'success');
            loadAccounts();
            loadStatistics();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(err => {
        console.error('删除账号失败:', err);
        showToast('删除失败', 'error');
    });
}

function executeAccount(id) {
    showToast('正在执行...', 'info');
    
    fetch(`${API_BASE}/api/accounts/${id}/execute`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('执行成功', 'success');
        } else {
            showToast(data.message || '执行失败', 'error');
        }
        loadStatistics();
        if (currentTab === 'records') {
            loadRecords('today');
        }
    })
    .catch(err => {
        console.error('执行失败:', err);
        showToast('执行失败', 'error');
    });
}

function executeAllAccounts() {
    if (!confirm('确定要立即执行所有启用的账号吗？')) {
        return;
    }
    
    showToast('正在执行所有账号...', 'info');
    
    fetch(`${API_BASE}/api/accounts/execute-all`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
        } else {
            showToast(data.message, 'error');
        }
        loadStatistics();
        if (currentTab === 'records') {
            loadRecords('today');
        }
    })
    .catch(err => {
        console.error('执行失败:', err);
        showToast('执行失败', 'error');
    });
}

// ==================== 提交记录 ====================

function loadRecords(type) {
    const url = type === 'today' ? `${API_BASE}/api/records/today` : `${API_BASE}/api/records?limit=100`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderRecords(data.data);
            }
        })
        .catch(err => {
            console.error('加载记录失败:', err);
            showToast('加载记录失败', 'error');
        });
}

function renderRecords(records) {
    const container = document.getElementById('records-list');
    
    if (records.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-2xl mb-2"></i>
                    <p>暂无提交记录</p>
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = records.map(rec => `
        <tr class="border-b border-gray-700 hover:bg-gray-800/50">
            <td class="px-4 py-3">${rec.account_name}</td>
            <td class="px-4 py-3">${rec.steps.toLocaleString()}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 rounded text-xs ${
                    rec.status === 'success' ? 'bg-green-500/20 text-green-400' : 
                    rec.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
                    'bg-yellow-500/20 text-yellow-400'
                }">
                    ${rec.status === 'success' ? '成功' : rec.status === 'failed' ? '失败' : '待处理'}
                </span>
            </td>
            <td class="px-4 py-3 text-gray-400 text-sm">${rec.message || '-'}</td>
            <td class="px-4 py-3 text-gray-400 text-sm">${rec.created_at}</td>
        </tr>
    `).join('');
}

// ==================== 测试账号 ====================

function testAccount() {
    const account = document.getElementById('test-account').value.trim();
    const password = document.getElementById('test-password').value;
    const steps = parseInt(document.getElementById('test-steps').value) || 89888;
    
    if (!account || !password) {
        showToast('账号和密码不能为空', 'error');
        return;
    }
    
    const resultDiv = document.getElementById('test-result');
    resultDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i></div>';
    resultDiv.classList.remove('hidden');
    
    fetch(`${API_BASE}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password, steps })
    })
    .then(res => res.json())
    .then(data => {
        resultDiv.innerHTML = `
            <div class="p-4 rounded-lg ${data.success ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas ${data.success ? 'fa-check-circle text-green-400' : 'fa-times-circle text-red-400'}"></i>
                    <span class="font-medium ${data.success ? 'text-green-400' : 'text-red-400'}">
                        ${data.success ? '测试成功' : '测试失败'}
                    </span>
                </div>
                <p class="text-sm text-gray-300">${data.message}</p>
            </div>
        `;
    })
    .catch(err => {
        console.error('测试失败:', err);
        resultDiv.innerHTML = `
            <div class="p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fas fa-times-circle text-red-400"></i>
                    <span class="font-medium text-red-400">测试失败</span>
                </div>
                <p class="text-sm text-gray-300">网络错误，请稍后重试</p>
            </div>
        `;
    });
}

// ==================== 系统日志 ====================

function loadLogs() {
    fetch(`${API_BASE}/api/logs?limit=50`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderLogs(data.data);
            }
        })
        .catch(err => {
            console.error('加载日志失败:', err);
            showToast('加载日志失败', 'error');
        });
}

function renderLogs(logs) {
    const container = document.getElementById('logs-list');
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="glass-card rounded-xl p-8 text-center">
                <i class="fas fa-inbox text-4xl text-gray-500 mb-4"></i>
                <p class="text-gray-400">暂无日志</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = logs.map(log => `
        <div class="glass-card rounded-lg p-3 log-${log.level}">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <p class="text-sm text-gray-200">${log.message}</p>
                    ${log.details ? `<p class="text-xs text-gray-500 mt-1">${JSON.stringify(log.details)}</p>` : ''}
                </div>
                <span class="text-xs text-gray-500 ml-4">${log.created_at}</span>
            </div>
        </div>
    `).join('');
}

// ==================== Toast 提示 ====================

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600',
        warning: 'bg-yellow-600'
    };
    
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white transform transition-all duration-300 z-50 ${colors[type] || colors.info}`;
    toast.innerHTML = `
        <i class="fas ${
            type === 'success' ? 'fa-check-circle' : 
            type === 'error' ? 'fa-times-circle' : 
            type === 'warning' ? 'fa-exclamation-triangle' : 
            'fa-info-circle'
        } mr-2"></i>
        ${message}
    `;
    
    // 显示
    setTimeout(() => {
        toast.classList.remove('translate-y-20', 'opacity-0');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

// 点击模态框外部关闭
document.getElementById('account-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});
