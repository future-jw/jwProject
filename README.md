# jwProject · 权限管理系统

基于 **FastAPI + React** 的全栈后台管理系统，包含登录注册、用户管理和按钮级权限管理。

## 项目简介

jwProject 是一个前后端分离的后台管理系统，核心能力：

- **登录 / 注册**：用户注册后自动登录，登录态通过 token 维持（内存 token，24 小时有效）
- **用户管理**：用户列表、新增、编辑、删除，角色标识（超级管理员 / 普通用户）
- **权限管理**：超级管理员可查看所有页面，并为普通用户分配按钮级功能权限（权限点精确到查看 / 新增 / 编辑 / 删除等操作），权限实时生效

系统内置超级管理员账号 `root`（拥有全部权限），普通用户默认只授予「查看用户」，其余权限由超级管理员在权限管理页分配。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Python · FastAPI · pymysql · uvicorn |
| 数据库 | MySQL（库名 `test_py`，表：user / permission / user_permission） |
| 前端 | React 19 · Vite · TypeScript · Tailwind CSS · shadcn/ui · react-router · react-hook-form + zod |
| 其他 | Git · npm · pip |

## 目录结构

```
D:\测试\
├── app\                  # FastAPI 后端
│   ├── main.py           # 应用入口：用户 CRUD + 权限管理接口
│   ├── auth.py           # 登录注册、token 鉴权、权限校验依赖
│   └── db.py             # MySQL 连接配置
├── frontend\             # React 前端工程
│   └── src\
│       ├── api\          # 接口封装（axios 风格的 fetch 封装）
│       ├── lib\          # 登录态、权限判断工具
│       ├── pages\        # 登录 / 注册 / 用户管理 / 权限管理页面
│       └── components\   # 布局、头像、表单弹窗等组件
├── scripts\
│   └── init_permissions.py   # 权限系统数据库初始化脚本（幂等）
├── tests\                # 后端测试
├── requirements.txt      # Python 依赖
└── README.md
```

## 启动方式

### 1. 初始化数据库（首次）

确保本机 MySQL 已启动，`test_py` 库存在，且 `app/db.py` 中的连接信息（默认 root / root）正确，然后执行：

```bash
python scripts/init_permissions.py
```

该脚本会：为 user 表补充 role 列、创建 permission 与 user_permission 表、写入 6 个权限点、创建超级管理员 root（默认密码 `root123456`）。脚本幂等，可重复执行。

### 2. 启动后端（端口 8000）

```bash
# 创建虚拟环境并安装依赖（首次）
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --reload
```

启动后访问：
- 欢迎页：http://127.0.0.1:8000/
- 接口文档：http://127.0.0.1:8000/docs

### 3. 启动前端（端口 24680）

```bash
cd frontend
npm install                        # 首次
npm run dev -- --port 24680
```

启动后浏览器打开 **http://localhost:24680/** 即可使用系统。前端 dev server 已配置代理：`/api` → `http://127.0.0.1:8000`，无需处理跨域。

### 4. 运行测试

```bash
pytest
```

## 默认账号

| 账号 | 密码 | 角色 |
|---|---|---|
| root | root123456 | 超级管理员（拥有全部权限） |
| jiangwei | 199352 | 普通用户（查看用户 + 编辑用户） |
| test_user | abc123 | 普通用户（查看用户 + 新增用户） |

> 测试环境密码为明文存储，生产使用请务必改为加密存储。

## 权限点说明

| 权限码 | 名称 | 分组 | 控制范围 |
|---|---|---|---|
| user:view | 查看用户 | 用户管理 | 用户列表入口、列表数据 |
| user:create | 新增用户 | 用户管理 | 「新增用户」按钮 |
| user:update | 编辑用户 | 用户管理 | 「编辑」按钮 |
| user:delete | 删除用户 | 用户管理 | 「删除」按钮 |
| permission:view | 查看权限 | 权限管理 | 权限管理页入口 |
| permission:edit | 分配权限 | 权限管理 | 「分配权限」按钮 |
