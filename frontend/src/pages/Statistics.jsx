import React, { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import { BarChart3, Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { apiCall } from '../api.js';

// ─── Helpers (doar pentru view profesor) ────────────────────────

function getBarColor(pct) {
  if (pct >= 75) return { bar: '#00D9B5', bg: '#E6FAF7', text: '#00A88D' };
  if (pct >= 50) return { bar: '#F59E0B', bg: '#FEF3C7', text: '#B45309' };
  return { bar: '#F87171', bg: '#FEE2E2', text: '#B91C1C' };
}

function HorizontalBar({ course }) {
  const isOpen = course.allow_non_enrolled;
  const pct = isOpen ? 100 : Math.min(course.attendance, 100);
  const colors = isOpen
    ? { bar: '#00D9B5', bg: '#E6FAF7', text: '#00A88D' }
    : getBarColor(pct);

  const [animWidth, setAnimWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
      <div className="w-44 md:w-56 shrink-0">
        <p className="text-sm font-semibold text-[#1A3A52] truncate" title={course.name}>
          {course.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {isOpen
            ? `medie ${course.avg_per_session ?? '—'} pers./sesiune`
            : `${course.total_attendances ?? '—'} prezenți · ${course.total_sessions ?? '—'} sesiuni`}
        </p>
      </div>

      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
        <div
          className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
          style={{
            width: `${animWidth}%`,
            backgroundColor: colors.bar,
            minWidth: animWidth > 0 ? '2rem' : '0',
          }}
        >
          {isOpen ? (
            <span className="text-xs font-bold text-white">
              {course.avg_per_session ?? '—'} pers.
            </span>
          ) : (
            pct > 15 && <span className="text-xs font-bold text-white">{pct}%</span>
          )}
        </div>
        {!isOpen && pct <= 15 && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold"
            style={{ color: colors.text }}
          >
            {pct}%
          </span>
        )}
      </div>

      <div className="w-28 shrink-0 text-right hidden md:block">
        {isOpen ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-[#E6FAF7] text-[#00A88D]">
            <Users size={12} /> Deschis
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export function Statistics({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiCall('/courses/stats/my-summary');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Eroare de rețea:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <Layout user={user} role="student">
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D9B5]"></div>
        </div>
      </Layout>
    );
  }

  if (!stats) return <div className="p-8 text-center text-gray-500">Nu s-au putut încărca statisticile.</div>;

  // ==========================================
  // VIEW PENTRU STUDENT — neschimbat față de original
  // ==========================================
  if (stats.role === 'student') {
    return (
      <Layout user={user} role="student">
        <div className="p-2 md:p-6 max-w-7xl mx-auto animate-fade-in-up">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1A3A52]">Situația mea</h1>
            <p className="text-gray-500 mt-2">Urmărește-ți progresul și vezi unde trebuie să recuperezi.</p>
          </div>

          {/* Sumar Global Student */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><BookOpen size={28} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">Cursuri active</p>
                <h3 className="text-2xl font-bold text-[#1A3A52]">{stats.summary.totalCourses}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-4 bg-[#00D9B5]/10 text-[#00D9B5] rounded-xl"><Target size={28} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total prezențe</p>
                <h3 className="text-2xl font-bold text-[#1A3A52]">{stats.summary.totalPresent}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><TrendingUp size={28} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500">Rată medie</p>
                <h3 className="text-2xl font-bold text-[#1A3A52]">{stats.summary.averageAttendance}%</h3>
              </div>
            </div>
          </div>

          {/* Detalii pe fiecare curs */}
          <h2 className="text-xl font-bold text-[#1A3A52] mb-4">Situație pe cursuri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.courseStats.map((course, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg text-[#1A3A52] line-clamp-1" title={course.name}>{course.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${course.attendance >= 50 ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    {course.attendance}%
                  </span>
                </div>

                <div className="w-full bg-gray-100 h-2 rounded-full mb-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${course.attendance >= 50 ? 'bg-[#00D9B5]' : 'bg-orange-400'}`}
                    style={{ width: `${course.attendance}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-end">
                  <p className="text-sm text-gray-500 font-medium">
                    Ai fost la <span className="text-[#1A3A52] font-bold">{course.present}</span> din {course.total} sesiuni.
                  </p>

                  {course.type === 'recurring' && course.total > 0 && (
                    <div className="text-right">
                      {course.neededFor50 > 0 ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">
                          <AlertTriangle size={14} /> Mai trebuie {course.neededFor50}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">
                          <CheckCircle2 size={14} /> Peste 50%
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {course.type === 'recurring' && course.total > 0 && (
                  <p className="text-[10px] text-gray-400 mt-3 text-center border-t border-gray-50 pt-2">
                    *Calculat raportat la numărul de sesiuni ținute până în prezent.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // ==========================================
  // VIEW PENTRU PROFESOR — bare orizontale cu allow_non_enrolled
  // ==========================================
  return (
    <Layout user={user} role="professor">
      <div className="p-2 md:p-6 max-w-7xl mx-auto animate-fade-in-up">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A3A52]">Statistici și analiză</h1>
          <p className="text-gray-500 mt-2">Urmărește angajamentul studenților la cursurile tale active.</p>
        </div>

        {/* 4 Carduri */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><BookOpen size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Cursuri/Evenimente</p>
              <h3 className="text-2xl font-bold text-[#1A3A52]">{stats.summary.totalCourses}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-xl"><Users size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Angajament studenți</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[#1A3A52]">{stats.summary.activeStudents}</h3>
                <span className="text-sm text-gray-400 font-medium">/ {stats.summary.totalEnrolled} înscriși</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-[#00D9B5]/10 text-[#00D9B5] rounded-xl"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Prezență medie (Cursuri)</p>
              <h3 className="text-2xl font-bold text-[#1A3A52]">{stats.summary.averageAttendance}%</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-orange-50 text-orange-500 rounded-xl"><Users size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Vizitatori</p>
              <h3 className="text-2xl font-bold text-[#1A3A52]">{stats.summary.totalGuests}</h3>
            </div>
          </div>
        </div>

        {/* Grafic orizontal */}
        {stats.courseStats.length > 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-[#00D9B5]" size={24} />
                <h2 className="text-xl font-bold text-[#1A3A52]">Rată prezență per curs</h2>
              </div>
              <span className="text-xs font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full uppercase tracking-wider">
                Doar Cursuri Recurente
              </span>
            </div>

            {/* Legendă */}
            <div className="flex flex-col gap-3 mb-6">
              {/* Rând 1 — cursuri deschise */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-[#E6FAF7] border border-[#00D9B5]/20">
                <span className="w-3 h-3 rounded bg-[#00D9B5] inline-block mt-0.5 shrink-0" />
                <div className="text-xs text-[#00876F]">
                  <span className="font-bold">Curs deschis</span> (non-înrolați acceptați) —
                  bara e mereu plină; afișează <span className="font-bold">media de participanți per sesiune</span>, indiferent dacă sunt înscriși sau nu.
                </div>
              </div>
              {/* Rând 2 — cursuri închise */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="w-3 h-3 rounded bg-gray-300 inline-block mt-0.5 shrink-0" />
                <div className="text-xs text-gray-500">
                  <span className="font-bold">Curs închis</span> (doar înrolați) —
                  bara arată <span className="font-bold">procentul de prezență</span> raportat la studenții înscriși:
                  <span className="inline-flex items-center gap-1 ml-2 mr-1"><span className="w-2.5 h-2.5 rounded bg-[#00D9B5] inline-block" /> ≥ 75%</span>
                  <span className="inline-flex items-center gap-1 mr-1"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" /> 50–74%</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400 inline-block" /> &lt; 50%</span>
                </div>
              </div>
            </div>

            {stats.courseStats.map((course, idx) => (
              <HorizontalBar key={idx} course={course} />
            ))}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
            <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-[#1A3A52]">Nu există cursuri recurente active</h3>
            <p className="text-gray-500 mt-2">Graficul va apărea după ce începi sesiuni pentru cursurile cu studenți înscriși.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}