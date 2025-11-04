import { TopNav } from '../components/top-nav';
import { AlertsPanel } from '../components/alerts-panel';
import { DebugPanel } from '../components/debug-panel';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopNav />
      <AlertsPanel />
      <DebugPanel />
      <main className="flex-1 pt-16"> {/* Added padding-top for fixed nav */}
        {children}
      </main>
    </div>
  );
}