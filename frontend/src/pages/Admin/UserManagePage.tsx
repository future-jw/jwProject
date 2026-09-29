// EXPORTS: UserManagePage
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, type IUser } from '@/api/client';
import { hasPermission } from '@/lib/permission';
import UserAvatar from '@/components/UserAvatar';
import UserFormDialog from './UserFormDialog';

async function fetchUsers(): Promise<IUser[]> {
  const data = await api.listUsers();
  return data.users;
}

function RoleBadge({ role }: { role: IUser['role'] }) {
  return role === 'admin' ? (
    <Badge variant="default">超级管理员</Badge>
  ) : (
    <Badge variant="secondary">普通用户</Badge>
  );
}

export default function UserManagePage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IUser | null>(null);
  const [deleting, setDeleting] = useState<IUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const canCreate = hasPermission('user:create');
  const canUpdate = hasPermission('user:update');
  const canDelete = hasPermission('user:delete');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const list = await fetchUsers();
        if (!cancelled) setUsers(list);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : '加载用户列表失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刷新用户列表失败');
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(user: IUser) {
    setEditing(user);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.deleteUser(deleting.id);
      toast.success(`用户「${deleting.username}」已删除`);
      setDeleting(null);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败，请稍后重试');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">用户管理</h2>
          <p className="text-sm text-muted-foreground">
            管理系统全部用户账号，共 {users.length} 人
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            新增用户
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 whitespace-nowrap">ID</TableHead>
                  <TableHead className="whitespace-nowrap">用户名</TableHead>
                  <TableHead className="whitespace-nowrap">角色</TableHead>
                  <TableHead className="whitespace-nowrap">手机号</TableHead>
                  {(canUpdate || canDelete) && (
                    <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={canUpdate || canDelete ? 5 : 4}
                      className="py-16 text-center text-sm text-muted-foreground"
                    >
                      加载中…
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canUpdate || canDelete ? 5 : 4}>
                      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                        <Users className="size-8 opacity-40" />
                        <p className="text-sm">暂无用户，点击右上角「新增用户」创建</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {user.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={user.username} />
                          <span className="font-medium">{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{user.phone}</TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="flex justify-end gap-1">
                            {canUpdate && user.role !== 'admin' && (
                              <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                                <Pencil className="size-4" />
                                编辑
                              </Button>
                            )}
                            {canDelete && user.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeleting(user)}
                              >
                                <Trash2 className="size-4" />
                                删除
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <UserFormDialog
          editing={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={() => {
            setDialogOpen(false);
            void refresh();
          }}
        />
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除用户「{deleting?.username}」吗？该操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteBusy ? '删除中…' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
