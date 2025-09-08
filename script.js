// Firebase Configuration
const firebaseConfig = typeof __firebase_config !== 'undefined'
    ? JSON.parse(__firebase_config)
    : {}; // Fallback to an empty object if undefined

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Names of error types
const errorTypes = [
    { key: "wrongItem", name: "จัดสินค้าผิด" },
    { key: "overPicked", name: "จัดสินค้าเกิน" },
    { key: "underPicked", name: "จัดสินค้าขาด" },
    { key: "wrongBatch", name: "Batch ไม่ตรง" },
    { key: "wrongRoute", name: "จัดไม่ตรง Route" },
    { key: "cleanliness", name: "ความสะอาด" },
];

const allRoles = ['PICKING', 'CHECKER', 'SENIOR', 'SUPERVISOR', 'ADMIN'];
let userRoleIndex = 4; // Start with ADMIN role

// DOM elements
const loginSection = document.getElementById('login-section');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const pendingApproval = document.getElementById('pending-approval');
const loginLoading = document.getElementById('login-loading');
const loginError = document.getElementById('login-error');
const dailyView = document.getElementById('daily-view');
const monthlyKpiView = document.getElementById('monthly-kpi-view');
const employeeDetailView = document.getElementById('employee-detail-view');
const approvalView = document.getElementById('approval-view');
const employeeTableBody = document.getElementById('employee-table-body');
const kpiReportBody = document.getElementById('kpi-report-body');
const approvalTableBody = document.getElementById('approval-table-body');
const monthlyBillsInput = document.getElementById('monthly-bills');
const showKpiButton = document.getElementById('show-kpi-button');
const showDailyButton = document.getElementById('show-daily-button');
const backToKpiButton = document.getElementById('back-to-kpi-button');
const resetButton = document.getElementById('reset-button');
const exportButton = document.getElementById('export-button');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmResetButton = document.getElementById('confirm-reset');
const cancelResetButton = document.getElementById('cancel-reset');
const employeeSearchInput = document.getElementById('employee-search');
const userRoleDisplay = document.getElementById('user-role-display');
const changeRoleButton = document.getElementById('change-role-button');
const logList = document.getElementById('log-list');
const employeeHistoryLog = document.getElementById('employee-history-log');
const logSearch = document.getElementById('log-search');
const logFilter = document.getElementById('log-filter');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const sendMessageButton = document.getElementById('send-message-button');
const messageModal = document.getElementById('message-modal');
const messageRecipient = document.getElementById('message-recipient');
const messageContent = document.getElementById('message-content');
const cancelMessageBtn = document.getElementById('cancel-message-btn');
const sendMessageBtn = document.getElementById('send-message-btn');
const toastContainer = document.getElementById('toast-container');
const notificationContainer = document.getElementById('notification-container');

// Calendar elements
const calendarHeader = document.getElementById('calendar-header');
const calendarDays = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const todayEvents = document.getElementById('today-events');

// Variables for current data
let employees = [];
let monthlyBills = 0;
let performanceChart = null; // Chart.js instance for line graph
let errorBreakdownChart = null; // Chart.js instance for doughnut chart
let errorDistributionChart = null; // Chart.js instance for error distribution
let employeeComparisonChart = null; // Chart.js instance for employee comparison
let errorTrendsChart = null; // Chart.js instance for error trends
let logs = [];
let currentUser = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let events = [];

// Check auth state
auth.onAuthStateChanged(async (user) => {
    const storedUserJSON = sessionStorage.getItem('loggedInUser');
    if (storedUserJSON) {
        // A user is logged in according to session storage. Show the app.
        currentUser = JSON.parse(storedUserJSON);
        
        loginSection.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        userRoleIndex = allRoles.indexOf(currentUser.role);
        if (userRoleIndex === -1) userRoleIndex = 0;
        
        initializeApp();
        toggleView('daily');
    } else {
        // No session stored, so show the login screen.
        loginSection.classList.remove('hidden');
        mainApp.classList.add('hidden');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginLoading.classList.add('hidden');
        pendingApproval.classList.add('hidden');
    }
});

// Login form submission
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    
    if (!email) {
        loginError.textContent = 'กรุณากรอกอีเมล';
        loginError.classList.remove('hidden');
        return;
    }
    
    loginForm.classList.add('hidden');
    loginLoading.classList.remove('hidden');
    loginError.classList.add('hidden');
    
    try {
        const usersRef = db.collection(`artifacts/${appId}/public/data/users`);
        const querySnapshot = await usersRef.where("email", "==", email).get();
        if (querySnapshot.empty) {
            // FIX: Handle user not found case gracefully without throwing a console error
            loginForm.classList.remove('hidden');
            loginLoading.classList.add('hidden');
            loginError.textContent = 'ไม่พบอีเมลนี้ในระบบ';
            loginError.classList.remove('hidden');
            showToast('เข้าสู่ระบบล้มเหลว: ไม่พบผู้ใช้', 'error');
            return; 
        }
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        if (userData.status === 'approved') {
            const userToStore = { uid: userDoc.id, ...userData };
            sessionStorage.setItem('loggedInUser', JSON.stringify(userToStore));
            
            currentUser = userToStore;
            loginSection.classList.add('hidden');
            mainApp.classList.remove('hidden');
            userRoleIndex = allRoles.indexOf(userData.role);
            if (userRoleIndex === -1) userRoleIndex = 0;
            
            initializeApp();
            toggleView('daily');
            showToast('เข้าสู่ระบบสำเร็จ', 'success');
        } else if (userData.status === 'pending') {
            loginForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            loginLoading.classList.add('hidden');
            pendingApproval.classList.remove('hidden');
        } else {
            // This case handles 'rejected' or other statuses
            loginForm.classList.remove('hidden');
            loginLoading.classList.add('hidden');
            loginError.textContent = 'บัญชีของคุณไม่ได้รับการอนุมัติ';
            loginError.classList.remove('hidden');
            showToast('เข้าสู่ระบบล้มเหลว', 'error');
        }
    } catch (error) {
        loginForm.classList.remove('hidden');
        loginLoading.classList.add('hidden');
        loginError.textContent = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
        loginError.classList.remove('hidden');
        showToast('เข้าสู่ระบบล้มเหลว', 'error');
        console.error("An unexpected login error occurred:", error);
    }
});

// Register form submission
document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const nickname = document.getElementById('reg-nickname').value;
    const email = document.getElementById('reg-email').value;
    const role = document.getElementById('reg-role').value;
    const termsAccepted = document.getElementById('reg-terms').checked;
    
    if (!name || !nickname || !email || !termsAccepted) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }
    
    try {
        const usersRef = db.collection(`artifacts/${appId}/public/data/users`);
        const existingUser = await usersRef.where("email", "==", email).get();
        if (!existingUser.empty) {
            showToast('อีเมลนี้ถูกใช้งานแล้ว', 'error');
            return;
        }
        
        const displayName = `${name} (${nickname})`;
        
        await usersRef.add({
            name: displayName,
            email,
            role,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        pendingApproval.classList.remove('hidden');
        
        showToast('สมัครสมาชิกสำเร็จ รอการอนุมัติ', 'success');
    } catch (error) {
        showToast('เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + error.message, 'error');
        console.error(error);
    }
});

// Show/hide login and register forms
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Logout buttons
document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('loggedInUser');
    window.location.reload();
});

document.getElementById('logout-main-btn').addEventListener('click', () => {
    sessionStorage.removeItem('loggedInUser');
    window.location.reload();
});

