// EXPORTS: UserFormDialog
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api, type IUser } from '@/api/client';

const schema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符').max(32, '用户名最多 32 个字符'),
  password: z.string().refine((v) => v.length === 0 || v.length >= 4, '密码至少 4 位'),
  phone: z.string().regex(/^1\d{10}$/, '请输入 11 位手机号'),
});

type UserFormValues = z.infer<typeof schema>;

interface UserFormDialogProps {
  editing: IUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function UserFormDialog({
  editing,
  open,
  onOpenChange,
  onSuccess,
}: UserFormDialogProps) {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { username: editing.username, password: '', phone: editing.phone }
      : { username: '', password: '', phone: '' },
  });
  const { isSubmitting } = form.formState;

  async function onSubmit(values: UserFormValues) {
    if (!editing && !values.password) {
      toast.error('请填写密码');
      return;
    }
    try {
      if (editing) {
        await api.updateUser(editing.id, {
          username: values.username,
          password: values.password || editing.password,
          phone: values.phone,
        });
        toast.success('用户已更新');
      } else {
        await api.createUser({
          username: values.username,
          password: values.password,
          phone: values.phone,
        });
        toast.success('用户已创建');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败，请稍后重试');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? '编辑用户' : '新增用户'}</DialogTitle>
          <DialogDescription>
            {editing ? '修改用户信息，密码留空则保持不变。' : '填写用户信息并创建新账号。'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input placeholder="2-32 个字符" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={editing ? '留空则保持原密码' : '至少 4 位'}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>手机号</FormLabel>
                  <FormControl>
                    <Input placeholder="11 位手机号" inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  取消
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '保存中…' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
