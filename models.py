from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Account(db.Model):
    """账号表"""
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    account = db.Column(db.String(255), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)
    steps = db.Column(db.Integer, default=89888)
    schedule_hour = db.Column(db.Integer, default=0)  # 定时小时 (0-23)
    schedule_minute = db.Column(db.Integer, default=5)  # 定时分钟 (0-59)
    enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关联提交记录
    records = db.relationship('SubmitRecord', backref='account', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'account': self.account,
            'password': self.password,
            'steps': self.steps,
            'schedule_hour': self.schedule_hour,
            'schedule_minute': self.schedule_minute,
            'schedule_time': f"{self.schedule_hour:02d}:{self.schedule_minute:02d}",
            'enabled': self.enabled,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else None
        }

class SubmitRecord(db.Model):
    """提交记录表"""
    __tablename__ = 'submit_records'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    account_name = db.Column(db.String(255), nullable=False)  # 冗余存储账号名
    steps = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, success, failed
    message = db.Column(db.Text)
    response_data = db.Column(db.Text)
    submit_date = db.Column(db.Date, nullable=False)  # 提交日期
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'account_id': self.account_id,
            'account_name': self.account_name,
            'steps': self.steps,
            'status': self.status,
            'message': self.message,
            'submit_date': self.submit_date.strftime('%Y-%m-%d') if self.submit_date else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

class SystemLog(db.Model):
    """系统日志表"""
    __tablename__ = 'system_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    level = db.Column(db.String(20), default='info')  # info, success, warning, error
    message = db.Column(db.Text, nullable=False)
    details = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    def to_dict(self):
        return {
            'id': self.id,
            'level': self.level,
            'message': self.message,
            'details': json.loads(self.details) if self.details else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else None
        }

def init_default_account():
    """初始化默认账号"""
    # 用户提供的默认账号
    default_accounts = [
        {
            'account': 'Tbh2356@163.com',
            'password': '112233qq',
            'steps': 89888,
            'schedule_hour': 0,
            'schedule_minute': 5
        }
    ]
    
    for acc_data in default_accounts:
        existing = Account.query.filter_by(account=acc_data['account']).first()
        if not existing:
            account = Account(**acc_data)
            db.session.add(account)
    
    db.session.commit()