// Function to initialize data from Firestore
async function initializeData() {
    try {
        // แสดงสถานะการโหลด
        showToast('กำลังโหลดข้อมูล...', 'info');
        
        // Get employees from Firestore
        const employeesSnapshot = await db.collection(`artifacts/${appId}/public/data/employees`).get();
        if (!employeesSnapshot.empty) {
            employees = employeesSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    errors: data.errors || {}
                };
            });
        } else {
            // ไม่มีข้อมูลพนักงานในระบบ
            employees = [];
            showToast('ไม่พบข้อมูลพนักงานในระบบ', 'warning');
        }
        
        // Get monthly bills from Firestore
        const billsDoc = await db.collection(`artifacts/${appId}/public/data/settings`).doc('monthlyBills').get();
        monthlyBills = billsDoc.exists ? billsDoc.data().value : 0;
        monthlyBillsInput.value = monthlyBills;
        
        // Get logs from Firestore
        const logsSnapshot = await db.collection(`artifacts/${appId}/public/data/logs`).orderBy('timestamp', 'desc').limit(50).get();
        logs = logsSnapshot.docs.map(doc => doc.data());
        
        updateUIBasedOnRole();
        renderLogs();
        updateDashboardSummary();
        
        // แสดงข้อความเมื่อโหลดเสร็จสิ้น
        showToast('โหลดข้อมูลเสร็จสิ้น', 'success');
    } catch (error) {
        console.error('Error initializing data:', error);
        showToast('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
}

// Function to update the UI based on the current user role
function updateUIBasedOnRole() {
    const userRole = allRoles[userRoleIndex];
    userRoleDisplay.textContent = `บทบาท: ${userRole}`;
    const isDailyEditable = ['CHECKER', 'SENIOR', 'SUPERVISOR', 'ADMIN'].includes(userRole);
    const isKpiViewable = ['SENIOR', 'SUPERVISOR', 'ADMIN'].includes(userRole);
    const isKpiEditable = ['SUPERVISOR', 'ADMIN'].includes(userRole);
    const canSeeModifiers = ['SENIOR', 'SUPERVISOR', 'ADMIN'].includes(userRole);
    const canApproveUsers = ['SUPERVISOR', 'ADMIN'].includes(userRole);
    
    // Only admin can change role
    const canChangeRole = userRole === 'ADMIN';
    
    // Update Daily View controls
    const dailyControls = document.querySelectorAll('.add-error-btn, .minus-error-btn, .employee-name-input');
    dailyControls.forEach(el => {
        el.disabled = !isDailyEditable;
        if (!isDailyEditable) {
            el.classList.add('cursor-not-allowed', 'opacity-50');
        } else {
            el.classList.remove('cursor-not-allowed', 'opacity-50');
        }
    });
    
    // Update KPI View button
    if (isKpiViewable) {
        showKpiButton.classList.remove('hidden');
    } else {
        showKpiButton.classList.add('hidden');
    }
    
    // Update KPI controls
    monthlyBillsInput.disabled = !isKpiEditable;
    if (!isKpiEditable) {
        monthlyBillsInput.classList.add('cursor-not-allowed', 'opacity-50');
    } else {
        monthlyBillsInput.classList.remove('cursor-not-allowed', 'opacity-50');
    }
    
    const kpiControls = ['reset-button', 'export-button'];
    kpiControls.forEach(id => {
        const btn = document.getElementById(id);
        if (isKpiEditable) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });
    
    // Update approval button
    if (canApproveUsers) {
        document.getElementById('approval-btn').classList.remove('hidden');
    } else {
        document.getElementById('approval-btn').classList.add('hidden');
    }
    
    // Update change role button - only for admin
    if (canChangeRole) {
        changeRoleButton.classList.remove('hidden');
    } else {
        changeRoleButton.classList.add('hidden');
    }
    
    // Hide/show tooltips based on role
    const tooltips = document.querySelectorAll('.modifier-tooltip');
    tooltips.forEach(tooltip => {
        if (canSeeModifiers) {
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        } else {
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        }
    });
    
    // Render current view again to apply changes
    if (!dailyView.classList.contains('hidden')) {
        renderDailyTable();
    } else if (!monthlyKpiView.classList.contains('hidden')) {
        renderMonthlyKpiTable();
    }
}

// Function to switch roles - only for admin
function switchRole() {
    // Only admin can change roles
    if (allRoles[userRoleIndex] !== 'ADMIN') {
        showToast('เฉพาะแอดมินเท่านั้นที่สามารถเปลี่ยนบทบาทได้', 'warning');
        return;
    }
    
    // แสดงกล่องเลือกบทบาท
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full">
            <h3 class="text-xl font-bold text-gray-800 mb-4">เปลี่ยนบทบาท</h3>
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-medium mb-2" for="role-select">เลือกบทบาท</label>
                <select id="role-select" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    ${allRoles.map((role, index) => 
                        `<option value="${index}" ${index === userRoleIndex ? 'selected' : ''}>${role}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="flex justify-end space-x-3">
                <button id="cancel-btn" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors">
                    ยกเลิก
                </button>
                <button id="confirm-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    ยืนยัน
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('confirm-btn').addEventListener('click', () => {
        const selectedRoleIndex = parseInt(document.getElementById('role-select').value);
        if (selectedRoleIndex !== userRoleIndex) {
            userRoleIndex = selectedRoleIndex;
            updateUIBasedOnRole();
            
            // บันทึก log
            saveLog({
                modifierRole: 'ADMIN',
                employeeName: currentUser.name || 'ผู้ใช้งาน',
                action: 'เปลี่ยนบทบาทเป็น',
                newValue: allRoles[userRoleIndex]
            });
            
            showToast(`เปลี่ยนบทบาทเป็น ${allRoles[userRoleIndex]} สำเร็จ`, 'success');
            
            // After switching roles, re-render the current view to update permissions
            if (!dailyView.classList.contains('hidden')) {
                renderDailyTable();
            } else if (!monthlyKpiView.classList.contains('hidden')) {
                renderMonthlyKpiTable();
            }
        }
        
        document.body.removeChild(modal);
    });
}

// Function to save error data to Firestore
async function saveData() {
    // ตรวจสอบความถูกต้องของข้อมูล
    const validation = validateData();
    if (!validation.isValid) {
        showToast(validation.errorMessage, 'error');
        return;
    }
    
    try {
        // แสดงสถานะการบันทึก
        showToast('กำลังบันทึกข้อมูล...', 'info');
        
        const batch = db.batch();
        
        employees.forEach(emp => {
            const empRef = db.collection(`artifacts/${appId}/public/data/employees`).doc(emp.id.toString());
            batch.update(empRef, { errors: emp.errors });
        });
        
        const billsRef = db.collection(`artifacts/${appId}/public/data/settings`).doc('monthlyBills');
        batch.set(billsRef, { value: parseInt(monthlyBillsInput.value) || 0 });
        
        await batch.commit();
        
        // แสดงข้อความเมื่อบันทึกสำเร็จ
        showToast('บันทึกข้อมูลสำเร็จ', 'success');
    } catch (error) {
        console.error('Error saving data:', error);
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}

// Function to save a log entry to Firestore
async function saveLog(logEntry) {
    try {
        // เพิ่มชื่อผู้ใช้ที่ทำการกระทำ
        const userName = currentUser.name || currentUser.email;
        
        // Add to Firestore
        await db.collection(`artifacts/${appId}/public/data/logs`).add({
            ...logEntry,
            userName: userName, // เพิ่มชื่อผู้ใช้
            userRole: allRoles[userRoleIndex], // เก็บตำแหน่งไว้ด้วย
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local logs
        logs.unshift({
            ...logEntry,
            userName: userName,
            userRole: allRoles[userRoleIndex],
            timestamp: new Date()
        });
        
        if (logs.length > 50) {
            logs.pop();
        }
        
        renderLogs();
        
        // แสดงการแจ้งเตือนแบบ real-time
        showRealtimeNotification(logEntry);
    } catch (error) {
        console.error('Error saving log:', error);
    }
}

// Function to render the log list
function renderLogs() {
    logList.innerHTML = '';
    
    if (logs.length === 0) {
        showEmptyState(logList, 'ไม่มีประวัติการแก้ไข');
        return;
    }
    
    logs.forEach((log, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'text-sm text-gray-600 p-3 bg-white rounded-lg mb-2 shadow-sm border-l-4 border-indigo-500 transition-all duration-300 hover:shadow-md';
        
        // กำหนดไอคอนตามประเภทของการกระทำ
        let icon = '<i class="fas fa-edit text-blue-500 mr-2"></i>';
        let borderColor = 'border-blue-500';
        
        if (log.action.includes('เพิ่ม')) {
            icon = '<i class="fas fa-plus-circle text-green-500 mr-2"></i>';
            borderColor = 'border-green-500';
        } else if (log.action.includes('ลด')) {
            icon = '<i class="fas fa-minus-circle text-red-500 mr-2"></i>';
            borderColor = 'border-red-500';
        } else if (log.action.includes('อนุมัติ')) {
            icon = '<i class="fas fa-user-check text-green-500 mr-2"></i>';
            borderColor = 'border-green-500';
        } else if (log.action.includes('ปฏิเสธ')) {
            icon = '<i class="fas fa-user-times text-red-500 mr-2"></i>';
            borderColor = 'border-red-500';
        } else if (log.action.includes('เปลี่ยนบทบาท')) {
            icon = '<i class="fas fa-user-cog text-purple-500 mr-2"></i>';
            borderColor = 'border-purple-500';
        } else if (log.action.includes('รีเซ็ต')) {
            icon = '<i class="fas fa-sync-alt text-yellow-500 mr-2"></i>';
            borderColor = 'border-yellow-500';
        }
        
        // แสดงชื่อผู้ใช้และตำแหน่ง
        const userDisplay = log.userName ? `${log.userName} (${log.userRole})` : log.userRole;
        
        listItem.className = `text-sm text-gray-600 p-3 bg-white rounded-lg mb-2 shadow-sm border-l-4 ${borderColor} transition-all duration-300 hover:shadow-md`;
        listItem.innerHTML = `
            <div class="flex items-start">
                ${icon}
                <div class="flex-1">
                    <p class="font-bold text-gray-800">${userDisplay}</p>
                    <p class="mt-1">ได้${log.action}ของ <span class="font-bold text-indigo-600">${log.employeeName}</span> เป็น <span class="font-bold text-red-500">${log.newValue}</span></p>
                    <p class="text-xs text-gray-500 mt-1">${new Date(log.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `;
        
        // เพิ่ม animation เมื่อ log ใหม่ถูกเพิ่ม
        if (index === 0) {
            listItem.classList.add('animate-pulse');
            setTimeout(() => {
                listItem.classList.remove('animate-pulse');
            }, 2000);
        }
        
        logList.appendChild(listItem);
    });
}

// Function to save employee name to Firestore
async function saveEmployeeName(id, name) {
    await db.collection(`artifacts/${appId}/public/data/employees`).doc(id).update({ name });
}

// Function to toggle between different views
function toggleView(view) {
    dailyView.classList.add('hidden');
    monthlyKpiView.classList.add('hidden');
    employeeDetailView.classList.add('hidden');
    approvalView.classList.add('hidden');
    showKpiButton.classList.remove('hidden');
    showDailyButton.classList.remove('hidden');
    backToKpiButton.classList.add('hidden');
    
    if (view === 'daily') {
        dailyView.classList.remove('hidden');
        showDailyButton.classList.add('hidden');
        renderDailyTable();
        renderLogs();
        renderErrorTrendsChart();
        renderErrorDistributionChart();
        renderTopErrorEmployees();
        renderEmployeeComparisonChart();
    } else if (view === 'kpi') {
        const userRole = allRoles[userRoleIndex];
        if (!['SENIOR', 'SUPERVISOR', 'ADMIN'].includes(userRole)) {
            return;
        }
        monthlyKpiView.classList.remove('hidden');
        showKpiButton.classList.add('hidden');
        renderMonthlyKpiTable();
    } else if (view === 'detail') {
        employeeDetailView.classList.remove('hidden');
        showKpiButton.classList.add('hidden');
        showDailyButton.classList.add('hidden');
        backToKpiButton.classList.remove('hidden');
    } else if (view === 'approval') {
        approvalView.classList.remove('hidden');
        renderApprovalTable();
    }
}

// Function to render the daily tracking table
function renderDailyTable() {
    employeeTableBody.innerHTML = '';
    const searchTerm = employeeSearchInput.value.toLowerCase();
    const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm));
    
    if (filteredEmployees.length === 0) {
        employeeTableBody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-500">ไม่พบพนักงานที่ค้นหา</td></tr>`;
        return;
    }
    
    const isDailyEditable = ['CHECKER', 'SENIOR', 'SUPERVISOR', 'ADMIN'].includes(allRoles[userRoleIndex]);
    const canSeeModifiers = ['SENIOR', 'SUPERVISOR', 'ADMIN'].includes(allRoles[userRoleIndex]);
    
    filteredEmployees.forEach(emp => {
        const totalErrors = Object.values(emp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
        const row = document.createElement('tr');
        row.className = "bg-white hover:bg-gray-100 transition-colors";
        row.setAttribute('data-employee-id', emp.id);
        
        // Build the table row content
        let rowContent = `
            <td class="px-4 py-3 text-gray-900 border-b border-gray-200 font-medium text-lg">
                <input type="text" value="${emp.name}" data-id="${emp.id}"
                    class="employee-name-input bg-transparent border-none focus:outline-none focus:ring-0 w-full" ${isDailyEditable ? '' : 'disabled'}/>
            </td>
        `;
        
        rowContent += errorTypes.map(type => `
            <td class="px-4 py-3 border-b border-gray-200 text-center">
                <div class="error-cell group">
                    <span class="text-sm font-bold text-gray-800">${emp.errors[type.key]?.value || 0}</span>
                    ${canSeeModifiers ? `<span class="modifier-tooltip">แก้ไขล่าสุดโดย: ${emp.errors[type.key]?.modifier || 'N/A'}</span>` : ''}
                    <div class="button-group">
                        <button class="minus-error-btn bg-gray-300 text-gray-700 rounded-full w-6 h-6 text-lg font-bold shadow-sm hover:bg-gray-400"
                            data-id="${emp.id}" data-type="${type.key}" ${isDailyEditable ? '' : 'disabled'}>
                            -
                        </button>
                        <button class="add-error-btn bg-blue-500 text-white rounded-full w-8 h-8 text-xl font-bold shadow-md hover:bg-blue-600"
                            data-id="${emp.id}" data-type="${type.key}" ${isDailyEditable ? '' : 'disabled'}>
                            +
                        </button>
                    </div>
                </div>
            </td>
        `).join('');
        
        rowContent += `
            <td class="px-4 py-3 border-b border-gray-200 text-center">
                <div class="error-cell group">
                    <span class="text-sm font-bold text-gray-800">${emp.errors.correctPicks?.value || 0}</span>
                    ${canSeeModifiers ? `<span class="modifier-tooltip">แก้ไขล่าสุดโดย: ${emp.errors.correctPicks?.modifier || 'N/A'}</span>` : ''}
                    <div class="button-group">
                        <button class="minus-error-btn bg-gray-300 text-gray-700 rounded-full w-6 h-6 text-lg font-bold shadow-sm hover:bg-gray-400"
                            data-id="${emp.id}" data-type="correctPicks" ${isDailyEditable ? '' : 'disabled'}>
                            -
                        </button>
                        <button class="add-error-btn bg-green-500 text-white rounded-full w-8 h-8 text-xl font-bold shadow-md hover:bg-green-600"
                            data-id="${emp.id}" data-type="correctPicks" ${isDailyEditable ? '' : 'disabled'}>
                            +
                        </button>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3 border-b border-gray-200 text-center font-bold text-lg">${totalErrors}</td>
        `;
        
        row.innerHTML = rowContent;
        employeeTableBody.appendChild(row);
    });
    
    // Add event listeners to name input fields
    employeeTableBody.querySelectorAll('.employee-name-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const id = e.target.dataset.id;
            const employee = employees.find(emp => emp.id === id);
            employee.name = e.target.value;
            saveEmployeeName(id, e.target.value);
        });
    });
    
    employeeTableBody.querySelectorAll('.add-error-btn, .minus-error-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const type = e.target.dataset.type;
            const employee = employees.find(emp => emp.id === id);
            const userRole = allRoles[userRoleIndex];
            const typeName = errorTypes.find(t => t.key === type)?.name || type;
            
            if (!['CHECKER', 'SENIOR', 'SUPERVISOR', 'ADMIN'].includes(userRole)) {
                return;
            }
            
            if (e.target.classList.contains('add-error-btn')) {
                employee.errors[type] = employee.errors[type] || { value: 0, modifier: 'N/A' };
                employee.errors[type].value++;
                employee.errors[type].modifier = userRole;
                
                saveLog({
                    modifierRole: userRole,
                    employeeName: employee.name,
                    action: `เพิ่มความผิดพลาด "${typeName}"`,
                    newValue: employee.errors[type].value
                });
            } else {
                if (employee.errors[type]?.value > 0) {
                    employee.errors[type].value--;
                    employee.errors[type].modifier = userRole;
                    
                    saveLog({
                        modifierRole: userRole,
                        employeeName: employee.name,
                        action: `ลดความผิดพลาด "${typeName}"`,
                        newValue: employee.errors[type].value
                    });
                }
            }
            
            saveData();
            renderDailyTable();
            updateDashboardSummary();
            renderErrorDistributionChart();
            renderTopErrorEmployees();
            renderEmployeeComparisonChart();
        });
    });
}

