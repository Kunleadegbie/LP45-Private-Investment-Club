"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getNavigation, type NavItem, type Role } from "@/lib/navigation";
import NotificationBell from "@/components/NotificationBell";

export default function AppShell({
  title,
  subtitle,
  role,
  children,
}: {
  title: string;
  subtitle?: string;
  role: Role;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadNavigation();
  }, [role]);

  async function loadNavigation() {
    if (role === "member") {
      setNavItems(getNavigation("member"));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNavItems([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, admin_role, permissions, status")
      .eq("id", user.id)
      .single();

    setProfile(data);
    setNavItems(getNavigation("admin", data));
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function goTo(href: string) {
    setSidebarOpen(false);
    router.push(href);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        {sidebarOpen && (
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-white/10 bg-slate-900 transition-transform duration-300 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold">LP45 PIC</h1>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
                    {role === "admin" ? "Admin Console" : "Member Portal"}
                  </p>

                  {role === "admin" && profile?.admin_role && (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      {profile.admin_role.replaceAll("_", " ")}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm lg:hidden"
                >
                  ✕
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto p-4">
              {navItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-400">
                  No navigation available.
                </div>
              ) : (
                navItems.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <button
                      key={item.href}
                      onClick={() => goTo(item.href)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                        active
                          ? "bg-emerald-500 text-slate-950"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })
              )}
            </nav>

            <div className="border-t border-white/10 p-4">
              <button
                onClick={logout}
                className="flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold md:text-2xl">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 truncate text-sm text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {role === "member" && <NotificationBell />}

                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/10 lg:hidden"
                >
                  Menu
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-x-hidden p-5 md:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}