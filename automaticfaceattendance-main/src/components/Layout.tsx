import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Users, 
  LayoutDashboard, 
  ClipboardList,
  Scan,
  GraduationCap,
  BookOpen,
  LogOut,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Employees Check In', href: '/checkin', icon: Scan, section: 'Employees' },
  { name: 'Employees', href: '/employees', icon: Users, adminOnly: true },
  { name: 'Employees Attendance', href: '/attendance', icon: ClipboardList },
  { name: 'Student Check In', href: '/student-checkin', icon: BookOpen, section: 'Students' },
  { name: 'Students', href: '/students', icon: GraduationCap, adminOnly: true },
  { name: 'Student Attendance', href: '/student-attendance', icon: ClipboardList },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary">
              <Camera className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-sidebar-foreground">FaceAttend</h1>
              <p className="text-xs text-sidebar-foreground/60">Smart Attendance</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {item.adminOnly && (
                    <Shield className="h-3 w-3 ml-auto text-sidebar-foreground/50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          {user && (
            <div className="border-t border-sidebar-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-sidebar-foreground">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.email}
                  </p>
                  {isAdmin && (
                    <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Admin
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
