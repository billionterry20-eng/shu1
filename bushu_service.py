import requests
from datetime import datetime
import pytz

# 北京时间时区
BEIJING_TZ = pytz.timezone('Asia/Shanghai')

def submit_steps(account, password, steps):
    """
    提交步数到服务器
    
    Args:
        account: 账号
        password: 密码
        steps: 步数
    
    Returns:
        dict: {success: bool, message: str, data: any}
    """
    try:
        url = 'http://8.140.250.130/bushu/'
        
        data = {
            'account': account,
            'password': password,
            'steps': str(steps)
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.post(
            url,
            data=data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            return {
                'success': True,
                'message': '提交成功',
                'data': response.text
            }
        else:
            return {
                'success': False,
                'message': f'服务器返回错误: {response.status_code}',
                'data': response.text
            }
            
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'message': '请求超时',
            'data': None
        }
    except requests.exceptions.ConnectionError:
        return {
            'success': False,
            'message': '连接失败',
            'data': None
        }
    except Exception as e:
        return {
            'success': False,
            'message': f'异常: {str(e)}',
            'data': None
        }

def get_beijing_now():
    """获取当前北京时间"""
    return datetime.now(BEIJING_TZ)

def get_beijing_today():
    """获取当前北京日期"""
    return get_beijing_now().date()
