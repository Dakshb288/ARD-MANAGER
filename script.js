// Initialize Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Initialize state
let airdrops = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 5;
let currentSort = 'newest';
let currentFilter = '';
let activeTags = new Set();
let currentScreen = 'homeScreen';

// DOM Elements
const screens = document.querySelectorAll('.screen');
const navItems = document.querySelectorAll('.nav-item');
const airdropForm = document.getElementById('airdropForm');
const airdropNameInput = document.getElementById('airdropName');
const airdropLinkInput = document.getElementById('airdropLink');
const airdropTagsInput = document.getElementById('airdropTags');
const airdropsContainer = document.getElementById('airdropsContainer');
const recentAirdrops = document.getElementById('recentAirdrops');
const searchInput = document.getElementById('searchAirdrops');
const sortSelect = document.getElementById('sortDrops');
const tagsContainer = document.getElementById('tagsContainer');
const totalAirdropsElement = document.getElementById('totalAirdrops');
const todayAirdropsElement = document.getElementById('todayAirdrops');
const themeToggle = document.getElementById('themeToggle');
const viewModeToggle = document.getElementById('viewModeToggle');
const resetButton = document.getElementById('resetButton');
const toast = document.getElementById('toast');

// Screen Management
function showScreen(screenId) {
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenId) {
            item.classList.add('active');
        }
    });
    
    currentScreen = screenId;
    
    // Update content based on screen
    if (screenId === 'homeScreen') {
        updateRecentAirdrops();
    } else if (screenId === 'exploreScreen') {
        renderAirdrops();
    }
}

// Navigation Event Listeners
navItems.forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Airdrop Management
function addAirdrop(name, link, tags = '') {
    const airdrop = {
        id: Date.now().toString(),
        name: name.trim(),
        link: link.trim(),
        timestamp: Date.now(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        visits: 0
    };
    
    airdrops.unshift(airdrop);
    saveAirdrops();
    updateStats();
    showToast('Airdrop added successfully!');
    
    if (currentScreen === 'homeScreen') {
        updateRecentAirdrops();
    } else if (currentScreen === 'exploreScreen') {
        renderAirdrops();
    }
}

function updateRecentAirdrops() {
    const recent = airdrops.slice(0, 3);
    recentAirdrops.innerHTML = recent.map(airdrop => `
        <div class="airdrop-item">
            <div class="airdrop-info">
                <div class="airdrop-name">${airdrop.name}</div>
                <div class="airdrop-meta">
                    <span>${formatDate(airdrop.timestamp)}</span>
                    ${airdrop.visits ? `<span>👁 ${airdrop.visits} visits</span>` : ''}
                </div>
            </div>
            <div class="airdrop-actions">
                <button class="btn-go" onclick="window.open('${airdrop.link}', '_blank'); trackVisit('${airdrop.id}')">
                    Go to Airdrop →
                </button>
            </div>
        </div>
    `).join('');
}

// Stats Management
function updateStats() {
    const total = airdrops.length;
    const today = airdrops.filter(airdrop => {
        const date = new Date(airdrop.timestamp);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }).length;
    
    totalAirdropsElement.textContent = total;
    todayAirdropsElement.textContent = today;
}

// Event Listeners
airdropForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = airdropNameInput.value;
    const link = airdropLinkInput.value;
    const tags = airdropTagsInput.value;
    
    addAirdrop(name, link, tags);
    
    airdropForm.reset();
    showScreen('homeScreen');
});

themeToggle.addEventListener('click', toggleTheme);

resetButton.addEventListener('click', () => {
    const resetModal = document.getElementById('resetModal');
    resetModal.classList.add('active');
});

document.getElementById('confirmReset').addEventListener('click', () => {
    airdrops = [];
    saveAirdrops();
    updateStats();
    renderAirdrops();
    document.getElementById('resetModal').classList.remove('active');
    showToast('All airdrops have been reset');
});

