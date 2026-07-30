import React from 'react';
import { Hourglass, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

function PendingScreen() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl overflow-hidden animate-fade-in-up border border-gray-100">
        <div className="bg-[#1A3A52] p-8 text-center relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#00D9B5]/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 mb-6 shadow-inner">
              {/* Iconița cu Clepsidra, animată să se rotească încet */}
              <Hourglass size={40} className="text-[#00D9B5] animate-[spin_4s_linear_infinite]" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Cont în așteptare</h1>
            <p className="text-[#00D9B5] font-medium tracking-wide uppercase text-sm">Aprobare necesară</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-start gap-4 mb-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="mt-1">
              <ShieldAlert size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Deoarece ai folosit o adresă de email personală, contul tău necesită validare manuală din partea adminului. 
                <br /><br />
                Vei avea acces la aplicație imediat ce identitatea ta este confirmată. Pentru a accelera procesul de confirmare, te rugăm să contactezi administratorul pe adresa de email uniattendancee@gmail.com
              </p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-4 rounded-xl transition-colors border border-gray-200"
          >
            <LogOut size={20} />
            Înapoi la autentificare
          </button>
        </div>
      </div>
    </div>
  );
}

export default PendingScreen;