/**
 * Backend API client module.
 */
const API = {
    baseUrl: '/api',

    async request(method, path, body = null) {
        const token = localStorage.getItem('auth_token');
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (token) opts.headers['Authorization'] = `Bearer ${token}`;
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(`${this.baseUrl}${path}`, opts);
        if (res.status === 401) {
            // 토큰 만료 또는 미인증 → 로그인 페이지로
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            window.location.replace('/login');
            return;
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || 'Request failed');
        }
        if (res.status === 204) return null;
        return res.json();
    },

    // Customers
    getCustomers() { return this.request('GET', '/customers'); },
    createCustomer(data) { return this.request('POST', '/customers', data); },
    updateCustomer(id, data) { return this.request('PUT', `/customers/${id}`, data); },
    deleteCustomer(id) { return this.request('DELETE', `/customers/${id}`); },

    // Projects
    getProjects(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request('GET', `/projects${qs ? '?' + qs : ''}`);
    },
    getProject(id) { return this.request('GET', `/projects/${id}`); },
    createProject(data) { return this.request('POST', '/projects', data); },
    updateProject(id, data) { return this.request('PUT', `/projects/${id}`, data); },
    deleteProject(id) { return this.request('DELETE', `/projects/${id}`); },

    // Members
    getMembers() { return this.request('GET', '/members'); },
    getMember(id) { return this.request('GET', `/members/${id}`); },
    createMember(data) { return this.request('POST', '/members', data); },
    updateMember(id, data) { return this.request('PUT', `/members/${id}`, data); },
    deleteMember(id) { return this.request('DELETE', `/members/${id}`); },

    // Assignments
    getProjectAssignments(projectId) { return this.request('GET', `/projects/${projectId}/assignments`); },
    createAssignment(projectId, data) { return this.request('POST', `/projects/${projectId}/assignments`, data); },
    updateAssignment(id, data) { return this.request('PUT', `/assignments/${id}`, data); },
    deleteAssignment(id) { return this.request('DELETE', `/assignments/${id}`); },

    // Dashboard
    getProjectOverview(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request('GET', `/dashboard/project-overview${qs ? '?' + qs : ''}`);
    },
    getMemberOverview(params = {}) {
        const qs = new URLSearchParams(params).toString();
        return this.request('GET', `/dashboard/member-overview${qs ? '?' + qs : ''}`);
    },
    getMonthlySummary(year) { return this.request('GET', `/dashboard/monthly-summary?year=${year}`); },
    getMemberUtilization(year, month) { return this.request('GET', `/dashboard/member-utilization?year=${year}&month=${month}`); },

    // Master
    getDivisions() { return this.request('GET', '/master/divisions'); },
    getTeams() { return this.request('GET', '/master/teams'); },
    getTechStacks() { return this.request('GET', '/master/tech-stacks'); },
    getProjectTypes() { return this.request('GET', '/master/project-types'); },
    getBusinessTypes() { return this.request('GET', '/master/business-types'); },
    getStatuses() { return this.request('GET', '/master/statuses'); },
    getGrades() { return this.request('GET', '/master/grades'); },
    getConfirmedOptions() { return this.request('GET', '/master/confirmed-options'); },
    getMasterItems(category) { return this.request('GET', `/master/${category}/items`); },
    createMasterItem(category, value) { return this.request('POST', `/master/${category}`, { value }); },
    updateMasterItem(category, id, value) { return this.request('PUT', `/master/${category}/${id}`, { value }); },
    deleteMasterItem(category, id) { return this.request('DELETE', `/master/${category}/${id}`); },

    // Assignment periods
    createAssignmentPeriod(assignId, data) { return this.request('POST', `/assignments/${assignId}/periods`, data); },
    updateAssignmentPeriod(periodId, data) { return this.request('PUT', `/assignment-periods/${periodId}`, data); },
    deleteAssignmentPeriod(periodId) { return this.request('DELETE', `/assignment-periods/${periodId}`); },

    // Recurring schedules
    getRecurringSchedules(projectId) { return this.request('GET', `/projects/${projectId}/recurring-schedules`); },
    createRecurringSchedule(projectId, data) { return this.request('POST', `/projects/${projectId}/recurring-schedules`, data); },
    deleteRecurringSchedule(id) { return this.request('DELETE', `/recurring-schedules/${id}`); },

    // Sales Reps
    getSalesReps() { return this.request('GET', '/sales-reps'); },
    getSalesRep(id) { return this.request('GET', `/sales-reps/${id}`); },
    createSalesRep(data) { return this.request('POST', '/sales-reps', data); },
    updateSalesRep(id, data) { return this.request('PUT', `/sales-reps/${id}`, data); },
    deleteSalesRep(id) { return this.request('DELETE', `/sales-reps/${id}`); },

    // Auth - User management
    getUsers() { return this.request('GET', '/auth/users'); },
    createUser(data) { return this.request('POST', '/auth/users', data); },
    updateUser(id, data) { return this.request('PUT', `/auth/users/${id}`, data); },
    deleteUser(id) { return this.request('DELETE', `/auth/users/${id}`); },

    // Versions / Release notes
    getVersions() { return this.request('GET', '/versions'); },
    getVersion(id) { return this.request('GET', `/versions/${id}`); },
    createVersion(data) { return this.request('POST', '/versions', data); },
    updateVersion(id, data) { return this.request('PUT', `/versions/${id}`, data); },
    deleteVersion(id) { return this.request('DELETE', `/versions/${id}`); },
};
