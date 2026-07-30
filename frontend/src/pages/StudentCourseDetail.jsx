import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../Layout';
import { ArrowLeft, CheckCircle2, XCircle, Calendar, Clock, BookOpen } from 'lucide-react';
import { apiCall } from '../api.js';

function StudentCourseDetails({ user }) {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [courseInfo, setCourseInfo] = useState(null); // Stocăm datele despre curs (nume, cod)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Aducem istoricul de prezențe
        const historyRes = await apiCall(`/sessions/course/${courseId}/my-attendance`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData);
        }

        // 2. Încercăm să luăm detaliile cursului (pentru nume) dintr-un endpoint de info
        // Notă: Dacă nu ai un endpoint specific /courses/{id}, putem deduce numele 
        // din prima intrare a istoricului dacă backend-ul îl trimite
        const courseRes = await apiCall(`/courses/my-courses`);
        if (courseRes.ok) {
          const allCourses = await courseRes.json();
          const currentCourse = allCourses.find(c => c.id === parseInt(courseId));
          setCourseInfo(currentCourse);
        }

      } catch (error) {
        console.error("Eroare la încărcare:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9B5]"></div>
    </div>
  );

  const totalSessions = history.length;
  const presentSessions = history.filter(h => h.status === 'Prezent').length;
  const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0;

  return (
    <Layout user={user} role="student">
      <div className="mb-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-[#1A3A52] transition-colors mb-4 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold">Înapoi la cursuri</span>
        </button>
        
        {/* TITLUL MODIFICAT DINAMIC - SIMPLU ȘI ELEGANT */}
        <h2 className="text-3xl font-bold text-[#1A3A52] leading-tight mt-2">
          Istoricul meu de prezențe{courseInfo ? ` la cursul ${courseInfo.name}` : ''}
        </h2>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-gray-500 font-medium">Prezențe acumulate</p>
          <p className="text-3xl font-bold text-[#1A3A52]">
            {presentSessions} <span className="text-lg text-gray-400">/ {totalSessions}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 font-medium">Rată de participare</p>
          <p className={`text-3xl font-bold ${attendanceRate >= 50 ? 'text-[#00D9B5]' : 'text-red-500'}`}>
            {attendanceRate}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {history.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {history.map((session) => {
              const isPresent = session.status === 'Prezent';
              const dateObj = new Date(session.scheduled_for);
              
              return (
                <div key={session.session_id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isPresent ? 'bg-[#00D9B5]/10 text-[#00D9B5]' : 'bg-red-50 text-red-500'}`}>
                      {isPresent ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-[#1A3A52] font-bold">
                        <Calendar size={14} className="text-gray-400" />
                        {dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Clock size={14} />
                        {dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isPresent ? 'bg-[#00D9B5]/10 text-[#00D9B5]' : 'bg-red-50 text-red-500'}`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500">Nu există nicio sesiune înregistrată pentru acest curs încă.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default StudentCourseDetails;