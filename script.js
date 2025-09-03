// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCYSFu1MJWkEZjayF-e8-uiiX1caCc2PVI",
    authDomain: "outbound-f9dff.firebaseapp.com",
    projectId: "outbound-f9dff",
    storageBucket: "outbound-f9dff.firebasestorage.app",
    messagingSenderId: "60363947536",
    appId: "1:60363947536:web:79c6581d5a8c2b9c1bd495",
    measurementId: "G-4SC1R235WY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Initial data for 14 employees
const defaultEmployeeData = [
    { id: 1, name: "คุณปราโมทย์ ชูบาล(โมทย์)" }, 
    { id: 2, name: "คุณจิตติศักดิ์ ตราชู(แจ็ค)" }, 
    { id: 3, name: "คุณวสุธร อุทัยธรรม(เบน)" }, 
    { id: 4, name: "คุณภัทรลักษณ์ เสสุตา (นีโน่)" }, 
    { id: 5, name: "คุณชัดชวาฬ เต็มศรี (ปุ๊กกี้)" }, 
    { id: 6, name: "คุณพีระวัฒน์ ราชพลแสน" },
    { id: 7, name: "คุณบัณฑิต คงเจริญรส(เทส)" },
    { id: 8, name: "คุณอนุวัฒน์ สะสม(แบงค์)" },
    { id: 9, name: "คุณณัฐพงษ์ พิมพ์สนิม(สาม)" },
    { id: 10, name: "คุณภานุ จันจุติ(นุ)" },
    { id: 11, name: "คุณชัยพร ชนะตั้งเจริญ(เอก)" },
    { id: 12, name: "คุณสุทธิภัทร กาวินำ(เจมส์)" },
    { id: 13, name: "คุณชูเดช แสงแก้วพะเนาว์ (เจมส์)" },
    { id: 14, name: "คุณอาทิตย์ชัย ยิ่งสุจริตพันธุ์(ทิว)" },
];

const allRoles = ['PICKING', 'CHECKER', 'SENIOR', 'SUPERVISOR', 'ADMIN'];
let userRoleIndex = 4; // Start with ADMIN role

// Names of error types
const errorTypes = [
    { key: "wrongItem", name: "จัดสินค้าผิด" },
    { key: "overPicked", name: "จัดสินค้าเกิน" },
    { key: "underPicked", name: "จัดสินค้าขาด" },
    { key: "wrongBatch", name: "Batch ไม่ตรง" },
    { key: "wrongRoute", name: "จัดไม่ตรง Route" },
    { key: "cleanliness", name: "ความสะอาด" },
];

// DOM elements
const loginSection = document.getElementById('login-section');
const mainApp = document.getElementById('main-app');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const pendingApproval = document.getElementById('pending-approval');
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
const aiModal = document.getElementById('ai-modal');
const closeAiModal = document.getElementById('close-ai-modal');
const aiContent = document.getElementById('ai-content');
const aiAnalysisBtn = document.getElementById('ai-analysis-btn');
const aiInsights = document.getElementById('ai-insights');
const createAdminBtn = document.getElementById('create-admin-btn');
const autoLoginBtn = document.getElementById('auto-login-btn');

// Variables for current data
let employees;
let monthlyBills;
let performanceChart = null; // Chart.js instance for line graph
let errorBreakdownChart = null; // Chart.js instance for doughnut chart
let logs = [];
let currentUser = null;

