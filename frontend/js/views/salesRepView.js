/**
 * 영업 담당자 관리 뷰
 */
const SalesRepView = {
    reps: [],
    teams: [],

    async render() {
        const container = document.getElementById('app-content');
        const isAdmin = Auth.isAdmin();
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">영업 담당자 관리</span>
                    ${isAdmin ? `<button class="btn btn-primary" onclick="SalesRepView.showCreate()">+ 담당자 추가</button>` : ''}
                </div>
                <div class="filter-bar" style="border:none;padding:0;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                    <select id="sr-search-field" class="form-control" style="width:110px">
                        <option value="name">담당자명</option>
                        <option value="divteam">사업부/팀</option>
                        <option value="customer">고객사</option>
                    </select>
                    <input type="text" id="sr-search-input" class="form-control" placeholder="검색어 입력..." style="width:180px">
                </div>
                <div style="overflow-x:auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>담당자명</th>
                                <th>사업부 / 팀</th>
                                <th>담당 고객사</th>
                                <th style="width:100px"></th>
                            </tr>
                        </thead>
                        <tbody id="salesrep-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        this.teams = await API.getTeams();
        await this.loadData();

        document.getElementById('sr-search-field').addEventListener('change', () => this.filterTable());
        document.getElementById('sr-search-input').addEventListener('input', () => this.filterTable());
    },

    async loadData() {
        this.reps = await API.getSalesReps();
        this.filterTable();
    },

    filterTable() {
        const field  = document.getElementById('sr-search-field')?.value || 'name';
        const search = (document.getElementById('sr-search-input')?.value || '').toLowerCase().trim();
        let filtered = this.reps;
        if (search) {
            filtered = filtered.filter(r => {
                if (field === 'name')    return (r.name || '').toLowerCase().includes(search);
                if (field === 'divteam') return (r.division_team || '').toLowerCase().includes(search);
                if (field === 'customer') return (r.assigned_customers || []).some(c => c.toLowerCase().includes(search));
                return false;
            });
        }
        this.renderTable(filtered);
    },

    renderTable(reps) {
        reps = reps ?? this.reps;
        const tbody = document.getElementById('salesrep-tbody');
        if (!reps.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding:20px">등록된 영업 담당자가 없습니다.</td></tr>`;
            return;
        }
        const isAdmin = Auth.isAdmin();
        tbody.innerHTML = reps.map(r => {
            const parts = (r.division_team || '').split('>');
            const division = parts[0] || '';
            const team = parts[1] || '';
            const divTeamHtml = division
                ? `<span class="badge badge-gray" style="margin-right:4px">${division}</span>${team ? `<span class="badge badge-blue">${team}</span>` : ''}`
                : '<span class="text-muted">-</span>';
            const customers = (r.assigned_customers || []).join(', ') || '<span class="text-muted">-</span>';
            return `
                <tr onclick="SalesRepView.showDetail(${r.id})" style="cursor:pointer">
                    <td style="font-weight:600">${r.name}</td>
                    <td>${divTeamHtml}</td>
                    <td style="font-size:13px">${customers}</td>
                    <td style="white-space:nowrap" onclick="event.stopPropagation()">
                        ${isAdmin ? `
                        <button class="btn btn-sm btn-outline" onclick="SalesRepView.showEdit(${r.id})">수정</button>
                        <button class="btn btn-sm btn-danger" onclick="SalesRepView.deleteRep(${r.id}, '${r.name.replace(/'/g, "\\'")}')">삭제</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },

    _buildForm(rep = null) {
        const teamOptions = this.teams.map(t => {
            const val = t.value || '';
            const selected = rep && rep.division_team === val ? 'selected' : '';
            const label = val.replace('>', ' > ');
            return `<option value="${val}" ${selected}>${label}</option>`;
        }).join('');

        const nameVal  = rep ? rep.name : '';
        const emailVal = rep ? (rep.email || '') : '';
        return `
            <div class="form-group">
                <label>담당자명 <span style="color:var(--danger)">*</span></label>
                <input type="text" id="sr-name" class="form-control" value="${nameVal}" placeholder="이름 입력">
            </div>
            <div class="form-group">
                <label>사업부 / 팀</label>
                <select id="sr-team" class="form-control">
                    <option value="">선택 안 함</option>
                    ${teamOptions}
                </select>
            </div>
            <div class="form-group">
                <label>이메일</label>
                <input type="email" id="sr-email" class="form-control" value="${emailVal}" placeholder="example@company.com">
            </div>
        `;
    },

    async showDetail(id) {
        let rep;
        try {
            rep = await API.getSalesRep(id);
        } catch (e) {
            Toast.error('담당자 정보를 불러오지 못했습니다: ' + e.message);
            return;
        }

        // 연도 목록 추출
        const years = [...new Set((rep.projects || []).flatMap(p => {
            const ys = [];
            if (p.start_date) ys.push(parseInt(p.start_date.substring(0, 4)));
            if (p.end_date)   ys.push(parseInt(p.end_date.substring(0, 4)));
            return ys;
        }))].sort((a, b) => b - a);

        const parts = (rep.division_team || '').split('>');
        const division = parts[0] || '';
        const team     = parts[1] || '';
        const divTeamText = division ? (team ? `${division} > ${team}` : division) : '-';

        const yearOptions = years.map(y => `<option value="${y}">${y}년</option>`).join('');

        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:16px">
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">담당자명</div>
                    <div style="font-size:16px;font-weight:600">${rep.name}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">사업부 / 팀</div>
                    <div style="font-size:14px">${divTeamText}</div>
                </div>
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">이메일</div>
                    <div style="font-size:14px">${rep.email ? `<a href="mailto:${rep.email}" style="color:var(--primary)">${rep.email}</a>` : '-'}</div>
                </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <h3 style="margin:0;font-size:13px;font-weight:600;color:var(--gray-600)">담당 프로젝트</h3>
                <select id="sr-detail-year" class="form-control" style="width:120px"
                    onchange="SalesRepView._refreshDetail(${id}, this.value)">
                    <option value="">전체 년도</option>
                    ${yearOptions}
                </select>
            </div>

            <div id="sr-detail-kpi" style="margin-bottom:12px"></div>
            <div id="sr-detail-table"></div>
        `;

        const footer = Auth.isAdmin() ? `
            <button class="btn btn-danger" onclick="SalesRepView.deleteRep(${rep.id}, '${rep.name.replace(/'/g, "\\'")}')">삭제</button>
            <button class="btn btn-outline" onclick="Modal.close()">닫기</button>
            <button class="btn btn-primary" onclick="SalesRepView.showEdit(${rep.id})">수정</button>
        ` : `
            <button class="btn btn-outline" onclick="Modal.close()">닫기</button>
        `;

        // 현재 열린 담당자 데이터 캐시
        this._detailRep = rep;
        Modal.show(rep.name, body, footer);
        this._refreshDetail(id, '');
    },

    _refreshDetail(id, year) {
        const rep = this._detailRep;
        if (!rep) return;

        const yr = parseInt(year) || null;
        const filtered = (rep.projects || []).filter(p => {
            if (!yr) return true;
            const start = p.start_date ? parseInt(p.start_date.substring(0, 4)) : null;
            const end   = p.end_date   ? parseInt(p.end_date.substring(0, 4))   : null;
            return (!start || start <= yr) && (!end || end >= yr);
        });

        // KPI 계산
        const customerCount = new Set(filtered.map(p => p.customer_name).filter(Boolean)).size;
        const totalBudget   = filtered.reduce((s, p) => s + (p.budget || 0), 0);
        const typeCounts    = {};
        filtered.forEach(p => {
            const t = p.project_type || '기타';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        const typeHtml = Object.entries(typeCounts)
            .map(([t, c]) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:8px">
                <span class="badge badge-gray">${t}</span>
                <strong>${c}건</strong>
            </span>`).join('');

        // KPI 카드
        document.getElementById('sr-detail-kpi').innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
                <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 16px">
                    <div class="text-muted" style="font-size:11px;margin-bottom:4px">담당 고객사</div>
                    <div style="font-size:22px;font-weight:700;color:var(--primary)">${customerCount}<span style="font-size:13px;font-weight:400;margin-left:2px">개사</span></div>
                </div>
                <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 16px">
                    <div class="text-muted" style="font-size:11px;margin-bottom:4px">유형별 프로젝트</div>
                    <div style="font-size:13px;margin-top:4px">${typeHtml || '<span class="text-muted">-</span>'}</div>
                </div>
                <div style="background:var(--gray-50);border:1px solid var(--gray-200);border-radius:8px;padding:12px 16px">
                    <div class="text-muted" style="font-size:11px;margin-bottom:4px">총 규모</div>
                    <div style="font-size:22px;font-weight:700;color:var(--success,#16a34a)">${totalBudget.toFixed(1)}<span style="font-size:13px;font-weight:400;margin-left:2px">억</span></div>
                </div>
            </div>
        `;

        // 프로젝트 테이블
        const rowsHtml = filtered.length === 0
            ? `<tr><td colspan="6" class="text-center text-muted" style="padding:14px">해당 년도의 프로젝트가 없습니다.</td></tr>`
            : filtered.map(p => {
                const period = [p.start_date, p.end_date].filter(Boolean).join(' ~ ');
                return `<tr>
                    <td>${p.customer_name || '-'}</td>
                    <td style="font-weight:500">${p.name}</td>
                    <td style="white-space:nowrap;font-size:12px">${period || '-'}</td>
                    <td>${p.project_type || '-'}</td>
                    <td>${p.business_type || '-'}</td>
                    <td class="text-right">${p.budget != null ? p.budget + '억' : '-'}</td>
                </tr>`;
            }).join('');

        document.getElementById('sr-detail-table').innerHTML = `
            <div style="overflow-x:auto">
                <table class="data-table">
                    <thead>
                        <tr><th>고객사</th><th>프로젝트명</th><th>기간</th><th>유형</th><th>업무유형</th><th>규모(억)</th></tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    },

    showCreate() {
        const body = this._buildForm();
        const footer = `
            <button class="btn btn-outline" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="SalesRepView.create()">등록</button>
        `;
        Modal.show('영업 담당자 추가', body, footer);
    },

    showEdit(id) {
        const rep = this.reps.find(r => r.id === id);
        if (!rep) return;
        const body = this._buildForm(rep);
        const footer = `
            <button class="btn btn-outline" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="SalesRepView.save(${id})">저장</button>
        `;
        Modal.show('영업 담당자 수정', body, footer);
    },

    async create() {
        const name = document.getElementById('sr-name').value.trim();
        if (!name) { Toast.error('담당자명을 입력하세요.'); return; }
        const division_team = document.getElementById('sr-team').value || null;
        const email = document.getElementById('sr-email').value || null;
        try {
            await API.createSalesRep({ name, email, division_team });
            Toast.success('영업 담당자가 등록되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async save(id) {
        const name = document.getElementById('sr-name').value.trim();
        if (!name) { Toast.error('담당자명을 입력하세요.'); return; }
        const division_team = document.getElementById('sr-team').value || null;
        const email = document.getElementById('sr-email').value || null;
        try {
            await API.updateSalesRep(id, { name, email, division_team });
            Toast.success('저장되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async deleteRep(id, name) {
        if (!confirm(`"${name}" 담당자를 삭제하시겠습니까?\n연결된 프로젝트의 담당 영업 정보가 해제됩니다.`)) return;
        try {
            await API.deleteSalesRep(id);
            Toast.success('삭제되었습니다.');
            await this.loadData();
        } catch (e) {
            Toast.error(e.message);
        }
    },
};
