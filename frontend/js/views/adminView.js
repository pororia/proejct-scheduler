/**
 * Admin view — user management and release note (version history) management.
 */
const AdminView = {
    versions: [],
    _editor: null,
    _editingId: null,
    _usersCache: [],
    _userFormTeams: [],

    async render() {
        if (!Auth.isAdmin()) {
            await this._renderMyAccount();
            return;
        }
        const container = document.getElementById('app-content');
        container.innerHTML = `
            <!-- 사용자 관리 -->
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <span class="card-title">사용자 관리</span>
                    <button class="btn btn-primary" onclick="AdminView.showAddUser()">+ 사용자 추가</button>
                </div>
                <div id="admin-user-list"></div>
            </div>

            <!-- 조직 관리 -->
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <span class="card-title">조직 관리 (사업부 &gt; 팀)</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:16px">
                    <div>
                        <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">사업부</h4>
                        <div class="flex gap-2 items-center mb-2">
                            <input type="text" id="admin-new-division" class="form-control" placeholder="사업부명 입력" style="width:160px">
                            <button class="btn btn-sm btn-outline" onclick="AdminView.addDivision()">추가</button>
                        </div>
                        <div class="tag-list" id="admin-division-tags"></div>
                    </div>
                    <div>
                        <h4 style="font-size:13px;margin-bottom:6px;color:var(--gray-600)">팀</h4>
                        <div class="flex gap-2 items-center mb-2">
                            <select id="admin-team-div-select" class="form-control" style="width:120px">
                                <option value="">사업부 선택</option>
                            </select>
                            <input type="text" id="admin-new-team" class="form-control" placeholder="팀명 입력" style="width:120px">
                            <button class="btn btn-sm btn-outline" onclick="AdminView.addTeam()">추가</button>
                        </div>
                        <div id="admin-team-tree"></div>
                    </div>
                </div>
            </div>

            <!-- 릴리즈 노트 관리 -->
            <div class="card">
                <div class="card-header">
                    <span class="card-title">릴리즈 노트 관리</span>
                    <button class="btn btn-primary" onclick="AdminView.showForm()">+ 버전 추가</button>
                </div>
                <div id="admin-version-list"></div>
            </div>

            <!-- 버전 작성/수정 폼 (초기 숨김) -->
            <div class="card" id="admin-form-card" style="display:none;margin-top:16px">
                <div class="card-header">
                    <span class="card-title" id="admin-form-title">버전 추가</span>
                    <button class="btn btn-outline" onclick="AdminView.hideForm()">취소</button>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
                    <div class="form-group" style="margin:0">
                        <label>버전</label>
                        <input type="text" id="admin-version" class="form-control" placeholder="예: v0.6">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label>제목</label>
                        <input type="text" id="admin-title" class="form-control" placeholder="예: 기능 추가 및 버그 수정">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label>릴리즈 날짜</label>
                        <input type="date" id="admin-date" class="form-control">
                    </div>
                </div>
                <div class="form-group">
                    <label>릴리즈 노트 내용</label>
                    <div id="admin-editor" style="height:400px;font-size:14px"></div>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
                    <button class="btn btn-outline" onclick="AdminView.hideForm()">취소</button>
                    <button class="btn btn-primary" onclick="AdminView.save()">저장</button>
                </div>
            </div>
        `;
        await Promise.all([this._loadUsers(), this._loadOrg(), this.loadList()]);
    },

    // ── 내 계정 (일반 사용자) ────────────────────────────────────

    async _renderMyAccount() {
        const container = document.getElementById('app-content');
        const titleEl   = document.getElementById('header-page-title');
        if (titleEl) titleEl.textContent = '내 계정';

        const u = Auth.getUser();
        const ROLE_LABEL = { admin: '관리자', manager: '매니저', user: '일반 사용자' };

        container.innerHTML = `
            <div class="card" style="max-width:520px">
                <div class="card-header">
                    <span class="card-title">내 계정 정보</span>
                </div>
                <div style="padding:20px">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
                        <div class="form-group" style="margin:0">
                            <label>아이디</label>
                            <input class="form-control" value="${u.username || ''}" disabled style="background:var(--gray-50);color:var(--gray-500)">
                        </div>
                        <div class="form-group" style="margin:0">
                            <label>이름</label>
                            <input class="form-control" value="${u.name || ''}" disabled style="background:var(--gray-50);color:var(--gray-500)">
                        </div>
                        <div class="form-group" style="margin:0">
                            <label>역할</label>
                            <input class="form-control" value="${ROLE_LABEL[u.role] || u.role || ''}" disabled style="background:var(--gray-50);color:var(--gray-500)">
                        </div>
                        <div class="form-group" style="margin:0">
                            <label>이메일</label>
                            <input class="form-control" value="${u.email || '-'}" disabled style="background:var(--gray-50);color:var(--gray-500)">
                        </div>
                        <div class="form-group" style="margin:0">
                            <label>사업부</label>
                            <input class="form-control" value="${u.division || '-'}" disabled style="background:var(--gray-50);color:var(--gray-500)">
                        </div>
                        <div class="form-group" style="margin:0">
                            <label>팀</label>
                            <input class="form-control" value="${u.team || '-'}" disabled style="background:var(--gray-50);color:var(--gray-500)">
                        </div>
                    </div>
                    <hr style="margin:4px 0 20px;border:none;border-top:1px solid var(--gray-100)">
                    <h4 style="font-size:13px;font-weight:600;color:var(--gray-600);margin-bottom:12px">비밀번호 변경</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                        <div class="form-group" style="margin:0">
                            <label>새 비밀번호 <span style="color:var(--danger)">*</span></label>
                            <input type="password" id="my-new-pw" class="form-control" placeholder="새 비밀번호">
                        </div>
                        <div class="form-group" style="margin:0">
                            <label>비밀번호 확인 <span style="color:var(--danger)">*</span></label>
                            <input type="password" id="my-confirm-pw" class="form-control" placeholder="비밀번호 재입력">
                        </div>
                    </div>
                    <div style="margin-top:16px;text-align:right">
                        <button class="btn btn-primary" onclick="AdminView.saveMyPassword(${u.id})">비밀번호 변경</button>
                    </div>
                </div>
            </div>
        `;
    },

    async saveMyPassword(userId) {
        const pw  = document.getElementById('my-new-pw')?.value || '';
        const pw2 = document.getElementById('my-confirm-pw')?.value || '';
        if (!pw)        { Toast.error('새 비밀번호를 입력하세요.'); return; }
        if (pw !== pw2) { Toast.error('비밀번호가 일치하지 않습니다.'); return; }
        try {
            await API.updateUser(userId, { password: pw });
            Toast.success('비밀번호가 변경되었습니다.');
            document.getElementById('my-new-pw').value    = '';
            document.getElementById('my-confirm-pw').value = '';
        } catch (e) { Toast.error(e.message); }
    },

    // ── 사용자 관리 ─────────────────────────────────────────────

    async _loadUsers() {
        try {
            this._usersCache = await API.getUsers();
        } catch (e) {
            this._usersCache = [];
        }
        this._renderUsers(this._usersCache);
    },

    _renderUsers(users) {
        const el = document.getElementById('admin-user-list');
        if (!el) return;
        if (!users.length) {
            el.innerHTML = `<p class="text-muted" style="padding:20px;text-align:center">등록된 사용자가 없습니다.</p>`;
            return;
        }
        const roleLabel = r => r === 'admin' ? '<span class="badge badge-blue">관리자</span>' : '<span class="badge" style="background:var(--gray-100);color:var(--gray-600)">일반</span>';
        el.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:100px">아이디</th>
                        <th style="width:90px">이름</th>
                        <th style="width:80px">역할</th>
                        <th>이메일</th>
                        <th>사업부</th>
                        <th>팀</th>
                        <th style="width:120px"></th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${u.username}</td>
                            <td>${u.name}</td>
                            <td>${roleLabel(u.role)}</td>
                            <td>${u.email ? `<a href="mailto:${u.email}" style="color:var(--primary)">${u.email}</a>` : '<span class="text-muted">-</span>'}</td>
                            <td>${u.division || '<span class="text-muted">-</span>'}</td>
                            <td>${u.team || '<span class="text-muted">-</span>'}</td>
                            <td style="white-space:nowrap">
                                <button class="btn btn-sm btn-outline" onclick="AdminView.showEditUser(${u.id})">수정</button>
                                <button class="btn btn-sm btn-danger" onclick="AdminView.deleteUser(${u.id},'${(u.username||'').replace(/'/g,"\\'")}')">삭제</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    _userFormBody(u, divisions, teams) {
        const isEdit = !!u;
        const divOptions = divisions.map(d => `<option value="${d}" ${u?.division === d ? 'selected' : ''}>${d}</option>`).join('');
        const teamOptions = (u?.division
            ? teams.filter(t => t.division === u.division)
            : []
        ).map(t => `<option value="${t.team}" ${u?.team === t.team ? 'selected' : ''}>${t.team}</option>`).join('');

        return `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                ${!isEdit ? `
                <div class="form-group" style="margin:0">
                    <label>아이디 <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="uf-username" class="form-control" placeholder="로그인 아이디" autocomplete="off">
                </div>` : `<div></div>`}
                <div class="form-group" style="margin:0">
                    <label>이름 <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="uf-name" class="form-control" value="${u?.name || ''}" placeholder="표시 이름">
                </div>
                <div class="form-group" style="margin:0">
                    <label>비밀번호${isEdit ? ' <span style="color:var(--gray-400);font-weight:400">(변경 시 입력)</span>' : ' <span style="color:var(--danger)">*</span>'}</label>
                    <input type="password" id="uf-password" class="form-control" placeholder="${isEdit ? '변경할 비밀번호' : '비밀번호'}" autocomplete="new-password">
                </div>
                <div class="form-group" style="margin:0">
                    <label>역할</label>
                    <select id="uf-role" class="form-control" onchange="AdminView._onUserRoleChange()">
                        <option value="user" ${u?.role !== 'admin' ? 'selected' : ''}>일반 사용자</option>
                        <option value="admin" ${u?.role === 'admin' ? 'selected' : ''}>관리자</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0">
                    <label>사업부</label>
                    <select id="uf-division" class="form-control" onchange="AdminView._onUserDivisionChange()">
                        <option value="">선택 안 함</option>
                        ${divOptions}
                    </select>
                </div>
                <div class="form-group" style="margin:0">
                    <label>팀</label>
                    <select id="uf-team" class="form-control">
                        <option value="">선택 안 함</option>
                        ${teamOptions}
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin:0">
                <label>이메일</label>
                <input type="email" id="uf-email" class="form-control" value="${u?.email || ''}" placeholder="example@company.com">
            </div>
        `;
    },

    _onUserRoleChange() { /* no-op — reserved for future role-specific UI */ },

    _onUserDivisionChange() {
        const div = document.getElementById('uf-division')?.value || '';
        const teamSel = document.getElementById('uf-team');
        if (!teamSel) return;
        const filtered = div ? this._userFormTeams.filter(t => t.division === div) : [];
        teamSel.innerHTML = '<option value="">선택 안 함</option>' +
            filtered.map(t => `<option value="${t.team}">${t.team}</option>`).join('');
    },

    async showAddUser() {
        const [divisions, teams] = await Promise.all([
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
        ]);
        this._userFormTeams = teams;
        Modal.show(
            '사용자 추가',
            this._userFormBody(null, divisions, teams),
            `<button class="btn btn-outline" onclick="Modal.close()">취소</button>
             <button class="btn btn-primary" onclick="AdminView.createUser()">추가</button>`
        );
    },

    async createUser() {
        const username = document.getElementById('uf-username')?.value.trim() || '';
        const name     = document.getElementById('uf-name')?.value.trim() || '';
        const password = document.getElementById('uf-password')?.value || '';
        const role     = document.getElementById('uf-role')?.value || 'user';
        const email    = document.getElementById('uf-email')?.value.trim() || null;
        const division = document.getElementById('uf-division')?.value || null;
        const team     = document.getElementById('uf-team')?.value || null;
        if (!username) { Toast.error('아이디를 입력하세요.'); return; }
        if (!name)     { Toast.error('이름을 입력하세요.'); return; }
        if (!password) { Toast.error('비밀번호를 입력하세요.'); return; }
        try {
            await API.createUser({ username, name, password, email, role, division, team });
            Toast.success('사용자가 추가되었습니다.');
            Modal.close();
            await this._loadUsers();
        } catch (e) { Toast.error(e.message); }
    },

    async showEditUser(id) {
        const u = this._usersCache.find(x => x.id === id);
        if (!u) return;
        const [divisions, teams] = await Promise.all([
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
        ]);
        this._userFormTeams = teams;
        Modal.show(
            '사용자 수정',
            `<p class="text-muted" style="margin:0 0 16px;font-size:13px">아이디: ${u.username}</p>
             ${this._userFormBody(u, divisions, teams)}`,
            `<button class="btn btn-outline" onclick="Modal.close()">취소</button>
             <button class="btn btn-primary" onclick="AdminView.updateUser(${id})">저장</button>`
        );
    },

    async updateUser(id) {
        const name     = document.getElementById('uf-name')?.value.trim() || '';
        const password = document.getElementById('uf-password')?.value || '';
        const role     = document.getElementById('uf-role')?.value || 'user';
        const email    = document.getElementById('uf-email')?.value.trim() || null;
        const division = document.getElementById('uf-division')?.value || null;
        const team     = document.getElementById('uf-team')?.value || null;
        if (!name) { Toast.error('이름을 입력하세요.'); return; }
        const data = { name, email, role, division, team };
        if (password) data.password = password;
        try {
            await API.updateUser(id, data);
            Toast.success('사용자 정보가 수정되었습니다.');
            Modal.close();
            await this._loadUsers();
        } catch (e) { Toast.error(e.message); }
    },

    async deleteUser(id, username) {
        if (!confirm(`'${username}' 사용자를 삭제하시겠습니까?`)) return;
        try {
            await API.deleteUser(id);
            Toast.success('사용자가 삭제되었습니다.');
            await this._loadUsers();
        } catch (e) { Toast.error(e.message); }
    },

    // ── 조직 관리 ────────────────────────────────────────────────

    async _loadOrg() {
        const [divisions, teams] = await Promise.all([
            API.getDivisions().catch(() => []),
            API.getTeams().catch(() => []),
        ]);
        this._renderDivisions(divisions);
        this._renderTeamTree(divisions, teams);
    },

    _renderDivisions(divisions) {
        const el = document.getElementById('admin-division-tags');
        if (!el) return;
        el.innerHTML = divisions.map(d => {
            const safe = d.replace(/'/g, "\\'");
            return `<span class="tag-item" id="admin-divtag-${safe}">
                <span class="tag-label">${d}</span>
                <span class="edit-tag" onclick="AdminView.startEditDivision('${safe}')" title="수정">✎</span>
                <span class="remove-tag" onclick="AdminView.deleteDivision('${safe}')">&times;</span>
            </span>`;
        }).join('');

        const sel = document.getElementById('admin-team-div-select');
        if (sel) {
            const cur = sel.value;
            sel.innerHTML = '<option value="">사업부 선택</option>' +
                divisions.map(d => `<option value="${d}" ${d === cur ? 'selected' : ''}>${d}</option>`).join('');
        }
    },

    _renderTeamTree(divisions, teams) {
        const el = document.getElementById('admin-team-tree');
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
                                <select class="form-control" style="height:20px;font-size:11px;padding:0 2px;width:90px" id="admin-move-sel-${t.id}">
                                    <option value="">사업부↗</option>${divOptions}
                                </select>
                                <span style="cursor:pointer;color:var(--primary);font-size:11px"
                                    onclick="AdminView.moveTeamToDivision(${t.id},'${safeVal}','${safeTeam}')">이동</span>
                               </span>`
                            : '';
                        return `<span class="tag-item" style="display:inline-flex;align-items:center" id="admin-teamtag-${t.id}">
                            <span class="tag-label">${t.team}</span>${moveBtn}
                            <span class="edit-tag" style="margin-left:4px" onclick="AdminView.startEditTeam(${t.id},'${safeVal}','${safeTeam}')" title="수정">✎</span>
                            <span class="remove-tag" onclick="AdminView.deleteTeam(${t.id},'${safeVal}')">&times;</span>
                        </span>`;
                    }).join('')}
                </div>
            </div>`;
        }
        el.innerHTML = html || '<p class="text-muted" style="font-size:12px">등록된 팀이 없습니다.</p>';
    },

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

    async startEditDivision(currentName) {
        const items = await API.getMasterItems('divisions').catch(() => []);
        const item = items.find(i => i.value === currentName);
        if (!item) return;
        const tagEl = document.getElementById(`admin-divtag-${currentName}`);
        if (!tagEl) return;
        this._startInlineEdit(tagEl, currentName,
            async () => {
                const input = tagEl.querySelector('#inline-edit-input');
                const newName = input ? input.value.trim() : '';
                if (!newName) { Toast.error('사업부명을 입력하세요.'); return; }
                try {
                    await API.updateMasterItem('divisions', item.id, newName);
                    Toast.success('사업부명이 수정되었습니다.');
                    await AdminView._loadOrg();
                } catch (e) { Toast.error(e.message); }
            },
            () => AdminView._loadOrg()
        );
    },

    startEditTeam(id, currentValue, currentTeam) {
        const tagEl = document.getElementById(`admin-teamtag-${id}`);
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
                    await AdminView._loadOrg();
                } catch (e) { Toast.error(e.message); }
            },
            () => AdminView._loadOrg()
        );
    },

    async addDivision() {
        const name = document.getElementById('admin-new-division').value.trim();
        if (!name) { Toast.error('사업부명을 입력하세요.'); return; }
        try {
            await API.createMasterItem('divisions', name);
            document.getElementById('admin-new-division').value = '';
            Toast.success('사업부가 추가되었습니다.');
            await this._loadOrg();
        } catch (e) { Toast.error(e.message); }
    },

    async addTeam() {
        const div = document.getElementById('admin-team-div-select').value;
        const teamName = document.getElementById('admin-new-team').value.trim();
        if (!div) { Toast.error('사업부를 선택하세요.'); return; }
        if (!teamName) { Toast.error('팀명을 입력하세요.'); return; }
        try {
            await API.createMasterItem('teams', `${div}>${teamName}`);
            document.getElementById('admin-new-team').value = '';
            Toast.success('팀이 추가되었습니다.');
            await this._loadOrg();
        } catch (e) { Toast.error(e.message); }
    },

    async moveTeamToDivision(id, _oldValue, teamName) {
        const sel = document.getElementById(`admin-move-sel-${id}`);
        const newDiv = sel ? sel.value : '';
        if (!newDiv) { Toast.error('이동할 사업부를 선택하세요.'); return; }
        try {
            await API.deleteMasterItem('teams', id);
            await API.createMasterItem('teams', `${newDiv}>${teamName}`);
            Toast.success(`'${teamName}' 팀을 '${newDiv}' 사업부로 이동했습니다.`);
            await this._loadOrg();
        } catch (e) { Toast.error(e.message); }
    },

    async deleteDivision(name) {
        if (!confirm(`'${name}' 사업부를 삭제하시겠습니까?\n해당 사업부에 속한 팀은 미분류로 남습니다.`)) return;
        try {
            const items = await API.getMasterItems('divisions');
            const item = items.find(i => i.value === name);
            if (item) await API.deleteMasterItem('divisions', item.id);
            Toast.success('사업부가 삭제되었습니다.');
            await this._loadOrg();
        } catch (e) { Toast.error(e.message); }
    },

    async deleteTeam(id, value) {
        const label = value.includes('>') ? value.split('>')[1] : value;
        if (!confirm(`'${label}' 팀을 삭제하시겠습니까?`)) return;
        try {
            await API.deleteMasterItem('teams', id);
            Toast.success('팀이 삭제되었습니다.');
            await this._loadOrg();
        } catch (e) { Toast.error(e.message); }
    },

    // ── 버전/릴리즈 노트 관리 ───────────────────────────────────

    async loadList() {
        try {
            this.versions = await API.getVersions();
        } catch (e) {
            this.versions = [];
        }
        this._renderList();
    },

    _renderList() {
        const el = document.getElementById('admin-version-list');
        if (!el) return;
        if (!this.versions.length) {
            el.innerHTML = `<p class="text-muted" style="padding:20px;text-align:center">등록된 버전이 없습니다.</p>`;
            return;
        }
        el.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width:90px">버전</th>
                        <th>제목</th>
                        <th style="width:110px">릴리즈 날짜</th>
                        <th style="width:120px"></th>
                    </tr>
                </thead>
                <tbody>
                    ${this.versions.map(v => `
                        <tr>
                            <td><span class="badge badge-blue">${v.version}</span></td>
                            <td>${v.title || '<span class="text-muted">-</span>'}</td>
                            <td>${v.released_at || '-'}</td>
                            <td style="white-space:nowrap">
                                <button class="btn btn-sm btn-outline" onclick="AdminView.showForm(${v.id})">수정</button>
                                <button class="btn btn-sm btn-danger" onclick="AdminView.deleteVersion(${v.id},'${(v.version||'').replace(/'/g,"\\'")}')">삭제</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    showForm(id) {
        this._editingId = id || null;
        const card = document.getElementById('admin-form-card');
        const titleEl = document.getElementById('admin-form-title');
        if (!card) return;

        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (id) {
            const v = this.versions.find(x => x.id === id);
            titleEl.textContent = '버전 수정';
            document.getElementById('admin-version').value = v?.version || '';
            document.getElementById('admin-title').value   = v?.title || '';
            document.getElementById('admin-date').value    = v?.released_at || '';
            this._initEditor(v?.content || '');
        } else {
            titleEl.textContent = '버전 추가';
            document.getElementById('admin-version').value = '';
            document.getElementById('admin-title').value   = '';
            document.getElementById('admin-date').value    = '';
            this._initEditor('');
        }
    },

    hideForm() {
        const card = document.getElementById('admin-form-card');
        if (card) card.style.display = 'none';
        this._editingId = null;
        this._editor = null;
    },

    _initEditor(content) {
        // 기존 Quill 인스턴스 제거 후 재생성
        const el = document.getElementById('admin-editor');
        if (!el) return;
        el.innerHTML = '';
        this._editor = new Quill('#admin-editor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ header: [1, 2, 3, false] }],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link', 'clean'],
                ],
            },
        });
        if (content) this._editor.root.innerHTML = content;
    },

    async save() {
        const version = document.getElementById('admin-version').value.trim();
        if (!version) { Toast.error('버전을 입력하세요.'); return; }
        const content = this._editor?.root.innerHTML || '';
        const data = {
            version,
            title:       document.getElementById('admin-title').value.trim() || null,
            released_at: document.getElementById('admin-date').value || null,
            content:     (content === '<p><br></p>' || !content) ? null : content,
        };
        try {
            if (this._editingId) {
                await API.updateVersion(this._editingId, data);
                Toast.success('버전 정보가 수정되었습니다.');
            } else {
                await API.createVersion(data);
                Toast.success('버전이 등록되었습니다.');
            }
            this.hideForm();
            await this.loadList();
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async deleteVersion(id, versionStr) {
        if (!confirm(`"${versionStr}" 버전을 삭제하시겠습니까?`)) return;
        try {
            await API.deleteVersion(id);
            Toast.success('삭제되었습니다.');
            await this.loadList();
        } catch (e) {
            Toast.error(e.message);
        }
    },
};
