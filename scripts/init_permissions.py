"""权限系统数据库初始化脚本（幂等，可重复执行）。

- user 表新增 role 列（admin=超级管理员 / user=普通用户）
- 新建 permission 表（权限点定义）与 user_permission 表（用户-权限关联）
- 写入权限点种子数据
- 写入超级用户 root（admin 角色，拥有全部权限）
"""

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

# 权限点种子：code / name / group_name（按钮级粒度）
PERMISSIONS = [
    ("user:view", "查看用户", "用户管理"),
    ("user:create", "新增用户", "用户管理"),
    ("user:update", "编辑用户", "用户管理"),
    ("user:delete", "删除用户", "用户管理"),
    ("permission:view", "查看权限", "权限管理"),
    ("permission:edit", "分配权限", "权限管理"),
]

# 超级用户 root（测试环境明文密码，登录后可在用户管理里修改）
ROOT_USER = ("root", "root123456", "13800000000", "admin")


def main():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # 1. user 表加 role 列（已存在则跳过）
            cursor.execute(
                "SELECT COUNT(*) AS n FROM information_schema.columns "
                "WHERE table_schema = 'test_py' AND table_name = 'user' AND column_name = 'role'"
            )
            if cursor.fetchone()["n"] == 0:
                cursor.execute(
                    "ALTER TABLE user ADD COLUMN role VARCHAR(16) NOT NULL DEFAULT 'user' "
                    "COMMENT '角色：admin=超级管理员, user=普通用户'"
                )
                print("user 表已新增 role 列")
            else:
                print("user 表已存在 role 列，跳过")

            # 2. permission 表
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS permission ("
                "  id INT AUTO_INCREMENT PRIMARY KEY,"
                "  code VARCHAR(64) NOT NULL UNIQUE,"
                "  name VARCHAR(64) NOT NULL,"
                "  group_name VARCHAR(64) NOT NULL,"
                "  UNIQUE KEY uk_code (code)"
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            )
            print("permission 表就绪")

            # 3. user_permission 表
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS user_permission ("
                "  id INT AUTO_INCREMENT PRIMARY KEY,"
                "  user_id INT NOT NULL,"
                "  permission_code VARCHAR(64) NOT NULL,"
                "  UNIQUE KEY uk_user_perm (user_id, permission_code)"
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
            )
            print("user_permission 表就绪")

            # 4. 权限点种子
            for code, name, group_name in PERMISSIONS:
                cursor.execute(
                    "INSERT INTO permission (code, name, group_name) VALUES (%s, %s, %s) "
                    "ON DUPLICATE KEY UPDATE name = VALUES(name), group_name = VALUES(group_name)",
                    (code, name, group_name),
                )
            print(f"权限点种子写入 {len(PERMISSIONS)} 条")

            # 5. 超级用户 root
            username, password, phone, role = ROOT_USER
            cursor.execute("SELECT id FROM user WHERE username = %s", (username,))
            if cursor.fetchone() is None:
                cursor.execute(
                    "INSERT INTO user (username, password, phone, role) VALUES (%s, %s, %s, %s)",
                    (username, password, phone, role),
                )
                print(f"超级用户 {username} 已创建（默认密码 {password}）")
            else:
                # 已存在则确保其角色为 admin
                cursor.execute(
                    "UPDATE user SET role = 'admin' WHERE username = %s", (username,)
                )
                print(f"超级用户 {username} 已存在，角色已确认为 admin")

        conn.commit()
        print("数据库初始化完成")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