// Function to render the monthly KPI report table
function renderMonthlyKpiTable() {
    kpiReportBody.innerHTML = '';
    const monthlyBills = parseFloat(monthlyBillsInput.value) || 0;
    
    const employeeWithMetrics = employees.map(emp => {
        const totalErrors = Object.values(emp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
        const pps = (monthlyBills > 0) ? ((totalErrors * 100) / monthlyBills).toFixed(2) : '0.00';
        
        let mostFrequentError = { name: 'ไม่มี', percentage: 0 };
        if (totalErrors > 0) {
            const errorCounts = Object.entries(emp.errors).filter(([key]) => key !== 'correctPicks');
            const topError = errorCounts.reduce((max, [key, error]) => error.value > max.count ? { key, count: error.value } : max, { key: null, count: -1 });
            const errorName = errorTypes.find(type => type.key === topError.key)?.name || topError.key;
            const percentage = ((topError.count / totalErrors) * 100).toFixed(0);
            mostFrequentError = { name: errorName, percentage: percentage };
        }
        
        return { ...emp, totalErrors, pps: parseFloat(pps), mostFrequentError };
    });
    
    employeeWithMetrics.sort((a, b) => b.totalErrors - a.totalErrors);
    
    employeeWithMetrics.forEach((emp, index) => {
        const canViewDetails = true; // In this test version, everyone can view details
        const rank = index + 1;
        const isTop3 = rank <= 3 && emp.totalErrors > 0;
        const rowClass = isTop3 ? 'bg-red-100 hover:bg-red-200 transition-colors' : 'bg-white hover:bg-gray-100 transition-colors';
        
        const row = document.createElement('tr');
        row.className = rowClass;
        row.innerHTML = `
            <td class="px-4 py-3 text-gray-900 border-b border-gray-200 font-medium text-lg">${emp.name}</td>
            <td class="px-4 py-3 text-gray-700 border-b border-gray-200 text-center text-lg">${emp.totalErrors}</td>
            <td class="px-4 py-3 text-red-500 border-b border-gray-200 text-center font-bold text-xl">${emp.pps}%</td>
            <td class="px-4 py-3 text-blue-600 border-b border-gray-200 text-center font-bold text-xl">${rank}</td>
            <td class="px-4 py-3 text-gray-700 border-b border-gray-200 text-center text-lg">${emp.mostFrequentError.name} (${emp.mostFrequentError.percentage}%)</td>
            <td class="px-4 py-3 text-center border-b border-gray-200">
                <button class="view-details-btn bg-purple-500 text-white font-bold text-sm py-2 px-4 rounded-lg shadow-md hover:bg-purple-600 transition-colors transform hover:scale-105" data-id="${emp.id}">
                    ดูรายละเอียด
                </button>
            </td>
        `;
        kpiReportBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    kpiReportBody.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            renderEmployeeDetailView(id);
            toggleView('detail');
        });
    });
}

