from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import json

from models import db, Account, SubmitRecord, SystemLog, init_default_account
from scheduler import BushuScheduler
from bushu_service import get_beijing_now

# 创建 Flask 应用
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'bushu-scheduler-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///bushu.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 启用 CORS
CORS(app)

# 初始化数据库
db.init_app(app)

# 创建调度器
scheduler = BushuScheduler(app)

# 初始化应用
with app.app_context():
    db.create_all()
    init_default_account()

@app.before_request
def before_request():
    """请求前处理"""
    pass

# ==================== 页面路由 ====================

@app.route('/')
def index():
    """首页"""
    return render_template('index.html')

# ==================== API 路由 - 账号管理 ====================

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    """获取所有账号"""
    accounts = Account.query.all()
    return jsonify({
        'success': True,
        'data': [acc.to_dict() for acc in accounts]
    })

@app.route('/api/accounts/<int:account_id>', methods=['GET'])
def get_account(account_id):
    """获取单个账号"""
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'success': False, 'message': '账号不存在'}), 404
    
    return jsonify({
        'success': True,
        'data': account.to_dict()
    })

@app.route('/api/accounts', methods=['POST'])
def create_account():
    """创建账号"""
    data = request.json
    
    # 验证必填字段
    if not data.get('account') or not data.get('password'):
        return jsonify({'success': False, 'message': '账号和密码不能为空'}), 400
    
    # 检查账号是否已存在
    existing = Account.query.filter_by(account=data['account']).first()
    if existing:
        return jsonify({'success': False, 'message': '账号已存在'}), 400
    
    # 创建账号
    account = Account(
        account=data['account'],
        password=data['password'],
        steps=data.get('steps', 89888),
        schedule_hour=data.get('schedule_hour', 0),
        schedule_minute=data.get('schedule_minute', 5),
        enabled=data.get('enabled', True)
    )
    
    db.session.add(account)
    db.session.commit()
    
    # 添加到调度器
    if account.enabled:
        scheduler.add_account_job(account)
    
    # 记录日志
    log = SystemLog(
        level='info',
        message=f'创建账号: {account.account}',
        details=json.dumps({'steps': account.steps, 'schedule': f"{account.schedule_hour:02d}:{account.schedule_minute:02d}"})
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '账号创建成功',
        'data': account.to_dict()
    })

@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
def update_account(account_id):
    """更新账号"""
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'success': False, 'message': '账号不存在'}), 404
    
    data = request.json
    
    # 更新字段
    if 'account' in data:
        # 检查新账号名是否冲突
        if data['account'] != account.account:
            existing = Account.query.filter_by(account=data['account']).first()
            if existing:
                return jsonify({'success': False, 'message': '账号名已存在'}), 400
        account.account = data['account']
    
    if 'password' in data:
        account.password = data['password']
    
    if 'steps' in data:
        account.steps = data['steps']
    
    if 'schedule_hour' in data:
        account.schedule_hour = data['schedule_hour']
    
    if 'schedule_minute' in data:
        account.schedule_minute = data['schedule_minute']
    
    if 'enabled' in data:
        account.enabled = data['enabled']
    
    db.session.commit()
    
    # 更新调度器
    if account.enabled:
        scheduler.update_account_job(account)
    else:
        scheduler.remove_account_job(account.id)
    
    # 记录日志
    log = SystemLog(
        level='info',
        message=f'更新账号: {account.account}'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '账号更新成功',
        'data': account.to_dict()
    })

@app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
def delete_account(account_id):
    """删除账号"""
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'success': False, 'message': '账号不存在'}), 404
    
    account_name = account.account
    
    # 从调度器移除
    scheduler.remove_account_job(account.id)
    
    # 删除账号（级联删除提交记录）
    db.session.delete(account)
    
    # 记录日志
    log = SystemLog(
        level='info',
        message=f'删除账号: {account_name}'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': '账号删除成功'
    })

@app.route('/api/accounts/<int:account_id>/toggle', methods=['POST'])
def toggle_account(account_id):
    """切换账号启用状态"""
    account = Account.query.get(account_id)
    if not account:
        return jsonify({'success': False, 'message': '账号不存在'}), 404
    
    account.enabled = not account.enabled
    db.session.commit()
    
    # 更新调度器
    if account.enabled:
        scheduler.add_account_job(account)
    else:
        scheduler.remove_account_job(account.id)
    
    return jsonify({
        'success': True,
        'message': f'账号已{"启用" if account.enabled else "禁用"}',
        'data': account.to_dict()
    })

# ==================== API 路由 - 提交记录 ====================

