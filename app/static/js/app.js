/**
 * KUMC Anam Medical Portal - Main JavaScript
 */

// API Configuration
const API_BASE_URL = '/api';

// State Management
const state = {
    isLoggedIn: false,
    token: null,
    userData: null,
    currentView: 'dashboard',
    // 원본 데이터 캐시 (필터링용)
    dataCache: {
        reservations: null,
        labTests: null,
        medications: null,
        outpatient: null,
        hospitalization: null,
        payments: null
    }
};

// DOM Elements
const elements = {};

// ============================================
// Theme Management
// ============================================

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('kumc-theme', newTheme);
    
    // Update toggle button icon animation
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.classList.add('theme-switching');
        setTimeout(() => toggleBtn.classList.remove('theme-switching'), 300);
    }
}

/**
 * Get current theme
 * @returns {string} 'light' or 'dark'
 */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

/**
 * Initialize theme from localStorage or system preference
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem('kumc-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('kumc-theme')) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    });
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeElements();
    checkAuthStatus();
    setupEventListeners();
});

// Initialize DOM element references
function initializeElements() {
    elements.loginForm = document.getElementById('loginForm');
    elements.logoutBtn = document.getElementById('logoutBtn');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    elements.alertContainer = document.getElementById('alertContainer');
}

// Check authentication status
function checkAuthStatus() {
    const token = localStorage.getItem('access_token');
    if (token) {
        state.token = token;
        state.isLoggedIn = true;
        
        // If on login page, redirect to dashboard
        if (window.location.pathname === '/') {
            window.location.href = '/dashboard';
        }
    } else {
        // If on dashboard, redirect to login
        if (window.location.pathname === '/dashboard') {
            window.location.href = '/';
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout button
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', handleLogout);
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showAlert('아이디와 비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success && data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            state.token = data.access_token;
            state.isLoggedIn = true;
            
            showAlert('로그인 성공! 대시보드로 이동합니다.', 'success');
            
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showAlert(data.message || '로그인에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
        showLoading(false);
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('access_token');
    state.token = null;
    state.isLoggedIn = false;
    window.location.href = '/';
}

// API Request Helper
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    const options = {
        method,
        headers
    };
    
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (response.status === 401) {
        handleLogout();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    
    return response.json();
}

// Load user info
async function loadUserInfo() {
    try {
        const data = await apiRequest('/user/info');
        if (data.success && data.data) {
            // API returns nested structure: data.data contains user info
            state.userData = data.data;
            updateUserDisplay();
        }
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}

// Update user display
function updateUserDisplay() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl && state.userData) {
        // Use memName from actual API response
        userNameEl.textContent = state.userData.memName || state.userData.memId || '사용자';
    }
    
    // Update patient ID display if exists
    const patientIdEl = document.getElementById('patientId');
    if (patientIdEl && state.userData) {
        patientIdEl.textContent = state.userData.memAaPatId || '-';
    }
    
    // Update user info card
    updateUserInfoCard();
}

// Update user info card with detailed information
function updateUserInfoCard() {
    if (!state.userData) return;
    
    const card = document.getElementById('userInfoCard');
    if (card) {
        card.style.display = 'block';
    }
    
    const info = getUserInfoDetails();
    if (!info) return;
    
    // Update each field
    const fields = {
        'infoName': info.name,
        'infoBirth': info.birthDate,
        'infoGender': info.gender,
        'infoPhone': info.phone,
        'infoEmail': info.email,
        'infoAddress': info.address
    };
    
    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }
}

// Toggle user info card collapse
function toggleUserInfoCard() {
    const body = document.getElementById('userInfoBody');
    const icon = document.getElementById('userInfoToggleIcon');
    
    if (body && icon) {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        icon.classList.toggle('fa-chevron-up', isHidden);
        icon.classList.toggle('fa-chevron-down', !isHidden);
    }
}

// Get formatted user info for display
function getUserInfoDetails() {
    if (!state.userData) return null;
    
    const data = state.userData;
    return {
        name: data.memName || '-',
        memberId: data.memId || '-',
        patientId: data.memAaPatId || '-',
        birthDate: formatBirthDate(data.memBirth),
        gender: data.memGender === 'M' ? '남성' : data.memGender === 'F' ? '여성' : '-',
        email: data.memEmail || '-',
        phone: formatPhoneNumber(data.memHpNo),
        address: formatAddress(data.memAddress1, data.memAddress2, data.memZipcode),
        emailAgree: data.memEmailAgreeYn === 'Y' ? '동의' : '미동의',
        smsAgree: data.memSmsAgreeYn === 'Y' ? '동의' : '미동의'
    };
}

// Format birth date (YYYYMMDD -> YYYY년 MM월 DD일)
function formatBirthDate(birth) {
    if (!birth || birth.length !== 8) return '-';
    return `${birth.substring(0, 4)}년 ${birth.substring(4, 6)}월 ${birth.substring(6, 8)}일`;
}

// Format phone number
function formatPhoneNumber(phone) {
    if (!phone) return '-';
    return phone;
}

// Format address
function formatAddress(addr1, addr2, zipcode) {
    const parts = [];
    if (zipcode) parts.push(`(${zipcode})`);
    if (addr1) parts.push(addr1);
    if (addr2) parts.push(addr2);
    return parts.length > 0 ? parts.join(' ') : '-';
}

// 데이터 배열 추출 헬퍼 함수
function getDataArray(data, type) {
    switch (type) {
        case 'reservations':
        case 'outpatient':
        case 'hospitalization':
        case 'payments':
            return Array.isArray(data) ? data : (data?.list || []);
        case 'labTests':
            // labTests는 lemonRsltDetlOutDVOList에 데이터가 있음
            return data?.lemonRsltDetlOutDVOList || (Array.isArray(data) ? data : []);
        case 'medications':
            // IN/OUT 구조에서 데이터 추출
            let medItems = [];
            if (data?.OUT?.sdpMobilePharmsOutDVOList) {
                medItems = medItems.concat(data.OUT.sdpMobilePharmsOutDVOList);
            }
            if (data?.IN?.sdpMobilePharmsOutDVOList) {
                medItems = medItems.concat(data.IN.sdpMobilePharmsOutDVOList);
            }
            if (Array.isArray(data)) {
                return data;
            } else if (data?.list) {
                return data.list;
            }
            return medItems;
        default:
            return Array.isArray(data) ? data : [];
    }
}

// 진료과 필드명 가져오기
function getDepartmentField(type) {
    switch (type) {
        case 'medications':
        case 'payments':
            return 'kornDprtNm';
        case 'labTests':
            return 'ordrDprtNm'; // 검사 처방과
        default:
            return 'mcdpNm';
    }
}

// 진료과 목록 추출 (데이터 유형별로 다른 필드명 사용)
function extractDepartments(data, type) {
    const departments = new Set();
    const items = getDataArray(data, type);
    const deptField = getDepartmentField(type);
    
    items.forEach(item => {
        const dept = item[deptField] || item.mcdpNm || item.dprtNm;
        if (dept) departments.add(dept);
    });
    
    return Array.from(departments).sort();
}

// 진료과별 데이터 개수 계산
function countByDepartment(data, type) {
    const items = getDataArray(data, type);
    const deptField = getDepartmentField(type);
    const counts = {};
    
    items.forEach(item => {
        const dept = item[deptField] || item.mcdpNm || item.dprtNm;
        if (dept) {
            counts[dept] = (counts[dept] || 0) + 1;
        }
    });
    
    return counts;
}

// 진료과 드롭다운 업데이트 (개수 포함)
function updateDepartmentFilter(type, departments, data) {
    const filterEl = document.getElementById(`${type}DeptFilter`);
    if (!filterEl) return;
    
    const totalCount = getDataArray(data, type).length;
    const counts = countByDepartment(data, type);
    
    // 기존 옵션 초기화
    filterEl.innerHTML = `<option value="">전체 (${totalCount}건)</option>`;
    
    // 진료과 옵션 추가 (개수 포함)
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = `${dept} (${counts[dept] || 0}건)`;
        filterEl.appendChild(option);
    });
}

// 진료과별 데이터 필터링 (원본 데이터 구조 유지)
function filterDataByDepartment(data, type, department) {
    if (!department) return data; // 전체 선택 시 원본 반환
    
    const deptField = getDepartmentField(type);
    
    switch (type) {
        case 'reservations':
        case 'outpatient':
        case 'hospitalization':
        case 'payments': {
            const items = Array.isArray(data) ? data : (data?.list || []);
            const filtered = items.filter(item => {
                const dept = item[deptField] || item.mcdpNm || item.dprtNm;
                return dept === department;
            });
            return filtered;
        }
            
        case 'labTests': {
            // labTests는 lemonRsltDetlOutDVOList 구조 유지
            const items = data?.lemonRsltDetlOutDVOList || (Array.isArray(data) ? data : []);
            const filtered = items.filter(item => {
                const dept = item.ordrDprtNm || item.mcdpNm;
                return dept === department;
            });
            // 원본 구조 유지하여 반환
            if (data?.lemonRsltDetlOutDVOList) {
                return { ...data, lemonRsltDetlOutDVOList: filtered };
            }
            return filtered;
        }
            
        case 'medications': {
            // IN/OUT 구조인지 확인
            if (data?.OUT?.sdpMobilePharmsOutDVOList || data?.IN?.sdpMobilePharmsOutDVOList) {
                // IN/OUT 구조 유지하면서 필터링
                const filtered = {};
                if (data?.OUT?.sdpMobilePharmsOutDVOList) {
                    filtered.OUT = {
                        ...data.OUT,
                        sdpMobilePharmsOutDVOList: data.OUT.sdpMobilePharmsOutDVOList.filter(
                            item => item.kornDprtNm === department
                        )
                    };
                }
                if (data?.IN?.sdpMobilePharmsOutDVOList) {
                    filtered.IN = {
                        ...data.IN,
                        sdpMobilePharmsOutDVOList: data.IN.sdpMobilePharmsOutDVOList.filter(
                            item => item.kornDprtNm === department
                        )
                    };
                }
                return filtered;
            }
            const items = Array.isArray(data) ? data : (data?.list || []);
            return items.filter(item => item.kornDprtNm === department);
        }
            
        default:
            return data;
    }
}

// 진료과 필터 적용
function filterByDepartment(type) {
    const filterEl = document.getElementById(`${type}DeptFilter`);
    if (!filterEl) return;
    
    const department = filterEl.value;
    const originalData = state.dataCache[type];
    
    if (!originalData) {
        showAlert('먼저 데이터를 조회해주세요.', 'warning');
        return;
    }
    
    const filteredData = filterDataByDepartment(originalData, type, department);
    
    // 필터링 결과 로그
    const originalCount = getDataArray(originalData, type).length;
    const filteredCount = getDataArray(filteredData, type).length;
    console.log(`[${type}] 필터링: ${department || '전체'} - ${filteredCount}/${originalCount}건`);
    
    // 필터링 적용 알림 (전체가 아닌 경우)
    if (department) {
        showAlert(`${department}: ${filteredCount}건 표시`, 'info');
    }
    
    // 렌더링 함수 호출
    switch (type) {
        case 'reservations':
            renderReservations(filteredData);
            break;
        case 'labTests':
            renderLabTestResults(filteredData);
            break;
        case 'medications':
            renderMedicationHistory(filteredData);
            break;
        case 'outpatient':
            renderOutpatientHistory(filteredData);
            break;
        case 'hospitalization':
            renderHospitalizationHistory(filteredData);
            break;
        case 'payments':
            renderPaymentList(filteredData);
            break;
    }
}

// Load reservations
async function loadReservations(startDate, endDate) {
    showLoading(true);
    try {
        const data = await apiRequest('/reservations', 'POST', {
            start_date: parseInt(startDate),
            end_date: parseInt(endDate),
            hospital_code: 'AA'
        });
        
        if (data.success) {
            // 데이터 캐시 저장
            state.dataCache.reservations = data.data;
            // 진료과 필터 업데이트
            const departments = extractDepartments(data.data, 'reservations');
            updateDepartmentFilter('reservations', departments, data.data);
            renderReservations(data.data);
        } else {
            showAlert(data.message || '예약 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Failed to load reservations:', error);
        showAlert('예약 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// Load health check results
async function loadLabTestResults(startDate, endDate) {
    showLoading(true);
    try {
        const data = await apiRequest('/lab-tests', 'POST', {
            start_date: parseInt(startDate),
            end_date: parseInt(endDate),
            hospital_code: 'AA'
        });
        
        if (data.success) {
            // 데이터 캐시 저장
            state.dataCache.labTests = data.data;
            // 진료과 필터 업데이트
            const departments = extractDepartments(data.data, 'labTests');
            updateDepartmentFilter('labTests', departments, data.data);
            renderLabTestResults(data.data);
        } else {
            showAlert(data.message || '진단검사 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Failed to load lab test results:', error);
        showAlert('진단검사 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// Load medication history
async function loadMedicationHistory(startDate, endDate) {
    showLoading(true);
    try {
        const data = await apiRequest('/medications', 'POST', {
            start_date: parseInt(startDate),
            end_date: parseInt(endDate),
            hospital_code: 'AA'
        });
        
        if (data.success) {
            // 데이터 캐시 저장
            state.dataCache.medications = data.data;
            // 진료과 필터 업데이트
            const departments = extractDepartments(data.data, 'medications');
            updateDepartmentFilter('medications', departments, data.data);
            renderMedicationHistory(data.data);
        } else {
            showAlert(data.message || '처방 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Failed to load medication history:', error);
        showAlert('처방 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// Load outpatient history
async function loadOutpatientHistory(startDate, endDate) {
    showLoading(true);
    try {
        const data = await apiRequest('/outpatient-history', 'POST', {
            start_date: parseInt(startDate),
            end_date: parseInt(endDate),
            hospital_code: 'AA'
        });
        
        if (data.success) {
            // 데이터 캐시 저장
            state.dataCache.outpatient = data.data;
            // 진료과 필터 업데이트
            const departments = extractDepartments(data.data, 'outpatient');
            updateDepartmentFilter('outpatient', departments, data.data);
            renderOutpatientHistory(data.data);
        } else {
            showAlert(data.message || '외래 진료 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Failed to load outpatient history:', error);
        showAlert('외래 진료 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// Load hospitalization history
async function loadHospitalizationHistory(startDate, endDate) {
    showLoading(true);
    try {
        const data = await apiRequest('/hospitalization-history', 'POST', {
            start_date: parseInt(startDate),
            end_date: parseInt(endDate),
            hospital_code: 'AA'
        });
        
        if (data.success) {
            // 데이터 캐시 저장
            state.dataCache.hospitalization = data.data;
            // 진료과 필터 업데이트
            const departments = extractDepartments(data.data, 'hospitalization');
            updateDepartmentFilter('hospitalization', departments, data.data);
            renderHospitalizationHistory(data.data);
        } else {
            showAlert(data.message || '입퇴원 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Failed to load hospitalization history:', error);
        showAlert('입퇴원 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// Load payment list
async function loadPaymentList(startDate, endDate, codeDivision = 'O') {
    showLoading(true);
    try {
        const data = await apiRequest('/payments', 'POST', {
            start_date: parseInt(startDate),
            end_date: parseInt(endDate),
            hospital_code: 'AA',
            code_division: codeDivision
        });
        
        if (data.success) {
            // 데이터 캐시 저장
            state.dataCache.payments = data.data;
            // 진료과 필터 업데이트
            const departments = extractDepartments(data.data, 'payments');
            updateDepartmentFilter('payments', departments, data.data);
            renderPaymentList(data.data);
        } else {
            showAlert(data.message || '수납 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Failed to load payment list:', error);
        showAlert('수납 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// Load payment detail
async function loadPaymentDetail(mdrpNo) {
    showLoading(true);
    try {
        const data = await apiRequest('/payments/detail', 'POST', {
            hospital_code: 'AA',
            mdrp_no: mdrpNo
        });
        
        if (data.success) {
            renderPaymentDetail(data.data);
        } else {
            showAlert(data.message || '수납 상세 정보를 불러오는데 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('Failed to load payment detail:', error);
        showAlert('수납 상세 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
        showLoading(false);
    }
}

// Render functions
function renderReservations(data) {
    const container = document.getElementById('reservationsData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = renderEmptyState('예약 내역이 없습니다.', 'calendar-times');
        return;
    }
    
    // 진료일 기준 정렬 (가까운 날짜 먼저)
    const sortedData = [...data].sort((a, b) => {
        const dateA = a.mdcrYmd + a.mdcrDt;
        const dateB = b.mdcrYmd + b.mdcrDt;
        return dateA.localeCompare(dateB);
    });
    
    container.innerHTML = `
        <div class="reservations-list">
            ${sortedData.map(item => {
                const isPaymentDone = item.mcfeRcpcCd === 'Y';
                const statusBadgeClass = isPaymentDone ? 'badge-success' : 'badge-warning';
                const doctorImage = item.phtgPathNm || null;
                
                return `
                <div class="reservation-card" style="background: var(--card-bg); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 1px solid var(--border-color);">
                    <div class="reservation-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div class="reservation-datetime" style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-calendar-check text-primary" style="font-size: 1.25rem;"></i>
                            <div>
                                <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-color);">${item.afiMdcrDtCtn || formatDate(item.mdcrYmd)}</div>
                                <div style="font-size: 0.85rem; color: var(--text-muted);">예약 신청일: ${item.mdcrApntAplcYmdCtn || '-'}</div>
                            </div>
                        </div>
                        <span class="badge ${statusBadgeClass}" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">${item.cnfrSttsCtn || item.afiMcfeRcpcNm || '예약'}</span>
                    </div>
                    
                    <div class="reservation-body" style="display: flex; gap: 1rem; align-items: flex-start;">
                        ${doctorImage ? `
                        <div class="doctor-photo" style="flex-shrink: 0;">
                            <img src="${doctorImage}" alt="${item.mddrNm}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color);" onerror="this.style.display='none'">
                        </div>
                        ` : ''}
                        
                        <div class="reservation-info" style="flex: 1;">
                            <div class="info-row" style="display: flex; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 0.75rem;">
                                <div class="info-item">
                                    <span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fas fa-hospital"></i> 진료과</span>
                                    <div style="font-weight: 500; color: var(--text-color);">${item.mcdpNm || '-'}</div>
                                </div>
                                <div class="info-item">
                                    <span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fas fa-user-md"></i> 담당의</span>
                                    <div style="font-weight: 500; color: var(--text-color);">${item.mddrNm || '-'}</div>
                                </div>
                                <div class="info-item">
                                    <span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fas fa-map-marker-alt"></i> 위치</span>
                                    <div style="font-weight: 500; color: var(--text-color);">${item.otptMcrmLctnNm || '-'}</div>
                                </div>
                            </div>
                            
                            <div class="info-row" style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
                                <div class="info-item">
                                    <span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fas fa-building"></i> 병원</span>
                                    <div style="font-weight: 500; color: var(--text-color);">${item.mccnNm || '-'}</div>
                                </div>
                                <div class="info-item">
                                    <span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fas fa-stethoscope"></i> 구분</span>
                                    <div style="font-weight: 500; color: var(--text-color);">${item.fvdvNm || '-'}</div>
                                </div>
                                <div class="info-item">
                                    <span style="color: var(--text-muted); font-size: 0.85rem;"><i class="fas fa-phone"></i> 문의</span>
                                    <div style="font-weight: 500; color: var(--text-color);">${item.hsptRprsTlno || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderLabTestResults(data) {
    const container = document.getElementById('labTestsData');
    if (!container) return;
    
    // Extract items from nested structure
    const items = data?.lemonRsltDetlOutDVOList || [];
    
    if (!items || items.length === 0) {
        container.innerHTML = renderEmptyState('진단검사 결과가 없습니다.', 'vial');
        return;
    }
    
    // Group by slip name (category) and order date
    const groupedByDate = {};
    items.forEach(item => {
        const dateKey = item.ordrYmd || item.rprtDt;
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = {};
        }
        const category = item.slipNm || '기타';
        if (!groupedByDate[dateKey][category]) {
            groupedByDate[dateKey][category] = [];
        }
        groupedByDate[dateKey][category].push(item);
    });
    
    // Sort dates descending
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    
    container.innerHTML = `
        <div class="lab-results-container">
            ${sortedDates.map(date => `
                <div class="lab-date-group mb-2">
                    <h3 class="lab-date-header" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--primary-color);">
                        <i class="fas fa-calendar-alt text-primary"></i>
                        검사일: ${formatDate(date)}
                    </h3>
                    ${Object.entries(groupedByDate[date]).map(([category, tests]) => `
                        <div class="lab-category-group mb-2">
                            <h4 style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-folder"></i> ${category}
                            </h4>
                            <div class="table-responsive">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>검사항목</th>
                                            <th class="text-right">결과</th>
                                            <th>단위</th>
                                            <th>참고치</th>
                                            <th>상태</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${tests.map(test => {
                                            const value = parseFloat(test.exrsNcvlVl);
                                            const low = parseFloat(test.nrmlLwlmNcvlVl);
                                            const high = parseFloat(test.nrmlUplmNcvlVl);
                                            let status = 'normal';
                                            let statusBadge = '<span class="badge badge-success">정상</span>';
                                            
                                            if (!isNaN(value) && !isNaN(low) && !isNaN(high)) {
                                                if (value < low) {
                                                    status = 'low';
                                                    statusBadge = '<span class="badge badge-info">↓ 낮음</span>';
                                                } else if (value > high) {
                                                    status = 'high';
                                                    statusBadge = '<span class="badge badge-danger">↑ 높음</span>';
                                                }
                                            } else if (!test.rfrcCtn) {
                                                statusBadge = '<span class="badge badge-secondary">-</span>';
                                            }
                                            
                                            return `
                                                <tr class="lab-result-row ${status}">
                                                    <td>
                                                        <div style="font-weight: 500;">${test.exmnNm || '-'}</div>
                                                        <div style="font-size: 0.75rem; color: var(--text-muted);">${test.spcmNm || ''}</div>
                                                    </td>
                                                    <td class="text-right" style="font-weight: 600; font-size: 1.05rem; ${status === 'high' ? 'color: var(--danger-color);' : status === 'low' ? 'color: var(--primary-color);' : ''}">
                                                        ${test.exrsNcvlVl || test.exrsCtn || '-'}
                                                    </td>
                                                    <td style="color: var(--text-secondary);">${test.exrsUnitNm || ''}</td>
                                                    <td style="color: var(--text-secondary); font-size: 0.85rem;">${test.rfrcCtn || '-'}</td>
                                                    <td>${statusBadge}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
        <div class="mt-2">
            <span class="text-muted"><i class="fas fa-info-circle"></i> 총 ${items.length}개 검사항목</span>
        </div>
    `;
}

function renderMedicationHistory(data) {
    const container = document.getElementById('medicationsData');
    if (!container) return;
    
    // API 응답 구조에 맞게 데이터 추출 (IN: 입원, OUT: 외래)
    let items = [];
    if (data?.OUT?.sdpMobilePharmsOutDVOList) {
        items = items.concat(data.OUT.sdpMobilePharmsOutDVOList);
    }
    if (data?.IN?.sdpMobilePharmsOutDVOList) {
        items = items.concat(data.IN.sdpMobilePharmsOutDVOList);
    }
    // 기존 형식도 지원
    if (Array.isArray(data)) {
        items = data;
    } else if (data?.list) {
        items = data.list;
    }
    
    if (!items || items.length === 0) {
        container.innerHTML = renderEmptyState('처방 내역이 없습니다.', 'pills');
        return;
    }
    
    // 처방일 기준으로 그룹화
    const groupedByDate = {};
    items.forEach(item => {
        const dateKey = item.ordrYmd || '미상';
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(item);
    });
    
    // 날짜 내림차순 정렬
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
    
    // 진료과별 통계
    const deptStats = {};
    items.forEach(item => {
        const dept = item.kornDprtNm || '기타';
        if (!deptStats[dept]) {
            deptStats[dept] = { count: 0, doctors: new Set() };
        }
        deptStats[dept].count++;
        if (item.userNm) deptStats[dept].doctors.add(item.userNm);
    });
    
    container.innerHTML = `
        <div class="medication-summary" style="display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 10px;">
            ${Object.entries(deptStats).map(([dept, stats]) => `
                <div class="dept-badge" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <i class="fas fa-pills text-primary"></i>
                    <span style="font-weight: 500;">${dept}</span>
                    <span class="badge badge-primary" style="font-size: 0.75rem;">${stats.count}건</span>
                </div>
            `).join('')}
        </div>
        
        <div class="medication-list">
            ${sortedDates.map(date => `
                <div class="medication-date-group mb-2">
                    <h3 class="date-header" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--primary-color);">
                        <i class="fas fa-calendar-alt text-primary"></i>
                        처방일: ${formatDate(date)}
                    </h3>
                    
                    ${(() => {
                        // 같은 날짜 내에서 진료과별로 그룹화
                        const byDept = {};
                        groupedByDate[date].forEach(item => {
                            const dept = item.kornDprtNm || '기타';
                            if (!byDept[dept]) {
                                byDept[dept] = { doctor: item.userNm, items: [] };
                            }
                            byDept[dept].items.push(item);
                        });
                        
                        return Object.entries(byDept).map(([dept, data]) => `
                            <div class="dept-prescription-group" style="margin-bottom: 1.5rem; padding: 1rem; background: var(--card-bg); border-radius: 10px; border: 1px solid var(--border-color);">
                                <div class="dept-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span class="badge badge-info">${dept}</span>
                                        <strong>${data.doctor || '-'}</strong>
                                    </div>
                                </div>
                                
                                <div class="table-responsive">
                                    <table class="data-table" style="margin-bottom: 0;">
                                        <thead>
                                            <tr>
                                                <th>약품명</th>
                                                <th>용량</th>
                                                <th>복용법</th>
                                                <th>일수</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.items.map(item => `
                                                <tr>
                                                    <td>
                                                        <div style="font-weight: 500;">${item.ordrNm || '-'}</div>
                                                    </td>
                                                    <td>
                                                        <span class="badge badge-secondary">${item.pcknUnadQty || 1}${item.pcunNm || ''} × ${item.mdnt || 1}회</span>
                                                    </td>
                                                    <td>
                                                        <span style="color: var(--text-muted);">${item.tkmdInftDrusCtn || '-'}</span>
                                                    </td>
                                                    <td>
                                                        <strong>${item.mdtnDdcn || '-'}</strong>일
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `).join('');
                    })()}
                </div>
            `).join('')}
        </div>
        
        <div class="mt-2">
            <span class="text-muted"><i class="fas fa-info-circle"></i> 총 ${items.length}건의 처방 기록</span>
        </div>
    `;
}

function renderOutpatientHistory(data) {
    const container = document.getElementById('outpatientData');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = renderEmptyState('외래 진료 내역이 없습니다.', 'hospital-user');
        return;
    }
    
    // 진료과별로 그룹화하여 통계 생성
    const deptStats = {};
    data.forEach(item => {
        const dept = item.mcdpNm || '기타';
        if (!deptStats[dept]) {
            deptStats[dept] = { count: 0, doctors: new Set() };
        }
        deptStats[dept].count++;
        if (item.mddrNm) deptStats[dept].doctors.add(item.mddrNm);
    });
    
    container.innerHTML = `
        <div class="outpatient-summary" style="display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; padding: 1rem; background: var(--bg-secondary); border-radius: 10px;">
            ${Object.entries(deptStats).map(([dept, stats]) => `
                <div class="dept-badge" style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                    <i class="fas fa-stethoscope text-primary"></i>
                    <span style="font-weight: 500;">${dept}</span>
                    <span class="badge badge-primary" style="font-size: 0.75rem;">${stats.count}회</span>
                </div>
            `).join('')}
        </div>
        
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>진료일</th>
                        <th>진료과</th>
                        <th>담당의</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-calendar-check text-primary" style="font-size: 0.9rem;"></i>
                                    <span>${item.mdcrPerdCtn || '-'}</span>
                                </div>
                            </td>
                            <td><span class="badge badge-info">${item.mcdpNm || '-'}</span></td>
                            <td><strong>${item.mddrNm || '-'}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="mt-2">
            <span class="text-muted"><i class="fas fa-info-circle"></i> 총 ${data.length}건의 외래 진료 기록</span>
        </div>
    `;
}

function renderHospitalizationHistory(data) {
    const container = document.getElementById('hospitalizationData');
    if (!container) return;
    
    let items = Array.isArray(data) ? data : [];
    
    if (!items || items.length === 0) {
        container.innerHTML = renderEmptyState('입퇴원 내역이 없습니다.', 'procedures');
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>입퇴원 기간</th>
                        <th>환자번호</th>
                        <th>환자명</th>
                        <th>진료과</th>
                        <th>담당의</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-calendar-alt text-primary" style="font-size: 0.9rem;"></i>
                                    <span>${item.mdcrPerdCtn || '-'}</span>
                                </div>
                            </td>
                            <td>${item.ptno || '-'}</td>
                            <td><strong>${item.ptntNm || '-'}</strong></td>
                            <td>${item.mcdpNm || '-'}</td>
                            <td>${item.mddrNm || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="mt-2">
            <span class="text-muted"><i class="fas fa-info-circle"></i> 총 ${items.length}건의 입퇴원 기록</span>
        </div>
    `;
}

function renderPaymentList(data) {
    const container = document.getElementById('paymentsData');
    if (!container) return;
    
    // Data is already an array from API response
    let items = Array.isArray(data) ? data : [];
    
    if (!items || items.length === 0) {
        container.innerHTML = renderEmptyState('수납 내역이 없습니다.', 'receipt');
        return;
    }
    
    container.innerHTML = `
        <div class="table-responsive">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>수납일</th>
                        <th>진료과</th>
                        <th>담당의</th>
                        <th>총액</th>
                        <th>본인부담</th>
                        <th>상태</th>
                        <th>상세</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${formatDate(item.mdcrYmd)}</td>
                            <td>${item.kornDprtNm || '-'}</td>
                            <td>${item.mddrNm || '-'}</td>
                            <td class="text-right">${formatCurrency(item.tomcAmt)}</td>
                            <td class="text-right">${formatCurrency(item.onbrAmt)}</td>
                            <td>
                                ${item.cnclYn === 'C' 
                                    ? '<span class="badge badge-danger">취소</span>' 
                                    : '<span class="badge badge-success">완료</span>'}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="loadPaymentDetail(${item.mdrpNo})" ${item.cnclYn === 'C' ? 'disabled' : ''}>
                                    <i class="fas fa-search"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="payment-summary mt-2">
            <div class="card" style="background: var(--primary-light);">
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <span class="text-muted">총 ${items.filter(i => i.cnclYn !== 'C').length}건</span>
                    </div>
                    <div>
                        <span class="text-muted">총액 합계:</span>
                        <strong style="margin-left: 0.5rem;">${formatCurrency(items.filter(i => i.cnclYn !== 'C').reduce((sum, i) => sum + (i.tomcAmt || 0), 0))}</strong>
                    </div>
                    <div>
                        <span class="text-muted">본인부담 합계:</span>
                        <strong style="margin-left: 0.5rem;">${formatCurrency(items.filter(i => i.cnclYn !== 'C').reduce((sum, i) => sum + (i.onbrAmt || 0), 0))}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderPaymentDetail(data) {
    const modal = document.getElementById('paymentDetailModal');
    const content = document.getElementById('paymentDetailContent');
    
    if (!modal || !content) return;
    
    const receipt = data?.receipt || {};
    const items = data?.receiptDetail?.acaRealInsrClamItemOutDVOList || [];
    
    content.innerHTML = `
        <!-- 환자 및 진료 정보 -->
        <div class="receipt-header" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-color);">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
                <div>
                    <span class="text-muted" style="font-size: 0.8rem;">환자명</span>
                    <p style="font-weight: 600; margin: 0.25rem 0;">${receipt.ptntNm || '-'}</p>
                </div>
                <div>
                    <span class="text-muted" style="font-size: 0.8rem;">환자번호</span>
                    <p style="font-weight: 600; margin: 0.25rem 0;">${receipt.ptno || '-'}</p>
                </div>
                <div>
                    <span class="text-muted" style="font-size: 0.8rem;">진료일</span>
                    <p style="font-weight: 600; margin: 0.25rem 0;">${receipt.mdcrPerdCtn || '-'}</p>
                </div>
                <div>
                    <span class="text-muted" style="font-size: 0.8rem;">진료과</span>
                    <p style="font-weight: 600; margin: 0.25rem 0;">${receipt.mcdpNm || '-'}</p>
                </div>
                <div>
                    <span class="text-muted" style="font-size: 0.8rem;">담당의</span>
                    <p style="font-weight: 600; margin: 0.25rem 0;">${receipt.mddrNm || '-'}</p>
                </div>
                <div>
                    <span class="text-muted" style="font-size: 0.8rem;">보험유형</span>
                    <p style="font-weight: 600; margin: 0.25rem 0;">${receipt.istyNm || '-'}</p>
                </div>
            </div>
        </div>
        
        <!-- 항목별 상세 내역 -->
        <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
                <i class="fas fa-list"></i> 항목별 내역
            </h4>
            <div class="table-responsive">
                <table class="data-table" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th>항목</th>
                            <th style="text-align: right;">급여</th>
                            <th style="text-align: right;">비급여</th>
                            <th style="text-align: right;">합계</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.map(item => `
                            <tr>
                                <td>${item.afiMdacClsfNm || '-'}</td>
                                <td style="text-align: right;">${formatCurrency(item.clamAmt)}</td>
                                <td style="text-align: right;">${formatCurrency(item.nnpyAmt)}</td>
                                <td style="text-align: right; font-weight: 500;">${formatCurrency(item.tomcAmt)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- 결제 요약 -->
        <div class="receipt-summary" style="background: var(--background-color); border-radius: 8px; padding: 1rem;">
            <h4 style="font-size: 0.95rem; margin-bottom: 0.75rem; color: var(--text-secondary);">
                <i class="fas fa-calculator"></i> 결제 요약
            </h4>
            <div style="display: grid; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                    <span class="text-muted">총 진료비</span>
                    <span style="font-weight: 500;">${formatCurrency(receipt.tomcAmt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                    <span class="text-muted">공단부담금</span>
                    <span>${formatCurrency(receipt.clamAmt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0;">
                    <span class="text-muted">본인부담금</span>
                    <span>${formatCurrency(receipt.onbrAmt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; border-top: 1px dashed var(--border-color); margin-top: 0.5rem; padding-top: 0.75rem;">
                    <span style="font-weight: 600;">실제 수납액</span>
                    <span style="font-weight: 700; color: var(--primary-color); font-size: 1.1rem;">${formatCurrency(receipt.realRcpcAmt || receipt.rcpcAmt)}</span>
                </div>
            </div>
            
            <!-- 결제 방법 -->
            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    ${receipt.cardPaymAmt > 0 ? `<span><i class="fas fa-credit-card"></i> 카드: ${formatCurrency(receipt.cardPaymAmt)}</span>` : ''}
                    ${receipt.cashPaymAmt1 > 0 ? `<span style="margin-left: 1rem;"><i class="fas fa-money-bill"></i> 현금: ${formatCurrency(receipt.cashPaymAmt1)}</span>` : ''}
                </div>
            </div>
        </div>
        
        <!-- 병원 정보 -->
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); font-size: 0.8rem; color: var(--text-secondary);">
            <p style="margin: 0.25rem 0;"><i class="fas fa-hospital"></i> ${receipt.insrInfmCtn11 || '고려대학교 의료원 안암병원'}</p>
            <p style="margin: 0.25rem 0;"><i class="fas fa-phone"></i> ${receipt.insrInfmCtn12 || '1577-0083'}</p>
            <p style="margin: 0.25rem 0;"><i class="fas fa-map-marker-alt"></i> ${receipt.insrInfmCtn13 || ''}</p>
        </div>
    `;
    
    openModal('paymentDetailModal');
}

function renderEmptyState(message, icon) {
    return `
        <div class="empty-state">
            <i class="fas fa-${icon}"></i>
            <h3>${message}</h3>
            <p>조회 기간을 변경하여 다시 시도해보세요.</p>
        </div>
    `;
}

// Utility functions
function formatDate(dateValue) {
    if (!dateValue) return '-';
    
    const dateStr = String(dateValue);
    if (dateStr.length === 8) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
}

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

function getDateRange(months = 12, includeFuture = false) {
    const today = new Date();
    
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - months);
    const startDateStr = startDate.toISOString().slice(0, 10).replace(/-/g, '');
    
    let endDate;
    if (includeFuture) {
        // 예약 조회용: 미래 날짜도 포함
        const futureDate = new Date(today);
        futureDate.setMonth(futureDate.getMonth() + months);
        endDate = futureDate.toISOString().slice(0, 10).replace(/-/g, '');
    } else {
        endDate = today.toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    return { startDate: startDateStr, endDate };
}

// UI Helper functions
function showLoading(show) {
    const overlay = elements.loadingOverlay || document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}

function showAlert(message, type = 'info') {
    const container = elements.alertContainer || document.getElementById('alertContainer');
    if (!container) {
        console.log(`Alert (${type}): ${message}`);
        return;
    }
    
    const alertId = `alert-${Date.now()}`;
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type}">
            <i class="fas fa-${getAlertIcon(type)}"></i>
            <span>${message}</span>
            <button class="modal-close" onclick="closeAlert('${alertId}')">&times;</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-close after 5 seconds
    setTimeout(() => closeAlert(alertId), 5000);
}

function closeAlert(alertId) {
    const alert = document.getElementById(alertId);
    if (alert) {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }
}

function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Menu navigation
function selectMenu(menuId) {
    // Remove active class from all menu cards
    document.querySelectorAll('.menu-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected menu
    const selectedCard = document.querySelector(`[data-menu="${menuId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }
    
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected content section
    const selectedSection = document.getElementById(`${menuId}Section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }
    
    state.currentView = menuId;
}

// Search with date range
function searchWithDateRange(type) {
    const startDateEl = document.getElementById(`${type}StartDate`);
    const endDateEl = document.getElementById(`${type}EndDate`);
    
    if (!startDateEl || !endDateEl) return;
    
    const startDate = startDateEl.value.replace(/-/g, '');
    const endDate = endDateEl.value.replace(/-/g, '');
    
    if (!startDate || !endDate) {
        showAlert('시작일과 종료일을 선택해주세요.', 'warning');
        return;
    }
    
    // 예약 내역은 과거 날짜 조회 불가
    if (type === 'reservations') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        
        if (parseInt(startDate) < parseInt(todayStr)) {
            showAlert('예약 내역은 과거 날짜를 조회할 수 없습니다. 시작일을 오늘 이후로 설정해주세요.', 'error');
            return;
        }
    }
    
    switch (type) {
        case 'reservations':
            loadReservations(startDate, endDate);
            break;
        case 'labTests':
            loadLabTestResults(startDate, endDate);
            break;
        case 'medications':
            loadMedicationHistory(startDate, endDate);
            break;
        case 'outpatient':
            loadOutpatientHistory(startDate, endDate);
            break;
        case 'hospitalization':
            loadHospitalizationHistory(startDate, endDate);
            break;
        case 'payments':
            loadPaymentList(startDate, endDate);
            break;
    }
}

// Initialize date inputs with default values
function initializeDateInputs() {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    const todayStr = today.toISOString().slice(0, 10);
    const yearAgoStr = oneYearAgo.toISOString().slice(0, 10);
    const yearLaterStr = oneYearLater.toISOString().slice(0, 10);
    
    // Set default dates for all date inputs
    document.querySelectorAll('input[type="date"][id$="EndDate"]').forEach(input => {
        // 예약 내역은 미래 날짜까지 조회 가능해야 함
        if (input.id === 'reservationsEndDate') {
            input.value = yearLaterStr;
        } else {
            input.value = todayStr;
        }
    });
    
    document.querySelectorAll('input[type="date"][id$="StartDate"]').forEach(input => {
        // 예약 내역은 기본 시작일을 오늘로 설정 (과거 조회 불가)
        if (input.id === 'reservationsStartDate') {
            input.value = todayStr;
            input.min = todayStr; // 과거 날짜 선택 불가
        } else {
            input.value = yearAgoStr;
        }
    });
}

// 처방내역 간편 조회 (개월 수 기준)
function quickSearchMedications(months) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - months);
    
    const todayStr = today.toISOString().slice(0, 10);
    const startDateStr = startDate.toISOString().slice(0, 10);
    
    // 날짜 입력 필드에도 반영
    const startDateEl = document.getElementById('medicationsStartDate');
    const endDateEl = document.getElementById('medicationsEndDate');
    if (startDateEl) startDateEl.value = startDateStr;
    if (endDateEl) endDateEl.value = todayStr;
    
    // 조회 실행
    const startDateFormatted = startDateStr.replace(/-/g, '');
    const endDateFormatted = todayStr.replace(/-/g, '');
    loadMedicationHistory(startDateFormatted, endDateFormatted);
}

// Export functions for global access
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.loadReservations = loadReservations;
window.loadLabTestResults = loadLabTestResults;
window.loadMedicationHistory = loadMedicationHistory;
window.loadOutpatientHistory = loadOutpatientHistory;
window.loadHospitalizationHistory = loadHospitalizationHistory;
window.loadPaymentList = loadPaymentList;
window.loadPaymentDetail = loadPaymentDetail;
window.selectMenu = selectMenu;
window.searchWithDateRange = searchWithDateRange;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAlert = closeAlert;
window.initializeDateInputs = initializeDateInputs;
window.quickSearchMedications = quickSearchMedications;
window.filterByDepartment = filterByDepartment;
