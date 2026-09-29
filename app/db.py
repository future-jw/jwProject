"""数据库连接模块：连接本机 MySQL 的 test_py 库。"""

import pymysql

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "root",
    "database": "test_py",
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
}


def get_connection():
    """创建并返回一个数据库连接。"""
    return pymysql.connect(**DB_CONFIG)
