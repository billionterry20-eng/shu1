from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import pytz
import json

from models import db, Account, SubmitRecord, SystemLog
from bushu_service import submit_steps, get_beijing_now, get_beijing_today

# 北京时间时区
BEIJING_TZ = pytz.timezone('Asia/Shanghai')

class BushuScheduler:
    """步数定时任务调度器"""
    
    def __init__(self, app):
        self.app = app
        self.scheduler = BackgroundScheduler(timezone=BEIJING_TZ)
        self.jobs = {}  # 存储每个账号的任务 {account_id: job_id}
    
    def start(self):
        """启动调度器"""
        self.scheduler.start()
        self._load_all_jobs()
        self._log('调度器已启动', 'info')
    
    def shutdown(self):
        """关闭调度器"""
        self.scheduler.shutdown()
        self._log('调度器已关闭', 'info')
    
    def _log(self, message, level='info', details=None):
        """记录系统日志"""
        with self.app.app_context():
            log = SystemLog(
                level=level,
                message=message,
                details=json.dumps(details) if details else None
            )
            db.session.add(log)
            db.session.commit()
        print(f'[{level.upper()}] {message}')
    
    def _load_all_jobs(self):
        """加载所有启用的账号任务"""
        with self.app.app_context():
            accounts = Account.query.filter_by(enabled=True).all()
            for account in accounts:
                self._schedule_account_job(account)
    
    def _schedule_account_job(self, account):
        """
        为单个账号创建定时任务
        
        Args:
            account: Account 对象
        """
        # 如果已存在任务，先移除
        if account.id in self.jobs:
            try:
                self.scheduler.remove_job(self.jobs[account.id])
            except:
                pass
        
        # 创建新的定时任务
        trigger = CronTrigger(
            hour=account.schedule_hour,
            minute=account.schedule_minute,
            timezone=BEIJING_TZ
        )
        
        job = self.scheduler.add_job(
            func=self._execute_account_task,
            trigger=trigger,
            id=f'account_{account.id}',
            name=f'账号_{account.account}',
            replace_existing=True,
            args=[account.id]
        )
        
        self.jobs[account.id] = job.id
        
        self._log(
            f'已为账号 {account.account} 设置定时任务',
            'info',
            {'hour': account.schedule_hour, 'minute': account.schedule_minute}
        )
    
    def _execute_account_task(self, account_id):
        """
        执行单个账号的步数提交任务
        
        Args:
            account_id: 账号ID
        """
        with self.app.app_context():
            account = Account.query.get(account_id)
            
            if not account:
                self._log(f'账号不存在: {account_id}', 'error')
                return
            
            if not account.enabled:
                self._log(f'账号已禁用: {account.account}', 'warning')
                return
            
            # 检查今天是否已经提交过
            today = get_beijing_today()
            existing_record = SubmitRecord.query.filter_by(
                account_id=account.id,
                submit_date=today
            ).first()
            
            if existing_record and existing_record.status == 'success':
                self._log(
                    f'账号 {account.account} 今天已提交过，跳过',
                    'info',
                    {'submit_date': str(today)}
                )
                return
            
            self._log(f'开始执行账号 {account.account} 的步数提交', 'info')
            
            # 提交步数
            result = submit_steps(account.account, account.password, account.steps)
            
            # 创建或更新提交记录
            if existing_record:
                record = existing_record
            else:
                record = SubmitRecord(
                    account_id=account.id,
                    account_name=account.account,
                    steps=account.steps,
                    submit_date=today
                )
                db.session.add(record)
            
            # 更新记录
            record.steps = account.steps
            record.status = 'success' if result['success'] else 'failed'
            record.message = result['message']
            record.response_data = json.dumps(result['data']) if result['data'] else None
            record.created_at = get_beijing_now()
            
            db.session.commit()
            
            # 记录日志
            if result['success']:
                self._log(
                    f'账号 {account.account} 步数提交成功',
                    'success',
                    {'steps': account.steps}
                )
            else:
                self._log(
                    f'账号 {account.account} 步数提交失败',
                    'error',
                    {'message': result['message']}
                )
    
    def add_account_job(self, account):
        """
        添加账号定时任务
        
        Args:
            account: Account 对象
        """
        self._schedule_account_job(account)
    
    def remove_account_job(self, account_id):
        """
        移除账号定时任务
        
        Args:
            account_id: 账号ID
        """
        if account_id in self.jobs:
            try:
                self.scheduler.remove_job(self.jobs[account_id])
                del self.jobs[account_id]
                self._log(f'已移除账号 {account_id} 的定时任务', 'info')
            except Exception as e:
                self._log(f'移除账号 {account_id} 定时任务失败', 'error', {'error': str(e)})
    
    def update_account_job(self, account):
        """
        更新账号定时任务
        
        Args:
            account: Account 对象
        """
        self._schedule_account_job(account)
    
    def execute_account_now(self, account_id):
        """
        立即执行单个账号任务
        
        Args:
            account_id: 账号ID
        
        Returns:
            dict: 执行结果
        """
        with self.app.app_context():
            account = Account.query.get(account_id)
            
            if not account:
                return {'success': False, 'message': '账号不存在'}
            
            # 提交步数
            result = submit_steps(account.account, account.password, account.steps)
            
            # 创建提交记录
            today = get_beijing_today()
            existing_record = SubmitRecord.query.filter_by(
                account_id=account.id,
                submit_date=today
            ).first()
            
            if existing_record:
                record = existing_record
            else:
                record = SubmitRecord(
                    account_id=account.id,
                    account_name=account.account,
                    steps=account.steps,
                    submit_date=today
                )
                db.session.add(record)
            
            record.steps = account.steps
            record.status = 'success' if result['success'] else 'failed'
            record.message = result['message']
            record.response_data = json.dumps(result['data']) if result['data'] else None
            record.created_at = get_beijing_now()
            
            db.session.commit()
            
            # 记录日志
            self._log(
                f'手动执行账号 {account.account} 步数提交',
                'success' if result['success'] else 'error',
                {'steps': account.steps, 'message': result['message']}
            )
            
            return result
    
    def test_account(self, account, password, steps):
        """
        测试账号（不保存记录）
        
        Args:
            account: 账号
            password: 密码
            steps: 步数
        
        Returns:
            dict: 测试结果
        """
        result = submit_steps(account, password, steps)
        
        self._log(
            f'测试账号 {account}',
            'success' if result['success'] else 'error',
            {'steps': steps, 'message': result['message']}
        )
        
        return result
    
    def get_scheduler_status(self):
        """获取调度器状态"""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run_time': job.next_run_time.strftime('%Y-%m-%d %H:%M:%S') if job.next_run_time else None,
                'trigger': str(job.trigger)
            })
        
        return {
            'running': self.scheduler.running,
            'jobs': jobs
        }
