import { useState, useEffect } from 'react';
import { Plus, BookOpen, Camera, Star, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { JoinCourseModal } from '../components/Student/JoinCourseModal';
import { StudentCourseCard } from '../components/Student/StudentCourseCard';
import { QRScannerModal } from '../components/Student/QRScannerModal';
import toast from 'react-hot-toast'; 
import { apiCall } from '../api.js'; 

function StudentDashboard({ user }) {
  const [courses, setCourses] = useState([]);
  const [guestCourses, setGuestCourses] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGuestSectionOpen, setIsGuestSectionOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false); 
  const [lastInvalidToken, setLastInvalidToken] = useState(null); 

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      // Ambele cereri pleacă în același timp (super rapid)
      const [coursesRes, guestRes] = await Promise.all([
        apiCall('/courses/my-courses').catch(() => ({ ok: false })), 
        apiCall('/courses/my-guest-courses').catch(() => ({ ok: false }))
      ]);

      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data || []);
      } else setCourses([]);

      if (guestRes.ok) {
        const guestData = await guestRes.json();
        setGuestCourses(guestData || []);
      } else setGuestCourses([]);

    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
      setGuestCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Se verifică codul...'); 
    
    try {
      const response = await apiCall('/courses/join', {
        method: 'POST',
        body: JSON.stringify({ enrollment_code: enrollmentCode })
      });

      if (response.ok) {
        toast.success('Te-ai înscris cu succes!', { id: toastId });
        setShowJoinModal(false);
        setEnrollmentCode('');
        fetchCourses(); 
      } else {
        const error = await response.json();
        toast.error(error.detail, { id: toastId }); 
      }
    } catch (error) {
      toast.error('Eroare de rețea la înscriere', { id: toastId });
    }
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
    setLastInvalidToken(null);
  };

  const handleBackendScan = async (scannedToken) => {
    if (isProcessingQR || scannedToken === lastInvalidToken) return;

    setIsProcessingQR(true);
    const toastId = toast.loading('Se procesează prezența...', { duration: 3000 });

    try {
      const response = await apiCall('/sessions/scan', {
        method: 'POST',
        body: JSON.stringify({ session_token: scannedToken })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.message}\nCurs: ${data.course_name}`, { id: toastId, duration: 5000 });
        closeScanner(); 
        fetchCourses(); 
        
        // OPȚIONAL: Dacă scanează un curs extra, deschidem automat secțiunea ca să îl vadă!
        setIsGuestSectionOpen(true);
      } else {
        const error = await response.json();
        if (response.status === 404) {
          setLastInvalidToken(scannedToken); 
          toast.error('Cod expirat. Ține camera pe ecran pentru următorul...', { id: toastId, duration: 2500 });
        } else {
          toast.error(error.detail, { id: toastId, duration: 5000 });
          closeScanner(); 
        }
      }
    } catch (error) {
      toast.error('Eroare de Conexiune/Rețea', { id: toastId });
      closeScanner();
    } finally {
      setIsProcessingQR(false);
    }
  };

  const handleScanResult = (scannedData) => {
    let tokenCurat = "";
    if (typeof scannedData === 'string') {
      tokenCurat = scannedData;
    } else if (Array.isArray(scannedData)) {
      tokenCurat = scannedData[0]?.rawValue || scannedData[0]?.text || "";
    } else if (typeof scannedData === 'object' && scannedData !== null) {
      tokenCurat = scannedData.rawValue || scannedData.text || scannedData.data || "";
    }

    if (tokenCurat) {
      handleBackendScan(tokenCurat); 
    }
  };

  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuestCourses = guestCourses.filter(course =>
    course.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9B5]"></div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-full bg-[#00D9B5] hover:bg-[#00c2a3] text-[#1A3A52] p-4 rounded-2xl font-bold shadow-lg shadow-[#00D9B5]/20 flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <Camera size={32} />
          <span className="text-lg">Scanează prezența</span>
        </button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută curs după nume..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm text-gray-700 shadow-sm outline-none transition-all focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
      </div>

      {/* ============================================================== */}
      {/* SECȚIUNEA NOUĂ: EVENIMENTE ȘI PARTICIPĂRI EXTRA (COLAPSABILĂ)  */}
      {/* ============================================================== */}
      {filteredGuestCourses.length > 0 && (
        <div className="mb-10 bg-orange-50/50 rounded-3xl border border-orange-100 overflow-hidden shadow-sm">
          {/* Header-ul care funcționează ca un buton */}
          <button 
            onClick={() => setIsGuestSectionOpen(!isGuestSectionOpen)}
            className="w-full flex items-center justify-between p-5 md:p-6 hover:bg-orange-100/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-500 rounded-xl shrink-0">
                <Star size={24} fill="currentColor" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1A3A52]">Participări extra & evenimente</h2>
                <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">({filteredGuestCourses.length})</p>
              </div>
            </div>
            
            {/* Săgeata care se schimbă în funcție de stare */}
            <div className="p-2 bg-white rounded-full text-orange-500 shadow-sm shrink-0">
              {isGuestSectionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>
          
          {/* Conținutul (Cardurile) - Apare doar dacă isGuestSectionOpen este true */}
          {isGuestSectionOpen && (
            <div className="p-6 pt-0 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGuestCourses.map((course) => (
                  <StudentCourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECȚIUNEA EXISTENTĂ: CURSURILE OFICIALE                        */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A3A52]">Cursurile mele</h2>
          <p className="text-gray-500 mt-1">Gestionează înscrierile și istoricul tău oficial.</p>
        </div>
        
        <button
          onClick={() => setShowJoinModal(true)}
          className="w-full md:w-auto bg-[#1A3A52] active:bg-[#112738] text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={20} />
          <span>Înscrie-te la un curs</span>
        </button>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#1A3A52]">Nu ești înscris la niciun curs</h3>
          <p className="text-gray-400 mt-2 mb-6">Apasă butonul de mai sus și introdu codul primit de la profesor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <StudentCourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      <JoinCourseModal 
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setEnrollmentCode('');
        }}
        enrollmentCode={enrollmentCode}
        setEnrollmentCode={setEnrollmentCode}
        onSubmit={handleJoinCourse}
      />

      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={closeScanner}
        onScan={handleScanResult}
        courseName="Scanare Prezență" 
      />
    </div>
  );
}

export default StudentDashboard;