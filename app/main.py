"""FastAPI 小项目入口。

运行方式：
    uvicorn app.main:app --reload
然后浏览器打开 http://127.0.0.1:8000 查看交互式文档。
"""

from fastapi import FastAPI, HTTPException, Path, Depends
from pydantic import BaseModel, Field

from app.auth import (
    ALL_PERMISSION_CODES,
    DEFAULT_REGISTER_PERMISSIONS,
    get_current_user,
    get_permissions_for_user,
    require_permission,
    router as auth_router,
)
from app.db import get_connection

app = FastAPI(
    title="测试小项目 API",
    description=(
        "基于 FastAPI 搭建的测试后端接口服务。\n\n"
        "**数据库**：本机 MySQL（test_py 库）\n"
        "**数据表**：user（用户表）\n"
        "**接口功能**：对 user 表进行增删改查操作"
    ),
    version="0.1.0",
)

app.include_router(auth_router)


class UserCreate(BaseModel):
    """新增 / 更新用户时的请求体。"""

    username: str = Field(..., description="用户名", examples=["jiangwei"])
    password: str = Field(..., description="密码（测试环境明文存储）", examples=["199352"])
    phone: str = Field(..., description="手机号（11 位）", examples=["15523783249"])


@app.get(
    "/",
    summary="欢迎页",
    description="根路径，返回一条欢迎信息，用于确认服务已启动。",
    tags=["基础"],
)
def read_root():
    """根路径：返回欢迎信息。"""
    return {"message": "Hello, 后端开发工作空间已就绪！"}


@app.get(
    "/health",
    summary="健康检查",
    description="检查服务是否正常运行，返回 ok 表示服务健康。",
    tags=["基础"],
)
def health_check():
    """健康检查：用于确认服务是否正常运行。"""
    return {"status": "ok"}


@app.get(
    "/users",
    summary="查询全部用户",
    description="查询 user 表中的所有用户列表（需 user:view 权限），返回每条记录的 id、用户名、密码、手机号、角色。",
    tags=["用户管理"],
)
def list_users(current: dict = Depends(require_permission("user:view"))):
    """查询 test_py 库 user 表的全部用户。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, username, password, phone, role FROM user ORDER BY id"
            )
            rows = cursor.fetchall()
        return {"users": rows}
    finally:
        conn.close()


@app.post(
    "/users",
    summary="新增用户",
    description="向 user 表插入一条新用户记录（需 user:create 权限），默认普通用户并授予基础权限。",
    tags=["用户管理"],
)
def create_user(
    user: UserCreate,
    current: dict = Depends(require_permission("user:create")),
):
    """新增一个用户，id 由数据库自增。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM user WHERE username = %s", (user.username,))
            if cursor.fetchone() is not None:
                raise HTTPException(status_code=400, detail="用户名已存在")
            cursor.execute(
                "INSERT INTO user (username, password, phone, role) VALUES (%s, %s, %s, 'user')",
                (user.username, user.password, user.phone),
            )
            new_id = cursor.lastrowid
            for code in DEFAULT_REGISTER_PERMISSIONS:
                cursor.execute(
                    "INSERT INTO user_permission (user_id, permission_code) VALUES (%s, %s)",
                    (new_id, code),
                )
        conn.commit()
    finally:
        conn.close()
    return {"id": new_id, "username": user.username, "password": user.password, "phone": user.phone, "role": "user"}


@app.get(
    "/users/{user_id}",
    summary="按 id 查询用户",
    description="根据路径中的用户 id 查询单条记录；id 不存在时返回 404。",
    tags=["用户管理"],
)
def get_user(
    user_id: int = Path(..., description="要查询的用户 id", examples=[1]),
    current: dict = Depends(require_permission("user:view")),
):
    """按 id 查询单个用户。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, username, password, phone, role FROM user WHERE id = %s",
                (user_id,),
            )
            row = cursor.fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return row


@app.put(
    "/users/{user_id}",
    summary="更新用户",
    description="根据用户 id 更新其用户名、密码、手机号；id 不存在时返回 404。",
    tags=["用户管理"],
)
def update_user(
    user: UserCreate,
    user_id: int = Path(..., description="要更新的用户 id", examples=[1]),
    current: dict = Depends(require_permission("user:update")),
):
    """按 id 更新用户信息（超级管理员账号不可被修改）。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT role FROM user WHERE id = %s", (user_id,))
            target = cursor.fetchone()
            if target is None:
                raise HTTPException(status_code=404, detail="用户不存在")
            if target["role"] == "admin":
                raise HTTPException(status_code=400, detail="超级管理员账号不可修改")
            cursor.execute(
                "UPDATE user SET username = %s, password = %s, phone = %s WHERE id = %s",
                (user.username, user.password, user.phone, user_id),
            )
        conn.commit()
    finally:
        conn.close()
    return {"id": user_id, "username": user.username, "password": user.password, "phone": user.phone}