// Auto-login function for admin
async function autoLogin() {
    const email = "admin@admin.com";
    const password = "000000";
    
    try {
        // Try to sign in with admin credentials
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        
        if (!userDoc.exists) {
            // Create admin user in Firestore if not exists
            await db.collection('users').doc(userCredential.user.uid).set({
                name: "Administrator",
                email: email,
                role: "ADMIN",
                status: "approved",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Show main app
        loginSection.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        // Set user role
        userRoleIndex = allRoles.indexOf("ADMIN");
        
        // Initialize data
        initializeData();
        toggleView('daily');
    } catch (error) {
        console.error("Auto-login error:", error);
        alert("เกิดข้อผิดพลาดในการล็อกอินอัตโนมัติ: " + error.message);
    }
}

// Function to create the first admin user
async function createFirstAdmin() {
    const email = "admin@admin.com";
    const password = "000000";
    
    try {
        // Check if admin already exists
        const usersSnapshot = await db.collection('users').where('email', '==', email).get();
        
        if (usersSnapshot.empty) {
            // Create user in Firebase Authentication
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Add user to Firestore with admin role
            await db.collection('users').doc(user.uid).set({
                name: "Administrator",
                email: email,
                role: "ADMIN",
                status: "approved",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert("สร้างแอดมินสำเร็จ! อีเมล: " + email + " รหัสผ่าน: " + password);
            createAdminBtn.style.display = "none";
        } else {
            alert("แอดมินมีอยู่แล้วในระบบ");
            createAdminBtn.style.display = "none";
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการสร้างแอดมิน:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

// Check if there are any users in the system
async function checkIfAdminExists() {
    try {
        const usersSnapshot = await db.collection('users').limit(1).get();
        
        if (usersSnapshot.empty) {
            // No users exist, show create admin button
            createAdminBtn.style.display = "block";
            autoLoginBtn.style.display = "block";
            console.log("No users found, showing create admin button");
        } else {
            // Users exist, hide create admin button
            createAdminBtn.style.display = "none";
            autoLoginBtn.style.display = "block";
            console.log("Users found, hiding create admin button");
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการตรวจสอบผู้ใช้:", error);
        // If there's an error (like permission denied), assume no users exist
        createAdminBtn.style.display = "block";
        autoLoginBtn.style.display = "block";
        console.log("Error checking users, showing create admin button");
    }
}

// Check auth state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (userData && userData.status === 'approved') {
            // User is approved, show main app
            loginSection.classList.add('hidden');
            mainApp.classList.remove('hidden');
            
            // Set user role
            userRoleIndex = allRoles.indexOf(userData.role);
            if (userRoleIndex === -1) userRoleIndex = 0; // Default to PICKING
            
            // Initialize data
            initializeData();
            toggleView('daily');
        } else if (userData && userData.status === 'pending') {
            // User is pending approval
            loginForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            pendingApproval.classList.remove('hidden');
        } else {
            // User not found or other status
            auth.signOut();
        }
    } else {
        // No user is signed in
        loginSection.classList.remove('hidden');
        mainApp.classList.add('hidden');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        pendingApproval.classList.add('hidden');
        
        // Check if we need to show the create admin button
        checkIfAdminExists();
    }
});

// Login form submission
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        console.error(error);
    }
});

// Register form submission
document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const termsAccepted = document.getElementById('reg-terms').checked;
    
    if (!name || !email || !password || !termsAccepted) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }
    
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Add user to Firestore with pending status
        await db.collection('users').doc(user.uid).set({
            name,
            email,
            role,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show pending approval screen
        loginForm.classList.add('hidden');
        registerForm.classList.add('hidden');
        pendingApproval.classList.remove('hidden');
        
    } catch (error) {
        alert('เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + error.message);
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
    auth.signOut();
});

document.getElementById('logout-main-btn').addEventListener('click', () => {
    auth.signOut();
});

// Create admin button
createAdminBtn.addEventListener('click', createFirstAdmin);

// Auto login button
autoLoginBtn.addEventListener('click', autoLogin);

// Function to initialize data from Firestore
async function initializeData() {
    // Get employees from Firestore
    const employeesSnapshot = await db.collection('employees').get();
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
        // Create default employees if none exist
        employees = defaultEmployeeData.map(emp => ({ ...emp, errors: {} }));
        for (const emp of employees) {
            await db.collection('employees').doc(emp.id.toString()).set({
                name: emp.name,
                errors: {}
            });
        }
    }
    
    // Get monthly bills from Firestore
    const billsDoc = await db.collection('settings').doc('monthlyBills').get();
    monthlyBills = billsDoc.exists ? billsDoc.data().value : 0;
    monthlyBillsInput.value = monthlyBills;
    
    // Get logs from Firestore
    const logsSnapshot = await db.collection('logs').orderBy('timestamp', 'desc').limit(50).get();
    logs = logsSnapshot.docs.map(doc => doc.data());
    
    updateUIBasedOnRole();
    renderLogs();
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

// Function to switch roles
function switchRole() {
    userRoleIndex = (userRoleIndex + 1) % allRoles.length;
    updateUIBasedOnRole();
    // After switching roles, re-render the current view to update permissions
    if (!dailyView.classList.contains('hidden')) {
        renderDailyTable();
    } else if (!monthlyKpiView.classList.contains('hidden')) {
        renderMonthlyKpiTable();
    }
}

// Function to save error data to Firestore
async function saveData() {
    const batch = db.batch();
    
    employees.forEach(emp => {
        const empRef = db.collection('employees').doc(emp.id.toString());
        batch.update(empRef, { errors: emp.errors });
    });
    
    const billsRef = db.collection('settings').doc('monthlyBills');
    batch.set(billsRef, { value: parseInt(monthlyBillsInput.value) || 0 });
    
    await batch.commit();
}

// Function to save a log entry to Firestore
async function saveLog(logEntry) {
    // Add to Firestore
    await db.collection('logs').add({
        ...logEntry,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update local logs
    logs.unshift(logEntry);
    if (logs.length > 50) {
        logs.pop();
    }
    
    renderLogs();
}

// Function to render the log list
function renderLogs() {
    logList.innerHTML = '';
    logs.forEach(log => {
        const listItem = document.createElement('li');
        listItem.className = 'text-sm text-gray-600';
        listItem.innerHTML = `
            <span class="font-bold text-gray-800">${log.modifierRole}</span> ได้${log.action}ของ 
            <span class="font-bold text-indigo-600">${log.employeeName}</span> เป็น <span class="font-bold text-red-500">${log.newValue}</span> 
            เมื่อ <span class="text-xs text-gray-500">${new Date(log.timestamp).toLocaleString()}</span>
        `;
        logList.appendChild(listItem);
    });
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
        });
    });
}

