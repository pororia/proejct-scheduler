/**
 * Timeline view - Member monthly allocation overview.
 */

// 토글 가능한 열 정의 (담당자는 항상 표시)
const TL_COL_DEFS = [
    { key: 'division', label: '사업부' },
    { key: 'team',     label: '팀명'   },
    { key: 'grade',    label: '등급'   },
    { key: 'skills',   label: '기술영역' },
    { key: 'mm',       label: 'M/M'   },
    { key: 'md',       label: 'M/D'   },
];

/** start ~ end 구간의 일 수 반환. includeWeekends=true 이면 주말도 포함 */
function tlCountWeekdaysInRange(start, end, includeWeekends = false) {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    if (s > e) return 0;
    let count = 0;
    const cur = new Date(s);
    while (cur <= e) {
        const dow = cur.getDay();
        if (includeWeekends || (dow !== 0 && dow !== 6)) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

/** 배정 기간과 해당 월의 교집합 구간에서 일 수 × 할당률 반환.
 *  원본 투입 기간이 2일 이하인 경우 주말도 포함해서 계산. */
function tlCalcMDForMonth(year, month, alloc, assignStart, assignEnd) {
    if (!alloc || !assignStart || !assignEnd) return 0;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0);
    const origS = new Date(assignStart);
    const origE = new Date(assignEnd);
    origS.setHours(0, 0, 0, 0);
    origE.setHours(0, 0, 0, 0);
    const origDays = Math.round((origE - origS) / 86400000) + 1;
    const s = origS > monthStart ? origS : monthStart;
    const e = origE < monthEnd   ? origE : monthEnd;
    if (s > e) return 0;
    return alloc * tlCountWeekdaysInRange(s, e, origDays <= 2);
}

const TimelineView = {
    currentYear: new Date().getFullYear(),
    projectColors: {},
    colorIdx: 0,
    selectedDivision: '',
    hiddenCols: new Set(JSON.parse(localStorage.getItem('tl_hidden_cols') || '[]')),
    _baseMembers: [],

    // sticky 컬럼 순서와 너비 (left 재계산용)
    _TL_STICKY: [
        { key: null,       width: 80  }, // 담당자 (항상 표시)
        { key: 'division', width: 80  },
        { key: 'team',     width: 80  },
        { key: 'grade',    width: 50  },
        { key: 'skills',   width: 100 },
    ],

    toggleCol(key) {
        if (this.hiddenCols.has(key)) this.hiddenCols.delete(key);
        else this.hiddenCols.add(key);
        localStorage.setItem('tl_hidden_cols', JSON.stringify([...this.hiddenCols]));
        this._applyColVisibility();
    },

    resetAllCols() {
        this.hiddenCols.clear();
        localStorage.setItem('tl_hidden_cols', '[]');
        this._applyColVisibility();
    },

    toggleColPanel() {
        const panel = document.getElementById('tl-col-panel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    _recalcStickyLeft() {
        let left = 0;
        this._TL_STICKY.forEach(({ key, width }) => {
            if (key === null || !this.hiddenCols.has(key)) {
                if (key !== null) {
                    document.querySelectorAll(`.tl-col-${key}`).forEach(el => {
                        el.style.left = `${left}px`;
                    });
                }
                left += width;
            }
        });
    },

    _applyColVisibility() {
        const hiddenCount = this.hiddenCols.size;
        const badge = document.getElementById('tl-col-hidden-badge');
        if (badge) {
            badge.style.display = hiddenCount > 0 ? 'inline' : 'none';
            badge.textContent   = hiddenCount;
        }

        TL_COL_DEFS.forEach(({ key }) => {
            const hidden = this.hiddenCols.has(key);
            document.querySelectorAll(`.tl-col-${key}`).forEach(el => {
                el.style.display = hidden ? 'none' : '';
            });
        });

        this._recalcStickyLeft();

        const panelItems = document.getElementById('tl-col-panel-items');
        if (!panelItems) return;
        panelItems.innerHTML = TL_COL_DEFS.map(({ key, label }) => {
            const hidden = this.hiddenCols.has(key);
            return `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0">
                    <input type="checkbox" ${hidden ? '' : 'checked'}
                        style="width:15px;height:15px;accent-color:var(--primary);cursor:pointer"
                        onchange="TimelineView.toggleCol('${key}')">
                    <span style="font-size:13px;color:${hidden ? 'var(--gray-400)' : 'var(--gray-700)'};font-weight:${hidden ? '400' : '500'}">${label}</span>
                    ${hidden ? '<span style="font-size:11px;color:var(--gray-400)">(숨김)</span>' : ''}
                </label>
            `;
        }).join('');
    },

    selectDivision(div) {
        this.selectedDivision = div;
        document.querySelectorAll('.tl-division-chip').forEach(btn => {
            const active = btn.dataset.value === div;
            btn.style.background  = active ? 'var(--primary)' : 'white';
            btn.style.color       = active ? 'white' : 'var(--gray-600)';
            btn.style.borderColor = active ? 'var(--primary)' : 'var(--gray-200)';
            btn.style.fontWeight  = active ? '600' : '500';
        });
        this.loadData();
    },

    _renderDivisionChips(divisions) {
        const group = document.getElementById('tl-division-radio-group');
        if (!group) return;
        const sel = this.selectedDivision;
        const allDivs = ['', ...divisions];
        group.innerHTML = allDivs.map(div => {
            const active = div === sel;
            const label  = div || '전체';
            return `<button class="tl-division-chip" data-value="${div}"
                onclick="TimelineView.selectDivision('${div}')"
                style="padding:4px 14px;border-radius:20px;border:1.5px solid;font-size:12px;cursor:pointer;transition:all 0.15s;
                background:${active ? 'var(--primary)' : 'white'};
                color:${active ? 'white' : 'var(--gray-600)'};
                border-color:${active ? 'var(--primary)' : 'var(--gray-200)'};
                font-weight:${active ? '600' : '500'}">${label}</button>`;
        }).join('');
    },

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
                <select id="tl-search-field" class="form-control" style="width:110px">
                    <option value="member">담당자명</option>
                    <option value="project">프로젝트명</option>
                    <option value="customer">고객사</option>
                </select>
                <input type="text" id="tl-search-input" class="form-control" placeholder="검색어 입력..." style="width:180px">
                <div style="margin-left:auto;position:relative">
                    <button id="tl-col-settings-btn" onclick="TimelineView.toggleColPanel()"
                        style="display:flex;align-items:center;gap:5px;padding:6px 12px;background:white;border:1.5px solid var(--gray-200);border-radius:8px;font-size:13px;font-weight:600;color:var(--gray-600);cursor:pointer">
                        <span>⚙</span> 열 설정
                        <span id="tl-col-hidden-badge" style="display:none;background:var(--primary);color:white;border-radius:10px;padding:1px 6px;font-size:11px"></span>
                    </button>
                    <div id="tl-col-panel" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:white;border:1.5px solid var(--gray-200);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:14px 16px;z-index:50;min-width:180px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                            <span style="font-size:12px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px">열 표시 설정</span>
                            <button onclick="TimelineView.resetAllCols()" style="font-size:11px;color:var(--primary);background:none;border:none;cursor:pointer;font-weight:600">전체 표시</button>
                        </div>
                        <div id="tl-col-panel-items" style="display:flex;flex-direction:column;gap:6px"></div>
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:white;border:1.5px solid var(--gray-100);border-radius:12px;margin-bottom:8px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:600;color:var(--gray-500);white-space:nowrap;min-width:64px">담당 사업부</span>
                <div id="tl-division-radio-group" style="display:flex;gap:6px;flex-wrap:wrap"></div>
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

        this._renderDivisionChips(divisions);

        document.getElementById('tl-filter-year').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-month').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-grade').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-tech').addEventListener('change', () => this.loadData());
        document.getElementById('tl-filter-team').addEventListener('change', () => this.loadData());
        document.getElementById('tl-search-field').addEventListener('change', () => this._doRender(this.currentYear));
        document.getElementById('tl-search-input').addEventListener('input', () => this._doRender(this.currentYear));

        // 패널 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('tl-col-panel');
            const btn   = document.getElementById('tl-col-settings-btn');
            if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
                panel.style.display = 'none';
            }
        });

        await this.loadData();
    },

    async loadData() {
        const year = parseInt(document.getElementById('tl-filter-year').value);
        this.currentYear = year;
        const params = { year };
        const grade    = document.getElementById('tl-filter-grade').value;
        const tech     = document.getElementById('tl-filter-tech').value;
        const team     = document.getElementById('tl-filter-team').value;
        const division = this.selectedDivision;

        if (grade)    params.grade = grade;
        if (tech)     params.tech_stack = tech;
        if (team)     params.team = team;
        if (division) params.division = division;

        const members = await API.getMemberOverview(params);
        this._baseMembers = members;
        this._doRender(year);
    },

    _doRender(year) {
        const field = document.getElementById('tl-search-field')?.value || 'member';
        const text  = (document.getElementById('tl-search-input')?.value || '').toLowerCase().trim();
        let data = this._baseMembers;
        if (text) {
            data = data.filter(d => {
                if (field === 'member')  return (d.name || '').toLowerCase().includes(text);
                if (field === 'project') return Object.values(d.monthly_data || {}).flat()
                    .some(item => (item.project_name || '').toLowerCase().includes(text));
                if (field === 'customer') return Object.values(d.monthly_data || {}).flat()
                    .some(item => (item.customer_name || '').toLowerCase().includes(text));
                return false;
            });
        }
        this.renderTable(data, year);
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
                <th class="fixed-col tl-col-division" style="left:80px;min-width:80px">사업부</th>
                <th class="fixed-col tl-col-team" style="left:160px;min-width:80px">팀명</th>
                <th class="fixed-col tl-col-grade" style="left:240px;min-width:50px">등급</th>
                <th class="fixed-col tl-col-skills" style="left:290px;min-width:100px">기술영역</th>
                <th class="tl-col-mm" style="min-width:55px">M/M</th>
                <th class="tl-col-md" style="min-width:45px">M/D</th>
                ${columns.map(c => `<th class="month-cell${c.isWeekend ? ' weekend-col' : ''}" style="min-width:28px;padding:2px;line-height:1.4">
                    <div style="font-size:12px">${c.day}</div>
                    <div style="font-size:10px;color:${c.dow===0?'#ef4444':c.dow===6?'#3b82f6':'var(--gray-400)'}">${c.dowLabel}</div>
                </th>`).join('')}
            </tr>`;
        } else {
            thead.innerHTML = `
                <tr>
                    <th class="fixed-col" style="left:0;min-width:80px" rowspan="2">담당자</th>
                    <th class="fixed-col tl-col-division" style="left:80px;min-width:80px" rowspan="2">사업부</th>
                    <th class="fixed-col tl-col-team" style="left:160px;min-width:80px" rowspan="2">팀명</th>
                    <th class="fixed-col tl-col-grade" style="left:240px;min-width:50px" rowspan="2">등급</th>
                    <th class="fixed-col tl-col-skills" style="left:290px;min-width:100px" rowspan="2">기술영역</th>
                    <th class="tl-col-mm" style="min-width:55px" rowspan="2">M/M</th>
                    <th class="tl-col-md" style="min-width:45px" rowspan="2">M/D</th>
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
        const colSumsMD = {};
        const colSumsMM = {};
        columns.forEach(c => {
            const k = isDaily ? c.dateStr : c.key;
            colSums[k] = 0;
            colSumsMD[k] = 0;
            colSumsMM[k] = 0;
        });

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
            rows += `<td class="fixed-col text-left tl-col-division" style="left:80px;min-width:80px">${member.division || ''}</td>`;
            rows += `<td class="fixed-col text-left tl-col-team" style="left:160px;min-width:80px">${member.team || ''}</td>`;
            rows += `<td class="fixed-col tl-col-grade" style="left:240px;min-width:50px">${member.grade || ''}</td>`;
            rows += `<td class="fixed-col text-left tl-col-skills" style="left:290px;font-size:11px">${member.skills.join(', ')}</td>`;
            rows += `<td class="tl-col-mm" style="text-align:right">${memberTotalMM > 0 ? memberTotalMM.toFixed(2) : ''}</td>`;
            rows += `<td class="tl-col-md" style="text-align:right">${memberTotalMD > 0 ? Math.round(memberTotalMD) : ''}</td>`;

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
                            // 월별 총 투입 집계: 프로젝트 건별 M/D → M/M (20일 이상=1.0)
                            colSumsMD[m.key] += entryMD;
                            colSumsMM[m.key] += entryMD >= 20 ? 1.0 : (entryMD > 0 ? entryMD / 20 : 0);
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
        // 숨겨진 sticky 열 수만큼 colspan 조정
        const stickyHidden = ['division','team','grade','skills'].filter(k => this.hiddenCols.has(k)).length;
        const stickyColspan = 5 - stickyHidden;
        const mmmdColspan = (['mm','md'].filter(k => !this.hiddenCols.has(k))).length;
        rows += '<tr class="summary-row">';
        rows += `<td class="fixed-col" style="left:0" colspan="${stickyColspan}"><strong>${isDaily ? '일별 총 투입' : '월별 총 투입'}</strong></td>`;
        if (mmmdColspan > 0) rows += `<td colspan="${mmmdColspan}"></td>`;
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
                const md = colSumsMD[m.key] || 0;
                const mm = colSumsMM[m.key] || 0;
                if (md <= 0 && mm <= 0) {
                    rows += `<td class="month-cell"></td>`;
                } else {
                    rows += `<td class="month-cell" style="padding:3px 4px;line-height:1.5">
                        <div style="font-weight:700;font-size:12px;color:var(--primary)">${mm.toFixed(2)}</div>
                        <div style="font-size:10px;color:var(--gray-500)">${Math.round(md)}일</div>
                    </td>`;
                }
            });
        }
        rows += '</tr>';

        tbody.innerHTML = rows;

        // 저장된 열 숨김 상태 적용
        this._applyColVisibility();
    },
};
