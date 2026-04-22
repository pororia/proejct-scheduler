/**
 * Version history modal — shows release notes list and content.
 */
const VersionHistory = {
    _versions: [],
    _selectedId: null,

    async show() {
        this._ensureOverlay();
        document.getElementById('vh-overlay').style.display = 'flex';
        document.getElementById('vh-content').innerHTML =
            '<p class="text-muted" style="padding:20px">버전을 선택하세요.</p>';
        try {
            this._versions = await API.getVersions();
        } catch (e) {
            this._versions = [];
        }
        this._renderList();

        // 최신 버전 자동 선택
        if (this._versions.length) {
            this.selectVersion(this._versions[0].id);
        }
    },

    hide() {
        const el = document.getElementById('vh-overlay');
        if (el) el.style.display = 'none';
    },

    _ensureOverlay() {
        if (document.getElementById('vh-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'vh-overlay';
        overlay.style.cssText =
            'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);' +
            'z-index:2000;display:none;justify-content:center;align-items:center';
        overlay.innerHTML = `
            <div style="background:white;border-radius:16px;width:960px;max-width:96vw;
                        height:82vh;display:flex;flex-direction:column;
                        box-shadow:0 20px 60px rgba(0,0,0,0.25);overflow:hidden">
                <!-- 헤더 -->
                <div style="display:flex;justify-content:space-between;align-items:center;
                            padding:18px 24px;border-bottom:1.5px solid var(--gray-100);flex-shrink:0">
                    <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-size:18px;font-weight:700;color:var(--gray-800)">버전 이력</span>
                        <span style="font-size:13px;color:var(--gray-400)">PMS</span>
                    </div>
                    <button onclick="VersionHistory.hide()"
                        style="background:none;border:none;font-size:22px;cursor:pointer;
                               color:var(--gray-400);line-height:1;padding:0 4px">&times;</button>
                </div>
                <!-- 바디 -->
                <div style="display:flex;flex:1;overflow:hidden">
                    <!-- 왼쪽: 버전 목록 -->
                    <div style="width:200px;flex-shrink:0;border-right:1.5px solid var(--gray-100);
                                overflow-y:auto;padding:12px 8px;background:var(--gray-50)">
                        <div id="vh-list"></div>
                    </div>
                    <!-- 오른쪽: 내용 -->
                    <div id="vh-content"
                         style="flex:1;overflow-y:auto;padding:28px 32px;font-size:14px;
                                line-height:1.7;color:var(--gray-700)"></div>
                </div>
            </div>
        `;
        overlay.addEventListener('click', e => {
            if (e.target === overlay) this.hide();
        });
        document.body.appendChild(overlay);
    },

    _renderList() {
        const el = document.getElementById('vh-list');
        if (!el) return;
        if (!this._versions.length) {
            el.innerHTML = '<p class="text-muted" style="padding:8px;font-size:13px">등록된 버전 없음</p>';
            return;
        }
        el.innerHTML = this._versions.map(v => `
            <div id="vh-item-${v.id}" onclick="VersionHistory.selectVersion(${v.id})"
                 style="padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:4px;
                        transition:background 0.1s">
                <div style="font-size:13px;font-weight:700;color:var(--primary)">${v.version}</div>
                ${v.released_at ? `<div style="font-size:11px;color:var(--gray-400);margin-top:2px">${v.released_at}</div>` : ''}
                ${v.title ? `<div style="font-size:12px;color:var(--gray-500);margin-top:3px;line-height:1.4">${v.title}</div>` : ''}
            </div>
        `).join('');
    },

    selectVersion(id) {
        this._selectedId = id;

        // 목록 활성 스타일
        document.querySelectorAll('[id^="vh-item-"]').forEach(el => {
            const isActive = el.id === `vh-item-${id}`;
            el.style.background = isActive ? 'var(--primary-light, #eff6ff)' : '';
            el.style.borderLeft  = isActive ? '3px solid var(--primary)' : '3px solid transparent';
        });

        const v = this._versions.find(x => x.id === id);
        const content = document.getElementById('vh-content');
        if (!content || !v) return;

        const dateStr = v.released_at
            ? `<span style="font-size:13px;color:var(--gray-400);font-weight:400;margin-left:10px">${v.released_at}</span>`
            : '';
        const body = v.content
            ? `<div class="ql-snow"><div class="ql-editor" style="padding:0">${v.content}</div></div>`
            : '<p class="text-muted">내용이 없습니다.</p>';

        content.innerHTML = `
            <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1.5px solid var(--gray-100)">
                <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
                    <span style="font-size:22px;font-weight:800;color:var(--gray-800)">${v.version}</span>
                    ${dateStr}
                </div>
                ${v.title ? `<div style="font-size:15px;font-weight:600;color:var(--gray-600);margin-top:6px">${v.title}</div>` : ''}
            </div>
            ${body}
        `;
    },
};
