/**
 * 인증 모듈 - JWT 토큰 및 사용자 세션 관리.
 */
const Auth = {
    getToken() {
        return localStorage.getItem('auth_token');
    },

    getUser() {
        const u = localStorage.getItem('auth_user');
        return u ? JSON.parse(u) : null;
    },

    setSession(token, user) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
    },

    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.replace('/login');
    },

    isAdmin() {
        const u = this.getUser();
        return u && u.role === 'admin';
    },

    /** 토큰 없으면 로그인 페이지로 이동. */
    requireAuth() {
        if (!this.getToken()) {
            window.location.replace('/login');
            return false;
        }
        return true;
    },

    /** 헤더에 로그인 사용자 정보 표시. */
    renderUserInfo() {
        const user = this.getUser();
        if (!user) return;
        const el = document.getElementById('header-user-info');
        if (!el) return;
        const ROLE_LABEL = { admin: '관리자', manager: '매니저', user: '사용자' };
        const initial = (user.name || 'U').charAt(0).toUpperCase();
        el.innerHTML = `
            <div class="header-user">
                <div class="header-user-avatar">${initial}</div>
                <div>
                    <div class="header-user-name">${user.name}</div>
                    <div class="header-user-role">${ROLE_LABEL[user.role] || user.role}</div>
                </div>
            </div>
        `;
    },
};