// Function to render the approval table
async function renderApprovalTable() {
    approvalTableBody.innerHTML = '';
    
    // แสดงสถานะการโหลด
    const loadingRow = document.createElement('tr');
    loadingRow.innerHTML = `
        <td colspan="6" class="p-4 text-center">
            <div class="flex justify-center items-center">
                <div class="spinner mr-2"></div>
                <span>กำลังโหลดข้อมูล...</span>
            </div>
        </td>
    `;
    approvalTableBody.appendChild(loadingRow);
    
    try {
        // Get pending users from Firestore
        const usersSnapshot = await db.collection(`artifacts/${appId}/public/data/users`).where('status', '==', 'pending').get();
        
        // ลบสถานะการโหลด
        approvalTableBody.innerHTML = '';
        
        if (usersSnapshot.empty) {
            approvalTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">ไม่มีผู้ใช้ที่รอการอนุมัติ</td></tr>`;
            return;
        }
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            const row = document.createElement('tr');
            row.className = "bg-white hover:bg-gray-100 transition-colors";
            
            row.innerHTML = `
                <td class="px-4 py-3 text-gray-900 border-b border-gray-200 font-medium">${user.name}</td>
                <td class="px-4 py-3 text-gray-700 border-b border-gray-200">${user.email}</td>
                <td class="px-4 py-3 text-gray-700 border-b border-gray-200">${user.role}</td>
                <td class="px-4 py-3 border-b border-gray-200">
                    <span class="approval-badge approval-pending">รอการอนุมัติ</span>
                </td>
                <td class="px-4 py-3 text-gray-700 border-b border-gray-200">${new Date(user.createdAt.toDate()).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-center border-b border-gray-200">
                    <button class="approve-btn bg-green-500 text-white font-bold text-sm py-2 px-4 rounded-lg shadow-md hover:bg-green-600 transition-colors mr-2" data-id="${doc.id}">
                        อนุมัติ
                    </button>
                    <button class="reject-btn bg-red-500 text-white font-bold text-sm py-2 px-4 rounded-lg shadow-md hover:bg-red-600 transition-colors" data-id="${doc.id}">
                        ปฏิเสธ
                    </button>
                </td>
            `;
            
            approvalTableBody.appendChild(row);
        });
        
        // Add event listeners to buttons
        approvalTableBody.querySelectorAll('.approve-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.dataset.id;
                approveUser(userId, 'approved');
            });
        });
        
        approvalTableBody.querySelectorAll('.reject-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.dataset.id;
                approveUser(userId, 'rejected');
            });
        });
    } catch (error) {
        console.error('Error loading approval table:', error);
        approvalTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>`;
    }
}

// Function to approve or reject a user
async function approveUser(userId, status) {
    try {
        showToast('กำลังอัปเดตสถานะผู้ใช้...', 'info');
        
        await db.collection(`artifacts/${appId}/public/data/users`).doc(userId).update({ status });
        
        // ดึงข้อมูลผู้ใช้เพื่อแสดงในข้อความแจ้งเตือน
        const userDoc = await db.collection(`artifacts/${appId}/public/data/users`).doc(userId).get();
        const userName = userDoc.data().name;
        
        // บันทึก log
        saveLog({
            modifierRole: allRoles[userRoleIndex],
            employeeName: userName,
            action: `${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}ผู้ใช้`,
            newValue: status
        });
        
        // แสดงข้อความแจ้งเตือน
        showToast(`${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}ผู้ใช้สำเร็จ`, 'success');
        
        // Refresh the approval table
        renderApprovalTable();
    } catch (error) {
        console.error('Error updating user status:', error);
        showToast('เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้', 'error');
    }
}

// Function to handle the export of the KPI report
function exportKpiReport() {
    try {
        showToast('กำลังสร้างรายงาน...', 'info');
        
        const monthlyBills = parseFloat(monthlyBillsInput.value) || 0;
        const employeeWithMetrics = employees.map(emp => {
            const totalErrors = Object.values(emp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
            const pps = (monthlyBills > 0) ? ((totalErrors * 100) / monthlyBills).toFixed(2) : '0.00';
            
            let mostFrequentError = { name: 'ไม่มี', percentage: 0 };
            if (totalErrors > 0) {
                const errorCounts = Object.entries(emp.errors).filter(([key]) => key !== 'correctPicks');
                const topError = errorCounts.reduce((max, [key, error]) => error.value > max.count ? { key, count: error.value } : max, { key: null, count: -1 });
                const errorName = errorTypes.find(type => type.key === topError.key)?.name || topError.key;
                const percentage = ((topError.count / totalErrors) * 100).toFixed(0);
                mostFrequentError = { name: errorName, percentage: percentage };
            }
            
            return { ...emp, totalErrors, pps: parseFloat(pps), mostFrequentError };
        });
        
        employeeWithMetrics.sort((a, b) => b.totalErrors - a.totalErrors);
        
        let reportContent = 'รายงานสรุป KPI ประจำเดือน\n\n';
        reportContent += `จำนวนบิลประจำเดือน: ${monthlyBillsInput.value}\n`;
        reportContent += `วันที่ส่งออกรายงาน: ${new Date().toLocaleDateString()}\n\n`;
        reportContent += 'อันดับ\tชื่อพนักงาน\tรวมความผิดพลาด\tอัตราความผิดพลาด (%)\tความผิดพลาดสูงสุด\n';
        reportContent += '----------------------------------------------------------------------------------------------------\n';
        
        employeeWithMetrics.forEach((emp, index) => {
            const rank = index + 1;
            reportContent += `${rank}\t\t${emp.name}\t\t${emp.totalErrors}\t\t${emp.pps}%\t\t\t\t${emp.mostFrequentError.name} (${emp.mostFrequentError.percentage}%)\n`;
        });
        
        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `รายงาน_KPI_ประจำเดือน_${new Date().toISOString().split('T')[0]}.txt`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('ส่งออกรายงานสำเร็จ', 'success');
    } catch (error) {
        console.error('Error exporting report:', error);
        showToast('เกิดข้อผิดพลาดในการส่งออกรายงาน', 'error');
    }
}

// Event Listener for monthly bills input
monthlyBillsInput.addEventListener('input', () => {
    saveData();
    renderMonthlyKpiTable();
});

// Event Listener for reset button
resetButton.addEventListener('click', () => {
    showConfirmDialog(
        'ยืนยันการรีเซ็ตข้อมูล',
        'คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูล? ข้อมูลความผิดพลาดประจำเดือนทั้งหมดจะถูกลบอย่างถาวร',
        () => {
            resetMonthlyData();
        }
    );
});

// Function to reset monthly data
async function resetMonthlyData() {
    try {
        showToast('กำลังรีเซ็ตข้อมูล...', 'info');
        
        // Reset employee errors
        const batch = db.batch();
        employees.forEach(emp => {
            const empRef = db.collection(`artifacts/${appId}/public/data/employees`).doc(emp.id.toString());
            batch.update(empRef, {
                errors: {
                    wrongItem: { value: 0, modifier: 'N/A' },
                    overPicked: { value: 0, modifier: 'N/A' },
                    underPicked: { value: 0, modifier: 'N/A' },
                    wrongBatch: { value: 0, modifier: 'N/A' },
                    wrongRoute: { value: 0, modifier: 'N/A' },
                    cleanliness: { value: 0, modifier: 'N/A' },
                    correctPicks: { value: 0, modifier: 'N/A' }
                }
            });
        });
        
        // Reset monthly bills
        const billsRef = db.collection(`artifacts/${appId}/public/data/settings`).doc('monthlyBills');
        batch.set(billsRef, { value: 0 });
        
        await batch.commit();
        
        // Clear logs
        const logsSnapshot = await db.collection(`artifacts/${appId}/public/data/logs`).get();
        logsSnapshot.forEach(doc => {
            doc.ref.delete();
        });
        
        // Update UI
        monthlyBillsInput.value = 0;
        logs = [];
        
        // บันทึก log
        saveLog({
            modifierRole: allRoles[userRoleIndex],
            employeeName: 'ระบบ',
            action: 'รีเซ็ตข้อมูลประจำเดือน',
            newValue: '0'
        });
        
        confirmationModal.classList.remove('flex');
        confirmationModal.classList.add('hidden');
        
        showToast('รีเซ็ตข้อมูลสำเร็จ', 'success');
        
        // Reinitialize data
        initializeData();
        toggleView('daily');
    } catch (error) {
        console.error('Error resetting data:', error);
        showToast('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล', 'error');
    }
}

// Event Listener for confirm reset button
confirmResetButton.addEventListener('click', () => {
    resetMonthlyData();
});

// Event Listener for cancel reset button
cancelResetButton.addEventListener('click', () => {
    confirmationModal.classList.remove('flex');
    confirmationModal.classList.add('hidden');
});

// Event Listeners for view toggle buttons
showKpiButton.addEventListener('click', () => toggleView('kpi'));
showDailyButton.addEventListener('click', () => toggleView('daily'));
backToKpiButton.addEventListener('click', () => toggleView('kpi'));
changeRoleButton.addEventListener('click', switchRole);
document.getElementById('approval-btn').addEventListener('click', () => toggleView('approval'));

// Event Listener for Export Report button
exportButton.addEventListener('click', exportKpiReport);

// Event Listener for employee search input
employeeSearchInput.addEventListener('input', renderDailyTable);

// Event listeners for log search and filter
logSearch.addEventListener('input', filterLogs);
logFilter.addEventListener('change', filterLogs);

// Function to filter logs
function filterLogs() {
    const searchTerm = logSearch.value.toLowerCase();
    const filterType = logFilter.value;
    
    const filteredLogs = logs.filter(log => {
        const matchesSearch = !searchTerm || 
            (log.userName && log.userName.toLowerCase().includes(searchTerm)) ||
            (log.employeeName && log.employeeName.toLowerCase().includes(searchTerm)) ||
            (log.action && log.action.toLowerCase().includes(searchTerm)) ||
            (log.newValue && log.newValue.toLowerCase().includes(searchTerm));
            
        const matchesFilter = filterType === 'all' || 
            (log.action && log.action.includes(filterType));
            
        return matchesSearch && matchesFilter;
    });
    
    renderFilteredLogs(filteredLogs);
}

// Function to render filtered logs
function renderFilteredLogs(filteredLogs) {
    logList.innerHTML = '';
    
    if (filteredLogs.length === 0) {
        showEmptyState(logList, 'ไม่พบข้อมูลที่ตรงกับเงื่อนไข');
        return;
    }
    
    filteredLogs.forEach((log, index) => {
        // ... โค้ดเดิมสำหรับสร้างรายการ log ...
        const listItem = document.createElement('li');
        listItem.className = 'text-sm text-gray-600 p-3 bg-white rounded-lg mb-2 shadow-sm border-l-4 border-indigo-500 transition-all duration-300 hover:shadow-md';
        
        // กำหนดไอคอนตามประเภทของการกระทำ
        let icon = '<i class="fas fa-edit text-blue-500 mr-2"></i>';
        let borderColor = 'border-blue-500';
        
        if (log.action.includes('เพิ่ม')) {
            icon = '<i class="fas fa-plus-circle text-green-500 mr-2"></i>';
            borderColor = 'border-green-500';
        } else if (log.action.includes('ลด')) {
            icon = '<i class="fas fa-minus-circle text-red-500 mr-2"></i>';
            borderColor = 'border-red-500';
        } else if (log.action.includes('อนุมัติ')) {
            icon = '<i class="fas fa-user-check text-green-500 mr-2"></i>';
            borderColor = 'border-green-500';
        } else if (log.action.includes('ปฏิเสธ')) {
            icon = '<i class="fas fa-user-times text-red-500 mr-2"></i>';
            borderColor = 'border-red-500';
        } else if (log.action.includes('เปลี่ยนบทบาท')) {
            icon = '<i class="fas fa-user-cog text-purple-500 mr-2"></i>';
            borderColor = 'border-purple-500';
        } else if (log.action.includes('รีเซ็ต')) {
            icon = '<i class="fas fa-sync-alt text-yellow-500 mr-2"></i>';
            borderColor = 'border-yellow-500';
        }
        
        // แสดงชื่อผู้ใช้และตำแหน่ง
        const userDisplay = log.userName ? `${log.userName} (${log.userRole})` : log.userRole;
        
        listItem.className = `text-sm text-gray-600 p-3 bg-white rounded-lg mb-2 shadow-sm border-l-4 ${borderColor} transition-all duration-300 hover:shadow-md`;
        listItem.innerHTML = `
            <div class="flex items-start">
                ${icon}
                <div class="flex-1">
                    <p class="font-bold text-gray-800">${userDisplay}</p>
                    <p class="mt-1">ได้${log.action}ของ <span class="font-bold text-indigo-600">${log.employeeName}</span> เป็น <span class="font-bold text-red-500">${log.newValue}</span></p>
                    <p class="text-xs text-gray-500 mt-1">${new Date(log.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `;
        
        logList.appendChild(listItem);
    });
}

// Function to render the employee detail view
function renderEmployeeDetailView(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    const totalErrors = Object.values(employee.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (employee.errors.correctPicks?.value || 0);
    const pps = (monthlyBills > 0) ? ((totalErrors * 100) / monthlyBills).toFixed(2) : '0.00';
    
    let mostFrequentError = { name: 'ไม่มี', percentage: 0 };
    if (totalErrors > 0) {
        const errorCounts = Object.entries(emp.errors).filter(([key]) => key !== 'correctPicks');
        const topError = errorCounts.reduce((max, [key, error]) => error.value > max.count ? { key, count: error.value } : max, { key: null, count: -1 });
        const errorName = errorTypes.find(type => type.key === topError.key)?.name || topError.key;
        const percentage = ((topError.count / totalErrors) * 100).toFixed(0);
        mostFrequentError = { name: errorName, percentage: percentage };
    }
    
    document.getElementById('detail-employee-name').textContent = employee.name;
    document.getElementById('summary-total-errors').textContent = totalErrors;
    document.getElementById('summary-correct-picks').textContent = employee.errors.correctPicks?.value || 0;
    document.getElementById('summary-pps').textContent = `${pps}%`;
    document.getElementById('summary-most-frequent').textContent = `${mostFrequentError.name} (${mostFrequentError.percentage}%)`;
    
    // Mock data for the line chart (as a real-time log is not persistent in localStorage)
    const labels = ['วันที่ 1', 'วันที่ 2', 'วันที่ 3', 'วันที่ 4', 'วันที่ 5', 'วันที่ 6', 'วันที่ 7'];
    const mockErrors = [2, 1, 3, 2, 0, 1, 2]; // Example daily error data
    const mockCorrect = [50, 60, 55, 70, 80, 75, 90]; // Example daily correct picks data
    
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    const ctx1 = document.getElementById('performanceChart').getContext('2d');
    performanceChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนสินค้าที่จัดผิด',
                data: mockErrors,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                fill: false,
                tension: 0.1
            }, {
                label: 'จำนวนสินค้าที่จัดถูก',
                data: mockCorrect,
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (tooltipItems) => {
                            return `วันที่ ${tooltipItems[0].label.split(' ')[1]}`;
                        },
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'จำนวนครั้ง/ชิ้น'
                    }
                }
            }
        }
    });
    
    // Error Breakdown Doughnut Chart
    if (errorBreakdownChart) {
        errorBreakdownChart.destroy();
    }
    
    const errorData = errorTypes.map(type => employee.errors[type.key]?.value || 0);
    const errorLabels = errorTypes.map(type => type.name);
    const backgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
    ];
    
    const ctx2 = document.getElementById('errorBreakdownChart').getContext('2d');
    errorBreakdownChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: errorLabels,
            datasets: [{
                data: errorData,
                backgroundColor: backgroundColors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false,
                    text: 'สัดส่วนความผิดพลาด'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.raw !== null) {
                                label += context.raw;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
    
    // Render employee-specific log history
    const employeeLogs = logs.filter(log => log.employeeName === employee.name);
    employeeHistoryLog.innerHTML = '';
    
    if (employeeLogs.length > 0) {
        employeeLogs.forEach(log => {
            const listItem = document.createElement('li');
            listItem.className = 'text-sm text-gray-600 p-3 bg-white rounded-lg mb-2 shadow-sm';
            
            // กำหนดไอคอนตามประเภทของการกระทำ
            let icon = '<i class="fas fa-edit text-blue-500 mr-2"></i>';
            if (log.action.includes('เพิ่ม')) {
                icon = '<i class="fas fa-plus-circle text-green-500 mr-2"></i>';
            } else if (log.action.includes('ลด')) {
                icon = '<i class="fas fa-minus-circle text-red-500 mr-2"></i>';
            }
            
            listItem.innerHTML = `
                ${icon}
                <div class="flex-1">
                    <p class="font-bold text-gray-800">${log.userName} (${log.userRole})</p>
                    <p class="mt-1">ได้${log.action}ของ <span class="font-bold text-indigo-600">${log.employeeName}</span> เป็น <span class="font-bold text-red-500">${log.newValue}</span></p>
                    <p class="text-xs text-gray-500 mt-1">${new Date(log.timestamp).toLocaleString()}</p>
                </div>
            `;
            
            employeeHistoryLog.appendChild(listItem);
        });
    } else {
        employeeHistoryLog.innerHTML = '<li class="text-gray-500 p-2 text-center">ไม่มีประวัติการแก้ไข</li>';
    }
}

// Function to update dashboard summary
function updateDashboardSummary() {
    const totalEmployees = employees.length;
    const totalErrors = employees.reduce((sum, emp) => {
        return sum + Object.values(emp.errors).reduce((errorSum, error) => errorSum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
    }, 0);
    
    const monthlyBillsValue = parseFloat(monthlyBillsInput.value) || 0;
    const errorRate = monthlyBillsValue > 0 ? ((totalErrors * 100) / monthlyBillsValue).toFixed(2) : '0.00';
    
    let topErrorEmployee = '-';
    if (employees.length > 0) {
        const employeeWithMostErrors = employees.reduce((maxEmp, emp) => {
            const empErrors = Object.values(emp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
            const maxEmpErrors = Object.values(maxEmp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (maxEmp.errors.correctPicks?.value || 0);
            return empErrors > maxEmpErrors ? emp : maxEmp;
        }, employees[0]);
        
        topErrorEmployee = employeeWithMostErrors.name;
    }
    
    document.getElementById('total-employees').textContent = totalEmployees;
    document.getElementById('total-errors').textContent = totalErrors;
    document.getElementById('error-rate').textContent = `${errorRate}%`;
    document.getElementById('top-error-employee').textContent = topErrorEmployee;
}

// Function to render error trends chart
function renderErrorTrendsChart() {
    const ctx = document.getElementById('errorTrendsChart').getContext('2d');
    
    // สร้างข้อมูลตัวอย่างสำหรับ 7 วันล่าสุด
    const labels = [];
    const errorData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
        
        // สร้างข้อมูลสุ่มสำหรับตัวอย่าง
        errorData.push(Math.floor(Math.random() * 10) + 1);
    }
    
    // ทำลายกราฟเก่าถ้ามี
    if (errorTrendsChart) {
        errorTrendsChart.destroy();
    }
    
    // สร้างกราฟใหม่
    errorTrendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนความผิดพลาด',
                data: errorData,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวนครั้ง'
                    }
                }
            }
        }
    });
}

// Function to render error distribution chart
function renderErrorDistributionChart() {
    const ctx = document.getElementById('errorDistributionChart').getContext('2d');
    
    // คำนวณข้อมูลความผิดพลาดตามประเภท
    const errorCounts = {};
    errorTypes.forEach(type => {
        errorCounts[type.name] = employees.reduce((sum, emp) => {
            return sum + (emp.errors[type.key]?.value || 0);
        }, 0);
    });
    
    // ทำลายกราฟเก่าถ้ามี
    if (errorDistributionChart) {
        errorDistributionChart.destroy();
    }
    
    // สร้างกราฟใหม่
    errorDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(errorCounts),
            datasets: [{
                label: 'จำนวนความผิดพลาด',
                data: Object.values(errorCounts),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `จำนวน: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวนครั้ง'
                    }
                }
            }
        }
    });
}

