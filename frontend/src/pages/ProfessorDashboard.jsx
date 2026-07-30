import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Calendar, Users, X, Sparkles, Edit, Trash2, Search, Filter } from 'lucide-react';
import { CreateSessionModal } from '../components/Session/CreateSessionModal';
import { QRCodeDisplay } from '../components/Session/QRCodeDisplay';
import { CreateCourseModal } from '../components/Course/CreateCourseModal';
import { CourseCard } from '../components/Course/CourseCard';
import { EditCourseModal } from '../components/Course/EditCourseModal';
import { apiCall } from '../api.js'; 


function ProfessorDashboard({ user }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [activeSession, setActiveSession] = useState(null);
  const [sessionCourse, setSessionCourse] = useState(null);
  
  // Stări pentru filtre
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); 
  const [semesterFilter, setSemesterFilter] = useState('all'); 
  const [yearFilter, setYearFilter] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    course_type: 'recurring',
    allow_non_enrolled: true,
    year: '',
    semester: ''
  });

  // Stări pentru Editare
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    code: '',
    year: 1,
    semester: 1,
    type: 'recurring',
    allow_non_enrolled: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await apiCall('/courses/my-courses');
      const coursesData = await response.json();
      
      if (Array.isArray(coursesData)) {
        const coursesWithHistory = await Promise.all(coursesData.map(async (course) => {
          try {
            const histRes = await apiCall(`/sessions/course/${course.id}`);
            const history = histRes.ok ? await histRes.json() : [];
            return { ...course, history };
          } catch (e) {
            return { ...course, history: [] };
          }
        }));
        setCourses(coursesWithHistory);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Logica de filtrare
  const yearOptions = Array.from(new Set(courses
    .filter(course => course.year > 0)
    .map(course => course.year)
  )).sort((a, b) => a - b);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.code && course.code.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || course.course_type === typeFilter;
    
    const matchesSemester = 
      semesterFilter === 'all' || 
      (course.course_type === 'recurring' && course.semester?.toString() === semesterFilter) ||
      course.course_type === 'event';

    const matchesYear = yearFilter === 'all' || course.year?.toString() === yearFilter;

    return matchesSearch && matchesType && matchesSemester && matchesYear;
  });

  const handleCreateCourse = async (e) => {
  e.preventDefault();
  
  // Validare manuală de siguranță
  if (formData.course_type === 'recurring' && (!formData.year || !formData.semester)) {
    alert("Te rugăm să selectezi Anul și Semestrul.");
    return;
  }

  try {
    const payload = {
      ...formData,
      // Transformăm în număr (int) înainte de trimitere
      year: formData.course_type === 'recurring' ? parseInt(formData.year, 10) : 0,
  semester: formData.course_type === 'recurring' ? parseInt(formData.semester, 10) : 0,
    };

    const response = await apiCall('/courses/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      setShowCreateModal(false);
      fetchCourses();
      setFormData({ name: '', code: '', course_type: 'recurring', allow_non_enrolled: true, year: '', semester: '' });
    } else {
      const error = await response.json();
      // Afișăm eroarea mai frumos
      alert('Eroare la creare: ' + (error.detail?.[0]?.msg || JSON.stringify(error.detail)));
    }
  } catch (error) {
    alert('Eroare de conexiune la server.');
  }
};

  const handleCreateSession = async (courseData, sessionDate) => {
    try {
      const response = await apiCall('/sessions/create', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseData.id,
          scheduled_for: sessionDate.toISOString(),
        })
      });

      if (response.ok) {
        const sessionData = await response.json();
        setActiveSession({ ...sessionData, course_name: courseData.name }); 
        setSessionCourse(null); 
        fetchCourses(); 
      } else {
        const error = await response.json();
        alert('Eroare: ' + JSON.stringify(error.detail));
      }
    } catch (error) {
      console.error(error);
      alert('Eroare la conectarea cu serverul pentru generarea sesiunii.');
    }
  };

  const openEditModal = (e, course) => {
    e.stopPropagation();
    setEditFormData({
      id: course.id,
      name: course.name,
      code: course.code || '',
      year: course.year || '',
      semester: course.semester || '',
      type: course.course_type || 'recurring',
      allow_non_enrolled: course.allow_non_enrolled 
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCourse = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
    // Dacă e curs recurent, forțăm numere. Dacă e eveniment, lăsăm null.
    const isRecurring = editFormData.type === 'recurring';
    
    const payload = {
      name: editFormData.name,
      code: editFormData.code || null,
      type: editFormData.type,
      allow_non_enrolled: editFormData.allow_non_enrolled,
      year: isRecurring ? parseInt(editFormData.year, 10) : 0,
    semester: isRecurring ? parseInt(editFormData.semester, 10) : 0
    };

    const response = await apiCall(`/courses/${editFormData.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // Refresh local după succes
      setCourses(prev => prev.map(c => c.id === editFormData.id ? { ...c, ...payload, course_type: payload.type } : c));
      setIsEditModalOpen(false);
    } else {
      const errorData = await response.json();
      alert(`Eroare: ${errorData.detail?.[0]?.msg || "A picat salvarea."}`);
    }
  } catch (error) {
    alert('Eroare de rețea.');
  } finally {
    setIsSubmitting(false);
  }
};

  const handleDeleteCourse = async (e, courseId, courseName) => {
    e.stopPropagation();
    if (!window.confirm(`Ești sigur că vrei să ștergi definitiv "${courseName}"? Tot istoricul se va pierde.`)) return;
    
    try {
      const response = await apiCall(`/courses/${courseId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCourses(prev => prev.filter(c => c.id !== courseId));
      } else {
        alert('Eroare la ștergerea cursului.');
      }
    } catch (error) {
      console.error(error);
      alert('Eroare de rețea.');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Se încarcă cursurile...</div>;

  return (
    <div>
      {/* 1. REPARAT HEADER-UL PENTRU MOBIL (items-start md:items-end) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#1A3A52]">Pagină principală profesor</h2>
          <p className="text-gray-500 mt-1">Gestionează cursurile și evenimentele, monitorizează prezența.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#00D9B5] hover:bg-[#00c4a4] text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-[#00D9B5]/20 flex items-center gap-2 transition-transform hover:-translate-y-1 active:scale-95 w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Adaugă activitate nouă
        </button>
      </div>

      {/* BARA DE FILTRE ȘI CĂUTARE */}
      {courses.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row gap-4 animate-fade-in-up">
          
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Caută curs după nume sau cod (ex: PW)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 outline-none transition-all text-sm bg-gray-50 focus:bg-white"
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          {/* 2. REPARAT FILTRELE PENTRU MOBIL (se așează pe verticală pe ecrane mici) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 text-sm font-medium transition-all cursor-pointer"
              >
                <option value="all">Toate tipurile</option>
                <option value="recurring">Doar cursuri</option>
                <option value="event">Doar evenimente</option>
              </select>
              <Filter size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 text-sm font-medium transition-all cursor-pointer"
              >
                <option value="all">Orice semestru</option>
                <option value="1">Semestrul 1</option>
                <option value="2">Semestrul 2</option>
              </select>
              <Filter size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-3 pl-4 pr-10 rounded-xl focus:outline-none focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 text-sm font-medium transition-all cursor-pointer"
              >
                <option value="all">Orice an</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
              <Filter size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#1A3A52]">Nu ai cursuri active</h3>
          <p className="text-gray-400 mt-2">Creează primul tău curs pentru a începe.</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Search className="mx-auto text-gray-300 mb-4" size={32} />
          <h3 className="text-lg font-bold text-[#1A3A52]">Nu am găsit niciun rezultat</h3>
          <p className="text-gray-500 mt-2">Încearcă să modifici filtrele sau termenii căutării.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              activeSessionInHistory={course.history?.find(s => s.is_active)}
              hasPastSessions={course.history?.length > 0}
              onNavigate={() => navigate(`/course/${course.id}`)}
              onEdit={(e) => openEditModal(e, course)}
              onDelete={(e) => handleDeleteCourse(e, course.id, course.name)}
              onActiveSessionClick={(session) => navigate(`/session/${session.id || session.session_id}`)}
              onCreateSessionClick={(c) => setSessionCourse(c)}
            />
          ))}
        </div>
      )}

      <CreateCourseModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        formData={formData} 
        setFormData={setFormData} 
        onSubmit={handleCreateCourse} 
      />

      <EditCourseModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        courseType={editFormData.type}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onSubmit={handleUpdateCourse}
        isSubmitting={isSubmitting}
      />

      <CreateSessionModal 
        isOpen={!!sessionCourse} 
        course={sessionCourse} 
        onClose={() => setSessionCourse(null)} 
        onCreate={handleCreateSession}
      />
    </div>
  );
}
export default ProfessorDashboard;