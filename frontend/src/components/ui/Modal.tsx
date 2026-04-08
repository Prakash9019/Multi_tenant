import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-blue-950/30 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClasses[size]} overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl transition-all duration-200 animate-[modal-in_180ms_ease-out]`}
      >
        <div className="border-b border-blue-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-950">{title}</h2>
              {description ? <p className="mt-1 text-sm text-blue-700/70">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-blue-100 p-2 text-blue-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="block text-xs font-semibold">Close</span>
            </button>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="border-t border-blue-100 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