// Function to render top error employees
function renderTopErrorEmployees() {
    const container = document.getElementById('top-error-employees');
    
    // คำนวณความผิดพลาดของพนักงานแต่ละคน
    const employeeErrors = employees.map(emp => {
        const totalErrors = Object.values(emp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
        return {
            name: emp.name,
            errors: totalErrors
        };
    });
    
    // เรียงลำดับตามความผิดพลาด
    employeeErrors.sort((a, b) => b.errors - a.errors);
    
    // แสดง 5 อันดับแรก
    container.innerHTML = '';
    
    for (let i = 0; i < Math.min(5, employeeErrors.length); i++) {
        const emp = employeeErrors[i];
        const div = document.createElement('div');
        div.className = 'flex items-center p-2 bg-white rounded-lg';
        
        // กำหนดสีตามอันดับ
        let badgeColor = 'bg-gray-200';
        if (i === 0) badgeColor = 'bg-yellow-200';
        else if (i === 1) badgeColor = 'bg-gray-300';
        else if (i === 2) badgeColor = 'bg-yellow-700 text-white';
        
        div.innerHTML = `
            <div class="${badgeColor} w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
                ${i + 1}
            </div>
            <div class="flex-1">
                <p class="font-medium">${emp.name}</p>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div class="bg-red-500 h-2 rounded-full" style="width: ${Math.min(100, (emp.errors / Math.max(1, employeeErrors[0].errors)) * 100)}%"></div>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold">${emp.errors}</p>
                <p class="text-xs text-gray-500">ครั้ง</p>
            </div>
        `;
        
        container.appendChild(div);
    }
}

// Function to render employee comparison chart
function renderEmployeeComparisonChart() {
    const ctx = document.getElementById('employeeComparisonChart').getContext('2d');
    
    // คำนวณความผิดพลาดของพนักงานแต่ละคน
    const employeeErrors = employees.map(emp => {
        const totalErrors = Object.values(emp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
        return {
            name: emp.name.split(' ')[0], // แสดงเฉพาะชื่อต้น
            errors: totalErrors
        };
    });
    
    // เรียงลำดับตามความผิดพลาด
    employeeErrors.sort((a, b) => b.errors - a.errors);
    
    // แสดง 10 อันดับแรก
    const topEmployees = employeeErrors.slice(0, 10);
    
    // ทำลายกราฟเก่าถ้ามี
    if (employeeComparisonChart) {
        employeeComparisonChart.destroy();
    }
    
    // สร้างกราฟใหม่
    employeeComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topEmployees.map(emp => emp.name),
            datasets: [{
                label: 'จำนวนความผิดพลาด',
                data: topEmployees.map(emp => emp.errors),
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return `จำนวน: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวนครั้ง'
                    }
                }
            }
        }
    });
}

// Function to fetch system stats
async function fetchSystemStats() {
    try {
        // ดึงข้อมูลผู้ใช้ทั้งหมด
        const usersSnapshot = await db.collection(`artifacts/${appId}/public/data/users`).get();
        const totalUsers = usersSnapshot.size;
        // Mock active users for today as we may not have permissions to userActivity collection
        const activeToday = 1;
        // ดึงข้อมูลการกระทำทั้งหมด
        const actionsSnapshot = await db.collection(`artifacts/${appId}/public/data/logs`).get();
        const totalActions = actionsSnapshot.size;
        
        // ดึงข้อมูลการกระทำวันนี้
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const actionsTodayQuery = await db.collection(`artifacts/${appId}/public/data/logs`)
            .where('timestamp', '>=', today)
            .where('timestamp', '<', tomorrow)
            .get();
        
        const actionsToday = actionsTodayQuery.size;
        
        // อัปเดต UI
        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('active-today').textContent = activeToday;
        document.getElementById('total-actions').textContent = totalActions;
        document.getElementById('actions-today').textContent = actionsToday;
    } catch (error) {
        console.error('Error fetching system stats:', error);
    }
}

// Function to render calendar
function renderCalendar() {
    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    calendarHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // ล้างวันที่เก่า
    calendarDays.innerHTML = '';
    
    // หาจำนวนวันในเดือน
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // หาวันแรกของเดือน
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    // เพิ่มวันที่ว่างในสัปดาห์แรก
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyDay = document.createElement('div');
        calendarDays.appendChild(emptyDay);
    }
    
    // เพิ่มวันที่ในเดือน
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'text-center p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors';
        
        // ตรวจสอบว่าเป็นวันนี้หรือไม่
        if (isCurrentMonth && day === today.getDate()) {
            dayElement.classList.add('bg-blue-500', 'text-white', 'font-bold');
        }
        
        // ตรวจสอบว่ามีกิจกรรมหรือไม่
        const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayEvents = events.filter(event => event.date === dateStr);
        
        if (dayEvents.length > 0) {
            dayElement.classList.add('relative');
            const indicator = document.createElement('div');
            indicator.className = 'absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-500 rounded-full';
            dayElement.appendChild(indicator);
        }
        
        dayElement.textContent = day;
        dayElement.addEventListener('click', () => showDayEvents(dateStr));
        
        calendarDays.appendChild(dayElement);
    }
    
    // แสดงกิจกรรมวันนี้
    renderTodayEvents();
}

// Function to render today's events
function renderTodayEvents() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    const dayEvents = events.filter(event => event.date === dateStr);
    
    todayEvents.innerHTML = '';
    
    if (dayEvents.length === 0) {
        todayEvents.innerHTML = '<li class="text-gray-500">ไม่มีกิจกรรมวันนี้</li>';
        return;
    }
    
    dayEvents.forEach(event => {
        const li = document.createElement('li');
        li.className = 'flex items-start p-2 bg-gray-100 rounded-lg';
        li.innerHTML = `
            <div class="bg-blue-500 text-white p-1 rounded-full mr-2">
                <i class="fas fa-calendar-day text-xs"></i>
            </div>
            <div>
                <p class="font-medium">${event.title}</p>
                <p class="text-sm text-gray-600">${event.time}</p>
            </div>
        `;
        todayEvents.appendChild(li);
    });
}

// Function to show day events
function showDayEvents(dateStr) {
    const dayEvents = events.filter(event => event.date === dateStr);
    
    if (dayEvents.length === 0) {
        showToast('ไม่มีกิจกรรมในวันนี้', 'info');
        return;
    }
    
    // สร้าง modal แสดงกิจกรรม
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50';
    
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full">
            <h3 class="text-xl font-bold text-gray-800 mb-4">กิจกรรมวันที่ ${formattedDate}</h3>
            <ul class="space-y-3">
                ${dayEvents.map(event => `
                    <li class="flex items-start p-3 bg-gray-100 rounded-lg">
                        <div class="bg-blue-500 text-white p-2 rounded-full mr-3">
                            <i class="fas fa-calendar-day"></i>
                        </div>
                        <div>
                            <p class="font-medium">${event.title}</p>
                            <p class="text-sm text-gray-600">${event.time}</p>
                            <p class="text-sm text-gray-600">${event.description}</p>
                        </div>
                    </li>
                `).join('')}
            </ul>
            <div class="mt-6 flex justify-end">
                <button class="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors" onclick="this.closest('.fixed').remove()">
                    ปิด
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Function to fetch events
async function fetchEvents() {
    try {
        const eventsSnapshot = await db.collection(`artifacts/${appId}/public/data/events`).get();
        events = eventsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                date: data.date,
                time: data.time,
                description: data.description
            };
        });
        
        renderCalendar();
    } catch (error) {
        console.error('Error fetching events:', error);
    }
}

// Event listeners for calendar navigation
prevMonthBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
});

// Function to fetch users for messaging
async function fetchUsersForMessaging() {
    try {
        const usersSnapshot = await db.collection(`artifacts/${appId}/public/data/users`).get();
        messageRecipient.innerHTML = '<option value="">เลือกผู้รับ...</option>';
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.status === 'approved' && doc.id !== currentUser.uid) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = user.name;
                messageRecipient.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error fetching users for messaging:', error);
    }
}

// Function to show message modal
function showMessageModal() {
    messageModal.classList.remove('hidden');
    messageModal.classList.add('flex');
    
    // ดึงข้อมูลผู้ใช้
    fetchUsersForMessaging();
}

// Function to hide message modal
function hideMessageModal() {
    messageModal.classList.add('hidden');
    messageModal.classList.remove('flex');
    
    // ล้างข้อมูลในฟอร์ม
    messageRecipient.value = '';
    messageContent.value = '';
}

// Function to send message
async function sendMessage() {
    const recipientId = messageRecipient.value;
    const content = messageContent.value;
    
    if (!recipientId || !content) {
        showToast('กรุณาเลือกผู้รับและพิมพ์ข้อความ', 'error');
        return;
    }
    
    try {
        const senderId = currentUser.uid;
        const senderName = currentUser.name;
        
        // บันทึกข้อความลง Firestore
        await db.collection(`artifacts/${appId}/public/data/messages`).add({
            senderId,
            senderName,
            recipientId,
            content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
        });
        
        // แสดงข้อความแจ้งเตือน
        showToast('ส่งข้อความสำเร็จ', 'success');
        
        // ซ่อน modal
        hideMessageModal();
        
        // บันทึก log
        saveLog({
            modifierRole: allRoles[userRoleIndex],
            employeeName: 'ระบบ',
            action: 'ส่งข้อความถึง',
            newValue: messageRecipient.options[messageRecipient.selectedIndex].text
        });
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('เกิดข้อผิดพลาดในการส่งข้อความ', 'error');
    }
}

// Event listeners for messaging
sendMessageButton.addEventListener('click', showMessageModal);
cancelMessageBtn.addEventListener('click', hideMessageModal);
sendMessageBtn.addEventListener('click', sendMessage);

// Function to toggle dark mode
function toggleDarkMode() {
    const body = document.body;
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    body.classList.toggle('dark-mode');
    
    // บันทึกการตั้งค่าลง localStorage
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // เปลี่ยนไอคอน
    if (isDarkMode) {
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Function to check dark mode setting
function checkDarkModeSetting() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Event listener for dark mode toggle
darkModeToggle.addEventListener('click', toggleDarkMode);

// Function to show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // กำหนดสีตามประเภทของข้อความ
    let bgColor = 'bg-blue-500';
    if (type === 'success') bgColor = 'bg-green-500';
    if (type === 'error') bgColor = 'bg-red-500';
    if (type === 'warning') bgColor = 'bg-yellow-500';
    
    toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center transform transition-all duration-300 translate-x-full`;
    
    // เพิ่มไอคอนตามประเภท
    let icon = '<i class="fas fa-info-circle mr-2"></i>';
    if (type === 'success') icon = '<i class="fas fa-check-circle mr-2"></i>';
    if (type === 'error') icon = '<i class="fas fa-exclamation-circle mr-2"></i>';
    if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle mr-2"></i>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    // แสดง toast
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 10);
    
    // ซ่อน toast หลังจาก 3 วินาที
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Function to show realtime notification
function showRealtimeNotification(logEntry) {
    const notificationContainer = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = 'bg-white rounded-lg shadow-lg p-4 mb-2 transform transition-all duration-300 translate-x-full';
    
    // กำหนดไอคอนตามประเภทของการกระทำ
    let icon = '<i class="fas fa-edit text-blue-500 mr-2"></i>';
    let bgColor = 'bg-blue-100';
    
    if (logEntry.action.includes('เพิ่ม')) {
        icon = '<i class="fas fa-plus-circle text-green-500 mr-2"></i>';
        bgColor = 'bg-green-100';
    } else if (logEntry.action.includes('ลด')) {
        icon = '<i class="fas fa-minus-circle text-red-500 mr-2"></i>';
        bgColor = 'bg-red-100';
    } else if (logEntry.action.includes('อนุมัติ')) {
        icon = '<i class="fas fa-user-check text-green-500 mr-2"></i>';
        bgColor = 'bg-green-100';
    } else if (logEntry.action.includes('ปฏิเสธ')) {
        icon = '<i class="fas fa-user-times text-red-500 mr-2"></i>';
        bgColor = 'bg-red-100';
    } else if (logEntry.action.includes('เปลี่ยนบทบาท')) {
        icon = '<i class="fas fa-user-cog text-purple-500 mr-2"></i>';
        bgColor = 'bg-purple-100';
    } else if (logEntry.action.includes('รีเซ็ต')) {
        icon = '<i class="fas fa-sync-alt text-yellow-500 mr-2"></i>';
        bgColor = 'bg-yellow-100';
    }
    
    // แสดงชื่อผู้ใช้และตำแหน่ง
    const userDisplay = logEntry.userName ? `${logEntry.userName}` : logEntry.userRole;
    
    notification.innerHTML = `
        <div class="flex items-start">
            <div class="${bgColor} p-2 rounded-full mr-3">
                ${icon}
            </div>
            <div class="flex-1">
                <p class="font-bold text-gray-800">${userDisplay}</p>
                <p class="text-sm text-gray-600">ได้${logEntry.action}</p>
                <p class="text-xs text-gray-500 mt-1">${new Date().toLocaleTimeString()}</p>
            </div>
            <button class="close-notification text-gray-400 hover:text-gray-600">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // แสดง notification
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 10);
    
    // ปิด notification เมื่อคลิกปุ่มปิด
    notification.querySelector('.close-notification').addEventListener('click', () => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    });
    
    // ปิด notification อัตโนมัติหลังจาก 5 วินาที
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notificationContainer.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Function to show confirm dialog
function showConfirmDialog(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full">
            <h3 class="text-xl font-bold text-gray-800 mb-4">${title}</h3>
            <p class="text-gray-600 mb-6">${message}</p>
            <div class="flex justify-end space-x-3">
                <button id="cancel-btn" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors">
                    ยกเลิก
                </button>
                <button id="confirm-btn" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    ยืนยัน
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('confirm-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        onConfirm();
    });
}

// Function to show empty state
function showEmptyState(container, message) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-center">
            <div class="text-gray-400 mb-4">
                <i class="fas fa-inbox text-5xl"></i>
            </div>
            <p class="text-gray-500 text-lg">${message}</p>
        </div>
    `;
}

// Function to validate data
function validateData() {
    let isValid = true;
    let errorMessage = '';
    
    // ตรวจสอบจำนวนบิล
    const monthlyBillsValue = parseFloat(monthlyBillsInput.value);
    if (isNaN(monthlyBillsValue) || monthlyBillsValue < 0) {
        isValid = false;
        errorMessage = 'จำนวนบิลต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0';
    }
    
    // ตรวจสอบข้อมูลพนักงาน
    employees.forEach(emp => {
        // ตรวจสอบชื่อพนักงาน
        if (!emp.name || emp.name.trim() === '') {
            isValid = false;
            errorMessage = 'พบพนักงานที่ไม่มีชื่อ';
        }
        
        // ตรวจสอบค่าความผิดพลาด
        Object.keys(emp.errors).forEach(errorKey => {
            const errorValue = emp.errors[errorKey]?.value || 0;
            if (isNaN(errorValue) || errorValue < 0) {
                isValid = false;
                errorMessage = `พบค่าความผิดพลาดที่ไม่ถูกต้องสำหรับพนักงาน ${emp.name}`;
            }
        });
    });
    
    return { isValid, errorMessage };
}

// Function to highlight employee change
function highlightEmployeeChange(empId) {
    const row = document.querySelector(`tr[data-employee-id="${empId}"]`);
    if (row) {
        row.classList.add('bg-yellow-100');
        setTimeout(() => {
            row.classList.remove('bg-yellow-100');
        }, 2000);
    }
}

// Function to highlight element change
function highlightElementChange(element) {
    element.classList.add('bg-yellow-100');
    setTimeout(() => {
        element.classList.remove('bg-yellow-100');
    }, 2000);
}

// Function to highlight new log
function highlightNewLog() {
    const firstLog = document.querySelector('#log-list li:first-child');
    if (firstLog) {
        firstLog.classList.add('animate-pulse');
        setTimeout(() => {
            firstLog.classList.remove('animate-pulse');
        }, 2000);
    }
}

// Function to setup realtime updates
function setupRealtimeUpdates() {
    // ตั้งค่าการติดตามการเปลี่ยนแปลงของข้อมูลพนักงาน
    db.collection(`artifacts/${appId}/public/data/employees`).onSnapshot(snapshot => {
        const changes = snapshot.docChanges();
        
        changes.forEach(change => {
            if (change.type === 'modified') {
                const empId = change.doc.id;
                const empData = change.doc.data();
                const empIndex = employees.findIndex(emp => emp.id === empId);
                
                if (empIndex !== -1) {
                    employees[empIndex] = {
                        id: empId,
                        name: empData.name,
                        errors: empData.errors || {}
                    };
                    
                    // แสดง animation เมื่อมีการเปลี่ยนแปลง
                    highlightEmployeeChange(empId);
                }
            }
        });
        
        // อัปเดต UI หากกำลังแสดงหน้าจอประจำวัน
        if (!dailyView.classList.contains('hidden')) {
            renderDailyTable();
            updateDashboardSummary();
            renderErrorDistributionChart();
            renderTopErrorEmployees();
            renderEmployeeComparisonChart();
        }
    });
    
    // ตั้งค่าการติดตามการเปลี่ยนแปลงของข้อมูลบิลประจำเดือน
    db.collection(`artifacts/${appId}/public/data/settings`).doc('monthlyBills').onSnapshot(doc => {
        monthlyBills = doc.exists ? doc.data().value : 0;
        monthlyBillsInput.value = monthlyBills;
        
        // แสดง animation เมื่อมีการเปลี่ยนแปลง
        highlightElementChange(monthlyBillsInput);
        
        // อัปเดต UI หากกำลังแสดงหน้าจอ KPI
        if (!monthlyKpiView.classList.contains('hidden')) {
            renderMonthlyKpiTable();
        }
    });
    
    // ตั้งค่าการติดตามการเปลี่ยนแปลงของข้อมูล logs
    db.collection(`artifacts/${appId}/public/data/logs`).orderBy('timestamp', 'desc').limit(50).onSnapshot(snapshot => {
        const changes = snapshot.docChanges();
        
        changes.forEach(change => {
            if (change.type === 'added') {
                const newLog = change.doc.data();
                logs.unshift(newLog);
                
                if (logs.length > 50) {
                    logs.pop();
                }
                
                // แสดง animation เมื่อมี log ใหม่
                highlightNewLog();
            }
        });
        
        // อัปเดต UI หากกำลังแสดงหน้าจอประจำวัน
        if (!dailyView.classList.contains('hidden')) {
            renderLogs();
        }
    });
}

// Function to initialize app
function initializeApp() {
    initializeData().then(async () => {
        setupRealtimeUpdates();
        updateDashboardSummary();
        try {
            await fetchSystemStats();
        } catch(e) {
            console.error("Could not fetch system stats:", e);
        }
        try {
            await fetchEvents();
        } catch(e) {
            console.error("Could not fetch events:", e);
        }
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    checkDarkModeSetting();
    try {
         if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await auth.signInWithCustomToken(__initial_auth_token);
        } else if (!auth.currentUser) {
            await auth.signInAnonymously();
        }
        
        // Add ADMIN user if not exists
        const adminEmail = "ADMIN@ADMIN.COM";
        const usersRef = db.collection(`artifacts/${appId}/public/data/users`);
        const adminQuery = await usersRef.where("email", "==", adminEmail).get();
        if (adminQuery.empty) {
            await usersRef.add({
                name: 'Admin',
                email: adminEmail,
                role: 'ADMIN',
                status: 'approved',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Admin user created');
        }
    } catch (error) {
        console.error("Initial sign-in failed:", error);
        showToast("การเชื่อมต่อฐานข้อมูลล้มเหลว", "error");
    }
});
