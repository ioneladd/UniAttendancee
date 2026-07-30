import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CourseHeader({ 
  course, 
  currentActiveSession, 
  onEditClick, 
  onDeleteClick, 
  onCreateSessionClick, 
  onActiveSessionClick 
}) {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-500 hover:text-[#1A3A52] mb-4 transition-colors group">
        <ArrowLeft size={20} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Înapoi la pagina principală
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col">
          <div className="flex flex-row items-center flex-wrap gap-4 mb-2">
            <h1 className="text-3xl font-bold text-[#1A3A52] leading-tight">{course.name}</h1>
            <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg shadow-sm px-1 py-1 shrink-0">
              <button onClick={onEditClick} className="p-1.5 text-gray-400 hover:text-[#00D9B5] hover:bg-[#00D9B5]/10 rounded-md"><Edit size={18} /></button>
              <div className="w-px h-4 bg-gray-200"></div>
              <button onClick={onDeleteClick} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"><Trash2 size={18} /></button>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-500 mt-1">
            <span className="bg-[#1A3A52]/5 text-[#1A3A52] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{course.code || 'Fără prescurtare'}</span>
            <span className="text-sm font-medium">{course.course_type === 'recurring' ? `${course.year === 5 ? 'Alt an' : `An ${course.year}`} • Semestrul ${course.semester}` : 'Eveniment'}</span>
          </div>
        </div>

        {course.course_type === 'recurring' && (
          <div className="bg-white border-2 border-dashed border-orange-200 p-4 rounded-2xl flex flex-col items-center shadow-sm">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-1">Cod înrolare</span>
            <span className="text-2xl font-mono font-black text-[#1A3A52] tracking-widest">{course.enrollment_code}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          {course.course_type === 'recurring' ? (
            currentActiveSession ? (
              <button onClick={() => onActiveSessionClick({ ...currentActiveSession, course_name: course.name })} className="bg-[#1A3A52] hover:bg-blue-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00D9B5] animate-pulse"></div> Sesiune curentă
              </button>
            ) : (
              <button onClick={() => onCreateSessionClick(new Date())} className="bg-[#00D9B5] hover:bg-[#00c4a4] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#00D9B5]/20 transition-all active:scale-95">Sesiune nouă</button>
            )
          ) : (
            currentActiveSession ? (
              <button onClick={() => onActiveSessionClick({ ...currentActiveSession, course_name: course.name })} className="bg-[#1A3A52] hover:bg-blue-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00D9B5] animate-pulse"></div> Eveniment activ
              </button>
            ) : course.history?.length > 0 ? (
              <button disabled className="bg-gray-100 text-gray-400 px-8 py-3 rounded-xl font-bold cursor-not-allowed border border-gray-200">Eveniment încheiat</button>
            ) : (
              <button onClick={() => onCreateSessionClick(new Date())} className="bg-[#00D9B5] hover:bg-[#00c4a4] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#00D9B5]/20 transition-all active:scale-95">Pornește evenimentul</button>
            )
          )}
        </div>
      </div>
    </div>
  );
}