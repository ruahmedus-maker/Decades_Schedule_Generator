import type { Schedule, Bartender, TargetShifts, EarningsMap, SummaryData, DayOfWeek } from '../types';

function getWeekData(schedule: Schedule, week: number) {
    return schedule.filter(s => s.week === week);
}

function calculateSummaryData(schedule: Schedule, bartenders: Bartender[], earningsMap: EarningsMap): SummaryData[] {
    const summary: Record<string, { shiftCount: number; totalEarnings: number }> = 
        bartenders.reduce((acc, b) => ({ ...acc, [b.name]: { shiftCount: 0, totalEarnings: 0 } }), {});

    schedule.forEach(entry => {
        const { floor, bar, day, bartenders: assigned } = entry;
        const earnings = earningsMap[floor]?.[bar]?.[day] || 0;
        
        assigned.forEach(name => {
            if (summary[name]) {
                summary[name].shiftCount++;
                summary[name].totalEarnings += earnings;
            }
        });
    });

    return bartenders.map(bartender => {
        const data = summary[bartender.name];
        return {
            name: bartender.name,
            shiftCount: data.shiftCount,
            totalEarnings: data.totalEarnings,
            averageEarnings: data.shiftCount > 0 ? data.totalEarnings / data.shiftCount : 0,
        };
    }).sort((a,b) => a.name.localeCompare(b.name));
}

function generateSummarySection(summaryData: SummaryData[], targetShifts: TargetShifts): string {
    let html = `<div class="section">
        <h2 class="section-title">📊 Bartender Summary & Target Analysis</h2>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Bartender</th>
                    <th>Total Shifts</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Total Earnings</th>
                    <th>Avg. Per Shift</th>
                </tr>
            </thead>
            <tbody>`;

    summaryData.forEach(data => {
        const { name, shiftCount, totalEarnings, averageEarnings } = data;
        const target = targetShifts[name] || 0;
        const onTrack = shiftCount >= target;
        const statusClass = onTrack ? 'target-met' : 'target-missed';
        const statusText = onTrack ? `✔ Met` : `❌ Needs ${Math.max(0, target - shiftCount)}`;
        html += `
            <tr>
                <td>${name}</td>
                <td>${shiftCount}</td>
                <td>${target}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>$${totalEarnings.toFixed(2)}</td>
                <td>$${averageEarnings.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `</tbody></table></div>`;
    return html;
}

const DAY_ORDER: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Sun_Night'];
const FLOOR_ORDER = ['Rooftop', 'Hip Hop', "2010's", "2000's"];

function generateWeeklySections(schedule: Schedule): string {
    let html = `<div class="section">
        <h2 class="section-title">🗓️ Weekly Schedules</h2>`;

    for (let i = 1; i <= 4; i++) {
        const weekSchedule = getWeekData(schedule, i);
        if (weekSchedule.length === 0) continue;

        const scheduleGrid: Record<string, Record<string, string[]>> = {};
        
        const daysInWeek = Array.from(new Set(weekSchedule.map(entry => entry.day)))
                                 .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

        weekSchedule.forEach(entry => {
            const key = `${entry.floor} / ${entry.bar}`;
            if (!scheduleGrid[key]) scheduleGrid[key] = {};
            scheduleGrid[key][entry.day] = entry.bartenders;
        });

        const uniqueKeys = Object.keys(scheduleGrid).sort((a, b) => {
            const [floorA, barA] = a.split(' / ');
            const [floorB, barB] = b.split(' / ');
            const indexA = FLOOR_ORDER.indexOf(floorA);
            const indexB = FLOOR_ORDER.indexOf(floorB);
        
            if (indexA !== indexB) {
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            }
            return barA.localeCompare(barB);
        });

        html += `<div class="week-table">
            <h3 class="week-title">Week ${i}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Shift (Floor / Bar)</th>
                        ${daysInWeek.map(d => `<th>${d.replace('_', ' ')}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>`;

        uniqueKeys.forEach(key => {
            const [floor, bar] = key.split(' / ');
            const floorClass = `floor-${floor.toLowerCase().replace(/'s/g, '').replace(/\s+/g, '-')}`;
            html += `<tr class="${floorClass}">
                <td><strong>${floor}</strong><br><span class="bar-name">${bar}</span></td>`;
            daysInWeek.forEach(day => {
                const bartenders = scheduleGrid[key][day] || [];
                html += `<td contenteditable="true" class="editable-cell">${bartenders.join('<br>')}</td>`;
            });
            html += `</tr>`;
        });
        
        html += `</tbody></table></div>`;
    }

    html += `</div>`;
    return html;
}

export function exportScheduleToHtml(schedule: Schedule, bartenders: Bartender[], targetShifts: TargetShifts, title: string, earningsMap: EarningsMap) {
  const summaryData = calculateSummaryData(schedule, bartenders, earningsMap);
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Schedule Report: ${title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f7f6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 1400px; margin: auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { text-align: center; border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; color: #2c3e50; margin: 0; }
        .header p { color: #7f8c8d; font-size: 1.1em; }
        .section-title { font-size: 1.8em; color: #34495e; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #3498db; }
        table { width: 100%; border-collapse: collapse; font-size: 0.95em; }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #ecf0f1; color: #34495e; font-weight: 600; }
        tbody tr:nth-child(even) { background-color: #f9f9f9; }
        tbody tr:hover { background-color: #f1f1f1; }
        .week-table { margin-bottom: 40px; }
        .week-title { font-size: 1.4em; background-color: #3498db; color: white; padding: 10px 15px; border-radius: 6px; margin-bottom: 15px; }
        .bar-name { font-size: 0.9em; color: #555; }
        .target-met { color: #27ae60; font-weight: bold; }
        .target-missed { color: #c0392b; font-weight: bold; }
        .bartender-tier { font-size: 0.8em; color: #95a5a6; }
        .floor-rooftop { background-color: rgba(252, 228, 236, 0.4); }
        .floor-hip-hop { background-color: rgba(255, 243, 224, 0.4); }
        .floor-2010s { background-color: rgba(227, 242, 253, 0.4); }
        .floor-2000s { background-color: rgba(232, 245, 233, 0.4); }
        .editable-cell { cursor: text; background-color: rgba(255, 253, 208, 0.5); }
        .editable-cell:focus { outline: 2px solid #3498db; background-color: #fff; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
            <h1>Bartender Schedule Report</h1>
            <p>${title}<br><small>(Note: Shift cells in the weekly schedule are editable for minor adjustments)</small></p>
        </div>
        ${generateSummarySection(summaryData, targetShifts)}
        ${generateWeeklySections(schedule)}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `schedule-report-${title.replace(/\s+/g, '-')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