document.getElementById('cancelReset').addEventListener('click', () => {
    document.getElementById('resetModal').classList.remove('active');
});

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    
    // Show intro animation
    const introAnimation = document.querySelector('.intro-animation');
    setTimeout(() => {
        introAnimation.style.opacity = '0';
        setTimeout(() => {
            introAnimation.style.display = 'none';
            // Check channel membership after intro
            checkChannelMembership();
        }, 1000);
    }, 2000);

    // Load saved airdrops
    const saved = localStorage.getItem('airdrops');
    if (saved) {
        airdrops = JSON.parse(saved);
    }
    
    updateStats();
    updateRecentAirdrops();
    
    tg.ready();
});

// Helper Functions
function saveAirdrops() {
    localStorage.setItem('airdrops', JSON.stringify(airdrops));
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function trackVisit(id) {
    const airdrop = airdrops.find(a => a.id === id);
    if (airdrop) {
        airdrop.visits = (airdrop.visits || 0) + 1;
        saveAirdrops();
    }
}

// Filter and sort airdrops
function getFilteredAndSortedAirdrops() {
    let filtered = [...airdrops];

    // Apply search filter
    if (currentFilter) {
        const searchTerm = currentFilter.toLowerCase();
        filtered = filtered.filter(airdrop => 
            airdrop.name.toLowerCase().includes(searchTerm) ||
            airdrop.link.toLowerCase().includes(searchTerm)
        );
    }

    // Apply tag filters
    if (activeTags.size > 0) {
        filtered = filtered.filter(airdrop => 
            airdrop.tags && airdrop.tags.some(tag => activeTags.has(tag))
        );
    }

    // Apply sorting
    filtered.sort((a, b) => {
        switch (currentSort) {
            case 'newest':
                return b.timestamp - a.timestamp;
            case 'oldest':
                return a.timestamp - b.timestamp;
            case 'az':
                return a.name.localeCompare(b.name);
            case 'za':
                return b.name.localeCompare(a.name);
            case 'popular':
                return (b.visits || 0) - (a.visits || 0);
            default:
                return 0;
        }
    });

    return filtered;
}

// Render pagination
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    let paginationHTML = '';

    if (totalPages > 1) {
        paginationHTML += `
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">←</button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }

        paginationHTML += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">→</button>
        `;
    }

    paginationContainer.innerHTML = paginationHTML;

    // Add click handlers
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                currentPage = parseInt(btn.dataset.page);
                renderAirdrops();
            }
        });
    });
}

// Render airdrops
function renderAirdrops() {
    const filteredAirdrops = getFilteredAndSortedAirdrops();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageAirdrops = filteredAirdrops.slice(startIndex, endIndex);

    if (pageAirdrops.length === 0) {
        airdropsContainer.innerHTML = `
            <div class="empty-state">
                <p>No airdrops found</p>
                <p>Try adjusting your filters or adding new airdrops</p>
            </div>
        `;
    } else {
        airdropsContainer.innerHTML = pageAirdrops.map(airdrop => `
            <div class="airdrop-item">
                <div class="airdrop-info">
                    <div class="airdrop-name">${airdrop.name}</div>
                    <div class="airdrop-meta">
                        <span>${formatDate(airdrop.timestamp)}</span>
                        ${airdrop.visits ? `<span>👁 ${airdrop.visits} visits</span>` : ''}
                        ${airdrop.tags ? airdrop.tags.map(tag => 
                            `<span class="airdrop-tag">${tag}</span>`
                        ).join('') : ''}
                    </div>
                </div>
                <div class="airdrop-actions">
                    <button class="btn-go" onclick="window.open('${airdrop.link}', '_blank'); trackVisit('${airdrop.id}')">
                        Go to Airdrop →
                    </button>
                    <button class="btn-icon delete-btn" data-id="${airdrop.id}">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    renderPagination(filteredAirdrops.length);

    // Add delete button listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedAirdropId = e.target.dataset.id;
            showModal();
        });
    });
}

// Extract and render tags
function renderTags() {
    const tags = new Set();
    airdrops.forEach(airdrop => {
        if (airdrop.tags) {
            airdrop.tags.forEach(tag => tags.add(tag));
        }
    });

    tagsContainer.innerHTML = Array.from(tags).map(tag => `
        <span class="tag ${activeTags.has(tag) ? 'active' : ''}" data-tag="${tag}">
            ${tag}
        </span>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.tag').forEach(tagElement => {
        tagElement.addEventListener('click', () => {
            const tag = tagElement.dataset.tag;
            if (activeTags.has(tag)) {
                activeTags.delete(tag);
            } else {
                activeTags.add(tag);
            }
            renderTags();
            renderAirdrops();
        });
    });
}

