// EXPORTS: PermissionDialog
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { api, type IPermissionItem } from '@/api/client';

interface PermissionDialogProps {
  user: { id: number; username: string; role: 'admin' | 'user' };
  permissions: IPermissionItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface IPermissionGroup {
  name: string;
  items: IPermissionItem[];
}

export default function PermissionDialog({
  user,
  permissions,
  open,
  onOpenChange,
  onSuccess,
}: PermissionDialogProps) {
  const [checked, setChecked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const info = await api.getUserPermissions(user.id);
        if (!cancelled) setChecked(info.permissions);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : '加载用户权限失败');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, user.id]);

  function toggle(code: string, value: boolean) {
    setChecked((prev) =>
      value ? [...prev, code] : prev.filter((c) => c !== code),
    );
  }

  const groups: IPermissionGroup[] = permissions.reduce<IPermissionGroup[]>(
    (acc, item) => {
      const group = acc.find((g) => g.name === item.group_name);
      if (group) {
        group.items.push(item);
      } else {
        acc.push({ name: item.group_name, items: [item] });
      }
      return acc;
    },
    [],
  );

  async function handleSave() {
    setSaving(true);
    try {
      await api.setUserPermissions(user.id, checked);
      toast.success(`已更新「${user.username}」的权限`);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分配权限：{user.username}</DialogTitle>
          <DialogDescription>
            勾选允许该用户使用的功能，权限精确到按钮。
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : (
          <div className="max-h-[50vh] space-y-5 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.name}>
                <p className="mb-2 text-sm font-semibold text-foreground">{group.name}</p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <Label
                      key={item.code}
                      className="flex cursor-pointer items-center gap-2.5 font-normal"
                    >
                      <Checkbox
                        checked={checked.includes(item.code)}
                        onCheckedChange={(v) => toggle(item.code, v === true)}
                      />
                      <span className="text-sm">{item.name}</span>
                      <span className="text-xs text-muted-foreground">{item.code}</span>
                    </Label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              取消
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
