// app/dashboard/layout.tsx
import { DashboardNav } from '../components/dashboard-nav';
import { ThemeToggle } from '../components/theme-toggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <DashboardNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}