// Show toast message
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Delete airdrop
function deleteAirdrop(id) {
    airdrops = airdrops.filter(airdrop => airdrop.id !== id);
    saveAirdrops();
    renderTags();
    renderAirdrops();
    showToast('Airdrop deleted successfully');
}

// Reset all airdrops
function resetAirdrops() {
    airdrops = [];
    saveAirdrops();
    renderTags();
    renderAirdrops();
    showToast('All airdrops have been reset');
}

// Toggle view mode (grid/list)
function toggleViewMode() {
    currentViewMode = currentViewMode === 'list' ? 'grid' : 'list';
    document.documentElement.setAttribute('data-view', currentViewMode);
    renderAirdrops();
}

// Show full-screen view
function showFullScreenView() {
    const container = fullScreenView.querySelector('.airdrops-container');
    container.innerHTML = airdrops.map(airdrop => `
        <div class="airdrop-item">
            <div class="airdrop-info">
                <div class="airdrop-name">${airdrop.name}</div>
                <div class="airdrop-meta">
                    <span>${formatDate(airdrop.timestamp)}</span>
                    ${airdrop.visits ? `<span>👁 ${airdrop.visits} visits</span>` : ''}
                    ${airdrop.tags ? airdrop.tags.map(tag => 
                        `<span class="airdrop-tag">${tag}</span>`
                    ).join('') : ''}
                </div>
            </div>
            <div class="airdrop-actions">
                <button class="btn-go" onclick="window.open('${airdrop.link}', '_blank'); trackVisit('${airdrop.id}')">
                    Go to Airdrop →
                </button>
                <button class="btn-icon delete-btn" data-id="${airdrop.id}">🗑️</button>
            </div>
        </div>
    `).join('');

    // Add delete button listeners
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedAirdropId = e.target.dataset.id;
            showModal();
        });
    });

    fullScreenView.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Hide full-screen view
function hideFullScreenView() {
    fullScreenView.classList.remove('active');
    document.body.style.overflow = '';
}

// Initialize view mode
function initializeViewMode() {
    document.documentElement.setAttribute('data-view', currentViewMode);
}

// Check channel membership
async function checkChannelMembership() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user) return false;

        // Check membership status first
        try {
            const isMember = await tg.sendData('check_membership');
            if (isMember === 'true') {
                return true;
            }
        } catch (error) {
            console.error('Initial membership check error:', error);
        }

        // Only create modal if user is not a member
        const channelModal = document.createElement('div');
        channelModal.className = 'modal active';
        channelModal.innerHTML = `
            <div class="modal-content">
                <h3>Join Our Channel</h3>
                <p>Please join our official channel to use this app:</p>
                <div class="channel-info">
                    <span class="channel-name">${TELEGRAM_CHANNEL}</span>
                </div>
                <div class="modal-actions">
                    <a href="${CHANNEL_LINK}" class="btn-primary" target="_blank">Join Channel</a>
                </div>
            </div>
        `;
        document.body.appendChild(channelModal);

        // Check membership status periodically
        const checkInterval = setInterval(async () => {
            try {
                const isMember = await tg.sendData('check_membership');
                if (isMember === 'true') {
                    clearInterval(checkInterval);
                    channelModal.remove();
                    showToast('Welcome to ARD Manager!');
                    return true;
                }
            } catch (error) {
                console.error('Error checking membership:', error);
            }
        }, 2000);

        return false;
    } catch (error) {
        console.error('Error checking channel membership:', error);
        return false;
    }
}

// Event Listeners
searchInput.addEventListener('input', (e) => {
    currentFilter = e.target.value;
    currentPage = 1;
    renderAirdrops();
});

sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderAirdrops();
});

viewModeToggle.addEventListener('click', toggleViewMode);
expandAllButton.addEventListener('click', showFullScreenView);
fullScreenView.querySelector('.close-full-screen').addEventListener('click', hideFullScreenView);

// Close modal when clicking outside
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        hideModal();
        selectedAirdropId = null;
    }
});
