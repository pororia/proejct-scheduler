/**
 * Dashboard view - Project overview with monthly Gantt chart.
 */

/** 해당 연월의 평일(월~금) 수를 반환 */
function countWeekdays(year, month) {
    return countWeekdaysInRange(
        new Date(year, month - 1, 1),
        new Date(year, month, 0)
    );
}

/** start ~ end 구간의 평일(월~금) 수를 반환 (Date 또는 날짜 문자열) */
function countWeekdaysInRange(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    // 하루짜리 기간이 주말인 경우 1일로 계산 (반복일정 등)
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

/**
 * 배정 기간(assignStart~assignEnd)과 해당 월의 교집합 구간에서
 * 평일 수 × 할당률을 반환
 */
function calcMDForMonth(year, month, alloc, assignStart, assignEnd) {
    if (!alloc || !assignStart || !assignEnd) return 0;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month, 0);
    const s = new Date(assignStart) > monthStart ? new Date(assignStart) : monthStart;
    const e = new Date(assignEnd)   < monthEnd   ? new Date(assignEnd)   : monthEnd;
    if (s > e) return 0;
    return alloc * countWeekdaysInRange(s, e);
}

/** 프로젝트 유형별 셀 색상 (background;color) */
const PTYPE_COLORS = {
    '프로젝트':   'background:#dbeafe;color:#1e40af',
    '유지보수':   'background:#dcfce7;color:#166534',
    'BMT':       'background:#fed7aa;color:#c2410c',
    'PoC':       'background:#fef9c3;color:#854d0e',
    '티켓베이스': 'background:#ccfbf1;color:#134e4a',
    '하자보수':   'background:#fce7f3;color:#9d174d',
};

// 열 정의: key, 표시명, colgroup class
const COL_DEFS = [
    { key: 'confirmed',   label: '확정' },
    { key: 'customer',    label: '고객사' },
    { key: 'budget',      label: '규모' },
    { key: 'ptype',       label: '유형' },
    { key: 'projname',    label: '프로젝트명' },
    { key: 'member',      label: '담당자' },
    { key: 'tech',        label: '기술' },
    { key: 'grade',       label: '등급' },
    { key: 'role',        label: '역할' },
    { key: 'mm',          label: 'M/M' },
    { key: 'md',          label: 'M/D' },
];

