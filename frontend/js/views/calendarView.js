/**
 * Calendar view - Monthly project schedule calendar.
 */
const CalendarView = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,

    _allDivisions: [],
    _allTeams: [],
    _memberMap: {}, // memberId -> {name, division, team}

    async render() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="cal-page">
                <div class="filter-bar" style="flex-wrap:wrap;gap:8px">
                    <button class="btn btn-sm btn-outline" onclick="CalendarView.prevMonth()">&#8249; 이전</button>
                    <span id="cal-title" style="font-size:16px;font-weight:600;min-width:110px;text-align:center"></span>
                    <button class="btn btn-sm btn-outline" onclick="CalendarView.nextMonth()">다음 &#8250;</button>
                    <span style="border-left:1px solid var(--gray-200);margin-left:4px;padding-left:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                        <label>확정여부</label>
                        <select id="cal-filter-confirmed" class="form-control" style="width:100px">
                            <option value="">전체</option>
                            <option value="O">O (확정)</option>
                            <option value="?">? (미확정)</option>
                            <option value="X">X (취소)</option>
                            <option value="미정">미정</option>
                        </select>
                        <label>진행현황</label>
                        <select id="cal-filter-status" class="form-control" style="width:110px">
                            <option value="">전체</option>
                        </select>
                        <label>구축항목</label>
                        <select id="cal-filter-tech" class="form-control" style="width:130px">
                            <option value="">전체</option>
                        </select>
                    </span>
                    <span style="border-left:1px solid var(--gray-200);margin-left:4px;padding-left:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                        <label>사업부</label>
                        <select id="cal-filter-division" class="form-control" style="width:120px">
                            <option value="">전체</option>
                        </select>
                        <label>팀</label>
                        <select id="cal-filter-team" class="form-control" style="width:120px">
                            <option value="">전체</option>
                        </select>
                        <label>담당자</label>
                        <select id="cal-filter-member" class="form-control" style="width:110px">
                            <option value="">전체</option>
                        </select>
                    </span>
                    <button class="btn btn-sm btn-outline" style="margin-left:auto" onclick="CalendarView.goToday()">오늘</button>
                </div>

                <div id="cal-summary" style="display:flex;gap:16px;align-items:center;background:white;border-radius:8px;padding:10px 20px;box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:13px;flex-wrap:wrap"></div>

                <div class="cal-wrapper">
                    <div class="cal-grid" id="cal-grid">
                        <div class="cal-dow">일</div>
                        <div class="cal-dow">월</div>
                        <div class="cal-dow">화</div>
                        <div class="cal-dow">수</div>
                        <div class="cal-dow">목</div>
                        <div class="cal-dow">금</div>
                        <div class="cal-dow">토</div>
                    </div>
                </div>
            </div>
        `;

        // Load filter options
        const [statuses, techStacks, divisions, teams, members] = await Promise.all([
            API.getStatuses().catch(() => []),
            API.getTechStacks().catch(() => []),
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
            API.getMembers().catch(() => []),
        ]);

        this._allDivisions = divisions;
        this._allTeams = teams;
        this._memberMap = {};
        members.forEach(m => { this._memberMap[m.id] = { name: m.name, division: m.division || '', team: m.team || '' }; });

        const statusSel = document.getElementById('cal-filter-status');
        statuses.forEach(s => { statusSel.innerHTML += `<option value="${s}">${s}</option>`; });
        const techSel = document.getElementById('cal-filter-tech');
        techStacks.forEach(t => { techSel.innerHTML += `<option value="${t}">${t}</option>`; });

        const divSel = document.getElementById('cal-filter-division');
        divisions.forEach(d => { divSel.innerHTML += `<option value="${d}">${d}</option>`; });

        this._refreshTeamFilter('');
        this._refreshMemberFilter('', '');

        document.getElementById('cal-filter-confirmed').addEventListener('change', () => this.loadData());
        document.getElementById('cal-filter-status').addEventListener('change', () => this.loadData());
        document.getElementById('cal-filter-tech').addEventListener('change', () => this.loadData());
        document.getElementById('cal-filter-division').addEventListener('change', () => {
            const div = document.getElementById('cal-filter-division').value;
            this._refreshTeamFilter(div);
            this._refreshMemberFilter(div, '');
            this.loadData();
        });
        document.getElementById('cal-filter-team').addEventListener('change', () => {
            const div = document.getElementById('cal-filter-division').value;
            const team = document.getElementById('cal-filter-team').value;
            this._refreshMemberFilter(div, team);
            this.loadData();
        });
        document.getElementById('cal-filter-member').addEventListener('change', () => this.loadData());

        await this.loadData();
    },

    _refreshTeamFilter(division) {
        const sel = document.getElementById('cal-filter-team');
        if (!sel) return;
        const filtered = division
            ? this._allTeams.filter(t => t.division === division)
            : this._allTeams;
        sel.innerHTML = '<option value="">전체</option>' +
            filtered.map(t => `<option value="${t.team}">${t.team}</option>`).join('');
    },

    _refreshMemberFilter(division, team) {
        const sel = document.getElementById('cal-filter-member');
        if (!sel) return;
        let members = Object.values(this._memberMap);
        if (division) members = members.filter(m => m.division === division);
        if (team)     members = members.filter(m => m.team === team);
        members.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        sel.innerHTML = '<option value="">전체</option>' +
            members.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
    },

    async loadData() {
        document.getElementById('cal-title').textContent =
            `${this.currentYear}년 ${this.currentMonth}월`;

        const params = { year: this.currentYear };
        const confirmed = document.getElementById('cal-filter-confirmed')?.value;
        const status = document.getElementById('cal-filter-status')?.value;
        const tech = document.getElementById('cal-filter-tech')?.value;
        if (confirmed) params.confirmed = confirmed;
        if (status) params.status = status;
        if (tech) params.tech_stack = tech;

        try {
            const projects = await API.getProjectOverview(params);
            this.renderCalendar(projects);
        } catch (e) {
            console.error(e);
        }
    },

    // 프로젝트별 고유 색상 팔레트 (bg, border, text)
    _colorPalette: [
        { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }, // blue
        { bg: '#dcfce7', border: '#22c55e', text: '#166534' }, // green
        { bg: '#fef9c3', border: '#eab308', text: '#854d0e' }, // yellow
        { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' }, // pink
        { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' }, // purple
        { bg: '#ffedd5', border: '#f97316', text: '#9a3412' }, // orange
        { bg: '#ccfbf1', border: '#14b8a6', text: '#134e4a' }, // teal
        { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' }, // red
        { bg: '#f0fdf4', border: '#4ade80', text: '#14532d' }, // light green
        { bg: '#f0f9ff', border: '#38bdf8', text: '#0c4a6e' }, // sky
        { bg: '#fdf4ff', border: '#c084fc', text: '#6b21a8' }, // violet
        { bg: '#fff7ed', border: '#fb923c', text: '#7c2d12' }, // amber
    ],

    _projectColorMap: {},

    _assignProjectColors(projects) {
        const usedCount = Object.keys(this._projectColorMap).length;
        let idx = usedCount;
        for (const p of projects) {
            if (!(p.id in this._projectColorMap)) {
                this._projectColorMap[p.id] = idx % this._colorPalette.length;
                idx++;
            }
        }
    },

    // 평일(월~금) 수 계산 — 단일 주말 날짜는 1로 계산 (반복일정 대응)
    _weekdaysInRange(start, end) {
        const s = new Date(start); s.setHours(0,0,0,0);
        const e = new Date(end);   e.setHours(0,0,0,0);
        if (s.getTime() === e.getTime() && (s.getDay() === 0 || s.getDay() === 6)) return 1;
        let count = 0;
        const cur = new Date(s);
        while (cur <= e) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    },

    // 해당 월 내 기간의 평일 × 투입률
    _calcMDForMonth(year, month, alloc, assignStart, assignEnd) {
        if (!alloc || !assignStart || !assignEnd) return 0;
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd   = new Date(year, month, 0);
        const s = new Date(assignStart) > monthStart ? new Date(assignStart) : monthStart;
        const e = new Date(assignEnd)   < monthEnd   ? new Date(assignEnd)   : monthEnd;
        if (s > e) return 0;
        return alloc * this._weekdaysInRange(s, e);
    },

    renderCalendar(projects) {
        this._assignProjectColors(projects);
        const year = this.currentYear;
        const month = this.currentMonth;
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        // 클라이언트 사이드 필터 값
        const filterDiv    = document.getElementById('cal-filter-division')?.value || '';
        const filterTeam   = document.getElementById('cal-filter-team')?.value || '';
        const filterMember = document.getElementById('cal-filter-member')?.value || '';

        const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
        const daysInMonth = new Date(year, month, 0).getDate();

        // 이벤트 목록 구성 (담당자 있는 배정만)
        const events = [];
        for (const p of projects) {
            for (const a of p.assignments) {
                // 사업부/팀/담당자 필터 적용
                if (filterMember && a.member_name !== filterMember) continue;
                if (filterDiv || filterTeam) {
                    const m = this._memberMap[a.member_id];
                    if (filterDiv  && (!m || m.division !== filterDiv))  continue;
                    if (filterTeam && (!m || m.team    !== filterTeam))  continue;
                }
                events.push({
                    projectId: p.id,
                    projectName: p.name,
                    customerName: p.customer_name || '',
                    confirmed: p.confirmed,
                    memberId: a.member_id,
                    memberName: a.member_name || '',
                    periods: a.periods && a.periods.length > 0 ? a.periods : null,
                    start_date: a.start_date,
                    end_date: a.end_date,
                    monthly_allocations: a.monthly_allocations || {},
                });
            }
        }

        // ── 월별 M/M · M/D 집계 ──────────────────────────────
        const monthKey = `${year}-${String(month).padStart(2,'0')}`;
        let totalMD = 0;
        const memberMD = {}; // memberId -> 해당 월 M/D 합산
        const projectIds = new Set();

        for (const ev of events) {
            // allocation 누락 시 period가 해당 월을 커버하면 1.0으로 fallback (dashboard와 동일)
            let alloc = ev.monthly_allocations[monthKey] || 0;
            if (!alloc && ev.periods) {
                const covered = ev.periods.some(p =>
                    p.start_date.slice(0,7) <= monthKey && monthKey <= p.end_date.slice(0,7)
                );
                if (covered) alloc = 1.0;
            }
            if (!alloc) continue;
            let md = 0;
            if (ev.periods) {
                ev.periods.forEach(p => {
                    md += this._calcMDForMonth(year, month, alloc, p.start_date, p.end_date);
                });
            } else if (ev.start_date && ev.end_date) {
                md = this._calcMDForMonth(year, month, alloc, ev.start_date, ev.end_date);
            }
            totalMD += md;
            if (ev.memberId) memberMD[ev.memberId] = (memberMD[ev.memberId] || 0) + md;
            projectIds.add(ev.projectId);
        }
        // 담당자별 M/M = min(1.0, memberMD / 20) 합산 (20일 이상 → 1M/M)
        const totalMM = Object.values(memberMD).reduce((sum, md) => sum + Math.min(1.0, md / 20), 0);

        // summary 바 업데이트
        const summaryEl = document.getElementById('cal-summary');
        if (summaryEl) {
            const items = [
                { label: '투입 M/M', value: totalMM > 0 ? totalMM.toFixed(2) : '0.00', unit: 'M/M' },
                { label: '투입 M/D', value: totalMD > 0 ? Math.round(totalMD) : '0', unit: '일' },
                { label: '참여 담당자', value: Object.keys(memberMD).length, unit: '명' },
                { label: '프로젝트', value: projectIds.size, unit: '건' },
            ];
            summaryEl.innerHTML = items.map(it => `
                <div style="display:flex;flex-direction:column;align-items:center;padding:4px 16px;border-right:1px solid var(--gray-200);last-child:border:none">
                    <span style="font-size:11px;color:var(--gray-500);margin-bottom:2px">${it.label}</span>
                    <span style="font-size:18px;font-weight:700;color:var(--primary)">${it.value}<span style="font-size:12px;font-weight:400;color:var(--gray-500);margin-left:2px">${it.unit}</span></span>
                </div>
            `).join('') + `<span style="font-size:12px;color:var(--gray-400);margin-left:auto">${year}년 ${month}월 기준</span>`;
        }

        // 해당 날짜에 활성화된 이벤트인지 확인
        const isActive = (ev, dateStr) => {
            const monthKey = dateStr.slice(0, 7);
            if (Object.keys(ev.monthly_allocations).length > 0 && !ev.monthly_allocations[monthKey]) {
                // monthly_allocation이 없어도 period가 이 날짜를 직접 커버하면 표시
                // (데이터 불일치 방어: periods는 있지만 allocation이 누락된 경우)
                const coveredByPeriod = ev.periods
                    ? ev.periods.some(p => p.start_date <= dateStr && dateStr <= p.end_date)
                    : (ev.start_date && ev.end_date && ev.start_date <= dateStr && dateStr <= ev.end_date);
                if (!coveredByPeriod) return false;
            }
            // 주말 여부: 2일 이상 기간은 주말 제외, 하루짜리만 주말 표시
            const dow = new Date(dateStr).getDay();
            const isWeekend = dow === 0 || dow === 6;
            if (ev.periods) {
                return ev.periods.some(p => {
                    if (p.start_date > dateStr || dateStr > p.end_date) return false;
                    if (isWeekend && p.start_date !== p.end_date) return false;
                    return true;
                });
            }
            if (ev.start_date && ev.end_date) {
                if (isWeekend && ev.start_date !== ev.end_date) return false;
                return ev.start_date <= dateStr && dateStr <= ev.end_date;
            }
            return false;
        };

        // 그리드 재구성 (요일 헤더 7개 이후 삭제)
        const grid = document.getElementById('cal-grid');
        while (grid.children.length > 7) grid.removeChild(grid.lastChild);

        // 1일 이전 빈 셀
        for (let i = 0; i < firstDay; i++) {
            const blank = document.createElement('div');
            blank.className = 'cal-day cal-day-empty';
            grid.appendChild(blank);
        }

        // 날짜 셀
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dow = (firstDay + d - 1) % 7;
            const isToday = dateStr === todayStr;
            const isWeekend = dow === 0 || dow === 6;

            const cell = document.createElement('div');
            cell.className = 'cal-day' + (isToday ? ' cal-day-today' : '') + (isWeekend ? ' cal-day-weekend' : '');

            const numDiv = document.createElement('div');
            numDiv.className = 'cal-day-num';
            numDiv.textContent = d;
            cell.appendChild(numDiv);

            const evDiv = document.createElement('div');
            evDiv.className = 'cal-events';

            const dayEvents = events.filter(ev => isActive(ev, dateStr));
            for (const ev of dayEvents) {
                const pill = document.createElement('div');
                pill.className = 'cal-event';
                const color = this._colorPalette[this._projectColorMap[ev.projectId] ?? 0];
                pill.style.background = color.bg;
                pill.style.borderLeftColor = color.border;
                pill.style.color = color.text;

                const label = `${ev.customerName} · ${ev.projectName} / ${ev.memberName}`;
                pill.textContent = label;
                pill.title = label;
                pill.style.cursor = 'pointer';
                pill.addEventListener('click', () => {
                    App.navigate('projects');
                    setTimeout(() => ProjectView.showDetail(ev.projectId), 300);
                });
                evDiv.appendChild(pill);
            }

            cell.appendChild(evDiv);
            grid.appendChild(cell);
        }

        // 마지막 행 빈 셀 채우기
        const totalCells = firstDay + daysInMonth;
        const remainder = totalCells % 7;
        if (remainder !== 0) {
            for (let i = 0; i < 7 - remainder; i++) {
                const blank = document.createElement('div');
                blank.className = 'cal-day cal-day-empty';
                grid.appendChild(blank);
            }
        }
    },

    prevMonth() {
        if (this.currentMonth === 1) { this.currentMonth = 12; this.currentYear--; }
        else { this.currentMonth--; }
        this.loadData();
    },

    nextMonth() {
        if (this.currentMonth === 12) { this.currentMonth = 1; this.currentYear++; }
        else { this.currentMonth++; }
        this.loadData();
    },

    goToday() {
        const now = new Date();
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth() + 1;
        this.loadData();
    },
};
