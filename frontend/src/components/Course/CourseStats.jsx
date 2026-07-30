import { Users, Calendar } from 'lucide-react';

export function CourseStats({ course, enrolledStudentsCount, onOpenStudentsModal }) {
  if (!course) return null;

  if (course.course_type === 'recurring') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Card Interactiv: Studenți Înscriși */}
        <div 
          onClick={onOpenStudentsModal}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:border-[#00D9B5] hover:shadow-md transition-all group"
        >
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium group-hover:text-[#00D9B5] transition-colors">Studenți înscriși</p>
            <div className="flex justify-between items-center">
              <p className="text-2xl font-bold text-[#1A3A52]">{enrolledStudentsCount}</p> 
              <span className="text-xs font-bold text-[#00D9B5] opacity-0 group-hover:opacity-100 transition-opacity">Vezi lista &rarr;</span>
            </div>
          </div>
        </div>

        {/* Card: Sesiuni Totale */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Sesiuni totale</p>
            <p className="text-2xl font-bold text-[#1A3A52]">{course.history?.length || 0}</p>
          </div>
        </div>
      </div>
    );
  }

  // Afișarea statisticilor pentru Evenimente (fără modal de studenți)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
          <Users size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">Participanți</p>
          <p className="text-2xl font-bold text-[#1A3A52]">
            {course.history?.reduce((acc, curr) => acc + curr.attendees_count, 0) || 0}
          </p>
        </div>
      </div>
    </div>
  );
}