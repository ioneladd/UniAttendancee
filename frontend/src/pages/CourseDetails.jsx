import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../Layout';
import { CreateSessionModal } from '../components/Session/CreateSessionModal';
import { CourseStats } from '../components/Course/CourseStats';
import { EnrolledStudentsModal } from '../components/Course/EnrolledStudentsModal';
import { SessionHistoryTable } from '../components/Course/SessionHistoryTable';
import { exportOverallAttendance, exportSessionAttendance } from '../utils/exportExcel';
import { EditCourseModal } from '../components/Course/EditCourseModal';
import { CourseHeader } from '../components/Course/CourseHeader';
import API_BASE_URL, { apiCall, getWebSocketUrl } from '../api.js';

function CourseDetails({ user }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [course, setCourse] = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stări pentru Modaluri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);

  const [editFormData, setEditFormData] = useState({
    name: '', code: '', year: 1, semester: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentActiveSession = course?.history?.find(s => s.is_active);

  // Funcții extrase pentru a putea fi refolosite ușor de WebSockets
  const fetchStudentsSilently = async () => {
    try {
      const res = await apiCall(`/courses/${courseId}/students`);
      if (res.ok) setEnrolledStudents(await res.json());
    } catch (e) { console.error("Eroare polling studenți:", e); }
  };

  const fetchSessionHistorySilently = async () => {
    try {
      const historyRes = await apiCall(`/sessions/course/${courseId}`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setCourse(prev => prev ? { ...prev, history: historyData } : prev);
      }
    } catch (e) { console.error("Eroare istoric sesiuni:", e); }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const coursesRes = await apiCall('/courses/my-courses');
        const coursesData = await coursesRes.json();
        const foundCourse = coursesData.find(c => c.id === parseInt(courseId));
        
        if (foundCourse) {
          const historyRes = await apiCall(`/sessions/course/${courseId}`);
          const historyData = historyRes.ok ? await historyRes.json() : [];

          if (foundCourse.course_type === 'recurring') {
            await fetchStudentsSilently();
          }

          setCourse({
            ...foundCourse,
            stats: { total_sessions: historyData.length },
            history: historyData 
          });
        }
      } catch (error) {
        console.error("Eroare la încărcare:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [courseId]);

  useEffect(() => {
    if (!course?.id) return;

    let ws;
    let isActive = true;

    const openWebSocket = async () => {
      try {
        const url = await getWebSocketUrl(`/courses/ws/${course.id}`);
        ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('Connected to course websocket for', course.id);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'ENROLLMENT_UPDATE') {
            fetchStudentsSilently();
          }
        };

        ws.onerror = (event) => {
          console.error('Course websocket error:', event);
        };

        ws.onclose = (event) => {
          console.log('Course websocket closed:', event.code, event.reason);
          if (isActive && event.code !== 1008) {
            setTimeout(() => {
              if (isActive) openWebSocket();
            }, 2000);
          }
        };
      } catch (error) {
        console.error('Unable to open Course WebSocket:', error);
      }
    };

    openWebSocket();

    return () => {
      isActive = false;
      if (ws?.readyState === 1) ws.close();
    };
  }, [course?.id]);

  useEffect(() => {
    if (!course?.history) return;

    const activeSessionsForWS = course.history.filter(s => s.is_active);
    const activeWebSockets = [];
    let isActive = true;

    const openWebSocket = async (sessionObj) => {
      try {
        const url = await getWebSocketUrl(`/sessions/ws/${sessionObj.id}`);
        const ws = new WebSocket(url);

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE') {
            fetchSessionHistorySilently();
            if (course.course_type === 'recurring') {
              fetchStudentsSilently();
            }
          }
        };

        ws.onerror = (event) => {
          console.error('Session websocket error:', sessionObj.id, event);
        };

        ws.onclose = (event) => {
          console.log('Session websocket closed:', sessionObj.id, event.code, event.reason);
          if (isActive && event.code !== 1008) {
            setTimeout(() => {
              if (isActive) openWebSocket(sessionObj);
            }, 2000);
          }
        };

        activeWebSockets.push(ws);
      } catch (error) {
        console.error('Unable to open Session WebSocket for', sessionObj.id, error);
      }
    };

    activeSessionsForWS.forEach(sessionObj => {
      openWebSocket(sessionObj);
    });

    return () => {
      isActive = false;
      activeWebSockets.forEach(ws => {
        if (ws.readyState === 1) ws.close();
      });
    };
  }, [course?.history?.map(s => s.is_active).join(','), course?.course_type, course?.id]);

  // --- ELIMINARE STUDENT ---
  const handleRemoveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Sigur vrei să elimini studentul ${studentName} de la acest curs?`)) return;
    try {
      const response = await apiCall(`/courses/${courseId}/students/${studentId}`, { method: 'DELETE' });
      if (response.ok) setEnrolledStudents(prev => prev.filter(s => s.id !== studentId));
      else alert('Eroare la eliminarea studentului.');
    } catch (error) { console.error(error); alert('Eroare de rețea.'); }
  };

  const handleCreateSession = async (courseData, sessionDate) => {
    try {
      const response = await apiCall('/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseData.id, scheduled_for: sessionDate.toISOString() })
      });

      if (response.ok) {
        const sessionData = await response.json();
        const sessionId = sessionData.id ?? sessionData.session_id;
        setIsModalOpen(false);
        await fetchSessionHistorySilently();

        if (sessionId) {
          navigate(`/session/${sessionId}`);
        } else {
          alert('Eroare: răspunsul serverului nu conține un ID valid pentru sesiune.');
        }
      } else {
        const error = await response.json();
        alert('Eroare: ' + JSON.stringify(error.detail));
      }
    } catch (error) { console.error(error); alert('Eroare la conectarea cu serverul.'); }
  };

  const handleCloseSession = async (sessionId) => {
    if (!window.confirm('Ești sigur că vrei să închizi această sesiune?')) return;
    try {
      const response = await apiCall(`/sessions/${sessionId}/close`, { method: 'POST' });
      if (response.ok) {
        setCourse(prev => ({ ...prev, history: prev.history.map(session => session.id === sessionId ? { ...session, is_active: false } : session) }));
      }
    } catch (error) { console.error(error); }
  };

  const handleReopenSession = async (sessionId) => {
    if (!window.confirm('Ești sigur că vrei să redeschizi această sesiune?')) return;
    try {
      const response = await apiCall(`/sessions/${sessionId}/reopen`, { method: 'POST' });
      if (response.ok) {
        setCourse(prev => ({ 
          ...prev, 
          history: prev.history.map(session => 
            session.id === sessionId ? { ...session, is_active: true } : session
          ) 
        }));
      } else {
        alert("Eroare la redeschidere");
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Ești sigur că vrei să ștergi definitiv această sesiune?')) return;
    try {
      const response = await apiCall(`/sessions/${sessionId}`, { method: 'DELETE' });
      if (response.ok) {
        setCourse(prev => ({ ...prev, history: prev.history.filter(s => s.id !== sessionId) }));
      }
    } catch (error) { console.error(error); }
  };

  const openEditModal = () => {
    setEditFormData({ 
      id: course.id, name: course.name, code: course.code || '', 
      year: course.year || '', semester: course.semester || '', 
      type: course.course_type || 'recurring', 
      allow_non_enrolled: course.allow_non_enrolled !== undefined ? course.allow_non_enrolled : true 
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cleanedYear = (editFormData.year === null || editFormData.year === '') ? null : parseInt(editFormData.year, 10);
      const cleanedSemester = (editFormData.semester === null || editFormData.semester === '') ? null : parseInt(editFormData.semester, 10);

      const payload = {
        name: editFormData.name, code: editFormData.code || null,
        type: editFormData.type, allow_non_enrolled: editFormData.allow_non_enrolled,
        year: cleanedYear, semester: cleanedSemester
      };

      const response = await apiCall(`/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setCourse(prev => ({ ...prev, ...payload, course_type: payload.type }));
        setIsEditModalOpen(false);
      } else {
        alert('Eroare de validare. Verifică consola (F12) pentru detalii.');
      }
    } catch (error) { console.error("Eroare de rețea:", error); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm(`Ești sigur că vrei să ștergi definitiv cursul?`)) return;
    try {
      const response = await apiCall(`/courses/${courseId}`, { method: 'DELETE' });
      if (response.ok) navigate('/dashboard'); 
    } catch (error) { console.error(error); }
  };

  const handleOpenSession = (session) => {
    if (!session?.id && !session?.session_id) return;
    navigate(`/session/${session.id || session.session_id}`);
  };

  const istoricSesiuni = course?.history || [];
  const getFormatCalendar = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d)) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  const filteredSessions = selectedDateFilter
    ? istoricSesiuni.filter(session => getFormatCalendar(session.scheduled_for || session.created_at) === selectedDateFilter)
    : istoricSesiuni;

  const handleExportOverallAttendance = () => exportOverallAttendance(course, user);
  const handleExportSessionAttendance = (session) => exportSessionAttendance(session, course, user);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9B5]"></div>
    </div>
  );
  if (!course) return <div className="p-8 text-center text-red-500">Cursul nu a fost găsit.</div>;

  return (
    <Layout user={user} role="professor">
      <CourseHeader 
        course={course}
        currentActiveSession={currentActiveSession}
        onEditClick={openEditModal}
        onDeleteClick={handleDeleteCourse}
        onCreateSessionClick={() => course.course_type === 'recurring' ? setIsModalOpen(true) : handleCreateSession(course, new Date())}
        onActiveSessionClick={handleOpenSession}
      />

      <CourseStats 
        course={course} 
        enrolledStudentsCount={enrolledStudents.length} 
        onOpenStudentsModal={() => setIsStudentsModalOpen(true)} 
      />

      <SessionHistoryTable 
        course={course}
        istoricSesiuni={istoricSesiuni}
        filteredSessions={filteredSessions}
        selectedDateFilter={selectedDateFilter}
        setSelectedDateFilter={setSelectedDateFilter}
        onExportOverall={handleExportOverallAttendance}
        onExportSession={handleExportSessionAttendance}
        onCloseSession={handleCloseSession}
        onDeleteSession={handleDeleteSession}
        onReopenSession={handleReopenSession} 
      />

      <EnrolledStudentsModal 
        isOpen={isStudentsModalOpen}
        onClose={() => setIsStudentsModalOpen(false)}
        course={course}
        enrolledStudents={enrolledStudents}
        onRemoveStudent={handleRemoveStudent}
      />

      <CreateSessionModal isOpen={isModalOpen} course={course} onClose={() => setIsModalOpen(false)} onCreate={handleCreateSession} />

      <EditCourseModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        courseType={course.course_type}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        onSubmit={handleUpdateCourse}
        isSubmitting={isSubmitting}
      />
    </Layout>
  );
}

export default CourseDetails;