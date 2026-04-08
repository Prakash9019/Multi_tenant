interface AvatarProps {
  email?: string;
  className?: string;
}

export default function Avatar({ email, className = '' }: AvatarProps) {
  const letter = (email?.trim().charAt(0) || '?').toUpperCase();

  return (
    <div
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-blue-600 text-sm font-semibold text-white shadow-sm ${className}`.trim()}
      aria-label={email ? `User avatar for ${email}` : 'User avatar'}
    >
      {letter}
    </div>
  );
}
