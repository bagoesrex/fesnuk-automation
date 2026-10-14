interface BadgeProps {
  label: string;
  variant?: 'green' | 'red' | 'yellow' | 'gray' | 'blue';
}

const variants = {
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-800',
};

export function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  );
}