const DashboardView = {
    currentYear: new Date().getFullYear(),
    filters: {},
    hiddenIds: new Set(JSON.parse(localStorage.getItem('db_hidden_projects') || '[]')),
    hiddenCols: new Set(JSON.parse(localStorage.getItem('db_hidden_cols') || '[]')),
    kpiVisible: localStorage.getItem('db_kpi_visible') !== 'false',

    toggleKpi() {
        this.kpiVisible = !this.kpiVisible;
        localStorage.setItem('db_kpi_visible', this.kpiVisible);
        this._applyKpiVisibility();
    },

    _applyKpiVisibility() {
        const section = document.getElementById('kpi-section');
        const btn     = document.getElementById('kpi-toggle-btn');
        if (!section || !btn) return;
        section.style.display = this.kpiVisible ? '' : 'none';
        btn.textContent = this.kpiVisible ? '▲ KPI 숨기기' : '▼ KPI 표시';
        btn.style.color = this.kpiVisible ? 'var(--gray-500)' : 'var(--primary)';
    },

    toggleHide(id) {
        if (this.hiddenIds.has(id)) this.hiddenIds.delete(id);
        else this.hiddenIds.add(id);
        localStorage.setItem('db_hidden_projects', JSON.stringify([...this.hiddenIds]));
        this.loadData();
    },

    toggleCol(key) {
        if (this.hiddenCols.has(key)) this.hiddenCols.delete(key);
        else this.hiddenCols.add(key);
        localStorage.setItem('db_hidden_cols', JSON.stringify([...this.hiddenCols]));
        this._applyColVisibility();
    },

    resetAllCols() {
        this.hiddenCols.clear();
        localStorage.setItem('db_hidden_cols', '[]');
        this._applyColVisibility();
    },

    toggleColPanel() {
        const panel = document.getElementById('db-col-panel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    // sticky 고정 컬럼 순서와 너비 (숨김 여부에 따라 left 재계산)
    _STICKY: [
        { key: null,        width: 30  },
        { key: 'confirmed', width: 50  },
        { key: 'customer',  width: 100 },
        { key: 'budget',    width: 50  },
    ],

    _recalcStickyLeft() {
        let left = 0;
        this._STICKY.forEach(({ key, width }) => {
            if (key === null || !this.hiddenCols.has(key)) {
                if (key !== null) {
                    document.querySelectorAll(`.db-col-${key}`).forEach(el => {
                        el.style.left = `${left}px`;
                    });
                }
                left += width;
            }
        });
    },

    _applyColVisibility() {
        const hiddenCount = this.hiddenCols.size;

        // 배지 업데이트
        const badge = document.getElementById('db-col-hidden-badge');
        if (badge) {
            badge.style.display = hiddenCount > 0 ? 'inline' : 'none';
            badge.textContent   = hiddenCount;
        }

        // 테이블 열 표시/숨김
        COL_DEFS.forEach(({ key }) => {
            const hidden = this.hiddenCols.has(key);
            document.querySelectorAll(`.db-col-${key}`).forEach(el => {
                // CSS 클래스 + inline display 강제 적용 (sticky 컬럼 대응)
                el.classList.toggle('db-col-hidden', hidden);
                el.style.display = hidden ? 'none' : '';
            });
            const btn = document.getElementById(`db-colbtn-${key}`);
            if (btn) {
                btn.title       = '열 숨기기';
                btn.textContent = '◀';
                btn.style.color = 'var(--gray-300)';
            }
        });

        // sticky 컬럼 left 위치 재계산
        this._recalcStickyLeft();

        // 패널 아이템 렌더링
        const panelItems = document.getElementById('db-col-panel-items');
        if (!panelItems) return;
        panelItems.innerHTML = COL_DEFS.map(({ key, label }) => {
            const hidden = this.hiddenCols.has(key);
            return `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 0">
                    <input type="checkbox" ${hidden ? '' : 'checked'}
                        style="width:15px;height:15px;accent-color:var(--primary);cursor:pointer"
                        onchange="DashboardView.toggleCol('${key}')">
                    <span style="font-size:13px;color:${hidden ? 'var(--gray-400)' : 'var(--gray-700)'};font-weight:${hidden ? '400' : '500'}">${label}</span>
                    ${hidden ? '<span style="font-size:11px;color:var(--gray-400)">(숨김)</span>' : ''}
                </label>
            `;
        }).join('');
    },

    async render() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div id="kpi-section">
                <div class="kpi-grid" id="kpi-cards"></div>
            </div>
            <div class="filter-bar">
                <label>연도</label>
                <select id="filter-year" class="form-control" style="width:100px">
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
                <label>월</label>
                <select id="filter-month" class="form-control" style="width:80px">
                    <option value="">전체</option>
                    ${Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}월</option>`).join('')}
                </select>
                <label>확정여부</label>
                <select id="filter-confirmed" class="form-control" style="width:100px">
                    <option value="">전체</option>
                    <option value="O">O (확정)</option>
                    <option value="?">? (미확정)</option>
                    <option value="X">X (취소)</option>
                    <option value="미정">미정</option>
                </select>
                <label>구축항목</label>
                <select id="filter-tech" class="form-control" style="width:140px">
                    <option value="">전체</option>
                </select>
                <label>진행현황</label>
                <select id="filter-status" class="form-control" style="width:120px">
                    <option value="">전체</option>
                </select>
                <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                    <button id="kpi-toggle-btn" onclick="DashboardView.toggleKpi()"
                        style="padding:5px 12px;background:white;border:1.5px solid var(--gray-200);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">
                    </button>
                    <label id="hidden-count-label" style="font-size:12px;color:var(--gray-400)"></label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500;color:var(--gray-600)">
                        <input type="checkbox" id="filter-show-hidden" style="width:15px;height:15px;accent-color:var(--primary)">
                        숨긴 항목 표시
                    </label>
                    <div style="position:relative">
                        <button id="db-col-settings-btn" onclick="DashboardView.toggleColPanel()"
                            style="display:flex;align-items:center;gap:5px;padding:6px 12px;background:white;border:1.5px solid var(--gray-200);border-radius:8px;font-size:13px;font-weight:600;color:var(--gray-600);cursor:pointer">
                            <span>⚙</span> 열 설정 <span id="db-col-hidden-badge" style="display:none;background:var(--primary);color:white;border-radius:10px;padding:1px 6px;font-size:11px"></span>
                        </button>
                        <div id="db-col-panel" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:white;border:1.5px solid var(--gray-200);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:14px 16px;z-index:50;min-width:200px">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                                <span style="font-size:12px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px">열 표시 설정</span>
                                <button onclick="DashboardView.resetAllCols()" style="font-size:11px;color:var(--primary);background:none;border:none;cursor:pointer;font-weight:600">전체 표시</button>
                            </div>
                            <div id="db-col-panel-items" style="display:flex;flex-direction:column;gap:6px"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="overview-wrapper">
                <table class="overview-table" id="overview-table">
                    <thead id="overview-thead"></thead>
                    <tbody id="overview-tbody"></tbody>
                </table>
            </div>
        `;

        // Set current year
        document.getElementById('filter-year').value = this.currentYear;

        // Load filter options
        const [techStacks, statuses] = await Promise.all([
            API.getTechStacks(),
            API.getStatuses(),
        ]);
        const techSelect = document.getElementById('filter-tech');
        techStacks.forEach(t => {
            techSelect.innerHTML += `<option value="${t}">${t}</option>`;
        });
        const statusSelect = document.getElementById('filter-status');
        statuses.forEach(s => {
            statusSelect.innerHTML += `<option value="${s}">${s}</option>`;
        });

        // Event listeners
        document.getElementById('filter-year').addEventListener('change', () => this.loadData());
        document.getElementById('filter-month').addEventListener('change', () => this.loadData());
        document.getElementById('filter-confirmed').addEventListener('change', () => this.loadData());
        document.getElementById('filter-tech').addEventListener('change', () => this.loadData());
        document.getElementById('filter-status').addEventListener('change', () => this.loadData());
        document.getElementById('filter-show-hidden').addEventListener('change', () => this.loadData());

        // 패널 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('db-col-panel');
            const btn   = document.getElementById('db-col-settings-btn');
            if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
                panel.style.display = 'none';
            }
        }, { capture: false });

        await this.loadData();
        this._applyKpiVisibility();
    },

    async loadData() {
        const year = parseInt(document.getElementById('filter-year').value);
        this.currentYear = year;
        const params = { year };
        const confirmed = document.getElementById('filter-confirmed').value;
        const tech = document.getElementById('filter-tech').value;
        const status = document.getElementById('filter-status').value;
        if (confirmed) params.confirmed = confirmed;
        if (tech) params.tech_stack = tech;
        if (status) params.status = status;

        const [projects, summary] = await Promise.all([
            API.getProjectOverview(params),
            API.getMonthlySummary(year),
        ]);

        this.renderKPIs(projects, year);
        this.renderTable(projects, year);
    },

    renderKPIs(projects, year) {
        // 숨긴 프로젝트 제외 (표 합계와 동일한 데이터 기준)
        const showHidden = document.getElementById('filter-show-hidden')?.checked;
        const visibleProjects = showHidden ? projects : projects.filter(p => !this.hiddenIds.has(p.id));

        const totalProjects = visibleProjects.length;
        const confirmed = visibleProjects.filter(p => p.confirmed === 'O').length;
        const totalBudget = visibleProjects.reduce((s, p) => s + (p.budget || 0), 0);

        // 선택 연도의 12개월 키 목록 (표 합계와 동일 범위)
        const yearMonthKeys = new Set(
            Array.from({length: 12}, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
        );

        // 담당자별 월별 M/D 합산 후 min(1.0, md/20) 캡 적용 (선택 연도만)
        const memberMonthMD = {};
        for (const p of visibleProjects) {
            for (const a of p.assignments) {
                if (!a.member_id) continue;
                const periods = a.periods && a.periods.length > 0 ? a.periods : null;
                for (const [monthKey, alloc] of Object.entries(a.monthly_allocations)) {
                    if (!alloc || !yearMonthKeys.has(monthKey)) continue;
                    const [y, m] = monthKey.split('-').map(Number);
                    let md = 0;
                    if (periods) {
                        periods.forEach(per => { md += calcMDForMonth(y, m, alloc, per.start_date, per.end_date); });
                    } else {
                        md = calcMDForMonth(y, m, alloc, a.start_date, a.end_date);
                    }
                    if (md > 0) {
                        if (!memberMonthMD[a.member_id]) memberMonthMD[a.member_id] = {};
                        memberMonthMD[a.member_id][monthKey] = (memberMonthMD[a.member_id][monthKey] || 0) + md;
                    }
                }
            }
        }
        let totalMM = 0, totalMD = 0;
        for (const monthData of Object.values(memberMonthMD)) {
            for (const md of Object.values(monthData)) {
                totalMM += Math.min(1.0, md / 20);
                totalMD += md;
            }
        }

        document.getElementById('kpi-cards').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon-blue">📁</div>
                <div class="kpi-info">
                    <div class="kpi-label">총 프로젝트</div>
                    <div class="kpi-value">${totalProjects}</div>
                    <div class="kpi-sub">확정 ${confirmed}건</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon-green">💰</div>
                <div class="kpi-info">
                    <div class="kpi-label">총 규모</div>
                    <div class="kpi-value">${totalBudget.toFixed(1)}억</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon-purple">📈</div>
                <div class="kpi-info">
                    <div class="kpi-label">총 투입 M/M</div>
                    <div class="kpi-value">${totalMM.toFixed(1)}</div>
                    <div class="kpi-sub">M/D ${Math.round(totalMD)}일</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon kpi-icon-orange">🚀</div>
                <div class="kpi-info">
                    <div class="kpi-label">진행중</div>
                    <div class="kpi-value">${projects.filter(p => p.status === '진행중').length}</div>
                </div>
            </div>
        `;
    },

    renderTable(projects, year) {
        // 숨김 처리
        const showHidden = document.getElementById('filter-show-hidden')?.checked;
        const hiddenCount = projects.filter(p => this.hiddenIds.has(p.id)).length;
        const countLabel = document.getElementById('hidden-count-label');
        if (countLabel) countLabel.textContent = hiddenCount > 0 ? `숨김 ${hiddenCount}건` : '';
        if (!showHidden) projects = projects.filter(p => !this.hiddenIds.has(p.id));

        const monthFilter = parseInt(document.getElementById('filter-month')?.value) || 0;
        const isDaily = monthFilter > 0;
        const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

        // ── 컬럼 목록 ─────────────────────────────────────────
        let columns = [];
        if (isDaily) {
            const daysInMonth = new Date(year, monthFilter, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dow = new Date(year, monthFilter - 1, d).getDay();
                const dateStr = `${year}-${String(monthFilter).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                columns.push({
                    day: d, dow, isWeekend: dow === 0 || dow === 6,
                    dateStr,
                    monthKey: `${year}-${String(monthFilter).padStart(2, '0')}`,
                    dowLabel: DOW_LABELS[dow],
                });
            }
        } else {
            for (let m = 1; m <= 12; m++)
                columns.push({ year, month: m, key: `${year}-${String(m).padStart(2, '0')}` });
        }

        // ── 헤더 렌더링 ───────────────────────────────────────
        const thead = document.getElementById('overview-thead');
        // 열 숨기기 버튼 생성 헬퍼
        const colBtn = (key) =>
            `<button id="db-colbtn-${key}" onclick="event.stopPropagation();DashboardView.toggleCol('${key}')"
                title="열 숨기기"
                style="margin-left:4px;background:none;border:none;cursor:pointer;font-size:11px;padding:0;line-height:1;color:var(--gray-300)">◀</button>`;

        if (isDaily) {
            thead.innerHTML = `<tr>
                <th class="fixed-col" style="left:0;min-width:30px"></th>
                <th class="fixed-col db-col-confirmed" style="left:30px;min-width:50px">확정${colBtn('confirmed')}</th>
                <th class="fixed-col db-col-customer" style="left:80px;min-width:100px">고객사${colBtn('customer')}</th>
                <th class="fixed-col db-col-budget" style="left:180px;min-width:50px">규모${colBtn('budget')}</th>
                <th class="db-col-ptype" style="min-width:60px">유형${colBtn('ptype')}</th>
                <th class="db-col-projname" style="min-width:160px">프로젝트명${colBtn('projname')}</th>
                <th class="db-col-member" style="min-width:70px">담당자${colBtn('member')}</th>
                <th class="db-col-tech" style="min-width:60px">기술${colBtn('tech')}</th>
                <th class="db-col-grade" style="min-width:50px">등급${colBtn('grade')}</th>
                <th class="db-col-role" style="min-width:50px">역할${colBtn('role')}</th>
                <th class="db-col-mm" style="min-width:50px">M/M${colBtn('mm')}</th>
                <th class="db-col-md" style="min-width:50px">M/D${colBtn('md')}</th>
                ${columns.map(c => `<th class="month-cell${c.isWeekend ? ' weekend-col' : ''}" style="min-width:28px;padding:2px;line-height:1.4">
                    <div style="font-size:12px">${c.day}</div>
                    <div style="font-size:10px;color:${c.dow === 0 ? '#ef4444' : c.dow === 6 ? '#3b82f6' : 'var(--gray-400)'}">${c.dowLabel}</div>
                </th>`).join('')}
            </tr>`;
        } else {
            const yearGroups = [];
            columns.forEach(c => {
                const last = yearGroups[yearGroups.length - 1];
                if (last && last.year === c.year) last.count++;
                else yearGroups.push({ year: c.year, count: 1 });
            });
            thead.innerHTML = `
                <tr>
                    <th class="fixed-col" style="left:0;min-width:30px" rowspan="2"></th>
                    <th class="fixed-col db-col-confirmed" style="left:30px;min-width:50px" rowspan="2">확정${colBtn('confirmed')}</th>
                    <th class="fixed-col db-col-customer" style="left:80px;min-width:100px" rowspan="2">고객사${colBtn('customer')}</th>
                    <th class="fixed-col db-col-budget" style="left:180px;min-width:50px" rowspan="2">규모${colBtn('budget')}</th>
                    <th class="db-col-ptype" style="min-width:60px" rowspan="2">유형${colBtn('ptype')}</th>
                    <th class="db-col-projname" style="min-width:160px" rowspan="2">프로젝트명${colBtn('projname')}</th>
                    <th class="db-col-member" style="min-width:70px" rowspan="2">담당자${colBtn('member')}</th>
                    <th class="db-col-tech" style="min-width:60px" rowspan="2">기술${colBtn('tech')}</th>
                    <th class="db-col-grade" style="min-width:50px" rowspan="2">등급${colBtn('grade')}</th>
                    <th class="db-col-role" style="min-width:50px" rowspan="2">역할${colBtn('role')}</th>
                    <th class="db-col-mm" style="min-width:50px" rowspan="2">M/M${colBtn('mm')}</th>
                    <th class="db-col-md" style="min-width:50px" rowspan="2">M/D${colBtn('md')}</th>
                    ${yearGroups.map(yg => `<th class="month-cell" colspan="${yg.count}">${yg.year}년</th>`).join('')}
                </tr>
                <tr>
                    ${columns.map(c => `<th class="month-cell">${c.month}월</th>`).join('')}
                </tr>
            `;
        }

        // ── 사전 집계 (담당자 단위 M/M 캡) ───────────────────
        const tbody = document.getElementById('overview-tbody');
        let rows = '';
        let colSumsMD = {};
        let colSumsMM = {};
        let totalSumMD = 0;
        let totalSumMM = 0;

        if (isDaily) {
            // 일별: 담당자-일 투입률 합산 후 min(1.0) 캡
            const monthKey = `${year}-${String(monthFilter).padStart(2, '0')}`;
            columns.forEach(c => { colSumsMD[c.dateStr] = 0; colSumsMM[c.dateStr] = 0; });
            const memberDayAlloc = {}; // { memberId: { dateStr: totalAlloc } }
            for (const project of projects) {
                for (const a of project.assignments) {
                    if (!a.member_id) continue;
                    const alloc = a.monthly_allocations[monthKey] || 0;
                    if (!alloc) continue;
                    const periods = a.periods && a.periods.length > 0 ? a.periods : null;
                    for (const col of columns) {
                        // 주말은 하루짜리 기간이 정확히 해당 날짜인 경우만 허용
                        if (col.isWeekend) {
                            if (!periods || !periods.some(p => p.start_date === col.dateStr && p.end_date === col.dateStr)) continue;
                        }
                        let active = false;
                        if (periods) {
                            active = periods.some(p => p.start_date <= col.dateStr && col.dateStr <= p.end_date);
                        } else if (a.start_date && a.end_date) {
                            active = a.start_date <= col.dateStr && col.dateStr <= a.end_date;
                        }
                        if (active) {
                            if (!memberDayAlloc[a.member_id]) memberDayAlloc[a.member_id] = {};
                            memberDayAlloc[a.member_id][col.dateStr] = (memberDayAlloc[a.member_id][col.dateStr] || 0) + alloc;
                        }
                    }
                }
            }
            for (const dayData of Object.values(memberDayAlloc)) {
                for (const [dateStr, alloc] of Object.entries(dayData)) {
                    colSumsMD[dateStr] = (colSumsMD[dateStr] || 0) + alloc;
                    colSumsMM[dateStr] = (colSumsMM[dateStr] || 0) + Math.min(1.0, alloc);
                }
            }
            totalSumMD = Object.values(colSumsMD).reduce((s, v) => s + v, 0);
            totalSumMM = Object.values(colSumsMM).reduce((s, v) => s + v, 0);
        } else {
            // 월별: 담당자-월 M/D 합산 후 min(1.0, md/20) 캡
            columns.forEach(c => { colSumsMD[c.key] = 0; });
            const memberMonthMD = {};
            for (const project of projects) {
                for (const a of project.assignments) {
                    if (!a.member_id) continue;
                    const periods = a.periods && a.periods.length > 0 ? a.periods : null;
                    columns.forEach(c => {
                        const alloc = a.monthly_allocations[c.key] || 0;
                        if (!alloc) return;
                        let md = 0;
                        if (periods) {
                            periods.forEach(p => { md += calcMDForMonth(c.year, c.month, alloc, p.start_date, p.end_date); });
                        } else {
                            md = calcMDForMonth(c.year, c.month, alloc, a.start_date, a.end_date);
                        }
                        if (md > 0) {
                            if (!memberMonthMD[a.member_id]) memberMonthMD[a.member_id] = {};
                            memberMonthMD[a.member_id][c.key] = (memberMonthMD[a.member_id][c.key] || 0) + md;
                        }
                    });
                }
            }
            const monthlyMM = {};
            columns.forEach(c => { monthlyMM[c.key] = 0; });
            for (const monthData of Object.values(memberMonthMD)) {
                for (const [mk, md] of Object.entries(monthData)) {
                    if (mk in monthlyMM) monthlyMM[mk] += Math.min(1.0, md / 20);
                }
            }
            colSumsMM = monthlyMM;
            totalSumMM = Object.values(monthlyMM).reduce((s, v) => s + v, 0);
        }

        // ── 행 렌더링 ─────────────────────────────────────────
        for (const project of projects) {
            const assigns = project.assignments.length > 0 ? project.assignments : [null];
            assigns.forEach((a, idx) => {
                const typeStyle = PTYPE_COLORS[project.project_type] || '';
                const confirmedClass = project.confirmed === 'O' ? 'confirmed-O' :
                    project.confirmed === '?' ? 'confirmed-Q' :
                    project.confirmed === 'X' ? 'confirmed-X' : '';
                rows += '<tr>';
                if (idx === 0) {
                    const rs = assigns.length;
                    const isHidden = this.hiddenIds.has(project.id);
                    const hideTitle = isHidden ? '표시' : '숨기기';
                    const hideIcon  = isHidden ? '👁' : '🙈';
                    const hideStyle = isHidden
                        ? 'background:#f0fdf4;color:#16a34a;border-color:#bbf7d0'
                        : 'background:white;color:var(--gray-400);border-color:var(--gray-200)';
                    rows += `<td class="fixed-col" style="left:0;min-width:30px;padding:2px" rowspan="${rs}">
                        <button onclick="event.stopPropagation();DashboardView.toggleHide(${project.id})"
                            title="${hideTitle}"
                            style="border:1px solid;border-radius:5px;padding:2px 4px;font-size:13px;cursor:pointer;line-height:1;${hideStyle}">
                            ${hideIcon}
                        </button>
                    </td>`;
                    rows += `<td class="fixed-col db-col-confirmed ${confirmedClass}" style="left:30px;min-width:50px" rowspan="${rs}">${project.confirmed}</td>`;
                    rows += `<td class="fixed-col db-col-customer text-left" style="left:80px;min-width:100px" rowspan="${rs}">${project.customer_name || ''}</td>`;
                    rows += `<td class="fixed-col db-col-budget" style="left:180px;min-width:50px" rowspan="${rs}">${project.budget || ''}</td>`;
                    rows += `<td class="db-col-ptype" rowspan="${rs}">${project.project_type || ''}</td>`;
                    rows += `<td class="db-col-projname text-left" rowspan="${rs}" style="cursor:pointer" onclick="App.navigate('projects');setTimeout(()=>ProjectView.showDetail(${project.id}),300)">${project.name}</td>`;
                }
                if (a) {
                    const periods = a.periods && a.periods.length > 0 ? a.periods : null;
                    let totalMD = 0;
                    let displayMM = 0;

                    if (isDaily) {
                        const monthKey = `${year}-${String(monthFilter).padStart(2, '0')}`;
                        const alloc = a.monthly_allocations[monthKey] || 0;
                        if (alloc > 0) {
                            for (const col of columns) {
                                if (col.isWeekend) {
                                    // 하루짜리 주말 기간 처리
                                    if (periods && periods.some(p => p.start_date === col.dateStr && p.end_date === col.dateStr)) {
                                        totalMD += alloc;
                                    }
                                    continue;
                                }
                                let active = false;
                                if (periods) {
                                    active = periods.some(p => p.start_date <= col.dateStr && col.dateStr <= p.end_date);
                                } else if (a.start_date && a.end_date) {
                                    active = a.start_date <= col.dateStr && col.dateStr <= a.end_date;
                                }
                                if (active) totalMD += alloc;
                            }
                            displayMM = Math.min(1.0, totalMD / 20);
                        }
                    } else {
                        columns.forEach(c => {
                            const alloc = a.monthly_allocations[c.key] || 0;
                            if (alloc > 0) {
                                let md = 0;
                                if (periods) {
                                    periods.forEach(p => { md += calcMDForMonth(c.year, c.month, alloc, p.start_date, p.end_date); });
                                } else {
                                    md = calcMDForMonth(c.year, c.month, alloc, a.start_date, a.end_date);
                                }
                                totalMD += md;
                                displayMM += md / 20;
                            }
                        });
                        totalSumMD += totalMD;
                    }

                    rows += `<td class="db-col-member" style="cursor:pointer;color:var(--primary)" onclick="App.navigate('projects');setTimeout(()=>ProjectView.showEditAssignment(${a.id},${project.id},'dashboard'),300)">${a.member_name || ''}</td>`;
                    rows += `<td class="db-col-tech">${a.tech_stack || ''}</td>`;
                    rows += `<td class="db-col-grade">${a.grade_required || ''}</td>`;
                    rows += `<td class="db-col-role">${a.role_description || ''}</td>`;
                    rows += `<td class="db-col-mm">${displayMM > 0 ? displayMM.toFixed(2) : ''}</td>`;
                    rows += `<td class="db-col-md">${totalMD > 0 ? Math.round(totalMD) : ''}</td>`;

                    if (isDaily) {
                        const monthKey = `${year}-${String(monthFilter).padStart(2, '0')}`;
                        const alloc = a.monthly_allocations[monthKey] || 0;
                        columns.forEach(col => {
                            if (col.isWeekend) {
                                // 하루짜리 주말 기간 표시
                                const singleDay = alloc > 0 && periods && periods.some(p => p.start_date === col.dateStr && p.end_date === col.dateStr);
                                if (singleDay) {
                                    const val = alloc === 1 ? '●' : alloc.toFixed(1);
                                    rows += `<td class="month-cell weekend-col has-value" style="min-width:28px;font-size:11px${typeStyle ? ';' + typeStyle : ''}">${val}</td>`;
                                } else {
                                    rows += `<td class="month-cell weekend-col" style="min-width:28px"></td>`;
                                }
                                return;
                            }
                            let active = false;
                            if (alloc > 0) {
                                if (periods) {
                                    active = periods.some(p => p.start_date <= col.dateStr && col.dateStr <= p.end_date);
                                } else if (a.start_date && a.end_date) {
                                    active = a.start_date <= col.dateStr && col.dateStr <= a.end_date;
                                }
                            }
                            const val = active ? (alloc === 1 ? '●' : alloc.toFixed(1)) : '';
                            rows += `<td class="month-cell${active ? ' has-value' : ''}" style="min-width:28px;font-size:11px${active && typeStyle ? ';' + typeStyle : ''}">${val}</td>`;
                        });
                    } else {
                        columns.forEach(c => {
                            let val = a.monthly_allocations[c.key] || 0;
                            // fallback: allocation 없어도 period가 해당 월을 커버하면 1.0
                            if (!val && periods && periods.some(p =>
                                p.start_date.slice(0,7) <= c.key && c.key <= p.end_date.slice(0,7)
                            )) val = 1.0;
                            let md = 0;
                            if (val > 0) {
                                if (periods) {
                                    periods.forEach(p => { md += calcMDForMonth(c.year, c.month, val, p.start_date, p.end_date); });
                                } else {
                                    md = calcMDForMonth(c.year, c.month, val, a.start_date, a.end_date);
                                }
                            }
                            // raw float 축적 → 합계에서 반올림 (Calendar와 동일한 방식)
                            if (md > 0) colSumsMD[c.key] += md;
                            const mdRounded = Math.round(md);
                            rows += `<td class="month-cell${mdRounded > 0 ? ' has-value' : ''}" style="${mdRounded > 0 ? typeStyle : ''}">${mdRounded > 0 ? mdRounded : ''}</td>`;
                        });
                    }
                } else {
                    // 담당자 없는 행: 개별 셀 표시
                    rows += `<td class="db-col-member"></td><td class="db-col-tech"></td><td class="db-col-grade"></td><td class="db-col-role"></td><td class="db-col-mm"></td><td class="db-col-md"></td>`;
                    if (isDaily) {
                        columns.forEach(col => {
                            rows += `<td class="month-cell${col.isWeekend ? ' weekend-col' : ''}" style="min-width:28px"></td>`;
                        });
                    } else {
                        columns.forEach(() => { rows += `<td class="month-cell"></td>`; });
                    }
                }
                rows += '</tr>';
            });
        }

        // ── 합계 행 ───────────────────────────────────────────
        rows += '<tr class="summary-row">';
        rows += `<td class="fixed-col" style="left:0;min-width:30px"></td>`;
        rows += `<td class="fixed-col db-col-confirmed" style="left:30px;min-width:50px"><strong>합계</strong></td>`;
        rows += `<td class="fixed-col db-col-customer" style="left:80px;min-width:100px"></td>`;
        rows += `<td class="fixed-col db-col-budget" style="left:180px;min-width:50px"></td>`;
        rows += `<td class="db-col-ptype"></td><td class="db-col-projname"></td><td class="db-col-member"></td><td class="db-col-tech"></td><td class="db-col-grade"></td><td class="db-col-role"></td>`;
        rows += `<td class="db-col-mm"><strong>${totalSumMM > 0 ? totalSumMM.toFixed(2) : ''}</strong></td>`;
        rows += `<td class="db-col-md"><strong>${totalSumMD > 0 ? Math.round(totalSumMD) : ''}</strong></td>`;
        if (isDaily) {
            columns.forEach(col => {
                if (col.isWeekend) { rows += `<td class="month-cell weekend-col" style="min-width:28px"></td>`; return; }
                const md = colSumsMD[col.dateStr] || 0;
                const mm = colSumsMM[col.dateStr] || 0;
                rows += md > 0
                    ? `<td class="month-cell" style="min-width:28px;line-height:1.4;font-size:11px">${md.toFixed(1)}<br><span style="font-size:10px;color:var(--gray-500)">${mm.toFixed(2)}M</span></td>`
                    : `<td class="month-cell" style="min-width:28px"></td>`;
            });
        } else {
            columns.forEach(c => {
                const md = colSumsMD[c.key] || 0;
                const mm = colSumsMM[c.key] || 0;
                rows += md > 0
                    ? `<td class="month-cell" style="line-height:1.4">${Math.round(md)}<br><span style="font-size:11px;color:var(--gray-500)">${mm.toFixed(2)}M</span></td>`
                    : `<td class="month-cell"></td>`;
            });
        }
        rows += '</tr>';
        tbody.innerHTML = rows;

        // 저장된 열 숨김 상태 적용
        this._applyColVisibility();
    },
};
