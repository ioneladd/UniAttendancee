import { Calendar, X, FileText, Clock, Trash2, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SessionHistoryTable({
  course,
  istoricSesiuni,
  filteredSessions,
  selectedDateFilter,
  setSelectedDateFilter,
  onExportOverall,
  onExportSession,
  onCloseSession,
  onDeleteSession,
  onReopenSession
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl font-bold text-[#1A3A52]">Istoric prezențe</h3>
        
        {istoricSesiuni.length > 0 && course.course_type === 'recurring' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-44 h-10 group cursor-pointer">
              <div className="absolute inset-0 flex items-center justify-between px-4 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-[#1A3A52] pointer-events-none group-hover:border-[#00D9B5] transition-colors">
                <span>{selectedDateFilter ? selectedDateFilter.split('-').reverse().join('/') : 'Alege data...'}</span>
                <Calendar size={16} className="text-[#00D9B5]" />
              </div>
              <input 
                type="date" 
                value={selectedDateFilter} 
                onChange={(e) => setSelectedDateFilter(e.target.value)} 
                onClick={(e) => e.target.showPicker && e.target.showPicker()} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
            </div>
            {selectedDateFilter && (
              <button onClick={() => setSelectedDateFilter('')} className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-xl transition-colors">
                <X size={18} />
              </button>
            )}
            <button onClick={onExportOverall} className="flex items-center gap-2 bg-[#1A3A52] hover:bg-[#1A3A52]/90 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg transition-all">
              <FileText size={18} />
              <span className="hidden sm:inline">Exportă prezența totală</span>
            </button>
          </div>
        )}
      </div>

      {istoricSesiuni.length > 0 ? (
        <div className="flex flex-col">
          <div className="hidden sm:grid sm:grid-cols-4 gap-4 px-6 py-4 bg-gray-50 text-gray-400 text-xs uppercase tracking-wider font-bold">
            <div>Data & Ora</div>
            <div className="text-center">Studenți prezenți</div>
            <div className="text-center">Status</div>
            <div className="text-right">Acțiuni</div>
          </div>
          {filteredSessions.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredSessions.map((session) => {
                const dateObj = new Date(session.scheduled_for);
                return (
                  <div key={session.id} className="p-4 sm:px-6 hover:bg-gray-50/50 transition-colors group flex flex-col sm:grid sm:grid-cols-4 gap-4 sm:items-center">
                    <div className="flex items-center gap-3 justify-between sm:justify-start">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${session.is_active ? 'bg-[#00D9B5]/10 text-[#00D9B5]' : 'bg-gray-100 text-gray-400'}`}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-[#1A3A52]">{dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          <p className="text-xs text-gray-500">{dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="sm:hidden">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${session.is_active ? 'bg-[#00D9B5]/10 text-[#00D9B5]' : 'bg-gray-100 text-gray-500'}`}>{session.is_active ? 'Activă' : 'Închisă'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-center">
                      <span className="sm:hidden text-xs text-gray-400 font-bold uppercase tracking-wider">Prezențe:</span>
                      <span className="font-bold text-lg text-[#1A3A52]">{session.attendees_count}</span>
                    </div>
                    <div className="hidden sm:flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${session.is_active ? 'bg-[#00D9B5]/10 text-[#00D9B5]' : 'bg-gray-100 text-gray-500'}`}>{session.is_active ? 'Activă' : 'Închisă'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-3 sm:pt-0 border-t border-gray-100 sm:border-0 mt-2 sm:mt-0">
                      {/* Buton Export */}
                      <button onClick={() => onExportSession(session)} className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 p-2 rounded-lg transition-colors" title="Exportă această sesiune">
                        <FileText size={18} />
                      </button>
                      
                      {/* Buton Închide / Redeschide */}
                      {session.is_active ? (
                        <button onClick={() => onCloseSession(session.id)} className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                          Închide
                        </button>
                      ) : (
                        <button onClick={() => onReopenSession(session.id)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors p-2 rounded-lg" title="Redeschide sesiunea">
                          <RefreshCw size={18} />
                        </button>
                      )}

                      {/* Buton Șterge */}
                      <button onClick={() => onDeleteSession(session.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 bg-gray-50 sm:bg-transparent" title="Șterge sesiunea definitiv">
                        <Trash2 size={18} />
                      </button>
                      
                      {/* Buton Detalii */}
                      <button onClick={() => navigate(`/session/${session.id}`)} className="text-[#00D9B5] bg-[#00D9B5]/10 sm:text-gray-400 sm:bg-transparent hover:text-[#00D9B5] transition-colors p-2 sm:px-2 rounded-lg sm:hover:bg-[#00D9B5]/10 inline-flex items-center gap-1">
                        <span className="text-sm font-semibold sm:opacity-0 group-hover:opacity-100 transition-opacity">Detalii</span>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500"><p className="font-bold text-[#1A3A52]">Nicio sesiune găsită.</p></div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="bg-gray-50 p-4 rounded-full mb-4"><FileText size={40} className="text-gray-200" /></div>
          <p className="text-[#1A3A52] font-bold text-lg">Nu există prezențe înregistrate.</p>
        </div>
      )}
    </div>
  );
}