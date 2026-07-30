import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, LogOut, LayoutDashboard, UserCircle, Menu, X, Settings, BarChart3 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext.jsx';

export function Layout({ children, user, role, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      if (typeof onLogout === 'function') {
        await onLogout();
      }
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error("Eroare la deconectare:", error);
      window.location.href = '/';
    }
  };

  // Definim elementele meniului dinamic (Statistici dispare pentru admin)
  const menuItems = [
    { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Pagină principală' },
    // Adăugăm statistici DOAR dacă utilizatorul NU este admin
    ...(role !== 'admin' ? [{ path: '/statistics', icon: <BarChart3 size={20} />, label: 'Statistici' }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex relative">
      
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
        ></div>
      )}

      <aside className={`
        fixed h-full bg-[#1A3A52] text-white flex flex-col shadow-xl z-50 transition-transform duration-300 ease-in-out w-64
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 md:flex
      `}>
        
        <div className="p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg shrink-0">
              <Bot className="text-[#00D9B5]" size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg tracking-wide truncate">UniAttendance</h1>
              <span className="text-xs text-[#00D9B5] uppercase font-medium tracking-wider">
                {role === 'admin' ? 'Admin' : role === 'professor' ? 'Profesor' : 'Student'}
              </span>
            </div>
          </div>
          <button 
            className="md:hidden text-gray-300 hover:text-white shrink-0 ml-3 mt-1 transition-colors" 
            onClick={closeMobileMenu}
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  closeMobileMenu(); 
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive 
                    ? 'bg-[#00D9B5] text-white shadow-lg shadow-[#00D9B5]/20' 
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
            ) : (
              <UserCircle size={20} className="text-gray-400" />
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name || user?.displayName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-300 hover:text-red-100 hover:bg-white/5 rounded-lg transition-colors text-sm"
          >
            <LogOut size={18} />
            <span>Deconectare</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        
        <header className={`md:hidden sticky top-4 flex justify-between items-center mb-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-sm transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 pointer-events-none -z-10' : 'opacity-100 z-30'}`}>
           <div className="flex items-center gap-2">
             <Bot className="text-[#1A3A52]" />
             <span className="font-bold text-[#1A3A52]">UniAttendance</span>
           </div>
           
           <div className="flex items-center gap-4">
               <button onClick={() => setIsMobileMenuOpen(true)} className="text-[#1A3A52] hover:text-[#00D9B5]">
                   <Menu size={24} />
               </button>
           </div>
        </header>

        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}