"""登录注册与鉴权模块。

- 注册：写入 user 表（默认 role=user），并授予基础权限 user:view
- 登录：校验后签发内存 token
- 鉴权：get_current_user / require_permission 两个依赖，
  权限实时从数据库读取（admin 拥有全部权限，普通用户查 user_permission 表）
"""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.db import get_connection

router = APIRouter(prefix="/auth", tags=["登录注册"])

TOKEN_TTL_SECONDS = 60 * 60 * 24  # 24 小时

# 内存 token 表：token -> {user_id, username, expires_at}
TOKENS: dict[str, dict] = {}

# 全部权限点 code（与 permission 表种子一致；admin 角色直接拥有全部）
ALL_PERMISSION_CODES = [
    "user:view",
    "user:create",
    "user:update",
    "user:delete",
    "permission:view",
    "permission:edit",
]

# 新用户注册后默认授予的权限
DEFAULT_REGISTER_PERMISSIONS = ["user:view"]


class RegisterRequest(BaseModel):
    """注册请求体。"""

    username: str = Field(..., description="用户名", examples=["jiangwei"])
    password: str = Field(..., description="密码（测试环境明文存储）", examples=["199352"])
    phone: str = Field(..., description="手机号（11 位）", examples=["15523783249"])


class LoginRequest(BaseModel):
    """登录请求体。"""

    username: str = Field(..., description="用户名", examples=["jiangwei"])
    password: str = Field(..., description="密码", examples=["199352"])


def _issue_token(user_id: int, username: str) -> str:
    """签发一个内存 token 并登记有效期。"""
    token = secrets.token_hex(16)
    TOKENS[token] = {
        "user_id": user_id,
        "username": username,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=TOKEN_TTL_SECONDS),
    }
    return token


def get_permissions_for_user(user_id: int, role: str) -> list[str]:
    """取用户拥有的权限码列表；admin 角色直接返回全部。"""
    if role == "admin":
        return list(ALL_PERMISSION_CODES)
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT permission_code FROM user_permission WHERE user_id = %s",
                (user_id,),
            )
            return [row["permission_code"] for row in cursor.fetchall()]
    finally:
        conn.close()


def get_current_user(authorization: str = Header(default="")) -> dict:
    """解析 Bearer token 并返回当前用户（含实时角色与权限）。"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录或登录已过期")
    token = authorization.removeprefix("Bearer ").strip()
    record = TOKENS.get(token)
    if record is None or record["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="未登录或登录已过期")

    user_id = record["user_id"]
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
        raise HTTPException(status_code=401, detail="用户不存在或已被删除")

    return {
        "user_id": row["id"],
        "username": row["username"],
        "role": row["role"],
        "permissions": get_permissions_for_user(row["id"], row["role"]),
    }


def require_permission(code: str):
    """接口级权限校验依赖工厂：用户缺少指定权限码时返回 403。"""

    def checker(user: dict = Depends(get_current_user)) -> dict:
        if code not in user["permissions"]:
            raise HTTPException(status_code=403, detail="无权限执行此操作")
        return user

    return checker


def _user_payload(user_id: int, username: str, phone: str, role: str) -> dict:
    """组装登录/注册响应的用户信息（含角色与权限）。"""
    return {
        "id": user_id,
        "username": username,
        "phone": phone,
        "role": role,
        "permissions": get_permissions_for_user(user_id, role),
    }


def register_user(username: str, password: str, phone: str) -> dict:
    """注册新用户（默认普通用户角色 + 基础权限），用户名已存在时抛 400。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM user WHERE username = %s", (username,))
            if cursor.fetchone() is not None:
                raise HTTPException(status_code=400, detail="用户名已存在")
            cursor.execute(
                "INSERT INTO user (username, password, phone, role) VALUES (%s, %s, %s, 'user')",
                (username, password, phone),
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
    return _user_payload(new_id, username, phone, "user")


def login_user(username: str, password: str) -> dict:
    """登录校验，成功签发 token；用户名或密码错误抛 401。"""
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id, username, password, phone, role FROM user WHERE username = %s",
                (username,),
            )
            row = cursor.fetchone()
    finally:
        conn.close()
    if row is None or row["password"] != password:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = _issue_token(row["id"], row["username"])
    user = _user_payload(row["id"], row["username"], row["phone"], row["role"])
    return {"token": token, "user": user}


@router.post(
    "/register",
    summary="注册",
    description="校验用户名唯一后创建普通用户（默认授予查看用户权限），注册成功即签发登录 token。",
)
def register(req: RegisterRequest):
    """注册新用户，用户名已存在时返回 400。"""
    user = register_user(req.username, req.password, req.phone)
    token = _issue_token(user["id"], user["username"])
    return {"token": token, "user": user}


@router.post(
    "/login",
    summary="登录",
    description="按用户名密码校验，成功签发 token，失败返回 401。",
)
def login(req: LoginRequest):
    """登录校验，用户名或密码错误时返回 401。"""
    return login_user(req.username, req.password)
