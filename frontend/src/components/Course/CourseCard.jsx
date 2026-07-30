import { BookOpen, Edit, Trash2, Calendar, Users } from 'lucide-react';

export function CourseCard({ 
  course, 
  activeSessionInHistory, 
  hasPastSessions, 
  onNavigate, 
  onEdit, 
  onDelete, 
  onActiveSessionClick, 
  onCreateSessionClick 
}) {
  return (
    <div onClick={onNavigate} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#00D9B5]/30 transition-all group relative overflow-hidden flex flex-col h-full cursor-pointer">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D9B5]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#1A3A52]/5 flex items-center justify-center text-[#1A3A52] group-hover:bg-[#00D9B5] group-hover:text-white transition-colors">
          <BookOpen size={24} />
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          course.course_type === 'recurring' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
        }`}>
          {course.course_type === 'recurring' ? 'Curs' : 'Eveniment'}
        </span>
      </div>

      <div className="flex justify-between items-start mb-1 relative z-10">
        <div className="pr-2">
          <h3 className="text-xl font-bold text-[#1A3A52] group-hover:text-[#00D9B5] transition-colors line-clamp-1">
            {course.name}
          </h3>
        </div>

        <div className="flex flex-row items-center gap-1 bg-gray-50 border border-gray-100 rounded-lg shadow-sm px-1 py-1 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button onClick={onEdit} className="p-2 lg:p-1.5 text-gray-500 hover:text-[#00D9B5] hover:bg-white rounded-md transition-all" title="Editează curs">
            <Edit size={16} />
          </button>
          <div className="w-px h-4 bg-gray-200"></div>
          <button onClick={onDelete} className="p-2 lg:p-1.5 text-gray-500 hover:text-red-500 hover:bg-white rounded-md transition-all" title="Șterge curs">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    
      <div className="flex flex-col gap-1 mb-6 relative z-10 flex-grow">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
          Prescurtare: {course.code || 'N/A'}
        </p>
        
        {course.course_type === 'recurring' && (
          <>
            <div className="flex items-center text-sm text-gray-600 mt-2 mb-2">
              <Calendar size={16} className="mr-2 text-[#00D9B5]" />
              {course.year === 5 ? 'Alt an' : `An ${course.year}`} • Sem {course.semester}
            </div>

            <div className="flex items-center gap-2 mt-auto pt-2">
              <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded uppercase">Cod înscriere</span>
              <code className="text-sm font-mono font-bold text-[#1A3A52]">{course.enrollment_code}</code>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 relative z-10 mt-auto">
        {course.course_type === 'recurring' ? (
          activeSessionInHistory ? (
            <button onClick={(e) => { e.stopPropagation(); onActiveSessionClick(activeSessionInHistory); }} className="w-full bg-[#1A3A52] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00D9B5] animate-pulse"></div> Sesiune curentă
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onCreateSessionClick(course); }} className="w-full bg-[#00D9B5] text-white font-bold py-3 rounded-xl hover:bg-[#00c4a4] transition-all shadow-md active:scale-95">
              Sesiune nouă
            </button>
          )
        ) : (
          activeSessionInHistory ? (
            <button onClick={(e) => { e.stopPropagation(); onActiveSessionClick(activeSessionInHistory); }} className="w-full bg-[#1A3A52] text-white font-bold py-3 rounded-xl hover:bg-blue-900 transition-all shadow-md active:scale-95 flex justify-center items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00D9B5] animate-pulse"></div> Eveniment activ
            </button>
          ) : hasPastSessions ? (
            <button disabled className="w-full bg-gray-100 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed border border-gray-200">
              Eveniment încheiat
            </button>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); onCreateSessionClick(course); }} className="w-full bg-[#00D9B5] text-white font-bold py-3 rounded-xl hover:bg-[#00c4a4] transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
              Pornește evenimentul
            </button>
          )
        )}

        <button onClick={(e) => { e.stopPropagation(); onNavigate(); }} className="w-full bg-[#F8FAFB] text-[#1A3A52] font-semibold py-2 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 border border-gray-100">
          <Users size={16} /> Detalii și istoric
        </button>
      </div>
    </div>
  );
}