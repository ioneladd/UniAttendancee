// src/utils/exportExcel.js
import { apiCall } from '../api.js'; // <-- Importăm funcția noastră inteligentă

export const exportOverallAttendance = async (course, user) => {
  try {
    // Am șters `const token = ...` de aici
    const sessions = [...(course.history || [])].sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for));
    
    const allAttendanceData = await Promise.all(
      sessions.map(async (s) => {
        // Folosim apiCall, care se ocupă singur de token și headers!
        const res = await apiCall(`/sessions/${s.id}/attendees`);
        const attendees = res.ok ? await res.json() : [];
        
        return { 
          date: new Date(s.scheduled_for).toLocaleDateString('ro-RO'), 
          attendees: attendees.map(a => ({ 
            name: a.name, 
            notes: a.notes || a.observation || "",
            bonus_points: parseFloat(a.bonus_points) || 0 
          })) 
        };
      })
    );

    const allStudentNames = [...new Set(allAttendanceData.flatMap(d => d.attendees.map(a => a.name)))].sort();

    const headerStyle = { fill: { fgColor: { rgb: "1A3A52" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    const nameStyle = { fill: { fgColor: { rgb: "F0F9FF" } }, font: { bold: true }, border: { bottom: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } } };
    const cellStyle = { alignment: { horizontal: "center" }, border: { bottom: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } } };
    const bonusStyle = { fill: { fgColor: { rgb: "E6FFFA" } }, alignment: { horizontal: "center" }, font: { bold: true, color: { rgb: "047857" } }, border: { bottom: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } } };

    const headerRow = ["Nume student", ...allAttendanceData.map(s => s.date), "Total prezențe", "Total bonificații"];
    
    const rows = allStudentNames.map(name => {
      let totalPresence = 0;
      let totalBonus = 0; 
      const studentRow = [{ v: name, t: 's', s: nameStyle }];

      allAttendanceData.forEach(session => {
        const attendanceRecord = session.attendees.find(a => a.name === name);
        const isPresent = !!attendanceRecord;

        if (isPresent) {
          totalPresence++;
          totalBonus += attendanceRecord.bonus_points; 

          const displayValue = attendanceRecord.notes 
            ? `P (${attendanceRecord.notes})` 
            : "P";
          
          studentRow.push({ v: displayValue, t: 's', s: cellStyle });
        } else {
          studentRow.push({ v: "-", t: 's', s: cellStyle });
        }
      });

      studentRow.push({ v: totalPresence, t: 'n', s: { ...cellStyle, font: { bold: true } } });
      studentRow.push({ v: Number(totalBonus.toFixed(2)), t: 'n', s: bonusStyle });
      
      return studentRow;
    });

    const finalData = [headerRow.map(h => ({ v: h, t: 's', s: headerStyle })), ...rows];
    const XLSX = await import('xlsx-js-style');
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);

    worksheet['!cols'] = headerRow.map((col, i) => ({ 
      wch: Math.max(
        col.toString().length, 
        ...rows.map(row => (row[i].v ? row[i].v.toString().length : 0))
      ) + 2 
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prezenta Generala");
    XLSX.writeFile(workbook, `Prezenta_Generala_${course.code || course.name}.xlsx`);
  } catch (error) {
    console.error("Export error:", error);
    alert("Eroare la export.");
  }
};


export const exportSessionAttendance = async (session, course, user) => {
  try {
    // Am șters `const token = ...` de aici
    const dateStr = new Date(session.scheduled_for).toLocaleDateString('ro-RO');
    
    // Folosim apiCall curat!
    const res = await apiCall(`/sessions/${session.id}/attendees`);
    const attendees = res.ok ? await res.json() : [];

    if (attendees.length === 0) return alert("Nu există studenți prezenți în această sesiune.");

    const headerStyle = { fill: { fgColor: { rgb: "1A3A52" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
    const cellStyle = { alignment: { horizontal: "center" }, border: { bottom: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } } };
    const nameStyle = { border: { bottom: { style: "thin", color: { rgb: "D1D5DB" } }, right: { style: "thin", color: { rgb: "D1D5DB" } } } };

    const headerRow = [
      { v: "Nume student", t: 's', s: headerStyle }, 
      { v: "Observații", t: 's', s: headerStyle },
      { v: "Bonificație", t: 's', s: headerStyle }
    ];
    
    const rows = attendees.map(a => [
      { v: a.name, t: 's', s: nameStyle }, 
      { v: a.notes || a.observation || "-", t: 's', s: cellStyle },
      { v: a.bonus_points > 0 ? a.bonus_points : "-", t: a.bonus_points > 0 ? 'n' : 's', s: cellStyle } 
    ]);

    const XLSX = await import('xlsx-js-style');
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
    worksheet['!cols'] = [{ wch: 35 }, { wch: 40 }, { wch: 15 }]; 
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prezenta Sesiune");
    XLSX.writeFile(workbook, `Sesiune_${course.code || 'Export'}_${dateStr.replace(/\//g, '-')}.xlsx`);
  } catch (error) {
    console.error("Eroare export:", error);
  }
};