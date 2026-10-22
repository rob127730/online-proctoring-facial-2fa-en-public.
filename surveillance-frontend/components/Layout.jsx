import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getAuth, logout, isAdmin } from '../lib/auth';
import { getAdminDashboard } from '../lib/api';
import { LayoutDashboard, Users, Monitor, LogOut, Menu, X, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export default function Layout({ children }) {
  const router = useRouter();
  const [auth, setAuth] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    const authData = getAuth();
    setAuth(authData);

    // Charger le nombre de comptes en attente si admin
    if (authData?.role === 'admin') {
      getAdminDashboard()
        .then((data) => setPendingCount(data.pending_accounts || 0))
        .catch(() => {});
    }
  }, [router.pathname]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted) {
    return <div className="min-h-screen bg-dark-900">{children}</div>;
  }

  const noLayoutPages = ['/login', '/setup', '/register'];
  if (noLayoutPages.includes(router.pathname) || !auth?.token) {
    return <div className="min-h-screen bg-dark-900">{children}</div>;
  }

  const adminRole = auth.role === 'admin';

  const adminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Utilisateurs', path: '/admin/users', icon: Users },
    {
      name: 'Validations',
      path: '/admin/validations',
      icon: ClipboardList,
      badge: pendingCount > 0 ? pendingCount : null,
    },
  ];

  const studentNav = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Surveillance', path: '/student/monitoring', icon: Monitor },
  ];

  const navigation = adminRole ? adminNav : studentNav;

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <Monitor size={20} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Surveillance {adminRole ? 'Admin' : 'Étudiant'}
                </h1>
                <p className="text-xs text-gray-400">{auth.matricule}</p>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`relative flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-900 text-white'
                        : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-1 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-md text-sm transition-colors ml-4"
              >
                <LogOut size={18} />
                <span>Déconnexion</span>
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:bg-dark-700 hover:text-white"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-dark-700 border-t border-dark-600">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-blue-900 text-white'
                        : 'text-gray-300 hover:bg-dark-600 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon size={20} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-3 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-md text-sm"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-dark-800 border-t border-dark-600 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-400 text-sm">
            Système de Surveillance en Ligne © 2025
          </p>
        </div>
      </footer>
    </div>
  );
}