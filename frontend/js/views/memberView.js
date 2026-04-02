/**
 * Member management view.
 */
const MemberView = {
    members: [],

    async render() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">인력 관리</span>
                    <button class="btn btn-primary" onclick="MemberView.showCreate()">+ 인력 추가</button>
                </div>
                <div class="filter-bar" style="border:none;padding:0;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                    <input type="text" id="member-search" class="form-control" placeholder="이름 검색..." style="width:160px">
                    <select id="member-filter-division" class="form-control" style="width:130px">
                        <option value="">전체 사업부</option>
                    </select>
                    <select id="member-filter-team" class="form-control" style="width:130px">
                        <option value="">전체 팀</option>
                    </select>
                    <select id="member-filter-grade" class="form-control" style="width:110px">
                        <option value="">전체 등급</option>
                        <option value="초급">초급</option>
                        <option value="중급">중급</option>
                        <option value="고급">고급</option>
                        <option value="특급">특급</option>
                    </select>
                    <select id="member-filter-skill" class="form-control" style="width:140px">
                        <option value="">전체 업무영역</option>
                    </select>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>사업부</th>
                            <th>팀명</th>
                            <th>등급</th>
                            <th>연차</th>
                            <th>가능 업무 영역</th>
                        </tr>
                    </thead>
                    <tbody id="member-tbody"></tbody>
                </table>
            </div>
        `;

        document.getElementById('member-search').addEventListener('input', () => this.filterTable());
        document.getElementById('member-filter-division').addEventListener('change', () => this._onDivisionFilterChange());
        document.getElementById('member-filter-team').addEventListener('change', () => this.filterTable());
        document.getElementById('member-filter-grade').addEventListener('change', () => this.filterTable());
        document.getElementById('member-filter-skill').addEventListener('change', () => this.filterTable());

        await this.loadData();
    },

    async loadData() {
        const [members, divisions, teams, techStacks] = await Promise.all([
            API.getMembers(),
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
            API.getTechStacks().catch(() => []),
        ]);
        this.members = members;
        this._allTeams = teams;

        // 사업부 옵션
        const divSel = document.getElementById('member-filter-division');
        const curDiv = divSel.value;
        divSel.innerHTML = '<option value="">전체 사업부</option>' +
            divisions.map(d => `<option value="${d}" ${d === curDiv ? 'selected' : ''}>${d}</option>`).join('');

        // 팀 옵션 (현재 사업부 필터 반영)
        this._refreshTeamFilter(curDiv);

        // 업무영역 옵션
        const skillSel = document.getElementById('member-filter-skill');
        const curSkill = skillSel.value;
        skillSel.innerHTML = '<option value="">전체 업무영역</option>' +
            techStacks.map(t => `<option value="${t}" ${t === curSkill ? 'selected' : ''}>${t}</option>`).join('');

        this.filterTable();
    },

    _onDivisionFilterChange() {
        const div = document.getElementById('member-filter-division').value;
        this._refreshTeamFilter(div);
        this.filterTable();
    },

    _refreshTeamFilter(division) {
        const teamSel = document.getElementById('member-filter-team');
        const curTeam = teamSel.value;
        const filtered = division
            ? (this._allTeams || []).filter(t => t.division === division)
            : (this._allTeams || []);
        teamSel.innerHTML = '<option value="">전체 팀</option>' +
            filtered.map(t => `<option value="${t.team}" ${t.team === curTeam ? 'selected' : ''}>${t.team}</option>`).join('');
    },

    filterTable() {
        const search   = document.getElementById('member-search').value.toLowerCase();
        const division = document.getElementById('member-filter-division').value;
        const team     = document.getElementById('member-filter-team').value;
        const grade    = document.getElementById('member-filter-grade').value;
        const skill    = document.getElementById('member-filter-skill').value;
        let filtered = this.members;
        if (search)   filtered = filtered.filter(m => m.name.toLowerCase().includes(search));
        if (division) filtered = filtered.filter(m => m.division === division);
        if (team)     filtered = filtered.filter(m => m.team === team);
        if (grade)    filtered = filtered.filter(m => m.grade === grade);
        if (skill)    filtered = filtered.filter(m => (m.skills || []).some(s => s.tech_stack === skill));
        this.renderTable(filtered);
    },

    renderTable(members) {
        const tbody = document.getElementById('member-tbody');
        tbody.innerHTML = members.map(m => `
            <tr onclick="MemberView.showDetail(${m.id})" style="cursor:pointer">
                <td style="font-weight:600">${m.name}</td>
                <td>${m.division || ''}</td>
                <td>${m.team || ''}</td>
                <td><span class="badge ${m.grade === '특급' ? 'badge-red' : m.grade === '고급' ? 'badge-blue' : m.grade === '중급' ? 'badge-green' : 'badge-gray'}">${m.grade || ''}</span></td>
                <td>${m.years_of_experience || ''}년</td>
                <td>${(m.skills || []).map(s => s.tech_stack).join(', ')}</td>
            </tr>
        `).join('');
    },

    /** teams 배열로 사업부>팀 optgroup select HTML 생성 */
    _buildTeamSelect(selectId, teams, currentDivision, currentTeam) {
        // 사업부별 그룹핑
        const grouped = {};
        teams.forEach(t => {
            const div = t.division || '미분류';
            if (!grouped[div]) grouped[div] = [];
            grouped[div].push(t);
        });

        // 현재 선택값: "사업부|팀" 조합 값으로 구분
        const currentVal = (currentDivision && currentTeam) ? `${currentDivision}|${currentTeam}` : '';

        let opts = '<option value="">-</option>';
        for (const [div, items] of Object.entries(grouped)) {
            opts += `<optgroup label="${div}">`;
            opts += items.map(t => {
                const val = `${t.division || ''}|${t.team}`;
                return `<option value="${val}" ${val === currentVal ? 'selected' : ''}>${div} &gt; ${t.team}</option>`;
            }).join('');
            opts += '</optgroup>';
        }
        return `<select id="${selectId}" class="form-control">${opts}</select>`;
    },

    async showDetail(id) {
        let member;
        try {
            member = await API.getMember(id);
        } catch (e) {
            Toast.error('인력 정보를 불러오지 못했습니다: ' + e.message);
            return;
        }

        const gradeClass = member.grade === '특급' ? 'badge-red' :
            member.grade === '고급' ? 'badge-blue' :
            member.grade === '중급' ? 'badge-green' : 'badge-gray';

        const skillsHtml = (member.skills || []).length > 0
            ? (member.skills).map(s => `<span class="badge badge-gray" style="margin:2px">${s.tech_stack}</span>`).join('')
            : '<span class="text-muted">-</span>';

        const assignmentsHtml = (member.assignments || []).length === 0
            ? '<tr><td colspan="6" class="text-center text-muted" style="padding:10px">배정된 프로젝트가 없습니다.</td></tr>'
            : (member.assignments).map(a => `
                <tr>
                    <td>${a.customer_name || ''}</td>
                    <td>${a.project_name || ''}</td>
                    <td>${a.tech_stack || ''}</td>
                    <td>${a.start_date || ''} ~ ${a.end_date || ''}</td>
                    <td>${a.man_month || ''}</td>
                    <td>${a.role_description || ''}</td>
                </tr>
            `).join('');

        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:14px">
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">등급</div>
                    <div><span class="badge ${gradeClass}">${member.grade || '-'}</span></div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">실무연차</div>
                    <div style="font-size:14px">${member.years_of_experience != null ? member.years_of_experience + '년' : '-'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">사업부</div>
                    <div style="font-size:14px">${member.division || '-'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">팀명</div>
                    <div style="font-size:14px">${member.team || '-'}</div>
                </div>
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:4px">가능 업무 영역</div>
                    <div>${skillsHtml}</div>
                </div>
            </div>

            <h3 style="margin:14px 0 6px;font-size:13px;font-weight:600;color:var(--gray-600)">배정된 프로젝트</h3>
            <table class="data-table">
                <thead><tr><th>고객사</th><th>프로젝트명</th><th>기술</th><th>투입기간</th><th>M/M</th><th>역할</th></tr></thead>
                <tbody>${assignmentsHtml}</tbody>
            </table>
        `;

        const footer = `
            <button class="btn btn-danger" onclick="MemberView.deleteMember(${id})">삭제</button>
            <button class="btn btn-outline" onclick="Modal.close()">닫기</button>
            <button class="btn btn-primary" onclick="MemberView.showEdit(${id})">수정</button>
        `;

        Modal.show(member.name, body, footer);
    },

    async showEdit(id) {
        const [member, techStacks, grades, teams] = await Promise.all([
            API.getMember(id),
            API.getTechStacks(),
            API.getGrades(),
            API.getTeams().catch(() => []),
        ]);

        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>담당자명</label>
                    <input type="text" id="m-edit-name" class="form-control" value="${member.name}">
                </div>
                <div class="form-group">
                    <label>등급</label>
                    <select id="m-edit-grade" class="form-control">
                        <option value="">-</option>
                        ${grades.map(g => `<option ${g === member.grade ? 'selected' : ''}>${g}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>사업부 &gt; 팀명</label>
                    ${this._buildTeamSelect('m-edit-team', teams, member.division, member.team)}
                </div>
                <div class="form-group">
                    <label>실무연차</label>
                    <input type="number" id="m-edit-yoe" class="form-control" value="${member.years_of_experience || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>가능 업무 영역</label>
                <div class="checkbox-group">
                    ${techStacks.map(ts => {
                        const checked = (member.skills || []).some(s => s.tech_stack === ts) ? 'checked' : '';
                        return `<label><input type="checkbox" class="m-edit-skill" value="${ts}" ${checked}> ${ts}</label>`;
                    }).join('')}
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-danger" onclick="MemberView.deleteMember(${id})">삭제</button>
            <button class="btn btn-outline" onclick="MemberView.showDetail(${id})">취소</button>
            <button class="btn btn-primary" onclick="MemberView.saveMember(${id})">저장</button>
        `;

        Modal.show('인력 수정', body, footer);
    },

    async saveMember(id) {
        const skills = [...document.querySelectorAll('.m-edit-skill:checked')].map(c => c.value);
        const teamVal = document.getElementById('m-edit-team').value || '';
        const [division, team] = teamVal.includes('|') ? teamVal.split('|', 2) : ['', teamVal];
        const data = {
            name: document.getElementById('m-edit-name').value,
            division: division || null,
            team: team || null,
            years_of_experience: parseInt(document.getElementById('m-edit-yoe').value) || null,
            grade: document.getElementById('m-edit-grade').value || null,
            skills,
        };
        try {
            await API.updateMember(id, data);
            Toast.success('인력 정보가 저장되었습니다.');
            Modal.close();
            await this.loadData();
            this.showDetail(id);
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async deleteMember(id) {
        if (!confirm('인력을 삭제하시겠습니까? 관련 배정 정보도 함께 삭제됩니다.')) return;
        try {
            await API.deleteMember(id);
            Toast.success('인력이 삭제되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async showCreate() {
        const [techStacks, grades, teams] = await Promise.all([
            API.getTechStacks(),
            API.getGrades(),
            API.getTeams().catch(() => []),
        ]);

        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>담당자명</label>
                    <input type="text" id="m-new-name" class="form-control">
                </div>
                <div class="form-group">
                    <label>등급</label>
                    <select id="m-new-grade" class="form-control">
                        <option value="">-</option>
                        ${grades.map(g => `<option>${g}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>사업부 &gt; 팀명</label>
                    ${this._buildTeamSelect('m-new-team', teams, '', '')}
                </div>
                <div class="form-group">
                    <label>실무연차</label>
                    <input type="number" id="m-new-yoe" class="form-control">
                </div>
            </div>
            <div class="form-group">
                <label>가능 업무 영역</label>
                <div class="checkbox-group">
                    ${techStacks.map(ts => `<label><input type="checkbox" class="m-new-skill" value="${ts}"> ${ts}</label>`).join('')}
                </div>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="MemberView.createMember()">생성</button>
        `;

        Modal.show('인력 추가', body, footer);
    },

    async createMember() {
        const name = document.getElementById('m-new-name').value;
        if (!name) { Toast.error('이름을 입력하세요.'); return; }

        const skills = [...document.querySelectorAll('.m-new-skill:checked')].map(c => c.value);
        const teamVal = document.getElementById('m-new-team').value || '';
        const [division, team] = teamVal.includes('|') ? teamVal.split('|', 2) : ['', teamVal];
        const data = {
            name,
            division: division || null,
            team: team || null,
            years_of_experience: parseInt(document.getElementById('m-new-yoe').value) || null,
            grade: document.getElementById('m-new-grade').value || null,
            skills,
        };
        try {
            await API.createMember(data);
            Toast.success('인력이 등록되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) {
            Toast.error(e.message);
        }
    },
};
