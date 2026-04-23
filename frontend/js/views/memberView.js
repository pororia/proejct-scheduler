/**
 * Member management view.
 */
const MemberView = {
    members: [],
    selectedDivision: '',
    _existingUserEmails: new Set(),

    async render() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">인력 관리</span>
                    <button class="btn btn-primary" onclick="MemberView.showCreate()">+ 인력 추가</button>
                </div>
                <div class="filter-bar" style="border:none;padding:0;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                    <select id="mb-search-field" class="form-control" style="width:110px">
                        <option value="name">이름</option>
                        <option value="email">이메일</option>
                        <option value="division">사업부</option>
                        <option value="team">팀명</option>
                        <option value="skill">업무영역</option>
                    </select>
                    <input type="text" id="mb-search-input" class="form-control" placeholder="검색어 입력..." style="width:180px">
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
                <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:white;border:1.5px solid var(--gray-100);border-radius:12px;margin-bottom:8px;flex-wrap:wrap">
                    <span style="font-size:12px;font-weight:600;color:var(--gray-500);white-space:nowrap;min-width:64px">담당 사업부</span>
                    <div id="mb-division-radio-group" style="display:flex;gap:6px;flex-wrap:wrap"></div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>이름</th>
                            <th>이메일</th>
                            <th>사업부</th>
                            <th>팀명</th>
                            <th>등급</th>
                            <th>연차</th>
                            <th>가능 업무 영역</th>
                            <th style="width:90px"></th>
                        </tr>
                    </thead>
                    <tbody id="member-tbody"></tbody>
                </table>
            </div>
        `;

        document.getElementById('mb-search-field').addEventListener('change', () => this.filterTable());
        document.getElementById('mb-search-input').addEventListener('input', () => this.filterTable());
        document.getElementById('member-filter-team').addEventListener('change', () => this.filterTable());
        document.getElementById('member-filter-grade').addEventListener('change', () => this.filterTable());
        document.getElementById('member-filter-skill').addEventListener('change', () => this.filterTable());

        await this.loadData();
    },

    selectDivision(div) {
        this.selectedDivision = div;
        document.querySelectorAll('.mb-division-chip').forEach(btn => {
            const active = btn.dataset.value === div;
            btn.style.background  = active ? 'var(--primary)' : 'white';
            btn.style.color       = active ? 'white' : 'var(--gray-600)';
            btn.style.borderColor = active ? 'var(--primary)' : 'var(--gray-200)';
            btn.style.fontWeight  = active ? '600' : '500';
        });
        this._refreshTeamFilter(div);
        this.filterTable();
    },

    _renderDivisionChips(divisions) {
        const group = document.getElementById('mb-division-radio-group');
        if (!group) return;
        const sel = this.selectedDivision;
        group.innerHTML = ['', ...divisions].map(div => {
            const active = div === sel;
            const label  = div || '전체';
            return `<button class="mb-division-chip" data-value="${div}"
                onclick="MemberView.selectDivision('${div}')"
                style="padding:4px 14px;border-radius:20px;border:1.5px solid;font-size:12px;cursor:pointer;transition:all 0.15s;
                background:${active ? 'var(--primary)' : 'white'};
                color:${active ? 'white' : 'var(--gray-600)'};
                border-color:${active ? 'var(--primary)' : 'var(--gray-200)'};
                font-weight:${active ? '600' : '500'}">${label}</button>`;
        }).join('');
    },

    async loadData() {
        const [members, divisions, teams, techStacks, users] = await Promise.all([
            API.getMembers(),
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
            API.getTechStacks().catch(() => []),
            API.getUsers().catch(() => []),
        ]);
        this.members = members;
        this._allTeams = teams;
        this._existingUserEmails = new Set(users.map(u => u.email).filter(Boolean));

        this._renderDivisionChips(divisions);

        // 팀 옵션 (현재 사업부 필터 반영)
        this._refreshTeamFilter(this.selectedDivision);

        // 업무영역 옵션
        const skillSel = document.getElementById('member-filter-skill');
        const curSkill = skillSel.value;
        skillSel.innerHTML = '<option value="">전체 업무영역</option>' +
            techStacks.map(t => `<option value="${t}" ${t === curSkill ? 'selected' : ''}>${t}</option>`).join('');

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
        const field  = document.getElementById('mb-search-field')?.value || 'name';
        const search = (document.getElementById('mb-search-input')?.value || '').toLowerCase().trim();
        const team   = document.getElementById('member-filter-team').value;
        const grade  = document.getElementById('member-filter-grade').value;
        const skill  = document.getElementById('member-filter-skill').value;
        let filtered = this.members;
        if (search) {
            filtered = filtered.filter(m => {
                if (field === 'name')     return (m.name || '').toLowerCase().includes(search);
                if (field === 'email')    return (m.email || '').toLowerCase().includes(search);
                if (field === 'division') return (m.division || '').toLowerCase().includes(search);
                if (field === 'team')     return (m.team || '').toLowerCase().includes(search);
                if (field === 'skill')    return (m.skills || []).some(s => s.tech_stack.toLowerCase().includes(search));
                return false;
            });
        }
        if (this.selectedDivision) filtered = filtered.filter(m => m.division === this.selectedDivision);
        if (team)                 filtered = filtered.filter(m => m.team === team);
        if (grade)                filtered = filtered.filter(m => m.grade === grade);
        if (skill)                filtered = filtered.filter(m => (m.skills || []).some(s => s.tech_stack === skill));
        this.renderTable(filtered);
    },

    renderTable(members) {
        const tbody = document.getElementById('member-tbody');
        const isAdmin = Auth.isAdmin();
        tbody.innerHTML = members.map(m => {
            let accountBtnHtml = '';
            if (isAdmin) {
                const hasEmail   = !!m.email;
                const hasAccount = hasEmail && this._existingUserEmails.has(m.email);
                const btnDisabled = !hasEmail || hasAccount;
                const btnTitle = !hasEmail ? '이메일이 없어 계정을 생성할 수 없습니다'
                               : hasAccount ? '이미 계정이 존재합니다' : '계정 생성';
                const btnStyle = btnDisabled
                    ? 'background:var(--gray-100);color:var(--gray-400);border:1px solid var(--gray-200);cursor:not-allowed'
                    : 'background:var(--primary);color:white;border:none;cursor:pointer';
                accountBtnHtml = `<button
                    style="padding:4px 10px;border-radius:6px;font-size:12px;${btnStyle}"
                    title="${btnTitle}"
                    ${btnDisabled ? 'disabled' : `onclick="MemberView.createAccountFromMember(${m.id})"`}>
                    계정생성
                </button>`;
            }
            return `
            <tr onclick="MemberView.showDetail(${m.id})" style="cursor:pointer">
                <td style="font-weight:600">${m.name}</td>
                <td>${m.email ? `<a href="mailto:${m.email}" onclick="event.stopPropagation()" style="color:var(--primary)">${m.email}</a>` : ''}</td>
                <td>${m.division || ''}</td>
                <td>${m.team || ''}</td>
                <td><span class="badge ${m.grade === '특급' ? 'badge-red' : m.grade === '고급' ? 'badge-blue' : m.grade === '중급' ? 'badge-green' : 'badge-gray'}">${m.grade || ''}</span></td>
                <td>${m.years_of_experience || ''}년</td>
                <td>${(m.skills || []).map(s => s.tech_stack).join(', ')}</td>
                <td onclick="event.stopPropagation()">${accountBtnHtml}</td>
            </tr>`;
        }).join('');
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
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">이메일</div>
                    <div style="font-size:14px">${member.email ? `<a href="mailto:${member.email}" style="color:var(--primary)">${member.email}</a>` : '-'}</div>
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

        const currentUser = Auth.getUser();
        const canEdit = Auth.isAdmin() ||
            (member.email && currentUser?.email && member.email === currentUser.email);

        const footer = canEdit ? `
            ${Auth.isAdmin() ? `<button class="btn btn-danger" onclick="MemberView.deleteMember(${id})">삭제</button>` : ''}
            <button class="btn btn-outline" onclick="Modal.close()">닫기</button>
            <button class="btn btn-primary" onclick="MemberView.showEdit(${id})">수정</button>
        ` : `
            <button class="btn btn-outline" onclick="Modal.close()">닫기</button>
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
                <label>이메일</label>
                <input type="email" id="m-edit-email" class="form-control" value="${member.email || ''}" placeholder="example@company.com">
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
            email: document.getElementById('m-edit-email').value || null,
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

    async createAccountFromMember(id) {
        const m = this.members.find(x => x.id === id);
        if (!m?.email) { Toast.error('이메일이 없어 계정을 생성할 수 없습니다.'); return; }
        const username = m.email.split('@')[0];
        if (!confirm(`'${m.name}' 담당자의 계정을 생성하시겠습니까?\n\n아이디: ${username}\n비밀번호: user1234`)) return;
        try {
            await API.createUser({
                username,
                name: m.name,
                email: m.email,
                password: 'user1234',
                role: 'user',
                division: m.division || null,
                team: m.team || null,
            });
            Toast.success(`'${m.name}' 계정이 생성되었습니다. (아이디: ${username})`);
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
                <label>이메일</label>
                <input type="email" id="m-new-email" class="form-control" placeholder="example@company.com">
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
            email: document.getElementById('m-new-email').value || null,
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
