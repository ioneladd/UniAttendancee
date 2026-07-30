import { X, UserX } from 'lucide-react';

export function EnrolledStudentsModal({ 
  isOpen, 
  onClose, 
  course, 
  enrolledStudents, 
  onRemoveStudent 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-[#1A3A52]">Studenți înscriși</h3>
            <p className="text-sm text-gray-500 mt-1">Total: {enrolledStudents.length} studenți</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-[#1A3A52] transition-colors p-1 bg-gray-50 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto pr-2 flex-1">
          {enrolledStudents.length > 0 ? (
            <div className="space-y-3">
              {enrolledStudents.map((student) => (
                <div key={student.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1A3A52]/5 flex items-center justify-center text-[#1A3A52] font-bold">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#1A3A52] text-sm">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.email || 'Fără email'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemoveStudent(student.id, student.name)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Elimină student"
                  >
                    <UserX size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 font-medium">Niciun student nu s-a înrolat încă.</p>
              <p className="text-sm text-gray-400 mt-1">Oferă-le studenților codul: <span className="font-mono font-bold">{course.enrollment_code}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}