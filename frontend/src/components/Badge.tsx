interface BadgeProps {
  label: string;
  variant?: 'green' | 'red' | 'yellow' | 'gray' | 'blue';
  className?: string;
  pulse?: boolean;
}

const styles: Record<
  'green' | 'red' | 'yellow' | 'gray' | 'blue',
  { container: string; dot: string }
> = {
  green: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
    dot: 'bg-emerald-500',
  },
  red: {
    container: 'bg-rose-50 text-rose-700 border-rose-200/70',
    dot: 'bg-rose-500',
  },
  yellow: {
    container: 'bg-amber-50 text-amber-800 border-amber-200/70',
    dot: 'bg-amber-500',
  },
  gray: {
    container: 'bg-zinc-100 text-zinc-600 border-zinc-200/60',
    dot: 'bg-zinc-400',
  },
  blue: {
    container: 'bg-blue-50 text-blue-700 border-blue-200/70',
    dot: 'bg-blue-500',
  },
};

export function Badge({ label, variant = 'gray', className = '', pulse = false }: BadgeProps) {
  const current = styles[variant] ?? styles.gray;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-tight ${current.container} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot} ${
          pulse ? 'animate-pulse' : ''
        }`}
      />
      {label}
    </span>
  );
}
