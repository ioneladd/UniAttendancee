import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../Layout';
import { ArrowLeft } from 'lucide-react';
import { SessionInfoPanel } from '../components/Session/SessionInfoPanel';
import { SessionAttendeesTable } from '../components/Session/SessionAttendeesTable';
import { ManualAddModal } from '../components/Session/ManualAddModal';
import API_BASE_URL, { apiCall, getWebSocketUrl } from '../api.js';
import toast from 'react-hot-toast';

function SessionDetails({ user }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualStudentName, setManualStudentName] = useState('');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [session, setSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [tempNote, setTempNote] = useState('');
  
  const [availableStudents, setAvailableStudents] = useState([]);
  
  const [editingBonusFor, setEditingBonusFor] = useState(null);
  const [tempBonus, setTempBonus] = useState(0);
  
  const [qrToken, setQrToken] = useState('');
  const ROTATION_TIME = 3;
  const [timeLeft, setTimeLeft] = useState(ROTATION_TIME);
  const isSessionActiveRef = useRef(session?.is_active);

  useEffect(() => {
    isSessionActiveRef.current = session?.is_active;
  }, [session?.is_active]);

  // 1. Încărcarea datelor inițiale ale sesiunii
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await apiCall(`/sessions/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setSession(data);
          setQrToken(data.session_token);
          
          if (data.course_type === 'recurring') {
            const studentsRes = await apiCall(`/courses/${data.course_id}/students`);
            if (studentsRes.ok) {
              setAvailableStudents(await studentsRes.json());
            }
          }
        }
      } catch (error) {
        console.error("Eroare la încărcare:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // 2. Fetching și WebSockets (Actualizare în timp real)
  useEffect(() => {
    const fetchAttendees = async () => {
      try {
        const response = await apiCall(`/sessions/${sessionId}/attendees`);
        if (response.ok) {
          const data = await response.json();
          setAttendees(data);
        }
      } catch (error) {
        console.error("Eroare fetching studenți:", error);
      }
    };

    fetchAttendees();

    let ws;
    let isActive = true;

    const openWebSocket = async () => {
      try {
        const url = await getWebSocketUrl(`/sessions/ws/${sessionId}`);
        ws = new WebSocket(url);

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE') {
            fetchAttendees(); 
          } else if (data.type === 'SESSION_CLOSED') {
            setSession(prev => {
              if (prev && prev.is_active) {
                return { ...prev, is_active: false };
              }
              return prev;
            });
          }
        };

        ws.onerror = (error) => console.error('WebSocket Error:', error);

        ws.onclose = (event) => {
          if (isActive && event.code !== 1008) {
            setTimeout(() => { if (isActive) openWebSocket(); }, 2000);
          }
        };
      } catch (error) {
        console.error('Unable to open WebSocket:', error);
      }
    };

    openWebSocket();

    return () => {
      isActive = false;
      if (ws?.readyState === WebSocket.OPEN) ws.close();
    };
  }, [sessionId]);

  // 3. Rotirea Token-ului QR
  useEffect(() => {
    if (!session?.is_active) return;

    const rotateToken = async () => {
      try {
        const response = await apiCall(`/sessions/${sessionId}/rotate`, { method: 'POST' });
        if (response.ok) {
          const data = await response.json();
          setQrToken(data.new_token);
        }
      } catch (error) {
        console.error("Eroare la rotire QR:", error);
      }
    };

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          rotateToken();
          return ROTATION_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.is_active, sessionId]);

  const handleCloseSession = async () => {
    if (!window.confirm('Ești sigur că vrei să închizi această sesiune?')) return;
    
    // Oprim vizual sesiunea instantaneu
    setSession(prev => ({ ...prev, is_active: false }));
    setTimeLeft(0); 

    try {
      const response = await apiCall(`/sessions/${sessionId}/close`, { method: 'POST' });
      if (response.ok) {
        toast.success("Sesiune închisă cu succes!", { id: 'manual-close' });
        // Opțional: re-fetch pentru a sincroniza cu serverul
        const fetchResponse = await apiCall(`/sessions/${sessionId}`);
        if (fetchResponse.ok) {
            const data = await fetchResponse.json();
            setSession(data);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredAttendees = attendees.filter(student => 
    student.name.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  const handleAddManualStudent = async (studentName) => {
    if (!studentName || typeof studentName !== 'string' || !studentName.trim()) return;
    
    setIsAddingManual(true);
    try {
      const response = await apiCall(`/sessions/${sessionId}/attendees/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setAttendees(prev => [{ name: data.name, scanned_at: data.scanned_at }, ...prev]);
        setSearchTerm(''); 
        setManualStudentName(''); 
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Eroare la adăugarea manuală.');
      }
    } catch (error) {
      console.error(error);
      alert('Eroare de rețea.');
    } finally {
      setIsAddingManual(false);
    }
  };

  const handleRemoveStudent = async (studentName) => {
    if (!window.confirm(`Ești sigur că vrei să anulezi prezența pentru ${studentName}?`)) return;
    
    try {
      const response = await apiCall(`/sessions/${sessionId}/attendees/${encodeURIComponent(studentName)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAttendees(prev => prev.filter(student => student.name !== studentName));
      } else {
        alert('Eroare la anularea prezenței.');
      }
    } catch (error) {
      console.error(error);
      alert('Eroare de rețea.');
    }
  };

  const handleSaveNote = async (studentName) => {
    try {
      const response = await apiCall(`/sessions/${sessionId}/attendees/${encodeURIComponent(studentName)}/notes`, {
        method: 'PATCH',
        body: JSON.stringify({ notes: tempNote })
      });

      if (response.ok) {
        setAttendees(prev => prev.map(student => 
          student.name === studentName ? { ...student, notes: tempNote } : student
        ));
        setEditingNoteFor(null); 
      } else {
        alert('Eroare la salvarea observației.');
      }
    } catch (error) {
      console.error(error);
      alert('Eroare de rețea.');
    }
  };

  const handleReopenSession = async () => {
    if (!window.confirm('Ești sigur că vrei să redeschizi această sesiune?')) return;
    try {
      const response = await apiCall(`/sessions/${sessionId}/reopen`, { method: 'POST' });
      if (response.ok) {
        setSession(prev => ({ ...prev, is_active: true }));
        toast.success("Sesiunea a fost redeschisă!");
      } else {
        toast.error("Eroare la redeschidere.");
      }
    } catch (error) { 
      toast.error("Eroare de rețea."); 
    }
  };

  const handleDeleteSession = async () => {
    if (!window.confirm('Ești sigur că vrei să ștergi definitiv această sesiune? Acțiunea este ireversibilă!')) return;
    try {
      const response = await apiCall(`/sessions/${sessionId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success("Sesiunea a fost ștearsă!");
        navigate(`/course/${session.course_id}`); 
      } else {
        toast.error("Eroare la ștergere.");
      }
    } catch (error) { 
      toast.error("Eroare de rețea."); 
    }
  };

  const handleSaveBonus = async (studentName) => {
    const student = attendees.find(a => a.name === studentName);
    if (!student) return;

    const rawBonus = typeof tempBonus === 'string' ? tempBonus.trim() : String(tempBonus).trim();

    if (rawBonus === '') {
      toast.error('Te rugăm să introduci o valoare pentru bonificație.');
      return;
    }

    const numericBonus = Number(rawBonus);

    if (!Number.isFinite(numericBonus)) {
      toast.error('Te rugăm să introduci doar un număr valid pentru bonificație.');
      return;
    }

    if (numericBonus < -5 || numericBonus > 10) {
      toast.error('Bonificatia a fost introdusa gresit. Interval de bonificatii:-5,10');
      return;
    }

    try {
      const response = await apiCall(`/sessions/attendance/${student.attendance_id}/bonus?points=${numericBonus}`, {
        method: 'PATCH'
      });

      if (!response.ok) throw new Error('Eroare la salvare');
      
      toast.success(`Bonificație salvată pentru ${studentName}`);
      
      setAttendees(prev => prev.map(a => 
        a.name === studentName ? { ...a, bonus_points: numericBonus } : a
      ));
      
      setEditingBonusFor(null);
      
    } catch (error) {
      console.error(error);
      toast.error('Nu am putut intra în contact cu serverul.');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9B5]"></div>
    </div>
  );

  if (!session) return <div className="p-8 text-center text-red-500">Sesiunea nu a fost găsită.</div>;

  const dateObj = new Date(session.scheduled_for);
  const dateStr = dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  return (
    <Layout user={user} role="professor">
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={() => navigate(`/course/${session.course_id}`)}
          className="flex items-center text-gray-500 hover:text-[#1A3A52] transition-colors group"
        >
          <ArrowLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" />
          Înapoi la curs
        </button>
        
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2 ${session.is_active ? 'bg-[#00D9B5]/10 text-[#00D9B5]' : 'bg-gray-200 text-gray-500'}`}>
          {session.is_active && <div className="w-2 h-2 rounded-full bg-[#00D9B5] animate-pulse"></div>}
          {session.is_active ? 'Sesiune activă' : 'Sesiune închisă'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <SessionInfoPanel 
            session={session}
            dateStr={dateStr}
            timeStr={timeStr}
            qrToken={qrToken}
            timeLeft={timeLeft}
            rotationTime={ROTATION_TIME}
            onCloseSession={handleCloseSession}
            onReopenSession={handleReopenSession}  
            onDeleteSession={handleDeleteSession}
          />
        </div>

        <div className="lg:col-span-2">
          <SessionAttendeesTable 
            attendees={attendees}
            filteredAttendees={filteredAttendees}
            attendeeSearch={attendeeSearch}
            setAttendeeSearch={setAttendeeSearch}
            onShowManualAdd={() => setShowManualAdd(true)}
            editingNoteFor={editingNoteFor}
            setEditingNoteFor={setEditingNoteFor}
            tempNote={tempNote}
            setTempNote={setTempNote}
            onSaveNote={handleSaveNote}
            onRemoveStudent={handleRemoveStudent}
            editingBonusFor={editingBonusFor}
            setEditingBonusFor={setEditingBonusFor}
            tempBonus={tempBonus}
            setTempBonus={setTempBonus}
            onSaveBonus={handleSaveBonus}
          />
        </div>
      </div>

      <ManualAddModal 
        isOpen={showManualAdd}
        onClose={() => {
          setShowManualAdd(false);
          setSearchTerm(''); 
          setManualStudentName('');
        }}
        sessionType={session?.course_type}
        manualStudentName={manualStudentName}
        setManualStudentName={setManualStudentName}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isAddingManual={isAddingManual}
        onAddManualStudent={handleAddManualStudent}
        availableStudents={availableStudents}
        attendees={attendees}
      />
    </Layout>
  );
}

export default SessionDetails;