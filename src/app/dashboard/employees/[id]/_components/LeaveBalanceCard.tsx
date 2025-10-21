// src/app/dashboard/employees/[id]/_components/LeaveBalanceCard.tsx
import { hoursToDays } from '@/lib/leave-calculator';

interface Props {
  title: string;
  hours: number;
  hoursPerDay: number;
  color: 'blue' | 'green' | 'purple' | 'amber';
  icon: React.ReactNode;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    textDark: 'text-blue-900',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    textDark: 'text-green-900',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    textDark: 'text-purple-900',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    textDark: 'text-amber-900',
  },
};

export default function LeaveBalanceCard({ title, hours, hoursPerDay, color, icon }: Props) {
  const days = hoursToDays(hours, hoursPerDay);
  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} border ${classes.border} rounded-lg p-4 md:p-5`}>
      <div className={`flex items-center gap-2 mb-2 ${classes.text}`}>
        <div className="hidden sm:block">{icon}</div>
        <div className="text-xs sm:text-sm font-medium">{title}</div>
      </div>
      <div className={`text-2xl sm:text-3xl font-bold ${classes.textDark}`}>
        {hours.toFixed(1)}h
      </div>
      <div className={`text-xs ${classes.text} mt-1`}>{days.toFixed(1)} days available</div>

      {/* Progress bar for visual indication */}
      <div className="mt-3 bg-white/50 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${classes.text.replace('text-', 'bg-')} transition-all`}
          style={{ width: `${Math.min((days / 20) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