// Function to save employee name to Firestore
async function saveEmployeeName(id, name) {
    await db.collection('employees').doc(id).update({ name });
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
    
    // Get pending users from Firestore
    const usersSnapshot = await db.collection('users').where('status', '==', 'pending').get();
    
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
}

// Function to approve or reject a user
async function approveUser(userId, status) {
    try {
        await db.collection('users').doc(userId).update({ status });
        
        // Send email notification (in a real app, this would be done via a cloud function)
        alert(`ผู้ใช้ถูก${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}เรียบร้อยแล้ว`);
        
        // Refresh the approval table
        renderApprovalTable();
    } catch (error) {
        console.error('Error updating user status:', error);
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะผู้ใช้');
    }
}

// Function to handle the export of the KPI report
function exportKpiReport() {
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
    reportContent += `จำนวนบิลประจำเดือน: ${monthlyBillsInput.value}\n\n`;
    reportContent += 'อันดับ\tชื่อพนักงาน\tรวมความผิดพลาด\tอัตราความผิดพลาด (%)\tความผิดพลาดสูงสุด\n';
    reportContent += '----------------------------------------------------------------------------------------------------\n';
    
    employeeWithMetrics.forEach((emp, index) => {
        const rank = index + 1;
        reportContent += `${rank}\t\t${emp.name}\t\t${emp.totalErrors}\t\t${emp.pps}%\t\t\t\t${emp.mostFrequentError.name} (${emp.mostFrequentError.percentage}%)\n`;
    });
    
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'รายงาน_KPI_ประจำเดือน.txt';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to render the employee detail view
function renderEmployeeDetailView(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    const totalErrors = Object.values(employee.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (employee.errors.correctPicks?.value || 0);
    const pps = (monthlyBills > 0) ? ((totalErrors * 100) / monthlyBills).toFixed(2) : '0.00';
    
    let mostFrequentError = { name: 'ไม่มี', percentage: 0 };
    if (totalErrors > 0) {
        const errorCounts = Object.entries(employee.errors).filter(([key]) => key !== 'correctPicks');
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
    
    // Generate AI insights
    generateAIInsights(employee);
    
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
            listItem.className = 'text-sm text-gray-600';
            listItem.innerHTML = `
                <span class="font-bold text-gray-800">${log.modifierRole}</span> ได้${log.action}ของ 
                <span class="font-bold text-indigo-600">${log.employeeName}</span> เป็น <span class="font-bold text-red-500">${log.newValue}</span> 
                เมื่อ <span class="text-xs text-gray-500">${new Date(log.timestamp).toLocaleString()}</span>
            `;
            employeeHistoryLog.appendChild(listItem);
        });
    } else {
        employeeHistoryLog.innerHTML = '<li class="text-gray-500">ไม่มีประวัติการแก้ไข</li>';
    }
}

