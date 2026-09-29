// EXPORTS: PermissionManagePage
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, ShieldCheck, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, type IPermissionItem, type IUserPermissionInfo } from '@/api/client';
import { hasPermission } from '@/lib/permission';
import UserAvatar from '@/components/UserAvatar';
import PermissionDialog from './PermissionDialog';

async function loadPermissionRows(): Promise<{
  users: IUserPermissionInfo[];
  points: IPermissionItem[];
}> {
  const [userData, permData] = await Promise.all([
    api.listUsers(),
    api.listPermissions(),
  ]);
  const rows = await Promise.all(
    userData.users.map((u) => api.getUserPermissions(u.id)),
  );
  return { users: rows, points: permData.permissions };
}

export default function PermissionManagePage() {
  const [rows, setRows] = useState<IUserPermissionInfo[]>([]);
  const [points, setPoints] = useState<IPermissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<IUserPermissionInfo | null>(null);

  const canEdit = hasPermission('permission:edit');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await loadPermissionRows();
        if (!cancelled) {
          setRows(data.users);
          setPoints(data.points);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : '加载权限数据失败');
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
      const data = await loadPermissionRows();
      setRows(data.users);
      setPoints(data.points);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刷新权限数据失败');
    }
  }

  const nameByCode = new Map(points.map((p) => [p.code, p.name]));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">权限管理</h2>
        <p className="text-sm text-muted-foreground">
          超级管理员拥有全部权限，可为普通用户分配按钮级功能权限
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">用户</TableHead>
                  <TableHead className="whitespace-nowrap">角色</TableHead>
                  <TableHead className="whitespace-nowrap">拥有权限</TableHead>
                  {canEdit && (
                    <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={canEdit ? 4 : 3}
                      className="py-16 text-center text-sm text-muted-foreground"
                    >
                      加载中…
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={row.username} />
                          <span className="font-medium">{row.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.role === 'admin' ? (
                          <Badge variant="default">
                            <ShieldCheck className="mr-1 size-3.5" />
                            超级管理员
                          </Badge>
                        ) : (
                          <Badge variant="secondary">普通用户</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[420px] flex-wrap gap-1.5">
                          {row.role === 'admin' ? (
                            <span className="text-sm text-muted-foreground">
                              拥有全部权限
                            </span>
                          ) : row.permissions.length === 0 ? (
                            <span className="text-sm text-muted-foreground">
                              未分配任何权限
                            </span>
                          ) : (
                            row.permissions.map((code) => (
                              <Badge key={code} variant="outline">
                                {nameByCode.get(code) ?? code}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="whitespace-nowrap text-right">
                          {row.role === 'admin' ? (
                            <span className="text-sm text-muted-foreground">
                              不可分配
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTarget(row)}
                            >
                              <KeyRound className="size-4" />
                              分配权限
                            </Button>
                          )}
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

      {target && (
        <PermissionDialog
          user={{ id: target.user_id, username: target.username, role: target.role }}
          permissions={points}
          open={target !== null}
          onOpenChange={(open) => {
            if (!open) setTarget(null);
          }}
          onSuccess={() => {
            setTarget(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}
