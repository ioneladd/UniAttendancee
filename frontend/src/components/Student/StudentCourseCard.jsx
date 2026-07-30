import { BookOpen, User, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function StudentCourseCard({ course }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#00D9B5]/5 rounded-bl-full -mr-4 -mt-4"></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="w-12 h-12 rounded-xl bg-[#1A3A52]/5 flex items-center justify-center text-[#1A3A52] shrink-0">
          <BookOpen size={24} />
        </div>
        {course.code && (
          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            {course.code}
          </span>
        )}
      </div>

      <div className="mb-6 relative z-10 flex-grow">
        <h3 className="text-xl font-bold text-[#1A3A52] mb-3 line-clamp-2">
          {course.name}
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-500 font-medium">
            <User size={16} className="mr-2 text-gray-400" />
            Prof. {course.professor_name}
          </div>
          
          {course.year && course.semester && (
            <div className="flex items-center text-sm text-gray-500 font-medium">
              <Calendar size={16} className="mr-2 text-gray-400" />
              {course.year === 5 ? 'Alt an' : `An ${course.year}`} • Semestrul {course.semester}
            </div>
          )}
        </div>
      </div>

      {/* AICI ESTE BUTONUL MODIFICAT */}
      <button 
        onClick={() => navigate(`/student/course/${course.id}`)}
        className="w-full bg-[#1A3A52] text-white font-bold py-3.5 rounded-xl hover:bg-[#112738] transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 relative z-10"
      >
        <Clock size={20} /> Vezi istoricul
      </button>
    </div>
  );
}