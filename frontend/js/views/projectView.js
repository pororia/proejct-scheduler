/**
 * Project management view.
 */
const ProjectView = {
    customers: [],
    members: [],

    async render() {
        const currentYear = new Date().getFullYear();
        const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 3 + i)
            .map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}년</option>`)
            .join('');

        const container = document.getElementById('app-content');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="card-title">프로젝트 관리</span>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-secondary" onclick="ProjectView.downloadExcel()">↓ 엑셀 다운로드</button>
                        <button class="btn btn-primary" onclick="ProjectView.showCreate()">+ 프로젝트 추가</button>
                    </div>
                </div>
                <div class="filter-bar" style="border:none;padding:0;margin-bottom:12px">
                    <select id="proj-filter-year" class="form-control" style="width:110px">
                        <option value="">전체 년도</option>
                        ${yearOptions}
                    </select>
                    <input type="text" id="proj-search" class="form-control" placeholder="검색..." style="width:200px">
                    <select id="proj-filter-status" class="form-control" style="width:120px">
                        <option value="">전체 현황</option>
                    </select>
                    <select id="proj-filter-type" class="form-control" style="width:120px">
                        <option value="">전체 유형</option>
                    </select>
                </div>
                <div style="overflow-x:auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>확정</th>
                                <th>고객사</th>
                                <th>프로젝트명</th>
                                <th>유형</th>
                                <th>업무유형</th>
                                <th>진행현황</th>
                                <th>기간</th>
                                <th>규모(억)</th>
                                <th>구축항목</th>
                                <th>인력수</th>
                            </tr>
                        </thead>
                        <tbody id="proj-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        // Load filter options
        const [statuses, types] = await Promise.all([API.getStatuses(), API.getProjectTypes()]);
        const statusSel = document.getElementById('proj-filter-status');
        statuses.forEach(s => statusSel.innerHTML += `<option value="${s}">${s}</option>`);
        const typeSel = document.getElementById('proj-filter-type');
        types.forEach(t => typeSel.innerHTML += `<option value="${t}">${t}</option>`);

        document.getElementById('proj-filter-year').addEventListener('change', () => this.filterTable());
        document.getElementById('proj-search').addEventListener('input', () => this.filterTable());
        document.getElementById('proj-filter-status').addEventListener('change', () => this.filterTable());
        document.getElementById('proj-filter-type').addEventListener('change', () => this.filterTable());

        this.customers = await API.getCustomers();
        this.members = await API.getMembers();
        await this.loadData();
    },

    async loadData() {
        this.projects = await API.getProjects();
        this.filterTable();
    },

    filterTable() {
        const year = parseInt(document.getElementById('proj-filter-year').value) || null;
        const search = document.getElementById('proj-search').value.toLowerCase();
        const status = document.getElementById('proj-filter-status').value;
        const type = document.getElementById('proj-filter-type').value;
        let filtered = this.projects;
        if (year) {
            filtered = filtered.filter(p => {
                const start = p.start_date ? p.start_date.substring(0, 4) : null;
                const end = p.end_date ? p.end_date.substring(0, 4) : null;
                if (!start && !end) return false;
                return (!start || parseInt(start) <= year) && (!end || parseInt(end) >= year);
            });
        }
        if (search) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(search) ||
                (p.customer_name || '').toLowerCase().includes(search)
            );
        }
        if (status) filtered = filtered.filter(p => p.status === status);
        if (type) filtered = filtered.filter(p => p.project_type === type);
        this.filteredProjects = filtered;
        this.renderTable(filtered);
    },

    downloadExcel() {
        const projects = this.filteredProjects || this.projects || [];
        if (!projects.length) {
            Toast.error('다운로드할 데이터가 없습니다.');
            return;
        }

        const rows = projects.map(p => ({
            '확정': p.confirmed || '',
            '고객사': p.customer_name || '',
            '프로젝트명': p.name || '',
            '유형': p.project_type || '',
            '업무유형': p.business_type || '',
            '진행현황': p.status || '',
            '시작일': p.start_date || '',
            '종료일': p.end_date || '',
            '규모(억)': p.budget || '',
            '담당 영업': p.sales_rep || '',
            '구축항목': (p.tech_stacks || []).map(ts => ts.tech_stack).join(', '),
            '인력수': p.assignments_count || 0,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        // 컬럼 너비 설정
        ws['!cols'] = [
            { wch: 6 }, { wch: 14 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
            { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, { wch: 8 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '프로젝트 목록');

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `프로젝트목록_${today}.xlsx`);
    },

    renderTable(projects) {
        const tbody = document.getElementById('proj-tbody');
        tbody.innerHTML = projects.map(p => {
            const badgeClass = p.status === '진행중' ? 'badge-blue' :
                p.status === '완료' ? 'badge-green' :
                p.status === '시작전' ? 'badge-yellow' : 'badge-gray';
            const confirmedClass = p.confirmed === 'O' ? 'confirmed-O' :
                p.confirmed === '?' ? 'confirmed-Q' :
                p.confirmed === 'X' ? 'confirmed-X' : '';
            return `
                <tr onclick="ProjectView.showDetail(${p.id})" style="cursor:pointer">
                    <td class="${confirmedClass}" style="font-weight:700">${p.confirmed || ''}</td>
                    <td>${p.customer_name || ''}</td>
                    <td>${p.name}</td>
                    <td>${p.project_type || ''}</td>
                    <td>${p.business_type || ''}</td>
                    <td><span class="badge ${badgeClass}">${p.status || ''}</span></td>
                    <td>${p.start_date || ''} ~ ${p.end_date || ''}</td>
                    <td class="text-right">${p.budget || ''}</td>
                    <td>${(p.tech_stacks || []).map(ts => ts.tech_stack).join(', ')}</td>
                    <td class="text-center">${p.assignments_count || '-'}</td>
                </tr>
            `;
        }).join('');
    },

    async showDetail(id) {
        let project;
        try {
            project = await API.getProject(id);
        } catch (e) {
            Toast.error('프로젝트 정보를 불러오지 못했습니다: ' + e.message);
            return;
        }

        const confirmedClass = project.confirmed === 'O' ? 'confirmed-O' :
            project.confirmed === '?' ? 'confirmed-Q' :
            project.confirmed === 'X' ? 'confirmed-X' : '';
        const badgeClass = project.status === '진행중' ? 'badge-blue' :
            project.status === '완료' ? 'badge-green' :
            project.status === '시작전' ? 'badge-yellow' : 'badge-gray';

        const techStacksHtml = (project.tech_stacks || []).length > 0
            ? (project.tech_stacks).map(ts => `<span class="badge badge-gray" style="margin:2px">${ts.tech_stack}</span>`).join('')
            : '<span class="text-muted">-</span>';

        const projectUrlHtml = project.project_url
            ? `<a href="${project.project_url}" target="_blank" style="color:var(--primary)">🔗 ${project.project_url}</a>`
            : '<span class="text-muted">-</span>';
        const documentUrlHtml = project.document_url
            ? `<a href="${project.document_url}" target="_blank" style="color:var(--primary)">🔗 ${project.document_url}</a>`
            : '<span class="text-muted">-</span>';

        const assignmentsHtml = (project.assignments || []).length === 0
            ? '<tr><td colspan="5" class="text-center text-muted" style="padding:10px">등록된 인력이 없습니다.</td></tr>'
            : (project.assignments || []).map(a => {
                const periods = a.periods && a.periods.length > 0 ? a.periods : (a.start_date ? [{start_date: a.start_date, end_date: a.end_date, man_month: a.man_month}] : []);
                const periodHtml = periods.map(p =>
                    `<div style="white-space:nowrap">· ${p.start_date || ''} ~ ${p.end_date || ''}${p.man_month ? ` <span style="color:var(--gray-500)">(${p.man_month}M/M)</span>` : ''}</div>`
                ).join('');
                return `<tr>
                    <td>${a.member_name || ''}</td>
                    <td>${a.tech_stack || ''}</td>
                    <td>${a.grade_required || ''}</td>
                    <td>${a.role_description || ''}</td>
                    <td>${periodHtml}</td>
                </tr>`;
            }).join('');

        const recurringHtml = (project.recurring_schedules || []).length === 0
            ? '<tr><td colspan="5" class="text-center text-muted" style="padding:10px">등록된 반복일정이 없습니다.</td></tr>'
            : (project.recurring_schedules || []).map(r => `
                <tr>
                    <td>${r.recurrence_type === 'monthly' ? '월별' : '분기별'}</td>
                    <td>매월 ${r.day_of_month}일</td>
                    <td>${r.start_date || ''}</td>
                    <td>${r.end_date || '-'}</td>
                    <td>${r.description || ''}</td>
                </tr>
            `).join('');

        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:14px">
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">고객사</div>
                    <div style="font-size:14px">${project.customer_name || '-'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">확정여부</div>
                    <div class="${confirmedClass}" style="font-size:14px;font-weight:700">${project.confirmed || '-'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">유형</div>
                    <div style="font-size:14px">${project.project_type || '-'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">업무유형</div>
                    <div style="font-size:14px">${project.business_type || '-'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">진행현황</div>
                    <div><span class="badge ${badgeClass}">${project.status || '-'}</span></div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">규모(억)</div>
                    <div style="font-size:14px">${project.budget != null ? project.budget : '-'}</div>
                </div>
                <div>
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">담당 영업</div>
                    <div style="font-size:14px">${project.sales_rep || '-'}</div>
                </div>
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">기간</div>
                    <div style="font-size:14px">${project.start_date || ''} ~ ${project.end_date || ''}</div>
                </div>
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">구축항목</div>
                    <div style="margin-top:2px">${techStacksHtml}</div>
                </div>
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">프로젝트 상세 URL</div>
                    <div style="font-size:13px;word-break:break-all">${projectUrlHtml}</div>
                </div>
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">프로젝트 문서 URL</div>
                    <div style="font-size:13px;word-break:break-all">${documentUrlHtml}</div>
                </div>
                ${project.description ? `
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:4px">설명</div>
                    <div style="font-size:13px;line-height:1.6;padding:8px;background:var(--gray-50);border-radius:4px;border:1px solid var(--gray-200)">${project.description}</div>
                </div>` : ''}
                ${project.notes ? `
                <div style="grid-column:1/-1">
                    <div class="text-muted" style="font-size:11px;margin-bottom:2px">비고</div>
                    <div style="font-size:13px;white-space:pre-wrap">${project.notes}</div>
                </div>` : ''}
            </div>

            <h3 style="margin:14px 0 6px;font-size:13px;font-weight:600;color:var(--gray-600)">투입 인력</h3>
            <table class="data-table" style="margin-bottom:12px">
                <thead><tr><th>담당자</th><th>기술</th><th>등급</th><th>역할</th><th>투입 기간 / M/M</th></tr></thead>
                <tbody>${assignmentsHtml}</tbody>
            </table>

            <h3 style="margin:14px 0 6px;font-size:13px;font-weight:600;color:var(--gray-600)">반복일정</h3>
            <table class="data-table">
                <thead><tr><th>유형</th><th>기준일</th><th>시작월</th><th>종료월</th><th>메모</th></tr></thead>
                <tbody>${recurringHtml}</tbody>
            </table>
        `;

        const footer = `
            <button class="btn btn-danger" onclick="ProjectView.deleteProject(${id})">삭제</button>
            <button class="btn btn-outline" onclick="Modal.close()">닫기</button>
            <button class="btn btn-primary" onclick="ProjectView.showEdit(${id})">수정</button>
        `;

        Modal.show(project.name, body, footer);
    },

    async showEdit(id) {
        let project, techStacks, projectTypes, businessTypes, statuses;
        try {
            [project, [techStacks, projectTypes, businessTypes, statuses]] = await Promise.all([
                API.getProject(id),
                Promise.all([API.getTechStacks(), API.getProjectTypes(), API.getBusinessTypes(), API.getStatuses()]),
            ]);
        } catch (e) {
            Toast.error('프로젝트 정보를 불러오지 못했습니다: ' + e.message);
            return;
        }

        const body = `
            <div class="form-group">
                <label>고객사</label>
                <select id="edit-customer" class="form-control">
                    ${this.customers.map(c => `<option value="${c.id}" ${c.id === project.customer_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>프로젝트명</label>
                <input type="text" id="edit-name" class="form-control" value="${project.name}">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>규모(억)</label>
                    <input type="number" step="0.1" id="edit-budget" class="form-control" value="${project.budget || ''}">
                </div>
                <div class="form-group">
                    <label>확정여부</label>
                    <select id="edit-confirmed" class="form-control">
                        ${['O', 'X', '?', '미정'].map(v => `<option value="${v}" ${v === project.confirmed ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>유형</label>
                    <select id="edit-ptype" class="form-control">
                        ${projectTypes.map(t => `<option ${t === project.project_type ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>업무유형</label>
                    <select id="edit-btype" class="form-control">
                        <option value="">-</option>
                        ${businessTypes.map(t => `<option ${t === project.business_type ? 'selected' : ''}>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>진행현황</label>
                    <select id="edit-status" class="form-control">
                        ${statuses.map(s => `<option ${s === project.status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>담당 영업</label>
                    <input type="text" id="edit-sales-rep" class="form-control" value="${project.sales_rep || ''}" placeholder="담당자 이름">
                </div>
                <div class="form-group">
                    <label>시작일</label>
                    <input type="date" id="edit-start" class="form-control" value="${project.start_date || ''}">
                </div>
                <div class="form-group">
                    <label>종료일</label>
                    <input type="date" id="edit-end" class="form-control" value="${project.end_date || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>구축항목</label>
                <div class="checkbox-group">
                    ${techStacks.map(ts => {
                        const checked = (project.tech_stacks || []).some(t => t.tech_stack === ts) ? 'checked' : '';
                        return `<label><input type="checkbox" class="edit-tech" value="${ts}" ${checked}> ${ts}</label>`;
                    }).join('')}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>프로젝트 상세 URL</label>
                    <div style="display:flex;gap:6px;align-items:center">
                        <input type="url" id="edit-project-url" class="form-control" value="${project.project_url || ''}" placeholder="https://">
                        ${project.project_url ? `<a href="${project.project_url}" target="_blank" style="white-space:nowrap;color:var(--primary)">🔗 열기</a>` : ''}
                    </div>
                </div>
                <div class="form-group">
                    <label>프로젝트 문서 URL</label>
                    <div style="display:flex;gap:6px;align-items:center">
                        <input type="url" id="edit-document-url" class="form-control" value="${project.document_url || ''}" placeholder="https://">
                        ${project.document_url ? `<a href="${project.document_url}" target="_blank" style="white-space:nowrap;color:var(--primary)">🔗 열기</a>` : ''}
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>설명</label>
                <div id="edit-description-editor" style="height:200px;background:white;border-radius:4px"></div>
            </div>
            <div class="form-group">
                <label>비고</label>
                <textarea id="edit-notes" class="form-control">${project.notes || ''}</textarea>
            </div>

            <h3 style="margin:16px 0 8px;font-size:14px;font-weight:600">투입 인력</h3>
            <table class="data-table" style="margin-bottom:8px">
                <thead><tr><th>담당자</th><th>기술</th><th>등급</th><th>역할</th><th>투입 기간 / M/M</th><th></th></tr></thead>
                <tbody id="assign-tbody">
                    ${(project.assignments || []).map(a => {
                        const periods = a.periods && a.periods.length > 0 ? a.periods : (a.start_date ? [{start_date: a.start_date, end_date: a.end_date, man_month: a.man_month}] : []);
                        const periodHtml = periods.map(p =>
                            `<div style="white-space:nowrap">· ${p.start_date || ''} ~ ${p.end_date || ''}${p.man_month ? ` <span style="color:var(--gray-500)">(${p.man_month}M/M)</span>` : ''}</div>`
                        ).join('');
                        return `
                        <tr>
                            <td>${a.member_name || ''}</td>
                            <td>${a.tech_stack || ''}</td>
                            <td>${a.grade_required || ''}</td>
                            <td>${a.role_description || ''}</td>
                            <td>${periodHtml}</td>
                            <td style="white-space:nowrap">
                                <button class="btn btn-sm btn-outline" onclick="ProjectView.showEditAssignment(${a.id}, ${id})">수정</button>
                                <button class="btn btn-sm btn-danger" onclick="ProjectView.deleteAssignment(${a.id}, ${id})">삭제</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <button class="btn btn-sm btn-outline" onclick="ProjectView.showAddAssignment(${id})">+ 인력 추가</button>

            <h3 style="margin:16px 0 8px;font-size:14px;font-weight:600">반복일정</h3>
            <table class="data-table" style="margin-bottom:8px">
                <thead><tr><th>유형</th><th>기준일</th><th>시작월</th><th>종료월</th><th>메모</th><th></th></tr></thead>
                <tbody id="recurring-tbody">
                    ${(project.recurring_schedules || []).map(r => `
                        <tr>
                            <td>${r.recurrence_type === 'monthly' ? '월별' : '분기별'}</td>
                            <td>매월 ${r.day_of_month}일</td>
                            <td>${r.start_date || ''}</td>
                            <td>${r.end_date || '-'}</td>
                            <td>${r.description || ''}</td>
                            <td><button class="btn btn-sm btn-danger" onclick="ProjectView.deleteRecurring(${r.id}, ${id})">삭제</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <button class="btn btn-sm btn-outline" onclick="ProjectView.showAddRecurring(${id})">+ 반복일정 추가</button>
        `;

        const footer = `
            <button class="btn btn-danger" onclick="ProjectView.deleteProject(${id})">삭제</button>
            <button class="btn btn-outline" onclick="ProjectView.showDetail(${id})">취소</button>
            <button class="btn btn-primary" onclick="ProjectView.saveProject(${id})">저장</button>
        `;

        Modal.show('프로젝트 수정', body, footer);
        // Quill HTML 에디터 초기화
        this._descEditor = new Quill('#edit-description-editor', {
            theme: 'snow',
            modules: { toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link'],
                ['clean'],
            ]},
        });
        this._descEditor.root.innerHTML = project.description || '';
    },

    async saveProject(id) {
        const techStacks = [...document.querySelectorAll('.edit-tech:checked')].map(c => c.value);
        const data = {
            customer_id: parseInt(document.getElementById('edit-customer').value),
            name: document.getElementById('edit-name').value,
            budget: parseFloat(document.getElementById('edit-budget').value) || null,
            confirmed: document.getElementById('edit-confirmed').value,
            project_type: document.getElementById('edit-ptype').value,
            business_type: document.getElementById('edit-btype').value || null,
            status: document.getElementById('edit-status').value,
            start_date: document.getElementById('edit-start').value || null,
            end_date: document.getElementById('edit-end').value || null,
            notes: document.getElementById('edit-notes').value || null,
            project_url: document.getElementById('edit-project-url').value || null,
            document_url: document.getElementById('edit-document-url').value || null,
            sales_rep: document.getElementById('edit-sales-rep').value || null,
            description: (() => {
                const html = this._descEditor?.root.innerHTML || '';
                return (html === '<p><br></p>' || !html) ? null : html;
            })(),
            tech_stacks: techStacks,
        };
        try {
            await API.updateProject(id, data);
            Toast.success('프로젝트가 저장되었습니다.');
            Modal.close();
            await this.loadData();
            this.showDetail(id);
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async deleteProject(id) {
        if (!confirm('프로젝트를 삭제하시겠습니까? 관련 배정 정보도 함께 삭제됩니다.')) return;
        try {
            await API.deleteProject(id);
            Toast.success('프로젝트가 삭제되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async showCreate() {
        const techStacks = await API.getTechStacks();
        const projectTypes = await API.getProjectTypes();
        const businessTypes = await API.getBusinessTypes();
        const statuses = await API.getStatuses();

        const body = `
            <div class="form-group">
                <label>고객사</label>
                <select id="new-customer" class="form-control">
                    <option value="">선택하세요</option>
                    ${this.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>프로젝트명</label>
                <input type="text" id="new-name" class="form-control">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>규모(억)</label>
                    <input type="number" step="0.1" id="new-budget" class="form-control">
                </div>
                <div class="form-group">
                    <label>확정여부</label>
                    <select id="new-confirmed" class="form-control">
                        <option value="미정">미정</option>
                        <option value="O">O</option>
                        <option value="?">?</option>
                        <option value="X">X</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>유형</label>
                    <select id="new-ptype" class="form-control">
                        ${projectTypes.map(t => `<option>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>업무유형</label>
                    <select id="new-btype" class="form-control">
                        <option value="">-</option>
                        ${businessTypes.map(t => `<option>${t}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>진행현황</label>
                    <select id="new-status" class="form-control">
                        ${statuses.map(s => `<option>${s}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>담당 영업</label>
                    <input type="text" id="new-sales-rep" class="form-control" placeholder="담당자 이름">
                </div>
                <div class="form-group">
                    <label>시작일</label>
                    <input type="date" id="new-start" class="form-control">
                </div>
                <div class="form-group">
                    <label>종료일</label>
                    <input type="date" id="new-end" class="form-control">
                </div>
            </div>
            <div class="form-group">
                <label>구축항목</label>
                <div class="checkbox-group">
                    ${techStacks.map(ts => `<label><input type="checkbox" class="new-tech" value="${ts}"> ${ts}</label>`).join('')}
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>프로젝트 상세 URL</label>
                    <input type="url" id="new-project-url" class="form-control" placeholder="https://">
                </div>
                <div class="form-group">
                    <label>프로젝트 문서 URL</label>
                    <input type="url" id="new-document-url" class="form-control" placeholder="https://">
                </div>
            </div>
            <div class="form-group">
                <label>설명</label>
                <div id="new-description-editor" style="height:200px;background:white;border-radius:4px"></div>
            </div>
            <div class="form-group">
                <label>비고</label>
                <textarea id="new-notes" class="form-control"></textarea>
            </div>
        `;

        const footer = `
            <button class="btn btn-outline" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="ProjectView.createProject()">생성</button>
        `;

        Modal.show('프로젝트 추가', body, footer);
        this._descEditor = new Quill('#new-description-editor', {
            theme: 'snow',
            modules: { toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link'],
                ['clean'],
            ]},
        });
    },

    async createProject() {
        const customerId = parseInt(document.getElementById('new-customer').value);
        if (!customerId) { Toast.error('고객사를 선택하세요.'); return; }
        const name = document.getElementById('new-name').value;
        if (!name) { Toast.error('프로젝트명을 입력하세요.'); return; }

        const techStacks = [...document.querySelectorAll('.new-tech:checked')].map(c => c.value);
        const data = {
            customer_id: customerId,
            name,
            budget: parseFloat(document.getElementById('new-budget').value) || null,
            confirmed: document.getElementById('new-confirmed').value,
            project_type: document.getElementById('new-ptype').value,
            business_type: document.getElementById('new-btype').value || null,
            status: document.getElementById('new-status').value,
            start_date: document.getElementById('new-start').value || null,
            end_date: document.getElementById('new-end').value || null,
            notes: document.getElementById('new-notes').value || null,
            project_url: document.getElementById('new-project-url').value || null,
            document_url: document.getElementById('new-document-url').value || null,
            sales_rep: document.getElementById('new-sales-rep').value || null,
            description: (() => {
                const html = this._descEditor?.root.innerHTML || '';
                return (html === '<p><br></p>' || !html) ? null : html;
            })(),
            tech_stacks: techStacks,
        };
        try {
            await API.createProject(data);
            Toast.success('프로젝트가 생성되었습니다.');
            Modal.close();
            await this.loadData();
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async showAddAssignment(projectId) {
        const [techStacks, grades] = await Promise.all([API.getTechStacks(), API.getGrades()]);
        this._pendingPeriods = [];

        const memberOptions = this.members.map(m =>
            `<option value="${m.id}">${m.name} (${m.grade || ''})</option>`
        ).join('');
        const techOptions = techStacks.map(t => `<option>${t}</option>`).join('');
        const gradeOptions = grades.map(g => `<option>${g}</option>`).join('');

        const body = `
            <div class="form-group">
                <label>담당자</label>
                <select id="assign-member" class="form-control">
                    <option value="">선택</option>${memberOptions}
                </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>기술영역</label>
                    <select id="assign-tech" class="form-control">
                        <option value="">-</option>${techOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>필요등급</label>
                    <select id="assign-grade" class="form-control">
                        <option value="">-</option>${gradeOptions}
                    </select>
                </div>
                <div class="form-group" style="grid-column:1/-1">
                    <label>역할</label>
                    <input type="text" id="assign-role" class="form-control" placeholder="PL, 구축인력 등">
                </div>
            </div>

            <h4 style="font-size:13px;font-weight:600;margin:16px 0 6px">투입 기간</h4>
            <table class="data-table" style="margin-bottom:8px">
                <thead><tr><th style="width:30px">#</th><th>기간</th><th>M/M</th><th style="width:60px"></th></tr></thead>
                <tbody id="pending-period-tbody">${this._pendingPeriodListHtml()}</tbody>
            </table>
            <div style="display:grid;grid-template-columns:1fr 1fr 80px auto;gap:8px;align-items:end;margin-bottom:8px">
                <div class="form-group" style="margin:0">
                    <label style="font-size:12px">시작일</label>
                    <input type="date" id="new-period-start" class="form-control">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:12px">종료일</label>
                    <input type="date" id="new-period-end" class="form-control">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:12px">M/M</label>
                    <input type="number" step="0.25" id="new-period-mm" class="form-control" placeholder="선택">
                </div>
                <button class="btn btn-outline" style="white-space:nowrap" onclick="ProjectView.addManualPeriodToPending()">+ 직접 추가</button>
            </div>
            ${this._recurringPanelHtml('add')}
        `;
        const footer = `
            <button class="btn btn-outline" onclick="Modal.close()">취소</button>
            <button class="btn btn-primary" onclick="ProjectView.createAssignment(${projectId})">추가</button>
        `;
        Modal.show('인력 배정 추가', body, footer);
    },

    _editingPeriods: [],
    _pendingPeriods: [],

    _periodListHtml(assignId, projectId) {
        if (this._editingPeriods.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted" style="padding:8px">등록된 기간이 없습니다.</td></tr>';
        }
        return this._editingPeriods.map((p, i) => `
            <tr id="period-row-${p.id}">
                <td style="padding:4px 8px">${i + 1}</td>
                <td style="padding:4px 8px;white-space:nowrap;cursor:pointer;color:var(--primary)"
                    onclick="ProjectView.startEditPeriodInModal(${p.id}, ${assignId}, ${projectId})"
                    title="클릭하여 수정">${p.start_date} ~ ${p.end_date}</td>
                <td style="padding:4px 8px">${p.man_month != null ? p.man_month + ' M/M' : '-'}</td>
                <td style="padding:4px 8px;white-space:nowrap">
                    <button class="btn btn-sm btn-outline" style="padding:2px 6px;font-size:11px" onclick="ProjectView.startEditPeriodInModal(${p.id}, ${assignId}, ${projectId})">수정</button>
                    <button class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:11px" onclick="ProjectView.deletePeriodInModal(${p.id}, ${assignId}, ${projectId})">삭제</button>
                </td>
            </tr>
        `).join('');
    },

    _refreshPeriodList(assignId, projectId) {
        const el = document.getElementById('period-list-tbody');
        if (el) el.innerHTML = this._periodListHtml(assignId, projectId);
    },

    startEditPeriodInModal(periodId, assignId, projectId) {
        const p = this._editingPeriods.find(p => p.id === periodId);
        const row = document.getElementById(`period-row-${periodId}`);
        if (!p || !row) return;
        row.innerHTML = `
            <td style="padding:4px 8px" colspan="2">
                <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
                    <input type="date" id="ep-start-${periodId}" class="form-control" value="${p.start_date}" style="width:130px;height:28px;font-size:12px">
                    <span>~</span>
                    <input type="date" id="ep-end-${periodId}" class="form-control" value="${p.end_date}" style="width:130px;height:28px;font-size:12px">
                    <input type="number" step="0.25" id="ep-mm-${periodId}" class="form-control" value="${p.man_month ?? ''}" placeholder="M/M" style="width:70px;height:28px;font-size:12px">
                </div>
            </td>
            <td style="padding:4px 8px"></td>
            <td style="padding:4px 8px;white-space:nowrap">
                <button class="btn btn-sm btn-primary" style="padding:2px 6px;font-size:11px" onclick="ProjectView.saveEditPeriodInModal(${periodId}, ${assignId}, ${projectId})">저장</button>
                <button class="btn btn-sm btn-outline" style="padding:2px 6px;font-size:11px" onclick="ProjectView._refreshPeriodList(${assignId}, ${projectId})">취소</button>
            </td>
        `;
        document.getElementById(`ep-start-${periodId}`)?.focus();
    },

    async saveEditPeriodInModal(periodId, assignId, projectId) {
        const startDate = document.getElementById(`ep-start-${periodId}`)?.value;
        const endDate   = document.getElementById(`ep-end-${periodId}`)?.value;
        if (!startDate || !endDate) { Toast.error('시작일과 종료일을 입력하세요.'); return; }
        if (startDate > endDate) { Toast.error('종료일이 시작일보다 앞입니다.'); return; }
        const manMonth = parseFloat(document.getElementById(`ep-mm-${periodId}`)?.value) || null;
        try {
            const updated = await API.updateAssignmentPeriod(periodId, { start_date: startDate, end_date: endDate, man_month: manMonth });
            const idx = this._editingPeriods.findIndex(p => p.id === periodId);
            if (idx !== -1) this._editingPeriods[idx] = updated;
            this._refreshPeriodList(assignId, projectId);
            Toast.success('기간이 수정되었습니다.');
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async showEditAssignment(assignId, projectId, returnView = null) {
        this._returnView = returnView;
        const [assignments, techStacks, grades, members] = await Promise.all([
            API.getProjectAssignments(projectId),
            API.getTechStacks(),
            API.getGrades(),
            this.members.length ? Promise.resolve(this.members) : API.getMembers(),
        ]);
        if (members !== this.members) this.members = members;
        const a = assignments.find(a => a.id === assignId);
        if (!a) return;

        this._editingPeriods = a.periods ? [...a.periods] : [];

        const memberOptions = this.members.map(m =>
            `<option value="${m.id}" ${m.id === a.member_id ? 'selected' : ''}>${m.name} (${m.grade || ''})</option>`
        ).join('');
        const techOptions = techStacks.map(t =>
            `<option ${t === a.tech_stack ? 'selected' : ''}>${t}</option>`
        ).join('');
        const gradeOptions = grades.map(g =>
            `<option ${g === a.grade_required ? 'selected' : ''}>${g}</option>`
        ).join('');

        const body = `
            <div class="form-group">
                <label>담당자</label>
                <select id="assign-member" class="form-control">
                    <option value="">선택</option>${memberOptions}
                </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>기술영역</label>
                    <select id="assign-tech" class="form-control">
                        <option value="">-</option>${techOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>필요등급</label>
                    <select id="assign-grade" class="form-control">
                        <option value="">-</option>${gradeOptions}
                    </select>
                </div>
                <div class="form-group" style="grid-column:1/-1">
                    <label>역할</label>
                    <input type="text" id="assign-role" class="form-control" value="${a.role_description || ''}">
                </div>
            </div>

            <h4 style="font-size:13px;font-weight:600;margin:16px 0 6px">투입 기간</h4>
            <table class="data-table" style="margin-bottom:8px">
                <thead><tr><th style="width:30px">#</th><th>기간</th><th>M/M</th><th style="width:60px"></th></tr></thead>
                <tbody id="period-list-tbody">${this._periodListHtml(assignId, projectId)}</tbody>
            </table>
            <div style="display:grid;grid-template-columns:1fr 1fr 80px auto;gap:8px;align-items:end;margin-bottom:8px">
                <div class="form-group" style="margin:0">
                    <label style="font-size:12px">시작일</label>
                    <input type="date" id="new-period-start" class="form-control">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:12px">종료일</label>
                    <input type="date" id="new-period-end" class="form-control">
                </div>
                <div class="form-group" style="margin:0">
                    <label style="font-size:12px">M/M</label>
                    <input type="number" step="0.25" id="new-period-mm" class="form-control" placeholder="선택">
                </div>
                <button class="btn btn-outline" style="white-space:nowrap" onclick="ProjectView.addPeriodInModal(${assignId}, ${projectId})">+ 직접 추가</button>
            </div>
            ${this._recurringPanelHtml('edit', assignId, projectId)}
        `;
        const cancelAction = returnView
            ? `Modal.close();App.navigate('${returnView}')`
            : `Modal.close();ProjectView.showDetail(${projectId})`;
        const footer = `
            <button class="btn btn-outline" onclick="${cancelAction}">취소</button>
            <button class="btn btn-primary" onclick="ProjectView.saveEditAssignment(${assignId}, ${projectId})">저장</button>
        `;
        Modal.show('인력 배정 수정', body, footer);
    },

    async addPeriodInModal(assignId, projectId) {
        const startDate = document.getElementById('new-period-start').value;
        const endDate   = document.getElementById('new-period-end').value;
        if (!startDate || !endDate) { Toast.error('시작일과 종료일을 입력하세요.'); return; }
        const manMonth = parseFloat(document.getElementById('new-period-mm').value) || null;
        try {
            const newPeriod = await API.createAssignmentPeriod(assignId, { start_date: startDate, end_date: endDate, man_month: manMonth });
            this._editingPeriods.push(newPeriod);
            this._refreshPeriodList(assignId, projectId);
            document.getElementById('new-period-start').value = '';
            document.getElementById('new-period-end').value = '';
            document.getElementById('new-period-mm').value = '';
            Toast.success('기간이 추가되었습니다.');
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async deletePeriodInModal(periodId, assignId, projectId) {
        if (!confirm('이 기간을 삭제하시겠습니까?')) return;
        try {
            await API.deleteAssignmentPeriod(periodId);
            this._editingPeriods = this._editingPeriods.filter(p => p.id !== periodId);
            this._refreshPeriodList(assignId, projectId);
            Toast.success('기간이 삭제되었습니다.');
        } catch (e) {
            Toast.error(e.message);
        }
    },

    _pendingPeriodListHtml() {
        if (this._pendingPeriods.length === 0) {
            return '<tr><td colspan="4" class="text-center text-muted" style="padding:8px">추가된 기간이 없습니다.</td></tr>';
        }
        return this._pendingPeriods.map((p, i) => `
            <tr>
                <td style="padding:4px 8px">${i + 1}</td>
                <td style="padding:4px 8px;white-space:nowrap">${p.start_date} ~ ${p.end_date}</td>
                <td style="padding:4px 8px">${p.man_month != null ? p.man_month + ' M/M' : '-'}</td>
                <td style="padding:4px 8px">
                    <button class="btn btn-sm btn-danger" onclick="ProjectView.removePendingPeriod(${i})">삭제</button>
                </td>
            </tr>
        `).join('');
    },

    _refreshPendingPeriodList() {
        const el = document.getElementById('pending-period-tbody');
        if (el) el.innerHTML = this._pendingPeriodListHtml();
    },

    addManualPeriodToPending() {
        const startDate = document.getElementById('new-period-start').value;
        const endDate   = document.getElementById('new-period-end').value;
        if (!startDate || !endDate) { Toast.error('시작일과 종료일을 입력하세요.'); return; }
        const manMonth = parseFloat(document.getElementById('new-period-mm').value) || null;
        this._pendingPeriods.push({ start_date: startDate, end_date: endDate, man_month: manMonth });
        this._refreshPendingPeriodList();
        document.getElementById('new-period-start').value = '';
        document.getElementById('new-period-end').value = '';
        document.getElementById('new-period-mm').value = '';
    },

    removePendingPeriod(idx) {
        this._pendingPeriods.splice(idx, 1);
        this._refreshPendingPeriodList();
    },

    _recurringPanelHtml(mode, assignId, projectId) {
        const btnOnclick = mode === 'edit'
            ? `ProjectView.applyRecurring('edit', ${assignId}, ${projectId})`
            : `ProjectView.applyRecurring('add')`;
        return `
        <div style="padding:10px;background:var(--gray-50);border-radius:6px;border:1px solid var(--gray-200)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:12px;font-weight:600;white-space:nowrap">반복 기간 추가</span>
                <select id="${mode}-recur-type" class="form-control" style="width:130px" onchange="ProjectView.onRecurTypeChange('${mode}')">
                    <option value="">유형 선택</option>
                    <option value="weekly">요일 반복</option>
                    <option value="monthly">월 반복</option>
                    <option value="quarterly">분기 반복</option>
                </select>
            </div>
            <div id="${mode}-recur-detail" style="display:none;margin-bottom:8px"></div>
            <button class="btn btn-sm btn-primary" onclick="${btnOnclick}">반복 기간 생성</button>
        </div>
        `;
    },

    onRecurTypeChange(mode) {
        const type = document.getElementById(`${mode}-recur-type`).value;
        const detail = document.getElementById(`${mode}-recur-detail`);
        if (!type) { detail.style.display = 'none'; return; }
        detail.style.display = 'block';
        if (type === 'weekly') {
            detail.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                    <div class="form-group" style="margin:0">
                        <label style="font-size:12px">시작일</label>
                        <input type="date" id="${mode}-recur-start" class="form-control">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label style="font-size:12px">종료일</label>
                        <input type="date" id="${mode}-recur-end" class="form-control">
                    </div>
                </div>
                <div>
                    <label style="font-size:12px;display:block;margin-bottom:4px">요일 선택</label>
                    <div style="display:flex;gap:10px;flex-wrap:wrap">
                        ${[['월',1],['화',2],['수',3],['목',4],['금',5],['토',6],['일',0]].map(([n,v]) =>
                            `<label style="display:flex;align-items:center;gap:3px;font-size:13px"><input type="checkbox" class="${mode}-recur-dow" value="${v}"> ${n}</label>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else {
            const stepLabel = type === 'quarterly' ? '(분기별 생성)' : '(매월 생성)';
            detail.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
                    <div class="form-group" style="margin:0">
                        <label style="font-size:12px">시작월</label>
                        <input type="month" id="${mode}-recur-month-start" class="form-control">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label style="font-size:12px">종료월 ${stepLabel}</label>
                        <input type="month" id="${mode}-recur-month-end" class="form-control">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label style="font-size:12px">월내 시작일</label>
                        <input type="number" id="${mode}-recur-day-start" class="form-control" min="1" max="31" value="1">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label style="font-size:12px">월내 종료일</label>
                        <input type="number" id="${mode}-recur-day-end" class="form-control" min="1" max="31" value="1">
                    </div>
                </div>
            `;
        }
    },

    _generatePeriods(mode) {
        const type = document.getElementById(`${mode}-recur-type`).value;
        if (!type) { Toast.error('반복 유형을 선택하세요.'); return null; }

        if (type === 'weekly') {
            const startVal = document.getElementById(`${mode}-recur-start`).value;
            const endVal   = document.getElementById(`${mode}-recur-end`).value;
            if (!startVal || !endVal) { Toast.error('시작일과 종료일을 입력하세요.'); return null; }
            const days = [...document.querySelectorAll(`.${mode}-recur-dow:checked`)].map(c => parseInt(c.value));
            if (days.length === 0) { Toast.error('요일을 선택하세요.'); return null; }
            const start = new Date(startVal + 'T00:00:00');
            const end   = new Date(endVal   + 'T00:00:00');
            const periods = [];
            const cur = new Date(start);
            while (cur <= end) {
                if (days.includes(cur.getDay())) {
                    const d = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
                    periods.push({ start_date: d, end_date: d, man_month: null });
                }
                cur.setDate(cur.getDate() + 1);
            }
            if (periods.length === 0) { Toast.error('선택한 요일에 해당하는 날짜가 없습니다.'); return null; }
            return periods;
        }

        if (type === 'monthly' || type === 'quarterly') {
            const startMonth = document.getElementById(`${mode}-recur-month-start`).value;
            const endMonth   = document.getElementById(`${mode}-recur-month-end`).value;
            const dayStart   = parseInt(document.getElementById(`${mode}-recur-day-start`).value) || 1;
            const dayEnd     = parseInt(document.getElementById(`${mode}-recur-day-end`).value) || 1;
            if (!startMonth || !endMonth) { Toast.error('시작월과 종료월을 입력하세요.'); return null; }
            const [sy, sm] = startMonth.split('-').map(Number);
            const [ey, em] = endMonth.split('-').map(Number);
            const step = type === 'quarterly' ? 3 : 1;
            const periods = [];
            let y = sy, m = sm;
            while (y < ey || (y === ey && m <= em)) {
                const daysInMonth = new Date(y, m, 0).getDate();
                const ds = Math.min(dayStart, daysInMonth);
                const de = Math.min(dayEnd, daysInMonth);
                const pad = n => String(n).padStart(2, '0');
                periods.push({
                    start_date: `${y}-${pad(m)}-${pad(ds)}`,
                    end_date:   `${y}-${pad(m)}-${pad(de)}`,
                    man_month: null,
                });
                m += step;
                while (m > 12) { m -= 12; y++; }
            }
            if (periods.length === 0) { Toast.error('생성된 기간이 없습니다.'); return null; }
            return periods;
        }
        return null;
    },

    async applyRecurring(mode, assignId, projectId) {
        const periods = this._generatePeriods(mode);
        if (!periods) return;
        if (mode === 'add') {
            this._pendingPeriods.push(...periods);
            this._refreshPendingPeriodList();
            Toast.success(`${periods.length}개 기간이 추가되었습니다.`);
        } else {
            try {
                for (const p of periods) {
                    const newP = await API.createAssignmentPeriod(assignId, { start_date: p.start_date, end_date: p.end_date, man_month: null });
                    this._editingPeriods.push(newP);
                }
                this._refreshPeriodList(assignId, projectId);
                Toast.success(`${periods.length}개 기간이 추가되었습니다.`);
            } catch (e) {
                Toast.error(e.message);
            }
        }
    },

    async saveEditAssignment(assignId, projectId) {
        const memberId = parseInt(document.getElementById('assign-member').value);
        if (!memberId) { Toast.error('담당자를 선택하세요.'); return; }
        const data = {
            member_id: memberId,
            tech_stack: document.getElementById('assign-tech').value || null,
            grade_required: document.getElementById('assign-grade').value || null,
            role_description: document.getElementById('assign-role').value || null,
        };
        try {
            await API.updateAssignment(assignId, data);
            Toast.success('배정 정보가 저장되었습니다.');
            Modal.close();
            if (this._returnView) {
                App.navigate(this._returnView);
                this._returnView = null;
            } else {
                await this.loadData();
                this.showDetail(projectId);
            }
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async createAssignment(projectId) {
        const memberId = parseInt(document.getElementById('assign-member').value);
        if (!memberId) { Toast.error('담당자를 선택하세요.'); return; }
        if (this._pendingPeriods.length === 0) { Toast.error('투입 기간을 하나 이상 추가하세요.'); return; }

        const first = this._pendingPeriods[0];
        const data = {
            member_id: memberId,
            start_date: first.start_date,
            end_date: first.end_date,
            man_month: first.man_month || null,
            tech_stack: document.getElementById('assign-tech').value || null,
            grade_required: document.getElementById('assign-grade').value || null,
            role_description: document.getElementById('assign-role').value || null,
        };
        try {
            const assignment = await API.createAssignment(projectId, data);
            for (let i = 1; i < this._pendingPeriods.length; i++) {
                const p = this._pendingPeriods[i];
                await API.createAssignmentPeriod(assignment.id, { start_date: p.start_date, end_date: p.end_date, man_month: p.man_month });
            }
            Toast.success('인력이 배정되었습니다.');
            Modal.close();
            await this.loadData();
            this.showDetail(projectId);
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async deleteAssignment(assignId, projectId) {
        if (!confirm('이 인력 배정을 삭제하시겠습니까?')) return;
        try {
            await API.deleteAssignment(assignId);
            Toast.success('배정이 삭제되었습니다.');
            Modal.close();
            await this.loadData();
            this.showDetail(projectId);
        } catch (e) {
            Toast.error(e.message);
        }
    },

    showAddRecurring(projectId) {
        const body = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                    <label>반복 유형</label>
                    <select id="rec-type" class="form-control">
                        <option value="monthly">월별</option>
                        <option value="quarterly">분기별</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>기준일 (매월 몇 일)</label>
                    <input type="number" id="rec-day" class="form-control" min="1" max="31" value="1">
                </div>
                <div class="form-group">
                    <label>시작월</label>
                    <input type="month" id="rec-start" class="form-control">
                </div>
                <div class="form-group">
                    <label>종료월 (선택)</label>
                    <input type="month" id="rec-end" class="form-control">
                </div>
            </div>
            <div class="form-group">
                <label>메모</label>
                <input type="text" id="rec-desc" class="form-control" placeholder="예: 월간 점검, 분기 정기 유지보수">
            </div>
        `;
        const footer = `
            <button class="btn btn-outline" onclick="Modal.close();ProjectView.showDetail(${projectId})">취소</button>
            <button class="btn btn-primary" onclick="ProjectView.createRecurring(${projectId})">추가</button>
        `;
        Modal.show('반복일정 추가', body, footer);
    },

    async createRecurring(projectId) {
        const recurrenceType = document.getElementById('rec-type').value;
        const dayOfMonth = parseInt(document.getElementById('rec-day').value);
        const startMonth = document.getElementById('rec-start').value;
        const endMonth = document.getElementById('rec-end').value;
        const description = document.getElementById('rec-desc').value || null;

        if (!startMonth) { Toast.error('시작월을 입력하세요.'); return; }
        if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) { Toast.error('기준일을 1~31 사이로 입력하세요.'); return; }

        const data = {
            recurrence_type: recurrenceType,
            day_of_month: dayOfMonth,
            start_date: `${startMonth}-01`,
            end_date: endMonth ? `${endMonth}-01` : null,
            description,
        };
        try {
            await API.createRecurringSchedule(projectId, data);
            Toast.success('반복일정이 추가되었습니다.');
            Modal.close();
            await this.loadData();
            this.showDetail(projectId);
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async deleteRecurring(scheduleId, projectId) {
        if (!confirm('이 반복일정을 삭제하시겠습니까?')) return;
        try {
            await API.deleteRecurringSchedule(scheduleId);
            Toast.success('반복일정이 삭제되었습니다.');
            Modal.close();
            await this.loadData();
            this.showDetail(projectId);
        } catch (e) {
            Toast.error(e.message);
        }
    },
};