// Function to generate AI insights for an employee
async function generateAIInsights(employee) {
    // Prepare data for AI analysis
    const errorData = errorTypes.map(type => ({
        type: type.name,
        count: employee.errors[type.key]?.value || 0
    }));
    
    const totalErrors = errorData.reduce((sum, item) => sum + item.count, 0);
    const correctPicks = employee.errors.correctPicks?.value || 0;
    
    // Create prompt for AI
    const prompt = `
    ฉันมีข้อมูลความผิดพลาดของพนักงานจัดสินค้าคนหนึ่ง ดังนี้:
    
    ชื่อพนักงาน: ${employee.name}
    จำนวนความผิดพลาดทั้งหมด: ${totalErrors} ครั้ง
    จำนวนการจัดสินค้าที่ถูกต้อง: ${correctPicks} ครั้ง
    
    ข้อมูลความผิดพลาดแยกตามประเภท:
    ${errorData.map(item => `- ${item.type}: ${item.count} ครั้ง`).join('\n')}
    
    กรุณาวิเคราะห์ข้อมูลนี้และให้คำแนะนำในการปรับปรุงประสิทธิภาพการทำงานของพนักงานคนนี้ โดยเน้นที่:
    1. ประเภทความผิดพลาดที่เกิดขึ้นบ่อยที่สุด
    2. แนวทางในการลดความผิดพลาดประเภทนั้นๆ
    3. ข้อเสนอแนะในการฝึกอบรมเพิ่มเติม
    4. การประเมินโดยรวมของพนักงาน
    
    กรุณาตอบเป็นภาษาไทยและจัดรูปแบบให้อ่านง่าย
    `;
    
    // Show loading state
    aiInsights.innerHTML = `
        <p class="mb-3">กำลังวิเคราะห์ข้อมูล...</p>
        <div class="flex justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    `;
    
    try {
        // Call Gemini AI API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyB3PCMRQE_QobI_fnO11299hoWlKCurksE`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Display AI insights
        aiInsights.innerHTML = `
            <div class="prose max-w-none">
                ${aiResponse.split('\n').map(line => `<p class="mb-2">${line}</p>`).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error calling AI API:', error);
        aiInsights.innerHTML = `
            <p class="text-red-500">เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล กรุณาลองใหม่อีกครั้ง</p>
        `;
    }
}

// Function to generate comprehensive AI analysis
async function generateComprehensiveAIAnalysis() {
    // Prepare data for AI analysis
    const employeeData = employees.map(emp => {
        const totalErrors = Object.values(emp.errors).reduce((sum, error) => sum + (error.value || 0), 0) - (emp.errors.correctPicks?.value || 0);
        const correctPicks = emp.errors.correctPicks?.value || 0;
        
        return {
            name: emp.name,
            totalErrors,
            correctPicks,
            errorTypes: errorTypes.map(type => ({
                type: type.name,
                count: emp.errors[type.key]?.value || 0
            }))
        };
    });
    
    // Create prompt for AI
    const prompt = `
    ฉันมีข้อมูลความผิดพลาดของพนักงานจัดสินค้าในคลังสินค้า ดังนี้:
    
    ข้อมูลพนักงานทั้งหมด:
    ${employeeData.map(emp => `
    - ชื่อ: ${emp.name}
      ความผิดพลาดทั้งหมด: ${emp.totalErrors} ครั้ง
      การจัดสินค้าที่ถูกต้อง: ${emp.correctPicks} ครั้ง
      ข้อมูลความผิดพลาดแยกตามประเภท:
      ${emp.errorTypes.map(item => `  - ${item.type}: ${item.count} ครั้ง`).join('\n')}
    `).join('\n')}
    
    จำนวนบิลประจำเดือน: ${monthlyBillsInput.value}
    
    กรุณาวิเคราะห์ข้อมูลนี้และให้คำแนะนำในการปรับปรุงประสิทธิภาพการทำงานโดยรวม โดยเน้นที่:
    1. พนักงานที่มีประสิทธิภาพสูงสุดและต่ำสุด
    2. ประเภทความผิดพลาดที่เกิดขึ้นบ่อยที่สุดในทีมงาน
    3. แนวทางในการลดความผิดพลาดโดยรวม
    4. ข้อเสนอแนะในการฝึกอบรมเพิ่มเติมสำหรับทีมงาน
    5. การประเมินโดยรวมของทีมงานและแนวโน้ม
    
    กรุณาตอบเป็นภาษาไทยและจัดรูปแบบให้อ่านง่าย
    `;
    
    // Show loading state
    aiContent.innerHTML = `
        <div class="flex justify-center items-center h-40">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    `;
    
    try {
        // Call Gemini AI API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyB3PCMRQE_QobI_fnO11299hoWlKCurksE`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
        
        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        // Display AI insights
        aiContent.innerHTML = `
            <div class="prose max-w-none">
                ${aiResponse.split('\n').map(line => `<p class="mb-3">${line}</p>`).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error calling AI API:', error);
        aiContent.innerHTML = `
            <p class="text-red-500">เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล กรุณาลองใหม่อีกครั้ง</p>
        `;
    }
}

// Event Listener for monthly bills input
monthlyBillsInput.addEventListener('input', () => {
    saveData();
    renderMonthlyKpiTable();
});

// Event Listener for reset button
resetButton.addEventListener('click', () => {
    confirmationModal.classList.remove('hidden');
    confirmationModal.classList.add('flex');
});

// Event Listener for confirm reset button
confirmResetButton.addEventListener('click', async () => {
    try {
        // Reset employee errors
        const batch = db.batch();
        employees.forEach(emp => {
            const empRef = db.collection('employees').doc(emp.id.toString());
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
        const billsRef = db.collection('settings').doc('monthlyBills');
        batch.set(billsRef, { value: 0 });
        
        await batch.commit();
        
        // Clear logs
        const logsSnapshot = await db.collection('logs').get();
        logsSnapshot.forEach(doc => {
            doc.ref.delete();
        });
        
        // Update UI
        monthlyBillsInput.value = 0;
        logs = [];
        
        confirmationModal.classList.remove('flex');
        confirmationModal.classList.add('hidden');
        
        // Reinitialize data
        initializeData();
        toggleView('daily');
    } catch (error) {
        console.error('Error resetting data:', error);
        alert('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล');
    }
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

// Event Listener for AI analysis button
aiAnalysisBtn.addEventListener('click', () => {
    aiModal.classList.remove('hidden');
    aiModal.classList.add('flex');
    generateComprehensiveAIAnalysis();
});

// Event Listener for closing AI modal
closeAiModal.addEventListener('click', () => {
    aiModal.classList.remove('flex');
    aiModal.classList.add('hidden');
});
