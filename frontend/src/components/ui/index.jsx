import * as React from 'react';
import { cn } from '../../lib/utils';

// ─── Button ────────────────────────────────────────────
const buttonVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};
const buttonSizes = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-10 px-8',
  icon: 'h-9 w-9',
};

export const Button = React.forwardRef(({
  className, variant = 'default', size = 'default', children, loading, ...props
}, ref) => (
  <button
    ref={ref}
    disabled={loading || props.disabled}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
      buttonVariants[variant],
      buttonSizes[size],
      className
    )}
    {...props}
  >
    {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
    {children}
  </button>
));
Button.displayName = 'Button';

// ─── Badge ─────────────────────────────────────────────
export const Badge = ({ className, variant = 'default', children, ...props }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input text-foreground',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant] || variant,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// ─── Input ─────────────────────────────────────────────
export const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

// ─── Textarea ──────────────────────────────────────────
export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

// ─── Label ─────────────────────────────────────────────
export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
));
Label.displayName = 'Label';

// ─── Card ──────────────────────────────────────────────
export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

// ─── Separator ─────────────────────────────────────────
export const Separator = ({ className, orientation = 'horizontal', ...props }) => (
  <div
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )}
    {...props}
  />
);

// ─── Spinner ───────────────────────────────────────────
export const Spinner = ({ className, size = 'default' }) => {
  const sizes = { sm: 'h-4 w-4', default: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <span className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', sizes[size], className)} />
  );
};

// ─── Avatar ────────────────────────────────────────────
export const Avatar = ({ src, name, size = 'default', className }) => {
  const sizes = { sm: 'h-7 w-7 text-xs', default: 'h-8 w-8 text-sm', lg: 'h-10 w-10 text-base', xl: 'h-14 w-14 text-xl' };
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div className={cn('relative flex shrink-0 overflow-hidden rounded-full', sizes[size], className)}>
      {src ? (
        <img src={src} alt={name} className="aspect-square h-full w-full object-cover" />
      ) : (
        <div className={cn('flex h-full w-full items-center justify-center text-white font-semibold', colors[colorIdx])}>
          {initials}
        </div>
      )}
    </div>
  );
};

// ─── Select ────────────────────────────────────────────
export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

// ─── Skeleton ──────────────────────────────────────────
export const Skeleton = ({ className, ...props }) => (
  <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
);

// ─── Progress ──────────────────────────────────────────
export const Progress = ({ value = 0, className }) => (
  <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
    <div
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// ─── Switch ────────────────────────────────────────────
export const Switch = ({ checked, onChange, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange?.(!checked)}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      checked ? 'bg-primary' : 'bg-input',
      className
    )}
  >
    <span className={cn('pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
  </button>
);

// ─── Checkbox ──────────────────────────────────────────
export const Checkbox = React.forwardRef(({ className, checked, onChange, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={() => onChange?.(!checked)}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors',
      checked ? 'bg-primary text-primary-foreground' : 'bg-background',
      className
    )}
    {...props}
  >
    {checked && (
      <svg className="h-3 w-3 m-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )}
  </button>
));
Checkbox.displayName = 'Checkbox';

// ─── Empty State ───────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
    <h3 className="text-lg font-semibold mb-1">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
);

// ─── Tabs ──────────────────────────────────────────────
export const TabsBar = ({ tabs, activeTab, onChange, className }) => (
  <div className={cn('flex border-b border-border', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.value}
        onClick={() => onChange(tab.value)}
        className={cn(
          'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
          activeTab === tab.value
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )}
      >
        {tab.label}
        {tab.count !== undefined && (
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{tab.count}</span>
        )}
      </button>
    ))}
  </div>
);

// ─── Tooltip ───────────────────────────────────────────
export const Tooltip = ({ content, children, side = 'top' }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && content && (
        <div className={cn(
          'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none',
          side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-1',
          side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-1',
          side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-1',
          side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-1',
        )}>
          {content}
        </div>
      )}
    </div>
  );
};

// ─── Dropdown Menu ─────────────────────────────────────
export const DropdownMenu = ({ trigger, items, align = 'right' }) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className={cn(
          'absolute z-50 mt-1 min-w-[160px] rounded-md border bg-popover shadow-md animate-fade-in',
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} className="my-1 h-px bg-border" />
            ) : (
              <button
                key={i}
                onClick={() => { item.onClick?.(); setOpen(false); }}
                disabled={item.disabled}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent',
                  item.destructive && 'text-destructive hover:text-destructive',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ─── Modal ─────────────────────────────────────────────
export const Modal = ({ open, onClose, title, description, children, size = 'default', className }) => {
  const sizes = { sm: 'max-w-sm', default: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-full mx-4' };

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) {
      document.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative z-50 w-full rounded-xl border bg-background shadow-2xl animate-fade-in',
        sizes[size],
        className
      )}>
        {(title || description) && (
          <div className="flex items-start justify-between p-6 pb-4">
            <div>
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity ml-4">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className={cn('px-6 pb-6', !title && !description && 'pt-6')}>{children}</div>
      </div>
    </div>
  );
};

// ─── FormField ─────────────────────────────────────────
export const FormField = ({ label, error, required, children, className }) => (
  <div className={cn('space-y-1.5', className)}>
    {label && (
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
    )}
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

// ─── Table ─────────────────────────────────────────────
export const Table = ({ columns, data, loading, emptyMessage = 'No data found', onRowClick, className }) => (
  <div className={cn('overflow-auto rounded-lg border', className)}>
    <table className="w-full text-sm">
      <thead className="border-b bg-muted/50">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className={cn('px-4 py-3 text-left font-medium text-muted-foreground', col.className)}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))
        ) : data?.length > 0 ? (
          data.map((row, i) => (
            <tr
              key={row._id || i}
              onClick={() => onRowClick?.(row)}
              className={cn('border-b transition-colors hover:bg-muted/50', onRowClick && 'cursor-pointer')}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3', col.cellClassName)}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

// ─── Pagination ────────────────────────────────────────
export const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
        return p <= totalPages ? (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => onChange(p)}>{p}</Button>
        ) : null;
      })}
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
};

// ─── Compound Tabs (TabsList / TabsTrigger / TabsContent) ──────────────────
import { createContext, useContext } from 'react'

const TabsContext = createContext({ value: '', onValueChange: () => {} })

export function TabsRoot({ value, onValueChange, className, children }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }) {
  return (
    <div className={cn('flex items-center gap-1 rounded-lg bg-muted p-1', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children }) {
  const { value: active, onValueChange } = useContext(TabsContext)
  return (
    <button
      onClick={() => onValueChange(value)}
      className={cn(
        'flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        active === value
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }) {
  const { value: active } = useContext(TabsContext)
  if (active !== value) return null
  return <div className={className}>{children}</div>
}

// Compound Tabs wrapper that wires context
export { TabsRoot as TabsCompound }

// Unified <Tabs value onValueChange> compound root (replaces prop-based Tabs for new pages)
export function Tabs({ value, onValueChange, className, children }) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}
