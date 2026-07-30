import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfessorDashboard from './ProfessorDashboard';
import StudentDashboard from './StudentDashboard';
import PendingScreen from './PendingScreen';
import { UserManagement } from './UserManagement';
import { Layout } from '../Layout';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Bot, UserCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import API_BASE_URL, { apiCall, getWebSocketUrl } from '../api.js';

function Dashboard() {
  const { user, loading, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const lastRoleNotificationRef = useRef({ role: null, ts: 0 });
  const [needsName, setNeedsName] = useState(false);
  const [roleVerified, setRoleVerified] = useState(false);
  
  const getRoleDisplayName = (role) => {
    switch ((role || '').toLowerCase()) {
      case 'professor':
        return 'Profesor';
      case 'student':
        return 'Student';
      case 'pending':
        return 'În așteptare';
      case 'rejected':
        return 'Respins';
      case 'guest':
        return 'Vizitator';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNeedsName(!user.name);
  }, [user]);

  useEffect(() => {
    if (!user?.email) {
      setRoleVerified(true);
      return;
    }

    let isMounted = true;
    setRoleVerified(false);

    apiCall(`/auth/check-status?email=${encodeURIComponent(user.email)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Verificare status eșuată');
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data?.role) {
          if (data.role === 'rejected') {
            handleLogout();
            return;
          }

          if (data.role !== user.role) {
            const updatedUser = { ...user, role: data.role };
            updateUser(updatedUser);
          }
        }
      })
      .catch((err) => {
        console.error('Verificare status eșuată:', err);
        handleLogout();
      })
      .finally(() => {
        if (isMounted) {
          setRoleVerified(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error('Te rog să introduci un nume valid.');

    setSavingName(true);
    try {
      const response = await apiCall(`/users/${user.id}/name`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName.trim() })
      });

      if (response.ok) {
        const updatedUser = { ...user, name: newName.trim() };
        updateUser(updatedUser);
        setNeedsName(false);
        toast.success('Profil completat cu succes!');
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Eroare la salvarea numelui.');
      }
    } catch (error) {
      toast.error('Eroare de conexiune la server.');
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    let ws;
    let isActive = true;

    const openWebSocket = async () => {
      try {
        const url = await getWebSocketUrl(`/ws/user/${user.id}`);
        ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('User WebSocket connected for user', user.id);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'ROLE_UPDATED') {
            if (data.role === 'rejected') {
              toast.error('Rolul tău a fost respins. Te deconectăm.');
              handleLogout();
              return;
            }

            // Dedupe rapid: dacă am afișat deja aceeași notificare în ultimele 3s, ignorăm
            try {
              const now = Date.now();
              const last = lastRoleNotificationRef.current || { role: null, ts: 0 };
              if (last.role === data.role && (now - last.ts) < 3000) {
                return;
              }
              lastRoleNotificationRef.current = { role: data.role, ts: now };
            } catch (e) {
              // ignore
            }

            const updatedUser = { ...user, role: data.role };
            updateUser(updatedUser);
            toast.success(`Rol actualizat la: ${getRoleDisplayName(data.role)}`);
          }
        };

        ws.onerror = (error) => {
          console.error('User WebSocket error:', error);
        };

        ws.onclose = (event) => {
          console.log('User WebSocket closed', event.code, event.reason);
          if (isActive && event.code !== 1008) {
            setTimeout(() => {
              if (isActive) openWebSocket();
            }, 2000);
          }
        };
      } catch (error) {
        console.error('Unable to open User WebSocket:', error);
      }
    };

    openWebSocket();

    return () => {
      isActive = false;
      if (ws?.readyState === 1) ws.close();
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9B5]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!roleVerified) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9B5]"></div>
      </div>
    );
  }

  const userRole = user.role;

  // --- ECRANUL DE COMPLETARE A NUMELUI (apare doar dacă needsName e true) ---
  if (needsName) {
    return (
      <div className="min-h-screen bg-[#1A3A52] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative overflow-hidden animate-fade-in-up">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#00D9B5] opacity-10 rounded-full blur-xl"></div>
          
          <div className="text-center mb-8">
            <div className="bg-[#1A3A52] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Bot size={32} className="text-[#00D9B5]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A3A52] mb-2">Bun venit! 👋</h1>
            <p className="text-gray-500">Se pare că ești la prima conectare. Cum ai vrea să te strigăm?</p>
          </div>

          <form onSubmit={handleSaveName} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <UserCircle size={18} className="text-[#00D9B5]"/>
                Numele și prenumele
              </label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00D9B5]/20 focus:border-[#00D9B5] transition-all bg-gray-50 focus:bg-white"
                placeholder="Ex: Popescu Ion"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={savingName}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl shadow-md text-sm font-bold text-[#1A3A52] bg-[#00D9B5] hover:bg-[#00c2a3] focus:outline-none transition-colors disabled:opacity-50"
            >
              {savingName ? "Se salvează..." : "Continuă către aplicație"}
              {!savingName && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- LOGICA DE RUTARE NORMALĂ ---
  if (userRole === 'pending') {
    return <PendingScreen />;
  }

  return (
    <Layout user={user} role={userRole} onLogout={handleLogout}>
      {userRole === 'admin' ? (
        <UserManagement />
      ) : userRole === 'professor' ? (
        <ProfessorDashboard user={user} />
      ) : (
        <StudentDashboard user={user} />
      )}
    </Layout>
  );
}

export default Dashboard;