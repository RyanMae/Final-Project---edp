// --- EVENT-DRIVEN PROGRAMMING PROJECT: GearVault ---
// Group 3 | 31-ITE-07

document.addEventListener('DOMContentLoaded', () => {
    // Current Logged-in User State
    const THEME_KEY = 'gearVault_settings';
    const MAX_ACTIVITIES = 30;

    function readStorage(key, fallback = null) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function loadUsers() {
        const users = readStorage('gearVault_users', []);
        return Array.isArray(users) ? users : [];
    }

    function persistUsers(users) {
        try {
            localStorage.setItem('gearVault_users', JSON.stringify(users));
            return true;
        } catch (e) {
            alert('Storage is full. Remove large uploaded images or export a backup, then try again.');
            return false;
        }
    }

    function persistSession() {
        try {
            localStorage.setItem('gearVault_currentUser', JSON.stringify(currentUser));
        } catch (e) {
            alert('Storage is full. Remove large uploaded images or export a backup, then try again.');
        }
    }

    let currentUser = readStorage('gearVault_currentUser');
    // Remember the email the session was loaded with so profile edits can update
    // the matching account record instead of creating a duplicate one.
    let currentUserKey = currentUser ? currentUser.email : null;

    // DOM Elements - Navigation & Views
    const sidebarNav = document.getElementById('sidebar-nav');
    const navLinks = document.querySelectorAll('.nav-link');
    const viewSections = document.querySelectorAll('.view-section');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');

    // Auth DOM Elements
    const loginBox = document.getElementById('login-box');
    const signupBox = document.getElementById('signup-box');
    const authOverlay = document.getElementById('landing-auth');
    const closeAuthBtn = document.getElementById('close-auth-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const toSignupLink = document.getElementById('to-signup');
    const toLoginLink = document.getElementById('to-login');
    const logoutBtn = document.getElementById('logout-btn');
    let authReturnFocus = null;

    // App DOM Elements
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const gearModal = document.getElementById('gear-modal');
    const gearForm = document.getElementById('gear-form');
    const inventoryTableBody = document.getElementById('inventory-table-body');
    const wishlistGrid = document.getElementById('wishlist-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const clearSearchBtn = document.getElementById('clear-search');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const settingsClearBtn = document.getElementById('settings-clear-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const notificationsToggle = document.getElementById('notifications-toggle');
    const exportBtn = document.getElementById('export-btn');
    const saveAccountBtn = document.getElementById('save-account-btn');
    const moveAllInventoryBtn = document.getElementById('move-all-inventory-btn');

    // Projects & Tasks DOM Elements
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const projectForm = document.getElementById('project-form');
    const projectNameInput = document.getElementById('project-name-input');

    // Build & Audio Tools DOM Elements
    const psuCapacityInput = document.getElementById('psu-capacity-input');
    const savePsuBtn = document.getElementById('save-psu-btn');
    const enclosureForm = document.getElementById('enclosure-form');
    const enclosureResult = document.getElementById('enclosure-result');

    // Keep the activity log available even for accounts saved by older versions
    function logActivity(message) {
        if (!currentUser) return;
        if (!Array.isArray(currentUser.activities)) currentUser.activities = [];
        currentUser.activities = [message, ...currentUser.activities].slice(0, MAX_ACTIVITIES);
    }

    // Escape user-supplied text before it is written with innerHTML
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function loadSettings() {
        const settings = readStorage(THEME_KEY, {});
        return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
    }

    function saveSettings(settings) {
        try {
            localStorage.setItem(THEME_KEY, JSON.stringify(settings));
        } catch (e) {
            // Preferences are optional; the app still works if storage is full.
        }
    }

    function notificationsEnabled() {
        return loadSettings().notifications !== false;
    }

    function notify(message) {
        if (!notificationsEnabled()) return;
        const stack = document.getElementById('toast-stack');
        if (!stack) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        stack.appendChild(toast);
        window.setTimeout(() => {
            toast.classList.add('is-leaving');
            window.setTimeout(() => toast.remove(), 250);
        }, 2600);
    }

    // Restore the saved theme and notification preferences on startup
    function restoreTheme() {
        const settings = loadSettings();
        const isDark = settings.darkMode === true;
        document.body.classList.toggle('dark-mode', isDark);
        darkModeToggle.checked = isDark;
        notificationsToggle.checked = settings.notifications !== false;
    }

    // Loads the application and initializes its features
    function init() {
        restoreTheme();
        checkAuthState();
    }

    // Initialize UI Based on Auth State
    function checkAuthState() {
        document.body.classList.toggle('auth-page', !currentUser);
        if (currentUser) {
            closeAuthDialog(false);
            if (!currentUser.psuCapacity) currentUser.psuCapacity = 650;
            currentUserKey = currentUser.email;
            sidebarNav.style.display = 'flex';
            loginView.classList.remove('active');
            dashboardView.classList.add('active');
            navLinks.forEach(link => link.classList.toggle('active', link.dataset.target === 'dashboard-view'));

            document.getElementById('settings-name').value = currentUser.name || '';
            document.getElementById('settings-email').value = currentUser.email || '';
            document.getElementById('user-display-name').textContent = currentUser.name || currentUser.email;
            document.getElementById('sidebar-user-name').textContent = currentUser.name || currentUser.email;
            document.getElementById('account-initial').textContent = (currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase();
            psuCapacityInput.value = currentUser.psuCapacity;

            renderAll();
        } else {
            currentUserKey = null;
            sidebarNav.style.display = 'none';
            navLinks.forEach(link => link.classList.remove('active'));
            viewSections.forEach(sec => sec.classList.remove('active'));
            loginView.classList.add('active');
            closeAuthDialog(false);
        }
    }

    function showAuthMode(mode) {
        authOverlay.dataset.mode = mode;
        const box = mode === 'signup' ? signupBox : loginBox;
        const field = mode === 'signup'
            ? document.getElementById('signup-name')
            : document.getElementById('login-email');
        box.classList.add('is-highlighted');
        window.setTimeout(() => box.classList.remove('is-highlighted'), 900);
        window.requestAnimationFrame(() => field.focus({ preventScroll: true }));
    }

    function openAuthDialog(mode, trigger) {
        authReturnFocus = trigger;
        authOverlay.classList.add('open');
        authOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('auth-open');
        showAuthMode(mode);
    }

    function closeAuthDialog(restoreFocus = true) {
        authOverlay.classList.remove('open');
        authOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('auth-open');
        if (restoreFocus && authReturnFocus) authReturnFocus.focus();
        authReturnFocus = null;
    }

    // Switch forms inside the open dialog without showing both at once.
    toSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthMode('signup');
    });

    toLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthMode('login');
    });

    // Landing actions open the selected form.
    const heroLoginBtn = document.getElementById('hero-login-btn');
    const heroSignupBtn = document.getElementById('hero-signup-btn');

    heroLoginBtn.addEventListener('click', (e) => {
        openAuthDialog('login', e.currentTarget);
    });

    heroSignupBtn.addEventListener('click', (e) => {
        openAuthDialog('signup', e.currentTarget);
    });

    closeAuthBtn.addEventListener('click', () => closeAuthDialog());

    authOverlay.addEventListener('click', (e) => {
        if (e.target === authOverlay) closeAuthDialog();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authOverlay.classList.contains('open')) {
            closeAuthDialog();
        }
    });

    // Signup Form Event
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-pass').value;

        let users = loadUsers();
        if (users.some(u => u.email === email)) {
            alert('An account with this email already exists.');
            return;
        }

        const newUser = {
            name,
            email,
            password,
            psuCapacity: 650,
            items: [],
            tasks: [],
            projects: [],
            activities: []
        };

        users.push(newUser);
        if (!persistUsers(users)) return;

        currentUser = newUser;
        persistSession();
        signupForm.reset();
        checkAuthState();
        notify(`Welcome to GearVault, ${name}!`);
    });

    // Login Form Event
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const identifier = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-pass').value;

        const users = loadUsers();
        const user = users.find(u => (u.email === identifier || u.name === identifier) && u.password === password);

        if (!user) {
            alert('Invalid email/username or password.');
            return;
        }

        currentUser = user;
        persistSession();
        loginForm.reset();
        checkAuthState();
        notify(`Welcome back, ${user.name || user.email}!`);
    });

    // Logout Event
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentUser = null;
        localStorage.removeItem('gearVault_currentUser');
        checkAuthState();
    });

    // Navigation Event Handling
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.id === 'logout-btn') return;
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            viewSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });
            renderAll();
        });
    });

    // Modal Event Handling
    function openGearForm() {
        document.getElementById('modal-title').textContent = 'Add New Gear';
        gearForm.reset();
        document.getElementById('gear-id').value = '';
        gearImageInput.value = '';
        updateGearImagePreview('');
        gearModal.classList.add('open');
        document.body.classList.add('gear-modal-open');
        requestAnimationFrame(() => document.getElementById('gear-name').focus());
    }

    openModalBtn.addEventListener('click', openGearForm);

    document.querySelectorAll('[data-dashboard-action]').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.dashboardAction;
            const target = {
                'create-project': 'projects-view',
                'open-tools': 'builder-tools-view',
                'view-analytics': 'analytics-view',
                'view-wishlist': 'wishlist-view'
            }[action];

            if (action === 'add-gear') openGearForm();
            if (action === 'marketplace') {
                document.querySelector('.featured-widget').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (target) {
                document.querySelector(`.nav-link[data-target="${target}"]`).click();
                if (action === 'create-project') projectNameInput.focus();
            }
        });
    });

    function closeModal() {
        gearModal.classList.remove('open');
        document.body.classList.remove('gear-modal-open');
    }
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    gearModal.addEventListener('click', (event) => {
        if (event.target === gearModal) closeModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && gearModal.classList.contains('open')) closeModal();
    });

    // Form Submit / Validation Event
    gearForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('gear-id').value;
        const name = document.getElementById('gear-name').value.trim();
        const category = document.getElementById('gear-category').value;
        const price = parseFloat(document.getElementById('gear-price').value);
        const condition = document.getElementById('gear-condition').value;
        const wattage = parseFloat(document.getElementById('gear-wattage').value) || 0;
        const platform = document.getElementById('gear-platform').value;
        const description = document.getElementById('gear-desc').value.trim();
        const status = document.getElementById('gear-status').value;

        if (!name || !category || isNaN(price) || price < 0 || !condition || !status) {
            alert('Please fill out all required fields correctly.');
            return;
        }

        if (!currentUser.items) currentUser.items = [];
        if (!currentUser.activities) currentUser.activities = [];

        if (id) {
            currentUser.items = currentUser.items.map(item =>
                item.id == id ? { ...item, name, category, price, condition, wattage, platform, description, status, image: pendingGearImage } : item
            );
            logActivity(`Updated gear item: ${name}`);
            notify(`Updated ${name}`);
        } else {
            const newItem = { id: Date.now(), name, category, price, condition, wattage, platform, description, status, image: pendingGearImage };
            currentUser.items.push(newItem);
            logActivity(`Added ${name} to ${status}`);
            notify(`Added ${name} to ${status}`);
        }

        saveAndRefresh();
        closeModal();
    });

    // Image Upload Preview Logic
    let pendingGearImage = '';

    function updateGearImagePreview(imageSrc = '') {
        const preview = document.getElementById('gear-image-preview');
        pendingGearImage = imageSrc;
        if (!preview) return;
        preview.innerHTML = imageSrc
            ? `<img src="${imageSrc}" alt="Gear image preview">`
            : '<span>No image selected</span>';
    }

    const gearImageInput = document.getElementById('gear-image');
    gearImageInput.addEventListener('change', () => {
        const file = gearImageInput.files && gearImageInput.files[0];
        if (!file) {
            updateGearImagePreview('');
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            gearImageInput.value = '';
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            alert('Please choose an image smaller than 3 MB.');
            gearImageInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                // Downscale before saving: full-size photos quickly exhaust
                // the browser's localStorage quota when stored as data URLs.
                const maxSide = 900;
                const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                updateGearImagePreview(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = () => {
                alert('That image could not be read. Please try another file.');
                gearImageInput.value = '';
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });

    // Search and Filter Events
    searchInput.addEventListener('input', renderAll);
    categoryFilter.addEventListener('change', () => {
        syncMarketChips();
        renderAll();
    });

    // Marketplace category chips drive the same documented category filter
    function syncMarketChips() {
        document.querySelectorAll('.market-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === categoryFilter.value);
        });
    }

    document.querySelectorAll('.market-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            categoryFilter.value = chip.dataset.category;
            syncMarketChips();
            renderAll();
        });
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        categoryFilter.value = 'All';
        syncMarketChips();
        renderAll();
    });

    // Shared edit dialog for owned and wishlist gear
    function openEditGear(item) {
        if (!item) return;
        document.getElementById('modal-title').textContent = 'Edit Gear';
        document.getElementById('gear-id').value = item.id;
        document.getElementById('gear-name').value = item.name;
        document.getElementById('gear-category').value = item.category;
        document.getElementById('gear-price').value = item.price;
        document.getElementById('gear-condition').value = item.condition;
        document.getElementById('gear-wattage').value = item.wattage || '';
        document.getElementById('gear-platform').value = item.platform || '';
        document.getElementById('gear-desc').value = item.description || '';
        document.getElementById('gear-status').value = item.status;
        gearImageInput.value = '';
        updateGearImagePreview(item.image || '');
        gearModal.classList.add('open');
        document.body.classList.add('gear-modal-open');
        requestAnimationFrame(() => document.getElementById('gear-name').focus());
    }

    // Delete & Edit Events (Delegated)
    inventoryTableBody.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-id]');
        if (!button) return;
        const id = button.dataset.id;
        const item = currentUser.items.find(i => i.id == id);

        if (button.classList.contains('delete-btn')) {
            if (confirm(`Delete ${item ? item.name : 'this gear item'}? This cannot be undone.`)) {
                if (item) logActivity(`Deleted ${item.name}`);
                currentUser.items = currentUser.items.filter(i => i.id != id);
                saveAndRefresh();
                notify('Gear item deleted');
            }
        } else if (button.classList.contains('edit-btn')) {
            openEditGear(item);
        }
    });

    // Wishlist Edit / Delete / Move-to-Inventory Events (Delegated)
    wishlistGrid.addEventListener('click', (e) => {
        const button = e.target.closest('button[data-id]');
        if (!button) return;
        const id = button.dataset.id;
        const item = currentUser.items.find(i => i.id == id);

        if (button.classList.contains('delete-wishlist-btn')) {
            if (confirm(`Remove ${item ? item.name : 'this item'} from your wishlist?`)) {
                if (item) logActivity(`Removed ${item.name} from wishlist`);
                currentUser.items = currentUser.items.filter(i => i.id != id);
                saveAndRefresh();
                notify('Removed from wishlist');
            }
        } else if (button.classList.contains('edit-wishlist-btn')) {
            openEditGear(item);
        } else if (button.classList.contains('move-btn')) {
            currentUser.items = currentUser.items.map(i => {
                if (i.id == id) {
                    logActivity(`Moved ${i.name} to Inventory`);
                    return { ...i, status: 'Owned' };
                }
                return i;
            });
            saveAndRefresh();
            notify('Moved to inventory');
        }
    });

    moveAllInventoryBtn.addEventListener('click', () => {
        const wishlistCount = currentUser.items.filter(i => i.status === 'Wishlist').length;
        if (wishlistCount === 0) {
            alert('Your wishlist is empty.');
            return;
        }
        if (confirm(`Move all ${wishlistCount} wishlist item(s) to inventory?`)) {
            let moved = 0;
            currentUser.items = currentUser.items.map(i => {
                if (i.status === 'Wishlist') {
                    moved++;
                    return { ...i, status: 'Owned' };
                }
                return i;
            });
            logActivity(`Moved ${moved} wishlist item(s) to inventory`);
            saveAndRefresh();
            notify(`Moved ${moved} item(s) to inventory`);
        }
    });

    // Task Queue Event Handlers
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (!text) return;
        if (!currentUser.tasks) currentUser.tasks = [];
        currentUser.tasks.push({ id: Date.now(), text, completed: false });
        logActivity(`Added task: ${text}`);
        taskInput.value = '';
        saveAndRefresh();
        notify('Task added');
    });

    // Task Checkbox | change | Task handler (documentation event map)
    taskList.addEventListener('change', (e) => {
        if (e.target.classList.contains('toggle-task')) {
            const id = e.target.getAttribute('data-id');
            currentUser.tasks = currentUser.tasks.map(t => t.id == id ? { ...t, completed: !t.completed } : t);
            saveAndRefresh();
        }
    });

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-task')) {
            const id = e.target.getAttribute('data-id');
            currentUser.tasks = currentUser.tasks.filter(t => t.id != id);
            saveAndRefresh();
        }
    });

    // Ongoing & Completed Projects Event Handlers
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = projectNameInput.value.trim();
        if (!name) return;
        if (!currentUser.projects) currentUser.projects = [];
        currentUser.projects.push({ id: Date.now(), name, status: 'Ongoing' });
        logActivity(`Started new project: ${name}`);
        projectNameInput.value = '';
        saveAndRefresh();
        notify('Project created');
    });

    document.getElementById('projects-view').addEventListener('click', (e) => {
        const button = e.target.closest('button[data-id]');
        if (!button) return;
        const id = button.dataset.id;
        const project = currentUser.projects.find(p => p.id == id);

        if (button.classList.contains('complete-proj')) {
            currentUser.projects = currentUser.projects.map(p => p.id == id ? { ...p, status: 'Completed' } : p);
            logActivity(`Completed project build ID: ${id}`);
            saveAndRefresh();
            notify(`Completed: ${project ? project.name : 'project'}`);
        } else if (button.classList.contains('delete-proj')) {
            currentUser.projects = currentUser.projects.filter(p => p.id != id);
            saveAndRefresh();
            notify('Project deleted');
        }
    });

    // PSU Capacity Update Handler
    savePsuBtn.addEventListener('click', () => {
        const cap = parseFloat(psuCapacityInput.value);
        if (isNaN(cap) || cap <= 0) {
            alert('Please enter a valid PSU wattage.');
            return;
        }
        currentUser.psuCapacity = cap;
        logActivity(`Updated PSU rating to ${cap}W`);
        saveAndRefresh();
        // PSU Update Button | click | evaluateBuildTools() (documentation event map)
        evaluateBuildTools();
        notify(`PSU rating set to ${cap}W`);
    });

    // DIY Audio Enclosure Volume Estimator Handler
    enclosureForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const l = parseFloat(document.getElementById('enc-length').value);
        const w = parseFloat(document.getElementById('enc-width').value);
        const h = parseFloat(document.getElementById('enc-height').value);

        if (isNaN(l) || isNaN(w) || isNaN(h) || l <= 0 || w <= 0 || h <= 0) {
            alert('Enter valid positive numbers for dimensions.');
            return;
        }

        // Convert cm^3 to liters (1000 cm^3 = 1 L)
        const volumeLiters = (l * w * h) / 1000;
        enclosureResult.innerHTML = `
            <p><strong>Internal Volume:</strong> ${volumeLiters.toFixed(2)} L (${(l * w * h).toFixed(0)} cm³)</p>
            <p style="color:#7f8c8d; font-size:0.82rem;">Subtract driver displacement, bracing, and port volume for net tuning volume.</p>
        `;
        logActivity(`Calculated enclosure volume: ${volumeLiters.toFixed(2)} L`);
        saveAndRefresh();
        notify('Volume calculated');
    });

    // Clear All Events
    const clearAllData = () => {
        if (confirm('Clear all saved gear records? This cannot be undone.')) {
            currentUser.items = [];
            currentUser.tasks = [];
            currentUser.projects = [];
            logActivity('Cleared all inventory & project data');
            saveAndRefresh();
            notify('All gear, tasks, and projects cleared');
        }
    };
    clearAllBtn.addEventListener('click', clearAllData);
    settingsClearBtn.addEventListener('click', clearAllData);

    // Save Account Settings
    saveAccountBtn.addEventListener('click', () => {
        const newName = document.getElementById('settings-name').value.trim();
        const newEmail = document.getElementById('settings-email').value.trim();
        if (!newName || !newEmail) {
            alert('Fields cannot be empty.');
            return;
        }
        if (loadUsers().some(u => u.email === newEmail && u.email !== currentUserKey)) {
            alert('Another account already uses that email address.');
            return;
        }
        currentUser.name = newName;
        currentUser.email = newEmail;
        logActivity('Updated account profile');
        document.getElementById('user-display-name').textContent = newName;
        document.getElementById('sidebar-user-name').textContent = newName;
        document.getElementById('account-initial').textContent = newName.charAt(0).toUpperCase();
        saveAndRefresh();
        notify('Account settings updated');
    });

    // Export Inventory as JSON File
    exportBtn.addEventListener('click', () => {
        if (!currentUser.items || currentUser.items.length === 0) {
            alert('No inventory data to export.');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUser, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "gearvault_full_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        logActivity('Exported account data backup');
        saveAndRefresh();
        notify('Backup downloaded');
    });

    // Preferences (both are saved and restored on startup)
    darkModeToggle.addEventListener('change', () => {
        const isDark = darkModeToggle.checked;
        document.body.classList.toggle('dark-mode', isDark);
        const settings = loadSettings();
        settings.darkMode = isDark;
        saveSettings(settings);
    });

    notificationsToggle.addEventListener('change', () => {
        const settings = loadSettings();
        settings.notifications = notificationsToggle.checked;
        saveSettings(settings);
        if (notificationsToggle.checked) notify('Notifications enabled');
    });

    // Helper: Evaluate PSU Wattage & Compatibility Rules
    function evaluateBuildTools(gearItems = currentUser.items || []) {
        const psuCap = currentUser.psuCapacity || 650;
        const ownedItems = gearItems.filter(i => i.status === 'Owned');
        const totalDraw = ownedItems.reduce((sum, item) => sum + (Number(item.wattage) || 0), 0);
        const headroom = psuCap - totalDraw;
        const ratio = psuCap > 0 ? (totalDraw / psuCap) * 100 : 0;

        // Update PSU UI
        document.getElementById('psu-total-draw').textContent = `${totalDraw}W`;
        document.getElementById('psu-headroom').textContent = `${headroom}W`;
        document.getElementById('dash-psu-summary').textContent = `${totalDraw}W / ${psuCap}W`;

        const badge = document.getElementById('psu-status-badge');
        const fill = document.getElementById('psu-progress-fill');
        fill.style.width = `${Math.min(ratio, 100)}%`;

        if (totalDraw > psuCap) {
            badge.textContent = 'Overloaded';
            badge.className = 'status-pill danger';
            fill.style.background = 'var(--danger-color)';
        } else if (ratio > 75) {
            badge.textContent = 'Tight Headroom';
            badge.className = 'status-pill warn';
            fill.style.background = 'var(--warn-color)';
        } else {
            badge.textContent = 'Safe';
            badge.className = 'status-pill safe';
            fill.style.background = 'var(--success-color)';
        }

        // Compatibility checks across logged items
        const compatList = document.getElementById('compat-results-list');
        const checks = [];

        const cpus = gearItems.filter(i => i.category === 'CPU' && i.platform);
        const mobos = gearItems.filter(i => i.category === 'Motherboard' && i.platform);
        const rams = gearItems.filter(i => i.category === 'RAM' && i.platform);

        if (cpus.length === 0 && mobos.length === 0 && rams.length === 0) {
            checks.push('Add CPU, Motherboard, or RAM with platform tags to run compatibility checks.');
        } else {
            if (cpus.length > 0 && mobos.length > 0) {
                const cpuPlatforms = new Set(cpus.map(c => c.platform));
                const moboPlatforms = new Set(mobos.map(m => m.platform));
                const overlap = [...cpuPlatforms].some(p => moboPlatforms.has(p));
                if (overlap) {
                    checks.push('✅ CPU and Motherboard platform tags match.');
                } else {
                    checks.push('⚠️ Platform mismatch detected between logged CPU and Motherboard.');
                }
            }

            if (rams.length > 0) {
                const ramTypes = new Set(rams.map(r => r.platform));
                if (ramTypes.size > 1) {
                    checks.push('⚠️ Mixed RAM generation tags detected (e.g., DDR4 and DDR5).');
                } else {
                    checks.push(`✅ RAM generation consistent (${[...ramTypes][0]}).`);
                }
            }

            if (totalDraw > psuCap) {
                checks.push(`⚠️ Owned PC draw (${totalDraw}W) exceeds PSU capacity (${psuCap}W).`);
            } else {
                checks.push(`✅ PSU capacity (${psuCap}W) covers logged owned wattage (${totalDraw}W).`);
            }
        }

        compatList.innerHTML = checks.map(msg => `<li>${escapeHtml(msg)}</li>`).join('');
        document.getElementById('dash-compat-summary').textContent =
            checks.some(c => c.startsWith('⚠️')) ? 'Warning Found' : 'All Clear';
    }

    // Core Data & DOM Rendering Engine
    function saveAndRefresh() {
        const users = loadUsers();
        const index = users.findIndex(u => u.email === currentUserKey);
        if (index >= 0) users[index] = currentUser;
        else users.push(currentUser);
        persistUsers(users);
        persistSession();
        currentUserKey = currentUser.email;
        renderAll();
    }

    const featuredProducts = [
        { name: 'GeForce RTX 5070 12GB', category: 'GPU', price: 34999, image: 'images/gpu.jpg', platform: 'PCIe 5.0' },
        { name: 'AMD Ryzen 7 Processor', category: 'CPU', price: 26999, image: 'images/cpu.jpg', platform: 'AM5' },
        { name: 'AM5 Gaming Motherboard', category: 'Motherboard', price: 18999, image: 'images/motherboard.jpg', platform: 'AM5' },
        { name: '32GB DDR5 RGB Memory', category: 'RAM', price: 6499, image: 'images/ram.jpg', platform: 'DDR5' },
        { name: '850W Gold Power Supply', category: 'PSU', price: 7299, image: 'images/psu.jpg', platform: 'ATX 3.0' },
        { name: 'Studio Headphones', category: 'Audio', price: 3999, image: 'images/audio.jpg', platform: '3.5mm / USB' },
        { name: 'Wireless Gaming Mouse', category: 'Peripherals', price: 2499, image: 'images/peripherals.jpg', platform: 'Wireless' },
        { name: '27-inch QHD Monitor', category: 'Monitor', price: 14999, image: 'images/monitor.jpg', platform: '1440p' }
    ];

    const featuredCard = document.getElementById('featured-gear-card');
    if (featuredCard) {
        featuredCard.addEventListener('click', event => {
            const addButton = event.target.closest('.featured-add-btn');
            if (!addButton || !currentUser) return;

            const product = featuredProducts.find(item => item.name === addButton.dataset.featuredName);
            if (!product) return;
            if (currentUser.items.some(item => item.name === product.name)) return;

            currentUser.items.push({
                id: Date.now(),
                name: product.name,
                category: product.category,
                price: product.price,
                condition: 'Brand New',
                wattage: 0,
                platform: product.platform,
                description: 'Added from Featured Gear',
                status: 'Wishlist',
                image: product.image
            });
            logActivity(`Added ${product.name} to Wishlist`);
            saveAndRefresh();
            notify(`Added ${product.name} to your wishlist`);
        });
    }

    function renderAll() {
        if (!currentUser) return;
        const gearItems = currentUser.items || [];
        const activities = currentUser.activities || [];
        const tasks = currentUser.tasks || [];
        const projects = currentUser.projects || [];

        const query = searchInput.value.toLowerCase();
        const selectedCat = categoryFilter.value;

        // 1. Render Inventory Table (Strictly Owned items only)
        const ownedOnlyItems = gearItems.filter(i => i.status === 'Owned');
        const filteredOwned = ownedOnlyItems.filter(item => {
            const searchable = `${item.name} ${item.category} ${item.platform || ''} ${item.description || ''}`.toLowerCase();
            const matchesQuery = searchable.includes(query);
            const matchesCat = selectedCat === 'All' || item.category === selectedCat;
            return matchesQuery && matchesCat;
        });

        inventoryTableBody.innerHTML = '';
        if (filteredOwned.length === 0) {
            inventoryTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No owned gear found.</td></tr>`;
        } else {
            filteredOwned.forEach(item => {
                const specText = [item.platform, item.wattage ? `${item.wattage}W` : ''].filter(Boolean).join(' • ') || '-';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.image ? `<img class="table-gear-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : ''}<span>${escapeHtml(item.name)}</span></td>
                    <td>${escapeHtml(item.category)}</td>
                    <td>₱${Number(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${escapeHtml(item.condition)}</td>
                    <td>${escapeHtml(specText)}</td>
                    <td>${item.description ? escapeHtml(item.description) : '<em>No description provided</em>'}</td>
                    <td><span class="badge owned">Owned</span></td>
                    <td>
                        <button class="edit-btn secondary-btn" data-id="${item.id}">Edit</button>
                        <button type="button" class="delete-btn danger-btn" data-id="${item.id}">Delete</button>
                    </td>
                `;
                inventoryTableBody.appendChild(tr);
            });
        }

        // 2. Render Wishlist Grid
        const wishlistItems = gearItems.filter(i => i.status === 'Wishlist');
        const totalItems = gearItems.length;
        const ownedItems = ownedOnlyItems.length;
        const wishlistCount = wishlistItems.length;
        const totalValue = gearItems.reduce((sum, i) => sum + i.price, 0);
        const ownedBudget = ownedOnlyItems.reduce((sum, i) => sum + i.price, 0);
        const wishlistTotal = wishlistItems.reduce((sum, i) => sum + i.price, 0);
        wishlistGrid.innerHTML = '';
        if (wishlistItems.length === 0) {
            wishlistGrid.innerHTML = `<p>No items in wishlist.</p>`;
        } else {
            wishlistItems.forEach(item => {
                const specText = [item.platform, item.wattage ? `${item.wattage}W` : ''].filter(Boolean).join(' • ');
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.innerHTML = `
                    ${item.image ? `<img class="wishlist-gear-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : ''}
                    <h4>${escapeHtml(item.name)}</h4>
                    <p class="wishlist-card-meta">${escapeHtml(item.category)}</p>
                    <p>₱${Number(item.price || 0).toLocaleString()}</p>
                    ${specText ? `<p class="wishlist-card-spec">${escapeHtml(specText)}</p>` : ''}
                    <p class="wishlist-card-reason">"${escapeHtml(item.description || 'No reason specified')}"</p>
                    <div class="wishlist-card-actions">
                        <button type="button" class="primary-btn move-btn" data-id="${item.id}">Move to Inventory</button>
                    </div>
                    <div class="wishlist-card-actions">
                        <button type="button" class="secondary-btn edit-wishlist-btn" data-id="${item.id}">Edit</button>
                        <button type="button" class="danger-btn delete-wishlist-btn" data-id="${item.id}">Delete</button>
                    </div>
                `;
                wishlistGrid.appendChild(card);
            });
        }
        document.getElementById('wishlist-count').textContent = wishlistItems.length;

        // 3. Render Tasks for Today
        taskList.innerHTML = '';
        if (tasks.length === 0) {
            taskList.innerHTML = `<li>No tasks for today.</li>`;
        } else {
            tasks.forEach(t => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span style="${t.completed ? 'text-decoration: line-through; color: #7f8c8d;' : ''}">
                        <input type="checkbox" class="toggle-task" data-id="${t.id}" ${t.completed ? 'checked' : ''} style="margin-right:8px;">
                        ${escapeHtml(t.text)}
                    </span>
                    <button type="button" class="delete-task danger-btn" data-id="${t.id}" aria-label="Delete task">&times;</button>
                `;
                taskList.appendChild(li);
            });
        }

        // 4. Render Ongoing and Completed Projects
        const ongoingDiv = document.getElementById('ongoing-projects-list');
        const completedDiv = document.getElementById('completed-projects-list');

        const ongoingProj = projects.filter(p => p.status === 'Ongoing');
        const completedProj = projects.filter(p => p.status === 'Completed');

        ongoingDiv.innerHTML = ongoingProj.length === 0 ? '<p>No ongoing builds.</p>' : ongoingProj.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color);">
                <span>🛠️ ${escapeHtml(p.name)}</span>
                <div>
                    <button type="button" class="complete-proj primary-btn" data-id="${p.id}">Mark Done</button>
                    <button type="button" class="delete-proj danger-btn" data-id="${p.id}">Delete</button>
                </div>
            </div>
        `).join('');

        completedDiv.innerHTML = completedProj.length === 0 ? '<p>No completed projects yet.</p>' : completedProj.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border-color);">
                <span style="color:var(--success-color);">✅ ${escapeHtml(p.name)}</span>
                <button type="button" class="delete-proj danger-btn" data-id="${p.id}">Delete</button>
            </div>
        `).join('');

        // 5. Dashboard featured catalog, recent gear, and wishlist progress
        if (featuredCard) {
            featuredCard.classList.toggle('is-filtered', categoryFilter.value !== 'All');
            const visibleProducts = categoryFilter.value === 'All'
                ? featuredProducts.slice(0, 3)
                : featuredProducts.filter(product => product.category === categoryFilter.value);
            featuredCard.innerHTML = visibleProducts.map(product => `
                <article class="featured-product-card">
                    <div class="featured-product-image"><img src="${product.image}" alt="${product.name}" loading="lazy"></div>
                    <div class="featured-product-info"><small>${product.category} <span>·</span> Sample gear</small><h4>${product.name}</h4>
                        <div class="featured-product-footer"><strong>₱${product.price.toLocaleString()}</strong><button type="button" class="featured-add-btn" data-featured-name="${product.name}" aria-label="Add ${product.name} to wishlist" title="Add to wishlist">+</button></div>
                    </div>
                </article>`).join('');
        }

        const recentGearList = document.getElementById('recent-gear-list');
        const recentGear = [...gearItems].slice(-3).reverse();
        recentGearList.innerHTML = recentGear.length ? recentGear.map(item => `
            <div class="recent-gear-item">
                <div class="recent-gear-thumb">${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">` : '<span aria-hidden="true">⬡</span>'}</div>
                <div class="recent-gear-copy"><strong>${escapeHtml(item.name)}</strong><small>Added to ${escapeHtml(item.status)}</small></div>
                <span class="recent-status ${item.status === 'Owned' ? 'is-owned' : 'is-wishlist'}">${escapeHtml(item.status)}</span>
            </div>`).join('') : '<p class="empty-dashboard-message">Your newest gear will appear here.</p>';

        const wishlistGoal = 50000;
        const wishlistProgress = Math.min(100, Math.round((wishlistTotal / wishlistGoal) * 100));
        document.getElementById('wishlist-progress-value').textContent = `${wishlistProgress}%`;
        document.getElementById('wishlist-progress-ring').style.setProperty('--progress', `${wishlistProgress}%`);
        document.getElementById('wishlist-progress-amount').innerHTML = `₱${wishlistTotal.toLocaleString()} <span>/ ₱${wishlistGoal.toLocaleString()}</span>`;
        const recommendedItem = wishlistItems[0];
        document.getElementById('recommended-upgrade-name').textContent = recommendedItem ? recommendedItem.name : 'Plan your next build';
        document.getElementById('recommended-upgrade-copy').textContent = recommendedItem
            ? `${recommendedItem.category} upgrade saved to your wishlist.`
            : 'Add parts to your wishlist and keep your next upgrade in view.';

        // 6. Render Gear by Category Widget
        const categoryBreakdownList = document.getElementById('category-breakdown-list');
        const analyticsCategoryList = document.getElementById('analytics-category-list');

        const categories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'PSU', 'Audio', 'Peripherals', 'Monitor'];
        let catHtml = '';
        let hasCategories = false;

        categories.forEach(cat => {
            const count = gearItems.filter(i => i.category === cat).length;
            if (count > 0) {
                hasCategories = true;
                catHtml += `<p><strong>${cat}:</strong> ${count} item(s)</p>`;
            }
        });

        analyticsCategoryList.innerHTML = hasCategories ? catHtml : 'No data.';

        const chartTotal = ownedOnlyItems.length + wishlistItems.length + projects.length;
        const ownedShare = chartTotal ? (ownedOnlyItems.length / chartTotal) * 100 : 0;
        const wishlistShare = chartTotal ? (wishlistItems.length / chartTotal) * 100 : 0;
        const categoryChart = document.getElementById('category-chart');
        categoryChart.style.background = chartTotal
            ? `conic-gradient(#9b45ff 0 ${ownedShare}%, #129bf0 ${ownedShare}% ${ownedShare + wishlistShare}%, #21c778 ${ownedShare + wishlistShare}% 100%)`
            : 'conic-gradient(#27375d 0 100%)';
        document.getElementById('overview-total').textContent = totalItems;
        categoryBreakdownList.innerHTML = `
            <p><span class="legend-dot owned-dot"></span>Owned <strong>${ownedItems}</strong></p>
            <p><span class="legend-dot wishlist-dot"></span>Wishlist <strong>${wishlistCount}</strong></p>
            <p><span class="legend-dot projects-dot"></span>Projects <strong>${projects.length}</strong></p>`;

        // 7. Render Recent Activity Widget
        const recentActivityList = document.getElementById('recent-activity-list');
        recentActivityList.innerHTML = '';
        if (activities.length === 0) {
            recentActivityList.innerHTML = `<li>No recent activity.</li>`;
        } else {
            activities.slice(0, 5).forEach(act => {
                const li = document.createElement('li');
                li.textContent = act;
                recentActivityList.appendChild(li);
            });
        }

        // 8. Evaluate Build & Audio Tools
        evaluateBuildTools(gearItems);

        // 9. Update Statistics & Analytics Numbers
        document.getElementById('stat-total').textContent = totalItems;
        document.getElementById('stat-owned').textContent = ownedItems;
        document.getElementById('stat-wishlist').textContent = wishlistCount;
        document.getElementById('stat-value').textContent = `₱${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        document.getElementById('summary-owned-budget').textContent = `₱${ownedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('summary-wishlist-total').textContent = `₱${wishlistTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        document.getElementById('analytics-total').textContent = totalItems;
        document.getElementById('analytics-owned').textContent = ownedItems;
        document.getElementById('analytics-wishlist').textContent = wishlistCount;
        document.getElementById('analytics-owned-budget').textContent = `₱${ownedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('analytics-wishlist-total').textContent = `₱${wishlistTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        document.getElementById('analytics-total-value').textContent = `₱${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }

    // Run Initial Auth Check on Load
    init();

    document.querySelectorAll('.view-all-btn').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.target === targetId));
            viewSections.forEach(section => section.classList.toggle('active', section.id === targetId));
            renderAll();
        });
    });
});