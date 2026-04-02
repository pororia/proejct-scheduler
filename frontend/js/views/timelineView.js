/**
 * Timeline view - Member monthly allocation overview.
 */

/** start ~ end 구간의 평일(월~금) 수 반환 */
function tlCountWeekdaysInRange(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    // 하루짜리 기간이 주말인 경우 1일로 계산
    if (s.getTime() === e.getTime() && (s.getDay() === 0 || s.getDay() === 6)) return 1;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

/** 배정 기간과 해당 월의 교집합 구간에서 평일 수 × 할당률 반환 */
function tlCalcMDForMonth(year, month, alloc, assignStart, assignEnd) {
    if (!alloc || !assignStart || !assignEnd) return 0;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0);
    const s = new Date(assignStart) > monthStart ? new Date(assignStart) : monthStart;
    const e = new Date(assignEnd)   < monthEnd   ? new Date(assignEnd)   : monthEnd;
    if (s > e) return 0;
    return alloc * tlCountWeekdaysInRange(s, e);
}

const TimelineView = {
    currentYear: new Date().getFullYear(),
    projectColors: {},
    colorIdx: 0,

    async render() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="filter-bar" style="flex-wrap:wrap;gap:8px">
                <label>연도</label>
                <select id="tl-filter-year" class="form-control" style="width:100px">
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
                <label>월</label>
                <select id="tl-filter-month" class="form-control" style="width:80px">
                    <option value="">전체</option>
                    ${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}월</option>`).join('')}
                </select>
                <label>등급</label>
                <select id="tl-filter-grade" class="form-control" style="width:100px">
                    <option value="">전체</option>
                    <option value="초급">초급</option>
                    <option value="중급">중급</option>
                    <option value="고급">고급</option>
                    <option value="특급">특급</option>
                </select>
                <label>기술영역</label>
                <select id="tl-filter-tech" class="form-control" style="width:140px">
                    <option value="">전체</option>
                </select>
                <label>팀</label>
                <select id="tl-filter-team" class="form-control" style="width:120px">
                    <option value="">전체</option>
                </select>
            </div>
            <div class="filter-bar" id="tl-division-bar" style="padding-top:0;gap:12px;flex-wrap:wrap">
                <label style="margin-right:4px">사업부</label>
                <label><input type="radio" name="tl-division" value=""> 전체</label>
            </div>
            <div class="overview-wrapper">
                <table class="overview-table" id="timeline-table">
                    <thead id="tl-thead"></thead>
                    <tbody id="tl-tbody"></tbody>
                </table>
            </div>
        `;

        document.getElementById('tl-filter-year').value = this.currentYear;

        const [techStacks, divisions, teams] = await Promise.all([
            API.getTechStacks(),
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
        ]);

        const techSelect = document.getElementById('tl-filter-tech');
        techStacks.forEach(t => { techSelect.innerHTML += `<option value="${t}">${t}</option>`; });

        const teamSelect = document.getElementById('tl-filter-team');
        teams.forEach(t => {
            teamSelect.innerHTML += `<option value="${t.team}">${t.division ? t.division + ' > ' : ''}${t.team}</option>`;
        });

        const divBar = document.getElementById('tl-division-bar');
        divisions.forEach(d => {
            const lbl = document.createElement('label');
            lbl.innerHTML = `<input type="radio" name="tl-division" value="${d}"> ${d}`;
            divBar.appendChild(lbl);
        });
        divBar.querySelector('input[value=""]').checked = true;

        document.getElementById('tl-filter-year').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-month').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-grade').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-tech').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-team').addEventListener('change', () => this.loadData());
        divBar.addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    async loadData() {
        const year = parseInt(document.getElementById('tl-filter-year').value);
        this.currentYear = year;
        const params = { year };
        const grade    = document.getElementById('tl-filter-grade').value;
        const tech     = document.getElementById('tl-filter-tech').value;
        const team     = document.getElementById('tl-filter-team').value;
        const divRadio = document.querySelector('input[name="tl-division"]:checked');
        const division = divRadio ? divRadio.value : '';

        if (grade)    params.grade = grade;
        if (tech)     params.tech_stack = tech;
        if (team)     params.team = team;
        if (division) params.division = division;

        const members = await API.getMemberOverview(params);
        this.renderTable(members, year);
    },

    getProjectColor(projectName) {
        if (!this.projectColors[projectName]) {
            this.projectColors[projectName] = this.colorIdx % 10;
            this.colorIdx++;
        }
        return this.projectColors[projectName];
    },

    renderTable(members, year) {
        const monthFilter = parseInt(document.getElementById('tl-filter-month')?.value) || 0;
        const isDaily = monthFilter > 0;
        const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

        // ── 컬럼 목록 ─────────────────────────────────────────
        let columns = [];
        if (isDaily) {
            const daysInMonth = new Date(year, monthFilter, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dow = new Date(year, monthFilter - 1, d).getDay();
                const dateStr = `${year}-${String(monthFilter).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                columns.push({ day: d, dow, isWeekend: dow === 0 || dow === 6, dateStr, dowLabel: DOW_LABELS[dow] });
            }
        } else {
            for (let m = 1; m <= 12; m++)
                columns.push({ year, month: m, key: `${year}-${String(m).padStart(2,'0')}` });
        }

        // ── 헤더 ──────────────────────────────────────────────
        const thead = document.getElementById('tl-thead');
        if (isDaily) {
            thead.innerHTML = `<tr>
                <th class="fixed-col" style="left:0;min-width:80px">담당자</th>
                <th class="fixed-col" style="left:80px;min-width:80px">사업부</th>
                <th class="fixed-col" style="left:160px;min-width:80px">팀명</th>
                <th class="fixed-col" style="left:240px;min-width:50px">등급</th>
                <th class="fixed-col" style="left:290px;min-width:100px">기술영역</th>
                <th style="min-width:55px">M/M</th>
                <th style="min-width:45px">M/D</th>
                ${columns.map(c => `<th class="month-cell${c.isWeekend ? ' weekend-col' : ''}" style="min-width:28px;padding:2px;line-height:1.4">
                    <div style="font-size:12px">${c.day}</div>
                    <div style="font-size:10px;color:${c.dow===0?'#ef4444':c.dow===6?'#3b82f6':'var(--gray-400)'}">${c.dowLabel}</div>
                </th>`).join('')}
            </tr>`;
        } else {
            thead.innerHTML = `
                <tr>
                    <th class="fixed-col" style="left:0;min-width:80px" rowspan="2">담당자</th>
                    <th class="fixed-col" style="left:80px;min-width:80px" rowspan="2">사업부</th>
                    <th class="fixed-col" style="left:160px;min-width:80px" rowspan="2">팀명</th>
                    <th class="fixed-col" style="left:240px;min-width:50px" rowspan="2">등급</th>
                    <th class="fixed-col" style="left:290px;min-width:100px" rowspan="2">기술영역</th>
                    <th style="min-width:55px" rowspan="2">M/M</th>
                    <th style="min-width:45px" rowspan="2">M/D</th>
                    <th class="month-cell" colspan="12">${year}년</th>
                </tr>
                <tr>
                    ${columns.map(m => `<th class="month-cell">${m.month}월</th>`).join('')}
                </tr>
            `;
        }

        // ── 날짜 활성 여부 (일별 모드) ────────────────────────
        const isActiveOnDate = (d, dateStr) => {
            const dow = new Date(dateStr).getDay();
            const isWeekend = dow === 0 || dow === 6;
            const periods = d.periods && d.periods.length > 0 ? d.periods : null;
            if (periods) {
                return periods.some(p => {
                    if (p.start_date > dateStr || dateStr > p.end_date) return false;
                    if (isWeekend && p.start_date !== p.end_date) return false;
                    return true;
                });
            }
            if (d.start_date && d.end_date) {
                if (isWeekend) return false;
                return d.start_date <= dateStr && dateStr <= d.end_date;
            }
            return false;
        };

        // ── 합계 초기화 ───────────────────────────────────────
        const colSums = {};
        columns.forEach(c => { colSums[isDaily ? c.dateStr : c.key] = 0; });

        // ── 행 렌더링 ─────────────────────────────────────────
        const tbody = document.getElementById('tl-tbody');
        let rows = '';

        for (const member of members) {
            let memberTotalMD = 0;
            let memberTotalMM = 0;

            if (isDaily) {
                const monthKey = `${year}-${String(monthFilter).padStart(2,'0')}`;
                const data = member.monthly_data[monthKey] || [];
                data.forEach(d => {
                    const periods = d.periods && d.periods.length > 0 ? d.periods : null;
                    if (periods) {
                        periods.forEach(p => { memberTotalMD += tlCalcMDForMonth(year, monthFilter, d.allocation, p.start_date, p.end_date); });
                    } else {
                        memberTotalMD += tlCalcMDForMonth(year, monthFilter, d.allocation, d.start_date, d.end_date);
                    }
                });
                memberTotalMM = Math.min(1.0, memberTotalMD / 20);
            } else {
                columns.forEach(m => {
                    const data = member.monthly_data[m.key] || [];
                    let monthMD = 0;
                    data.forEach(d => {
                        const periods = d.periods && d.periods.length > 0 ? d.periods : null;
                        if (periods) {
                            periods.forEach(p => { monthMD += tlCalcMDForMonth(m.year, m.month, d.allocation, p.start_date, p.end_date); });
                        } else {
                            monthMD += tlCalcMDForMonth(m.year, m.month, d.allocation, d.start_date, d.end_date);
                        }
                    });
                    if (monthMD > 0) {
                        memberTotalMD += monthMD;
                        memberTotalMM += monthMD >= 20 ? 1 : monthMD / 20;
                    }
                });
            }

            rows += '<tr>';
            rows += `<td class="fixed-col text-left" style="left:0;min-width:80px;font-weight:600">${member.name}</td>`;
            rows += `<td class="fixed-col text-left" style="left:80px;min-width:80px">${member.division || ''}</td>`;
            rows += `<td class="fixed-col text-left" style="left:160px;min-width:80px">${member.team || ''}</td>`;
            rows += `<td class="fixed-col" style="left:240px;min-width:50px">${member.grade || ''}</td>`;
            rows += `<td class="fixed-col text-left" style="left:290px;font-size:11px">${member.skills.join(', ')}</td>`;
            rows += `<td style="text-align:right">${memberTotalMM > 0 ? memberTotalMM.toFixed(2) : ''}</td>`;
            rows += `<td style="text-align:right">${memberTotalMD > 0 ? Math.round(memberTotalMD) : ''}</td>`;

            if (isDaily) {
                const monthKey = `${year}-${String(monthFilter).padStart(2,'0')}`;
                const data = member.monthly_data[monthKey] || [];
                columns.forEach(col => {
                    const activeData = data.filter(d => isActiveOnDate(d, col.dateStr));
                    if (col.isWeekend) {
                        if (activeData.length > 0) {
                            const cellContent = activeData.map(d => {
                                const ci = this.getProjectColor(d.project_name);
                                return `<div class="project-block proj-color-${ci}" title="${d.customer_name} - ${d.project_name}" style="font-size:9px">${(d.customer_name||'').substring(0,4)}</div>`;
                            }).join('');
                            activeData.forEach(d => { colSums[col.dateStr] += d.allocation; });
                            rows += `<td class="timeline-cell weekend-col" style="min-width:28px">${cellContent}</td>`;
                        } else {
                            rows += `<td class="timeline-cell weekend-col" style="min-width:28px"></td>`;
                        }
                        return;
                    }
                    if (activeData.length === 0) {
                        rows += `<td class="timeline-cell available" style="min-width:28px"></td>`;
                    } else {
                        const totalAlloc = activeData.reduce((s, d) => s + d.allocation, 0);
                        colSums[col.dateStr] += totalAlloc;
                        const overloaded = totalAlloc > 1.0 ? 'overloaded' : '';
                        const cellContent = activeData.map(d => {
                            const ci = this.getProjectColor(d.project_name);
                            return `<div class="project-block proj-color-${ci}" title="${d.customer_name} - ${d.project_name}" style="font-size:9px">${(d.customer_name||'').substring(0,4)}</div>`;
                        }).join('');
                        rows += `<td class="timeline-cell ${overloaded}" style="min-width:28px">${cellContent}</td>`;
                    }
                });
            } else {
                columns.forEach(m => {
                    const data = member.monthly_data[m.key] || [];
                    const totalAlloc = data.reduce((s, d) => s + d.allocation, 0);
                    colSums[m.key] += totalAlloc;

                    if (data.length === 0) {
                        rows += `<td class="timeline-cell available"></td>`;
                    } else {
                        const overloaded = totalAlloc > 1.0 ? 'overloaded' : '';
                        const cellContent = data.map(d => {
                            const ci = this.getProjectColor(d.project_name);
                            const shortName = (d.customer_name || '').substring(0, 4);
                            let entryMD = 0;
                            const periods = d.periods && d.periods.length > 0 ? d.periods : null;
                            if (periods) {
                                periods.forEach(p => { entryMD += tlCalcMDForMonth(m.year, m.month, d.allocation, p.start_date, p.end_date); });
                            } else {
                                entryMD = tlCalcMDForMonth(m.year, m.month, d.allocation, d.start_date, d.end_date);
                            }
                            const mdLabel = entryMD > 0 ? ` | M/D: ${Math.round(entryMD)}일` : '';
                            return `<div class="project-block proj-color-${ci}" title="${d.customer_name} - ${d.project_name}${mdLabel}">${shortName}</div>`;
                        }).join('');
                        rows += `<td class="timeline-cell ${overloaded}">${cellContent}</td>`;
                    }
                });
            }
            rows += '</tr>';
        }

        // ── 합계 행 ───────────────────────────────────────────
        rows += '<tr class="summary-row">';
        rows += `<td class="fixed-col" style="left:0" colspan="5"><strong>${isDaily ? '일별 총 투입' : '월별 총 투입'}</strong></td>`;
        rows += `<td colspan="2"></td>`;
        if (isDaily) {
            columns.forEach(col => {
                if (col.isWeekend) {
                    rows += `<td class="month-cell weekend-col" style="min-width:28px"></td>`;
                    return;
                }
                const v = colSums[col.dateStr] || 0;
                rows += `<td class="month-cell" style="min-width:28px;font-size:11px">${v > 0 ? v.toFixed(1) : ''}</td>`;
            });
        } else {
            columns.forEach(m => {
                const v = colSums[m.key];
                rows += `<td class="month-cell">${v > 0 ? v.toFixed(1) : ''}</td>`;
            });
        }
        rows += '</tr>';

        tbody.innerHTML = rows;
    },
};