@app.route('/api/records', methods=['GET'])
def get_records():
    """获取提交记录"""
    account_id = request.args.get('account_id', type=int)
    date_from = request.args.get('from')
    date_to = request.args.get('to')
    limit = request.args.get('limit', 50, type=int)
    
    query = SubmitRecord.query
    
    if account_id:
        query = query.filter_by(account_id=account_id)
    
    if date_from:
        query = query.filter(SubmitRecord.submit_date >= date_from)
    
    if date_to:
        query = query.filter(SubmitRecord.submit_date <= date_to)
    
    records = query.order_by(SubmitRecord.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'success': True,
        'data': [rec.to_dict() for rec in records]
    })

@app.route('/api/records/today', methods=['GET'])
def get_today_records():
    """获取今日提交记录"""
    from bushu_service import get_beijing_today
    today = get_beijing_today()
    
    records = SubmitRecord.query.filter_by(submit_date=today).order_by(SubmitRecord.created_at.desc()).all()
    
    return jsonify({
        'success': True,
        'date': str(today),
        'data': [rec.to_dict() for rec in records]
    })

@app.route('/api/records/statistics', methods=['GET'])
def get_statistics():
    """获取统计信息"""
    from bushu_service import get_beijing_today
    today = get_beijing_today()
    
    # 今日统计
    today_success = SubmitRecord.query.filter_by(submit_date=today, status='success').count()
    today_failed = SubmitRecord.query.filter_by(submit_date=today, status='failed').count()
    
    # 总账号数
    total_accounts = Account.query.count()
    enabled_accounts = Account.query.filter_by(enabled=True).count()
    
    # 近7天成功记录
    week_ago = today - timedelta(days=7)
    week_success = SubmitRecord.query.filter(
        SubmitRecord.submit_date >= week_ago,
        SubmitRecord.status == 'success'
    ).count()
    
    return jsonify({
        'success': True,
        'data': {
            'today': {
                'date': str(today),
                'success': today_success,
                'failed': today_failed
            },
            'accounts': {
                'total': total_accounts,
                'enabled': enabled_accounts
            },
            'week_success': week_success
        }
    })

# ==================== API 路由 - 执行任务 ====================

@app.route('/api/accounts/<int:account_id>/execute', methods=['POST'])
def execute_account(account_id):
    """立即执行单个账号"""
    result = scheduler.execute_account_now(account_id)
    
    return jsonify({
        'success': result['success'],
        'message': result['message'],
        'data': result.get('data')
    })

@app.route('/api/accounts/execute-all', methods=['POST'])
def execute_all_accounts():
    """立即执行所有启用的账号"""
    accounts = Account.query.filter_by(enabled=True).all()
    
    results = []
    for account in accounts:
        result = scheduler.execute_account_now(account.id)
        results.append({
            'account': account.account,
            'success': result['success'],
            'message': result['message']
        })
    
    return jsonify({
        'success': True,
        'message': f'已执行 {len(results)} 个账号',
        'data': results
    })

@app.route('/api/test', methods=['POST'])
def test_account():
    """测试账号（不保存）"""
    data = request.json
    
    if not data.get('account') or not data.get('password'):
        return jsonify({'success': False, 'message': '账号和密码不能为空'}), 400
    
    result = scheduler.test_account(
        data['account'],
        data['password'],
        data.get('steps', 89888)
    )
    
    return jsonify({
        'success': result['success'],
        'message': result['message'],
        'data': result.get('data')
    })

# ==================== API 路由 - 系统日志 ====================

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """获取系统日志"""
    limit = request.args.get('limit', 50, type=int)
    level = request.args.get('level')
    
    query = SystemLog.query
    
    if level:
        query = query.filter_by(level=level)
    
    logs = query.order_by(SystemLog.created_at.desc()).limit(limit).all()
    
    return jsonify({
        'success': True,
        'data': [log.to_dict() for log in logs]
    })

# ==================== API 路由 - 调度器状态 ====================

@app.route('/api/scheduler/status', methods=['GET'])
def get_scheduler_status():
    """获取调度器状态"""
    status = scheduler.get_scheduler_status()
    
    return jsonify({
        'success': True,
        'data': status
    })

# ==================== API 路由 - 健康检查 ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'time': get_beijing_now().strftime('%Y-%m-%d %H:%M:%S'),
        'scheduler_running': scheduler.scheduler.running
    })

# ==================== 错误处理 ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': '接口不存在'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'success': False, 'message': '服务器内部错误'}), 500

# ==================== 启动和关闭 ====================

# 初始化应用
with app.app_context():
    db.create_all()
    init_default_account()
    
    # 启动调度器（Render / Gunicorn 兼容）
    if not scheduler.scheduler.running:
        scheduler.start()
        
       # 启动调度器（用于非WSGI环境）
if __name__ == '__main__':
    # 本地直接运行（Render/Gunicorn 会导入 app:app，不会走到这里）
    try:
        app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
    finally:
        # 优雅关闭调度器
        if scheduler.scheduler.running:
            scheduler.shutdown()
