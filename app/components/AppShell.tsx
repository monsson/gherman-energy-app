import { Link, NavLink, useNavigate } from "react-router";
import { LogoWordmark } from "./Logo";
import { logout, type Session } from "~/lib/auth";

type NavItem = { to: string; label: string; icon: React.ReactNode };

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  ),
  cars: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M5 17h14M6 17v2M18 17v2" />
      <path d="M5 17l1.5-5.5A2 2 0 0 1 8.4 10h7.2a2 2 0 0 1 1.9 1.5L19 17" />
      <circle cx="8" cy="17" r="1.5" />
      <circle cx="16" cy="17" r="1.5" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" />
    </svg>
  ),
};

const MANAGER_NAV: NavItem[] = [
  { to: "/manager", label: "Acasă", icon: ICONS.home },
  { to: "/manager/cars", label: "Mașini", icon: ICONS.cars },
  { to: "/manager/transactions", label: "Tranzacții", icon: ICONS.list },
];

const DRIVER_NAV: NavItem[] = [
  { to: "/driver", label: "Acasă", icon: ICONS.home },
];

export function AppShell({
  session,
  title,
  back,
  children,
}: {
  session: Session;
  title: string;
  back?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const items = session.role === "manager" ? MANAGER_NAV : DRIVER_NAV;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 pb-20">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-700 to-brand-600 text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {back ? (
            <Link
              to={back}
              className="-ml-1 p-2 rounded-lg hover:bg-white/10 active:bg-white/20"
              aria-label="Înapoi"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
          ) : (
            <LogoWordmark tone="light" />
          )}
          <div className="flex-1">
            {back && <h1 className="text-lg font-bold">{title}</h1>}
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="text-xs uppercase tracking-wide font-semibold px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
          >
            Ieșire
          </button>
        </div>
        {!back && (
          <div className="max-w-3xl mx-auto px-4 pb-4">
            <h1 className="text-2xl font-extrabold">{title}</h1>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto flex justify-around">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end
              className={({ isActive }) =>
                `flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium ${
                  isActive ? "text-brand-700" : "text-slate-500"
                }`
              }
            >
              {it.icon}
              {it.label}
            </NavLink>
          ))}
          <div className="flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium text-slate-500">
            {ICONS.user}
            {session.username}
          </div>
        </div>
      </nav>
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>
      {children}
    </div>
  );
}
