/**
 * Main SPA application controller.
 */
const VIEW_TITLES = {
    dashboard: '프로젝트 현황',
    calendar:  '현황 (캘린더)',
    timeline:  '인력현황',
    projects:  '프로젝트 관리',
    members:   '인력 관리',
    settings:  '설정',
};

const App = {
    currentView: 'dashboard',

    init() {
        // 인증 확인
        if (!Auth.requireAuth()) return;
        Auth.renderUserInfo();

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
                case 'settings':  await SettingsView.render();  break;
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
