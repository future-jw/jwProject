// EXPORTS: UserAvatar
import { cn } from '@/lib/utils';

// 签名元素：按用户名首字从主题图表色板取色的圆形头像，贯穿登录、顶栏与表格
const AVATAR_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];

function pickColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
        pickColor(name),
        className,
      )}
    >
      {name ? name.charAt(0).toUpperCase() : '?'}
    </span>
  );
}
