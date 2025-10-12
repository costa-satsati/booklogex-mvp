// src/lib/notify.ts
import { toast } from 'sonner';

export const notify = {
  success: (title: string, desc?: string) => toast.success(title, { description: desc }),
  error: (title: string, desc?: string) => toast.error(title, { description: desc }),
  info: (title: string, desc?: string) => toast.info(title, { description: desc }),
};
