import { useState, useEffect, useRef } from 'react';
import { Users, Search, ShieldCheck, ShieldAlert, Mail, Filter, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import API_BASE_URL, { apiCall, getWebSocketUrl } from '../api.js';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  const notifiedUsersRef = useRef(new Set());

  useEffect(() => {
    fetchUsers();

    let ws;
    let isActive = true;

    const openWebSocket = async () => {
      try {
        const url = await getWebSocketUrl('/ws/admin');
        ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('Admin WebSocket connected');
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_USER') {
            const userId = data.user.id;
            
            if (notifiedUsersRef.current.has(userId)) {
              return;
            }
            
            notifiedUsersRef.current.add(userId);

            setUsers((prevUsers) => {
              if (prevUsers.find(u => u.id === userId)) return prevUsers;
              return [data.user, ...prevUsers];
            });
            
            toast.success(`Utilizator nou înregistrat: ${data.user.email}`, { icon: '🔔', duration: 4000 });
          }
        };

        ws.onerror = (error) => {
          console.error("Eroare WebSocket:", error);
        };

        ws.onclose = (event) => {
          console.log('Admin WebSocket closed', event.code, event.reason);
          if (isActive && event.code !== 1008) {
            setTimeout(() => {
              if (isActive) openWebSocket();
            }, 2000);
          }
        };
      } catch (error) {
        console.error('Unable to open Admin WebSocket:', error);
      }
    };

    openWebSocket();

    return () => {
      isActive = false;
      ws?.close();
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiCall('/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.sort((a, b) => b.id - a.id));
      } else {
        toast.error('Eroare la încărcarea utilizatorilor');
      }
    } catch (error) {
      toast.error('Eroare de conexiune la server');
      console.error('fetchUsers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await apiCall(`/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        toast.success('Rol actualizat cu succes!');
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Eroare la actualizarea rolului');
      }
    } catch (error) {
      toast.error('Eroare de conexiune la server');
      console.error('handleRoleChange error:', error);
    }
  };

  const isOfficialEmail = (email) => {
    if (!email) return false;
    const domain = email.split('@')[1]?.toLowerCase();
    return !['gmail.com', 'yahoo.com'].includes(domain);
  };

  const isGuestAccount = (user) => {
    return user.role === 'guest' || (user.email && user.email.toLowerCase().includes('guest'));
  };
  // Înlocuiește sau adaugă această funcție
  const isProtectedAccount = (user) => {
    // Este protejat dacă este admin SAU dacă are email instituțional
    const hasOfficialEmail = isOfficialEmail(user.email);
    const isAdmin = user.role === 'admin';
    
    return isAdmin || hasOfficialEmail;
  };
  const getRoleDisplayName = (role) => {
    const rolesMap = {
      'admin': 'Admin',
      'professor': 'Profesor',
      'student': 'Student',
      'pending': 'În așteptare',
      'rejected': 'Respins',
      'guest': 'Vizitator'
    };
    return rolesMap[role] || role;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const renderStatusBadge = (role) => (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider
      ${role === 'professor' ? 'bg-purple-100 text-purple-700' : ''}
      ${role === 'student' ? 'bg-[#00D9B5]/10 text-[#00D9B5]' : ''}
      ${role === 'pending' ? 'bg-orange-100 text-orange-600' : ''}
      ${role === 'rejected' ? 'bg-red-100 text-red-600' : ''}
      ${role === 'guest' ? 'bg-gray-100 text-gray-600' : ''}
    `}>
      {role === 'pending' && <ShieldAlert size={12} className="mr-1" />}
      {getRoleDisplayName(role)}
    </span>
  );

  const renderAction = (u, isGuest, isProtected) => {
    if (isGuest) {
      return (
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 font-medium bg-gray-50 py-2.5 rounded-lg border border-gray-100 w-full text-center">
          <UserX size={14} className="shrink-0" />
          <span className="truncate">Cont vizitator</span>
        </div>
      );
    }
    if (isProtected) {
      // Determinăm textul în funcție de rol
      const labelText = u.role === 'admin' ? 'Cont administrator' : 'Cont instituțional';
      const titleText = u.role === 'admin' ? 'Cont Administrator Securizat' : 'Cont Instituțional Securizat';

      return (
        <div className="flex items-center justify-center gap-1 text-xs text-[#00D9B5] font-medium bg-[#00D9B5]/5 py-2.5 rounded-lg border border-[#00D9B5]/20 w-full text-center" title={titleText}>
          <ShieldCheck size={14} className="shrink-0" />
          <span className="truncate">{labelText}</span>
        </div>
      );
    }
    return (
      <select
        value={u.role}
        onChange={(e) => handleRoleChange(u.id, e.target.value)}
        className="w-full bg-white border border-gray-200 text-sm font-medium rounded-lg p-2 outline-none transition-all cursor-pointer text-gray-700 focus:ring-[#00D9B5] focus:border-[#00D9B5]"
      >
        <option value="pending">În așteptare</option>
        <option value="student">Student</option>
        <option value="professor">Profesor</option>
        <option value="rejected">Respins</option>
      </select>
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1A3A52] flex items-center gap-3">
            <Users className="text-[#00D9B5]" size={28} />
            Gestionare utilizatori
          </h1>
          <p className="text-gray-500 mt-2 text-sm lg:text-base">Aprobă conturile în așteptare și gestionează permisiunile.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Caută utilizator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#00D9B5] outline-none w-full bg-white shadow-sm text-sm"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#00D9B5] outline-none w-full bg-white shadow-sm text-sm appearance-none cursor-pointer"
            >
              <option value="all">Toate rolurile</option>
              <option value="pending">În așteptare</option>
              <option value="student">Studenți</option>
              <option value="professor">Profesori</option>
              <option value="guest">Vizitatori</option>
              <option value="rejected">Respinși</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00D9B5] mb-4"></div>
            Se încarcă lista...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nu am găsit niciun utilizator conform filtrelor.
          </div>
        ) : (
          <>
            {/* Desktop Table View (Apare doar pe ecrane mari > 1024px) */}
            <div className="hidden lg:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                    <th className="p-4 font-bold pl-6">Utilizator</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold text-center">Status / Rol</th>
                    <th className="p-4 font-bold text-center pr-6 w-56">Acțiuni Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => {
                    const isGuest = isGuestAccount(u);
                    const isProtected = isProtectedAccount(u); // Folosim noua funcție aici
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="font-bold text-[#1A3A52] whitespace-nowrap">{u.name || u.email.split('@')[0]}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-gray-600 whitespace-nowrap">
                            <Mail size={14} className="text-gray-400 shrink-0" />
                            {u.email}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {renderStatusBadge(u.role)}
                        </td>
                        <td className="p-4 pr-6">
                          {renderAction(u, isGuest, isProtected)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Cards View (Apare pe ecrane medii și mici < 1024px) */}
            <div className="lg:hidden flex flex-col divide-y divide-gray-100">
              {filteredUsers.map((u) => {
                const isGuest = isGuestAccount(u);
                const isProtected = isProtectedAccount(u);
                return (
                  <div key={u.id} className="p-4 flex flex-row items-center justify-between gap-3">
                    
                    {/* Partea Stângă: Info utilizator + Badge */}
                    <div className="min-w-0 flex-1 flex flex-col items-start gap-1">
                      <div className="font-bold text-[#1A3A52] truncate w-full">{u.name || u.email.split('@')[0]}</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate w-full">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="mt-1">{renderStatusBadge(u.role)}</div>
                    </div>
                    
                    {/* Partea Dreaptă: Dropdown-ul de acțiuni */}
                    <div className="shrink-0 w-36">
                      {renderAction(u, isGuest, isProtected)}
                    </div>

                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}