@app.delete(
    "/users/{user_id}",
    summary="删除用户",
    description="根据用户 id 删除记录；id 不存在时返回 404。",
    tags=["用户管理"],
)
def delete_user(
    user_id: int = Path(..., description="要删除的用户 id", examples=[1]),
    current: dict = Depends(require_permission("user:delete")),
):
    """按 id 删除用户（超级管理员账号不可删除）。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT role FROM user WHERE id = %s", (user_id,))
            target = cursor.fetchone()
            if target is None:
                raise HTTPException(status_code=404, detail="用户不存在")
            if target["role"] == "admin":
                raise HTTPException(status_code=400, detail="超级管理员账号不可删除")
            cursor.execute(
                "DELETE FROM user_permission WHERE user_id = %s",
                (user_id,),
            )
            cursor.execute("DELETE FROM user WHERE id = %s", (user_id,))
        conn.commit()
    finally:
        conn.close()
    return {"message": "删除成功", "id": user_id}


class PermissionUpdate(BaseModel):
    """设置用户权限时的请求体。"""

    permissions: list[str] = Field(..., description="要授予的权限码列表", examples=[["user:view", "user:create"]])


@app.get(
    "/permissions",
    summary="权限点列表",
    description="返回全部权限点定义以及当前用户拥有的权限码（登录即可访问）。",
    tags=["权限管理"],
)
def list_permissions(current: dict = Depends(get_current_user)):
    """查询 permission 表全部权限点，并附带当前用户的权限。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT code, name, group_name FROM permission ORDER BY id"
            )
            permissions = cursor.fetchall()
    finally:
        conn.close()
    return {
        "permissions": permissions,
        "mine": current["permissions"],
        "role": current["role"],
    }


@app.get(
    "/users/{user_id}/permissions",
    summary="查看用户权限",
    description="查询指定用户的角色与已授权限（需 permission:view 权限）。",
    tags=["权限管理"],
)
def get_user_permissions(
    user_id: int = Path(..., description="要查询的用户 id", examples=[1]),
    current: dict = Depends(require_permission("permission:view")),
):
    """查询单个用户被授予的权限；admin 角色返回全部权限。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, username, role FROM user WHERE id = %s",
                (user_id,),
            )
            row = cursor.fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    permissions = (
        ALL_PERMISSION_CODES
        if row["role"] == "admin"
        else get_permissions_for_user(row["id"], row["role"])
    )
    return {
        "user_id": row["id"],
        "username": row["username"],
        "role": row["role"],
        "permissions": permissions,
    }


@app.put(
    "/users/{user_id}/permissions",
    summary="设置用户权限",
    description="为普通用户设置权限码（需 permission:edit 权限），覆盖其原有权限；超级管理员不可修改。",
    tags=["权限管理"],
)
def update_user_permissions(
    body: PermissionUpdate,
    user_id: int = Path(..., description="要设置权限的用户 id", examples=[2]),
    current: dict = Depends(require_permission("permission:edit")),
):
    """覆盖设置某用户的权限；仅普通用户可设置，admin 角色拥有全部权限。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, role FROM user WHERE id = %s", (user_id,))
            target = cursor.fetchone()
            if target is None:
                raise HTTPException(status_code=404, detail="用户不存在")
            if target["role"] == "admin":
                raise HTTPException(status_code=400, detail="超级管理员拥有全部权限，无需分配")
            for code in body.permissions:
                if code not in ALL_PERMISSION_CODES:
                    raise HTTPException(status_code=400, detail=f"未知权限码：{code}")
            cursor.execute(
                "DELETE FROM user_permission WHERE user_id = %s",
                (user_id,),
            )
            for code in body.permissions:
                cursor.execute(
                    "INSERT INTO user_permission (user_id, permission_code) VALUES (%s, %s)",
                    (user_id, code),
                )
        conn.commit()
    finally:
        conn.close()
    return {
        "user_id": user_id,
        "permissions": body.permissions,
        "message": "权限已更新",
    }
