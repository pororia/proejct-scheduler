/**
 * Settings view - Customer and master data management.
 */
const SettingsView = {
    async render() {
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="card">
                <div class="card-title" style="margin-bottom:20px">설정</div>

                <div class="settings-section">
                    <h3>고객사 관리</h3>
                    <div class="flex gap-2 items-center mb-2">
                        <input type="text" id="new-customer-name" class="form-control" placeholder="고객사명 입력" style="width:200px">
                        <button class="btn btn-sm btn-primary" onclick="SettingsView.addCustomer()">추가</button>
                    </div>
                    <div class="tag-list" id="customer-tags"></div>
                </div>

                <hr style="border:none;border-top:1px solid var(--gray-200);margin:20px 0">

                <div class="settings-section">
                    <h3>조직 관리 (사업부 &gt; 팀)</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                        <div>
                            <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">사업부</h4>
                            <div class="flex gap-2 items-center mb-2">
                                <input type="text" id="new-division" class="form-control" placeholder="사업부명 입력" style="width:160px">
                                <button class="btn btn-sm btn-outline" onclick="SettingsView.addDivision()">추가</button>
                            </div>
                            <div class="tag-list" id="division-tags"></div>
                        </div>
                        <div>
                            <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">팀</h4>
                            <div class="flex gap-2 items-center mb-2">
                                <select id="team-division-select" class="form-control" style="width:120px">
                                    <option value="">사업부 선택</option>
                                </select>
                                <input type="text" id="new-team" class="form-control" placeholder="팀명 입력" style="width:120px">
                                <button class="btn btn-sm btn-outline" onclick="SettingsView.addTeam()">추가</button>
                            </div>
                            <div id="team-tree"></div>
                        </div>
                    </div>
                </div>

                <hr style="border:none;border-top:1px solid var(--gray-200);margin:20px 0">

                <div class="settings-section" id="user-mgmt-section" style="display:none">
                    <h3>사용자 관리</h3>
                    <table class="data-table" style="margin-bottom:10px">
                        <thead>
                            <tr><th>아이디</th><th>이름</th><th>사업부</th><th>팀</th><th>권한</th><th></th></tr>
                        </thead>
                        <tbody id="user-tbody"></tbody>
                    </table>
                    <button class="btn btn-sm btn-primary" onclick="SettingsView.showAddUser()">+ 사용자 추가</button>
                </div>

                <hr style="border:none;border-top:1px solid var(--gray-200);margin:20px 0" id="user-mgmt-hr" style="display:none">

                <div class="settings-section">
                    <h3>마스터 데이터</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                        <div>
                            <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">구축항목</h4>
                            <div class="flex gap-2 items-center mb-2">
                                <input type="text" id="new-tech-stacks" class="form-control" placeholder="항목 입력" style="width:160px">
                                <button class="btn btn-sm btn-outline" onclick="SettingsView.addMasterItem('tech-stacks', 'new-tech-stacks', 'tech-tags')">추가</button>
                            </div>
                            <div class="tag-list" id="tech-tags"></div>
                        </div>
                        <div>
                            <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">프로젝트 유형</h4>
                            <div class="flex gap-2 items-center mb-2">
                                <input type="text" id="new-project-types" class="form-control" placeholder="유형 입력" style="width:160px">
                                <button class="btn btn-sm btn-outline" onclick="SettingsView.addMasterItem('project-types', 'new-project-types', 'ptype-tags')">추가</button>
                            </div>
                            <div class="tag-list" id="ptype-tags"></div>
                        </div>
                        <div>
                            <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">업무 유형</h4>
                            <div class="flex gap-2 items-center mb-2">
                                <input type="text" id="new-business-types" class="form-control" placeholder="유형 입력" style="width:160px">
                                <button class="btn btn-sm btn-outline" onclick="SettingsView.addMasterItem('business-types', 'new-business-types', 'btype-tags')">추가</button>
                            </div>
                            <div class="tag-list" id="btype-tags"></div>
                        </div>
                        <div>
                            <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">진행현황</h4>
                            <div class="flex gap-2 items-center mb-2">
                                <input type="text" id="new-statuses" class="form-control" placeholder="현황 입력" style="width:160px">
                                <button class="btn btn-sm btn-outline" onclick="SettingsView.addMasterItem('statuses', 'new-statuses', 'status-tags')">추가</button>
                            </div>
                            <div class="tag-list" id="status-tags"></div>
                        </div>
                        <div>
                            <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">등급</h4>
                            <div class="flex gap-2 items-center mb-2">
                                <input type="text" id="new-grades" class="form-control" placeholder="등급 입력" style="width:160px">
                                <button class="btn btn-sm btn-outline" onclick="SettingsView.addMasterItem('grades', 'new-grades', 'grade-tags')">추가</button>
                            </div>
                            <div class="tag-list" id="grade-tags"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadData();
    },

    async loadData() {
        // admin인 경우 사용자 관리 섹션 표시
        if (Auth.isAdmin()) {
            const sec = document.getElementById('user-mgmt-section');
            const hr = document.getElementById('user-mgmt-hr');
            if (sec) sec.style.display = '';
            if (hr) hr.style.display = '';
        }

        const promises = [
            API.getCustomers(),
            API.getMasterItems('tech-stacks'),
            API.getMasterItems('project-types'),
            API.getMasterItems('business-types'),
            API.getMasterItems('statuses'),
            API.getMasterItems('grades'),
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
        ];
        if (Auth.isAdmin()) promises.push(API.getUsers().catch(() => []));

        const results = await Promise.all(promises);
        const [customers, techStacks, projectTypes, businessTypes, statuses, grades, divisions, teams, users] = results;

        this._renderCustomerTags(customers);
        this._renderMasterTags('tech-tags', 'tech-stacks', techStacks);
        this._renderMasterTags('ptype-tags', 'project-types', projectTypes);
        this._renderMasterTags('btype-tags', 'business-types', businessTypes);
        this._renderMasterTags('status-tags', 'statuses', statuses);
        this._renderMasterTags('grade-tags', 'grades', grades);
        this._renderDivisions(divisions);
        this._renderTeamTree(divisions, teams);
        if (Auth.isAdmin() && users) this._renderUsers(users);
    },

    _renderUsers(users) {
        const tbody = document.getElementById('user-tbody');
        if (!tbody) return;
        this._usersCache = users; // 수정 시 재사용
        const ROLE_LABEL = { admin: '관리자', manager: '매니저', user: '사용자' };
        tbody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.username}</strong></td>
                <td>${u.name}</td>
                <td>${u.division || '<span class="text-muted">전체</span>'}</td>
                <td>${u.team || '<span class="text-muted">전체</span>'}</td>
                <td><span class="badge ${u.role === 'admin' ? 'badge-red' : u.role === 'manager' ? 'badge-blue' : 'badge-gray'}">${ROLE_LABEL[u.role] || u.role}</span></td>
                <td style="white-space:nowrap">
                    <button class="btn btn-sm btn-outline" onclick="SettingsView.showEditUser(${u.id})">수정</button>
                    <button class="btn btn-sm btn-danger" onclick="SettingsView.deleteUser(${u.id},'${u.username.replace(/'/g,"\\'")}')">삭제</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="6" class="text-center text-muted" style="padding:10px">등록된 사용자가 없습니다.</td></tr>';
    },

    // ── 렌더 헬퍼 ──────────────────────────────────────────────

    _renderCustomerTags(customers) {
        const el = document.getElementById('customer-tags');
        if (!el) return;
        el.innerHTML = customers.map(c => {
            const safe = c.name.replace(/'/g, "\\'");
            return `<span class="tag-item" id="ctag-${c.id}">
                <span class="tag-label">${c.name}</span>
                <span class="edit-tag" onclick="SettingsView.startEditCustomer(${c.id},'${safe}')" title="수정">✎</span>
                <span class="remove-tag" onclick="SettingsView.deleteCustomer(${c.id},'${safe}')">&times;</span>
            </span>`;
        }).join('');
    },

    _renderMasterTags(containerId, category, items) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = items.map(item => {
            const safe = item.value.replace(/'/g, "\\'");
            return `<span class="tag-item" id="mtag-${category}-${item.id}">
                <span class="tag-label">${item.value}</span>
                <span class="edit-tag" onclick="SettingsView.startEditMasterItem('${category}',${item.id},'${safe}','${containerId}')" title="수정">✎</span>
                <span class="remove-tag" onclick="SettingsView.deleteMasterItem('${category}',${item.id},'${safe}')">&times;</span>
            </span>`;
        }).join('');
    },

    _renderDivisions(divisions) {
        const el = document.getElementById('division-tags');
        if (!el) return;
        el.innerHTML = divisions.map(d => {
            const safe = d.replace(/'/g, "\\'");
            return `<span class="tag-item" id="divtag-${safe}">
                <span class="tag-label">${d}</span>
                <span class="edit-tag" onclick="SettingsView.startEditDivision('${safe}')" title="수정">✎</span>
                <span class="remove-tag" onclick="SettingsView.deleteDivision('${safe}')">&times;</span>
            </span>`;
        }).join('');

        const sel = document.getElementById('team-division-select');
        if (sel) {
            const cur = sel.value;
            sel.innerHTML = '<option value="">사업부 선택</option>' +
                divisions.map(d => `<option value="${d}" ${d === cur ? 'selected' : ''}>${d}</option>`).join('');
        }
    },

    _renderTeamTree(divisions, teams) {
        const el = document.getElementById('team-tree');
        if (!el) return;

        const grouped = {};
        divisions.forEach(d => { grouped[d] = []; });
        teams.forEach(t => {
            const div = t.division || '미분류';
            if (!grouped[div]) grouped[div] = [];
            grouped[div].push(t);
        });

        const divOptions = divisions.map(d => `<option value="${d}">${d}</option>`).join('');

        let html = '';
        for (const [div, items] of Object.entries(grouped)) {
            if (items.length === 0 && div !== '미분류') continue;
            const isUnclassified = div === '미분류';
            html += `<div style="margin-bottom:10px">
                <span style="font-size:12px;font-weight:600;color:var(--gray-500)">${div}</span>
                <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:6px">
                    ${items.map(t => {
                        const safeVal = t.value.replace(/'/g, "\\'");
                        const safeTeam = t.team.replace(/'/g, "\\'");
                        const moveBtn = isUnclassified && divisions.length > 0
                            ? `<span style="display:inline-flex;align-items:center;gap:3px;margin-left:2px">
                                <select class="form-control" style="height:20px;font-size:11px;padding:0 2px;width:90px" id="move-sel-${t.id}">
                                    <option value="">사업부↗</option>${divOptions}
                                </select>
                                <span style="cursor:pointer;color:var(--primary);font-size:11px"
                                    onclick="SettingsView.moveTeamToDivision(${t.id},'${safeVal}','${safeTeam}')">이동</span>
                               </span>`
                            : '';
                        return `<span class="tag-item" style="display:inline-flex;align-items:center" id="teamtag-${t.id}">
                            <span class="tag-label">${t.team}</span>${moveBtn}
                            <span class="edit-tag" style="margin-left:4px" onclick="SettingsView.startEditTeam(${t.id},'${safeVal}','${safeTeam}')" title="수정">✎</span>
                            <span class="remove-tag" onclick="SettingsView.deleteTeam(${t.id},'${safeVal}')">&times;</span>
                        </span>`;
                    }).join('')}
                </div>
            </div>`;
        }
        el.innerHTML = html || '<p class="text-muted" style="font-size:12px">등록된 팀이 없습니다.</p>';
    },

    // ── 인라인 편집 공통 ────────────────────────────────────────

    /** tag-item 내부를 인라인 input으로 교체 */
    _startInlineEdit(tagEl, currentValue, onSave, onCancel) {
        tagEl.innerHTML = `
            <input type="text" class="form-control" value="${currentValue.replace(/"/g, '&quot;')}"
                style="height:22px;font-size:12px;padding:2px 6px;width:120px;display:inline-block"
                id="inline-edit-input">
            <span style="cursor:pointer;color:var(--primary);font-size:12px;margin-left:4px" onclick="(${onSave})()">저장</span>
            <span style="cursor:pointer;color:var(--gray-400);font-size:12px;margin-left:4px" onclick="(${onCancel})()">취소</span>
        `;
        const input = tagEl.querySelector('#inline-edit-input');
        input.focus();
        input.select();
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); (onSave)(); }
            if (e.key === 'Escape') { (onCancel)(); }
        });
    },

    // ── 고객사 수정 ─────────────────────────────────────────────

    startEditCustomer(id, currentName) {
        const tagEl = document.getElementById(`ctag-${id}`);
        if (!tagEl) return;
        this._startInlineEdit(tagEl, currentName,
            async () => {
                const input = tagEl.querySelector('#inline-edit-input');
                const newName = input ? input.value.trim() : '';
                if (!newName) { Toast.error('고객사명을 입력하세요.'); return; }
                try {
                    await API.updateCustomer(id, { name: newName });
                    Toast.success('고객사명이 수정되었습니다.');
                    await this.loadData();
                } catch (e) { Toast.error(e.message); }
            },
            () => this.loadData()
        );
    },

    // ── 사업부 수정 ─────────────────────────────────────────────

    async startEditDivision(currentName) {
        // divisions는 MasterData({category:'divisions', value:name}) — id 필요
        const items = await API.getMasterItems('divisions').catch(() => []);
        const item = items.find(i => i.value === currentName);
        if (!item) return;
        const tagEl = document.getElementById(`divtag-${currentName}`);
        if (!tagEl) return;
        this._startInlineEdit(tagEl, currentName,
            async () => {
                const input = tagEl.querySelector('#inline-edit-input');
                const newName = input ? input.value.trim() : '';
                if (!newName) { Toast.error('사업부명을 입력하세요.'); return; }
                try {
                    await API.updateMasterItem('divisions', item.id, newName);
                    Toast.success('사업부명이 수정되었습니다.');
                    await this.loadData();
                } catch (e) { Toast.error(e.message); }
            },
            () => this.loadData()
        );
    },

    // ── 팀 수정 ─────────────────────────────────────────────────

    startEditTeam(id, currentValue, currentTeam) {
        const tagEl = document.getElementById(`teamtag-${id}`);
        if (!tagEl) return;
        const divPart = currentValue.includes('>') ? currentValue.split('>')[0] : '';
        this._startInlineEdit(tagEl, currentTeam,
            async () => {
                const input = tagEl.querySelector('#inline-edit-input');
                const newTeam = input ? input.value.trim() : '';
                if (!newTeam) { Toast.error('팀명을 입력하세요.'); return; }
                const newValue = divPart ? `${divPart}>${newTeam}` : newTeam;
                try {
                    await API.updateMasterItem('teams', id, newValue);
                    Toast.success('팀명이 수정되었습니다.');
                    await this.loadData();
                } catch (e) { Toast.error(e.message); }
            },
            () => this.loadData()
        );
    },

    // ── 마스터 데이터 수정 ──────────────────────────────────────

    startEditMasterItem(category, id, currentValue, containerId) {
        const tagEl = document.getElementById(`mtag-${category}-${id}`);
        if (!tagEl) return;
        this._startInlineEdit(tagEl, currentValue,
            async () => {
                const input = tagEl.querySelector('#inline-edit-input');
                const newValue = input ? input.value.trim() : '';
                if (!newValue) { Toast.error('값을 입력하세요.'); return; }
                try {
                    await API.updateMasterItem(category, id, newValue);
                    Toast.success('항목이 수정되었습니다.');
                    const items = await API.getMasterItems(category);
                    this._renderMasterTags(containerId, category, items);
                } catch (e) { Toast.error(e.message); }
            },
            async () => {
                const items = await API.getMasterItems(category);
                this._renderMasterTags(containerId, category, items);
            }
        );
    },

    // ── 추가 ────────────────────────────────────────────────────

    async addCustomer() {
        const name = document.getElementById('new-customer-name').value.trim();
        if (!name) { Toast.error('고객사명을 입력하세요.'); return; }
        try {
            await API.createCustomer({ name });
            document.getElementById('new-customer-name').value = '';
            Toast.success('고객사가 추가되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async addDivision() {
        const name = document.getElementById('new-division').value.trim();
        if (!name) { Toast.error('사업부명을 입력하세요.'); return; }
        try {
            await API.createMasterItem('divisions', name);
            document.getElementById('new-division').value = '';
            Toast.success('사업부가 추가되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async addTeam() {
        const div = document.getElementById('team-division-select').value;
        const teamName = document.getElementById('new-team').value.trim();
        if (!div) { Toast.error('사업부를 선택하세요.'); return; }
        if (!teamName) { Toast.error('팀명을 입력하세요.'); return; }
        try {
            await API.createMasterItem('teams', `${div}>${teamName}`);
            document.getElementById('new-team').value = '';
            Toast.success('팀이 추가되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async addMasterItem(category, inputId, tagsId) {
        const input = document.getElementById(inputId);
        const value = input.value.trim();
        if (!value) { Toast.error('값을 입력하세요.'); return; }
        try {
            await API.createMasterItem(category, value);
            input.value = '';
            Toast.success('항목이 추가되었습니다.');
            const items = await API.getMasterItems(category);
            this._renderMasterTags(tagsId, category, items);
        } catch (e) { Toast.error(e.message); }
    },

    // ── 삭제 ────────────────────────────────────────────────────

    async deleteCustomer(id, name) {
        if (!confirm(`'${name}' 고객사를 삭제하시겠습니까?`)) return;
        try {
            await API.deleteCustomer(id);
            Toast.success('고객사가 삭제되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async deleteDivision(name) {
        if (!confirm(`'${name}' 사업부를 삭제하시겠습니까?\n해당 사업부에 속한 팀은 미분류로 남습니다.`)) return;
        try {
            const items = await API.getMasterItems('divisions');
            const item = items.find(i => i.value === name);
            if (item) await API.deleteMasterItem('divisions', item.id);
            Toast.success('사업부가 삭제되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async moveTeamToDivision(id, _oldValue, teamName) {
        const sel = document.getElementById(`move-sel-${id}`);
        const newDiv = sel ? sel.value : '';
        if (!newDiv) { Toast.error('이동할 사업부를 선택하세요.'); return; }
        try {
            await API.deleteMasterItem('teams', id);
            await API.createMasterItem('teams', `${newDiv}>${teamName}`);
            Toast.success(`'${teamName}' 팀을 '${newDiv}' 사업부로 이동했습니다.`);
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async deleteTeam(id, value) {
        const label = value.includes('>') ? value.split('>')[1] : value;
        if (!confirm(`'${label}' 팀을 삭제하시겠습니까?`)) return;
        try {
            await API.deleteMasterItem('teams', id);
            Toast.success('팀이 삭제되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async deleteMasterItem(category, id, value) {
        if (!confirm(`'${value}' 항목을 삭제하시겠습니까?`)) return;
        try {
            await API.deleteMasterItem(category, id);
            Toast.success('항목이 삭제되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    // ── 사용자 관리 ─────────────────────────────────────────────

    _userFormBody(u, divisions, teams) {
        const ROLES = [['admin','관리자'],['manager','매니저'],['user','사용자']];
        const isAdmin = (u.role || 'user') === 'admin';

        const divOptions = divisions.map(d =>
            `<option value="${d}" ${d === u.division ? 'selected' : ''}>${d}</option>`
        ).join('');

        const teamsForDiv = u.division
            ? teams.filter(t => t.division === u.division)
            : teams;
        const teamOptions = teamsForDiv.map(t =>
            `<option value="${t.team}" ${t.team === u.team ? 'selected' : ''}>${t.team}</option>`
        ).join('');

        return `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>아이디</label>
                    <input type="text" id="u-username" class="form-control" value="${u.username || ''}"
                        ${u.id ? 'readonly style="background:#f9fafb"' : ''}>
                </div>
                <div class="form-group">
                    <label>비밀번호 ${u.id ? '<span style="font-size:11px;color:var(--gray-400)">(변경 시에만 입력)</span>' : ''}</label>
                    <input type="password" id="u-password" class="form-control"
                        placeholder="${u.id ? '변경할 비밀번호' : '비밀번호 입력'}">
                </div>
                <div class="form-group">
                    <label>이름</label>
                    <input type="text" id="u-name" class="form-control" value="${u.name || ''}">
                </div>
                <div class="form-group">
                    <label>권한</label>
                    <select id="u-role" class="form-control" onchange="SettingsView._onUserRoleChange()">
                        ${ROLES.map(([v,l]) => `<option value="${v}" ${v === (u.role||'user') ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>사업부</label>
                    <select id="u-division" class="form-control" ${isAdmin ? 'disabled' : ''}
                        onchange="SettingsView._onUserDivisionChange()">
                        <option value="">${isAdmin ? '전체' : '-- 선택 --'}</option>
                        ${divOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>팀</label>
                    <select id="u-team" class="form-control" ${isAdmin ? 'disabled' : ''}>
                        <option value="">${isAdmin ? '전체' : '-- 선택 --'}</option>
                        ${teamOptions}
                    </select>
                </div>
            </div>
        `;
    },

    /** 권한 변경 시 사업부/팀 활성화 상태 전환 */
    _onUserRoleChange() {
        const isAdmin = document.getElementById('u-role').value === 'admin';
        const divSel  = document.getElementById('u-division');
        const teamSel = document.getElementById('u-team');
        divSel.disabled  = isAdmin;
        teamSel.disabled = isAdmin;
        divSel.options[0].text  = isAdmin ? '전체' : '-- 선택 --';
        teamSel.options[0].text = isAdmin ? '전체' : '-- 선택 --';
        if (isAdmin) {
            divSel.value  = '';
            teamSel.value = '';
        }
    },

    /** 사업부 변경 시 팀 목록 필터링 */
    _onUserDivisionChange() {
        const div     = document.getElementById('u-division').value;
        const teamSel = document.getElementById('u-team');
        const teams   = this._userFormTeams || [];
        const filtered = div ? teams.filter(t => t.division === div) : teams;
        teamSel.innerHTML = '<option value="">-- 선택 --</option>' +
            filtered.map(t => `<option value="${t.team}">${t.team}</option>`).join('');
    },

    async showAddUser() {
        const [divisions, teams] = await Promise.all([
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
        ]);
        this._userFormTeams = teams;
        Modal.show('사용자 추가', this._userFormBody({}, divisions, teams), `
            <button class="btn btn-outline" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="SettingsView.createUser()">추가</button>
        `);
    },

    async createUser() {
        const username = document.getElementById('u-username').value.trim();
        const password = document.getElementById('u-password').value;
        const name     = document.getElementById('u-name').value.trim();
        const role     = document.getElementById('u-role').value;
        if (!username) { Toast.error('아이디를 입력하세요.'); return; }
        if (!password) { Toast.error('비밀번호를 입력하세요.'); return; }
        if (!name)     { Toast.error('이름을 입력하세요.'); return; }
        const isAdmin = role === 'admin';
        try {
            await API.createUser({
                username, password, name, role,
                division: isAdmin ? null : (document.getElementById('u-division').value || null),
                team:     isAdmin ? null : (document.getElementById('u-team').value || null),
            });
            Toast.success('사용자가 추가되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async showEditUser(id) {
        const u = (this._usersCache || []).find(u => u.id === id);
        if (!u) return;
        const [divisions, teams] = await Promise.all([
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
        ]);
        this._userFormTeams = teams;
        Modal.show('사용자 수정', this._userFormBody(u, divisions, teams), `
            <button class="btn btn-outline" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="SettingsView.updateUser(${id})">저장</button>
        `);
    },

    async updateUser(id) {
        const name = document.getElementById('u-name').value.trim();
        if (!name) { Toast.error('이름을 입력하세요.'); return; }
        const role    = document.getElementById('u-role').value;
        const isAdmin = role === 'admin';
        const data = {
            name, role,
            division: isAdmin ? null : (document.getElementById('u-division').value || null),
            team:     isAdmin ? null : (document.getElementById('u-team').value || null),
        };
        const pw = document.getElementById('u-password').value;
        if (pw) data.password = pw;
        try {
            await API.updateUser(id, data);
            Toast.success('사용자 정보가 수정되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

    async deleteUser(id, username) {
        if (!confirm(`'${username}' 사용자를 삭제하시겠습니까?`)) return;
        try {
            await API.deleteUser(id);
            Toast.success('사용자가 삭제되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },
};
