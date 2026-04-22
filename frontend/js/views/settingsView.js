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
        const [customers, techStacks, projectTypes, businessTypes, statuses, grades] = await Promise.all([
            API.getCustomers(),
            API.getMasterItems('tech-stacks'),
            API.getMasterItems('project-types'),
            API.getMasterItems('business-types'),
            API.getMasterItems('statuses'),
            API.getMasterItems('grades'),
        ]);

        this._renderCustomerTags(customers);
        this._renderMasterTags('tech-tags', 'tech-stacks', techStacks);
        this._renderMasterTags('ptype-tags', 'project-types', projectTypes);
        this._renderMasterTags('btype-tags', 'business-types', businessTypes);
        this._renderMasterTags('status-tags', 'statuses', statuses);
        this._renderMasterTags('grade-tags', 'grades', grades);
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

    async deleteMasterItem(category, id, value) {
        if (!confirm(`'${value}' 항목을 삭제하시겠습니까?`)) return;
        try {
            await API.deleteMasterItem(category, id);
            Toast.success('항목이 삭제되었습니다.');
            await this.loadData();
        } catch (e) { Toast.error(e.message); }
    },

};
