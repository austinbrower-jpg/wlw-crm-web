"use client";
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import {
  X,
  Search,
  ArrowUpRight,
  Building2,
  UserRound,
  Handshake,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import { initials, type Kind, type Stage } from "@/lib/domain";
export function Button({
  children,
  className = "",
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  icon: Icon,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      <Icon size={18} />
    </button>
  );
}
export function Avatar({
  name,
  color = 0,
  small = false,
}: {
  name: string;
  color?: number;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar avatar-${color % 6} ${small ? "small" : ""}`}
    >
      {initials(name)}
    </span>
  );
}
export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`badge stage-${stage.toLowerCase()}`}>
      <span className="dot" />
      {stage}
    </span>
  );
}
export const kindIcons: Record<Kind, LucideIcon> = {
  company: Building2,
  contact: UserRound,
  deal: Handshake,
  task: CheckSquare,
};
export function RecordIcon({ kind }: { kind: Kind }) {
  const Icon = kindIcons[kind];
  return <Icon size={16} />;
}
export function Empty({
  title = "A clean slate.",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Search size={24} />
      </span>
      <h3>{title}</h3>
      <p>{children ?? "Try changing your search or filters."}</p>
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  drawer = false,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement as HTMLElement;
    element?.showModal();
    element?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
          ) ?? [],
        ).filter((el) => el.offsetParent !== null);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (!first) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      aria-labelledby={id}
      className={`${drawer ? "drawer" : "modal"} ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <IconButton icon={X} label="Close dialog" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button aria-label="Clear search" onClick={() => onChange("")}>
          <X size={15} />
        </button>
      )}
    </label>
  );
}
export function ArrowLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
