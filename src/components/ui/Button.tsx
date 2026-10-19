import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "outline";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-strong text-white hover:brightness-115 active:brightness-95 shadow-[0_8px_30px_-12px_var(--brand-strong)]",
  secondary: "bg-soft text-fg border border-line hover:border-brand/60",
  ghost: "bg-transparent text-muted hover:bg-soft hover:text-fg",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
  accent:
    "bg-accent text-black hover:brightness-110 active:brightness-95 shadow-[0_8px_30px_-12px_var(--accent)]",
  outline: "border border-line text-fg hover:border-brand hover:text-brand",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-13 px-7 text-base rounded-xl gap-2.5",
  xl: "h-16 px-9 text-lg rounded-2xl gap-3",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = CommonProps & { href: string } & Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "children" | "href"
  >;

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(
    "inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-150 select-none disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if ("href" in props && props.href) {
    const { href, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, href: _h, ...rest } =
    props as ButtonAsButton;
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
