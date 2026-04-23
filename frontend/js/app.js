/**
 * Main SPA application controller.
 */
const VIEW_TITLES = {
    dashboard: '프로젝트 현황',
    calendar:  '현황 (캘린더)',
    timeline:  '인력현황',
    projects:  '프로젝트 관리',
    members:   '인력 관리',
    salesreps: '영업 담당자 관리',
    settings:  '설정',
    admin:     '관리자',
};

const App = {
    currentView: 'dashboard',

    init() {
        // 인증 확인
        if (!Auth.requireAuth()) return;
        Auth.renderUserInfo();

        // 사이드바 최신 버전 표시
        API.getVersions().then(versions => {
            if (versions && versions.length) {
                const el = document.getElementById('sidebar-version');
                if (el) el.textContent = `PMS ${versions[0].version}`;
            }
        }).catch(() => {});

        // 관리자 전용 메뉴 표시 제어
        const isAdmin = Auth.isAdmin();
        const settingsEl = document.querySelector('.nav-item[data-view="settings"]');
        if (settingsEl) settingsEl.style.display = isAdmin ? '' : 'none';

        // 비관리자는 admin 메뉴를 "내 계정"으로 표시
        const adminNavEl = document.querySelector('.nav-item[data-view="admin"]');
        if (adminNavEl && !isAdmin) {
            adminNavEl.innerHTML = '<span class="icon">👤</span> 내 계정';
        }

        // 로그아웃 버튼
        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }

        this.bindNavigation();
        this.navigate('dashboard');
    },

    bindNavigation() {
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (view) this.navigate(view);
            });
        });
    },

    async navigate(view) {
        this.currentView = view;

        // 헤더 타이틀 업데이트
        const titleEl = document.getElementById('header-page-title');
        if (titleEl) titleEl.textContent = VIEW_TITLES[view] || '';

        // 사이드바 활성화
        document.querySelectorAll('.nav-item[data-view]').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // 뷰 렌더링
        try {
            switch (view) {
                case 'dashboard': await DashboardView.render(); break;
                case 'calendar':  await CalendarView.render();  break;
                case 'timeline':  await TimelineView.render();  break;
                case 'projects':  await ProjectView.render();   break;
                case 'members':   await MemberView.render();    break;
                case 'salesreps': await SalesRepView.render();  break;
                case 'settings':
                    if (!Auth.isAdmin()) { this.navigate('dashboard'); return; }
                    await SettingsView.render();
                    break;
                case 'admin':
                    await AdminView.render();
                    break;
            }
        } catch (e) {
            console.error('View render error:', e);
            document.getElementById('app-content').innerHTML = `
                <div class="card" style="text-align:center;padding:40px">
                    <p style="color:var(--danger);margin-bottom:8px">데이터를 불러오는 중 오류가 발생했습니다.</p>
                    <p class="text-muted">${e.message}</p>
                    <button class="btn btn-primary mt-2" onclick="App.navigate('${view}')">다시 시도</button>
                </div>
            `;
        }
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
