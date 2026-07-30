import { X, Search, CheckCircle, UserPlus, Users } from 'lucide-react';

export function ManualAddModal({
  isOpen,
  onClose,
  sessionType,
  manualStudentName,
  setManualStudentName,
  searchTerm,
  setSearchTerm,
  isAddingManual,
  onAddManualStudent,
  availableStudents,
  attendees
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-xl font-bold text-[#1A3A52]">Adaugă participant manual</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 bg-gray-50 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          
          {/* Partea de sus: Formularul de text liber (Apare PESTE TOT, și la curs și la eveniment) */}
          <form onSubmit={(e) => { e.preventDefault(); onAddManualStudent(manualStudentName); }} className="mb-6 shrink-0">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Scrie numele manual</label>
              <input 
                type="text" 
                autoFocus={sessionType === 'event'}
                required
                placeholder="ex: Mihai Eminescu"
                value={manualStudentName}
                onChange={(e) => setManualStudentName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 outline-none transition-all"
              />
            </div>
            <button 
              type="submit" 
              disabled={isAddingManual}
              className="w-full bg-[#1A3A52] hover:bg-[#00D9B5] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {isAddingManual ? 'Se adaugă...' : 'Confirmă prezența'}
            </button>
          </form>

          {/* Partea de jos: Lista de studenți (Apare DOAR la cursuri recurente) */}
          {sessionType === 'recurring' && (
            <>
              <div className="relative flex items-center gap-2 mb-4 shrink-0">
                <hr className="flex-1 border-gray-100" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">sau alege din listă</span>
                <hr className="flex-1 border-gray-100" />
              </div>

              {availableStudents.length > 0 ? (
                <>
                  <div className="mb-3 relative shrink-0">
                    <input
                      type="text"
                      placeholder="Caută în lista de înrolați..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#00D9B5] focus:ring-2 focus:ring-[#00D9B5]/20 outline-none transition-all text-sm bg-gray-50 focus:bg-white"
                    />
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>

                  <div className="space-y-2 flex-1 pb-2">
                    {availableStudents
                      .filter(enrolled => !attendees.some(att => att.name === enrolled.name))
                      .filter(enrolled => enrolled.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((student, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                        <span className="font-bold text-[#1A3A52]">{student.name}</span>
                        <button 
                          onClick={() => onAddManualStudent(student.name)}
                          disabled={isAddingManual}
                          className="bg-[#00D9B5]/10 text-[#00D9B5] hover:bg-[#00D9B5] hover:text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-colors shrink-0"
                        >
                          {isAddingManual ? '...' : 'Prezent'}
                        </button>
                      </div>
                    ))}
                    
                    {availableStudents.filter(enrolled => !attendees.some(att => att.name === enrolled.name)).length === 0 ? (
                      <div className="text-center py-4 text-gray-400 font-medium text-sm">
                        <CheckCircle size={24} className="mx-auto mb-1 text-[#00D9B5]/50" />
                        Toți studenții din listă sunt prezenți!
                      </div>
                    ) : availableStudents
                        .filter(enrolled => !attendees.some(att => att.name === enrolled.name))
                        .filter(enrolled => enrolled.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                      <div className="text-center py-4 text-gray-400 font-medium text-sm">
                        Niciun rezultat pentru "{searchTerm}".
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Users size={24} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">
                    Nu există studenți înrolați la acest curs încă.<br/>Folosește câmpul de mai sus.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}