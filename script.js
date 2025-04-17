// Room configuration
const rooms = {
    // Main Building
    groundFloor: ['001', '002', '003'],
    firstFloor: ['101', '102', '103', '104', '105', '106', '107'],
    secondFloor: ['201', '202', '203', '204', '205', '206', '207'],
    
    // New Building
    newGroundFloor: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '010', '011', '012'],
    newFirstFloor: ['11', '12', '13', '14', '15', '16', '17'],
    newSecondFloor: ['21', '22', '23', '24', '25', '26', '27'],
    newThirdFloor: ['31', '32', '33', '34', '35', '36', '37']
};

// Initialize room status data
let roomStatus = {};

// Telegram credentials
const TELEGRAM_BOT_TOKEN = '7059872493:AAGhsZJx9cUf_nQgrWye9sNCqt6Vk9B8BnM';
const TELEGRAM_CHAT_ID = '-4583086340';

// API base URL
const API_BASE_URL = 'https://sambath.axt.store';

// Pending changes for batch processing
let pendingChanges = {
    statusUpdates: {}
};

// Function to show loading spinner
function showLoading() {
    document.querySelector('.loading-spinner').style.display = 'block';
}

// Function to hide loading spinner
function hideLoading() {
    document.querySelector('.loading-spinner').style.display = 'none';
}

// Function to create room cards
function createRoomCard(roomNumber) {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.id = `room-${roomNumber}`;
    
    card.innerHTML = `
        <div class="status-indicator"></div>
        <div class="room-number">
            <i class="fas fa-door-closed"></i>
            បន្ទប់ ${roomNumber}
        </div>
        <div class="room-info">
            <i class="fas fa-info-circle"></i>
            <span class="status-text">Current Status: Available</span>
        </div>
        <div class="notes-section">
            <i class="fas fa-sticky-note"></i>
            <div class="notes-container">
                <div class="notes-list"></div>
                <div class="notes-actions">
                    <button class="add-note-btn" onclick="addNote('${roomNumber}')">
                        <i class="fas fa-plus"></i> Add Note
                    </button>
                    <button class="view-notes-btn" onclick="viewNotes('${roomNumber}')">
                        <i class="fas fa-list"></i> View Notes
                    </button>
                </div>
            </div>
        </div>
        <div class="room-status">
            <span class="status-label">Check Out</span>
            <label class="switch">
                <input type="checkbox" onchange="handleStatusToggle('${roomNumber}', this.checked)">
                <span class="slider"></span>
            </label>
            <span class="status-label">Check In</span>
        </div>
    `;
    
    return card;
}

// Function to update room card UI
function updateRoomCardUI(roomNumber, status) {
    const roomCard = document.getElementById(`room-${roomNumber}`);
    if (!roomCard) return;
    
    const statusIndicator = roomCard.querySelector('.status-indicator');
    const statusText = roomCard.querySelector('.status-text');
    const notesElement = roomCard.querySelector('.notes-list');
    const toggleSwitch = roomCard.querySelector('input[type="checkbox"]');
    
    roomCard.className = 'room-card ' + status;
    toggleSwitch.checked = status === 'checked-in';
    
    if (status === 'checked-in') {
        statusIndicator.textContent = 'នៅ';
        statusText.textContent = 'Current Status: ចូល';
    } else {
        statusIndicator.textContent = 'អត់នៅ';
        statusText.textContent = 'Current Status: ចេញ';
    }

    // Update notes display
    if (roomStatus[roomNumber]?.notes?.length > 0) {
        const latestNote = roomStatus[roomNumber].notes[roomStatus[roomNumber].notes.length - 1];
        notesElement.textContent = `Latest: ${latestNote.text}`;
    } else {
        notesElement.textContent = 'No notes';
    }
}

// Function to populate rooms
function populateRooms() {
    // Main Building
    const groundFloorContainer = document.getElementById('ground-floor');
    rooms.groundFloor.forEach(roomNumber => {
        groundFloorContainer.appendChild(createRoomCard(roomNumber));
    });

    const firstFloorContainer = document.getElementById('first-floor');
    rooms.firstFloor.forEach(roomNumber => {
        firstFloorContainer.appendChild(createRoomCard(roomNumber));
    });

    const secondFloorContainer = document.getElementById('second-floor');
    rooms.secondFloor.forEach(roomNumber => {
        secondFloorContainer.appendChild(createRoomCard(roomNumber));
    });

    // New Building
    const newGroundFloorContainer = document.getElementById('new-ground-floor');
    rooms.newGroundFloor.forEach(roomNumber => {
        newGroundFloorContainer.appendChild(createRoomCard(roomNumber));
    });

    const newFirstFloorContainer = document.getElementById('new-first-floor');
    rooms.newFirstFloor.forEach(roomNumber => {
        newFirstFloorContainer.appendChild(createRoomCard(roomNumber));
    });

    const newSecondFloorContainer = document.getElementById('new-second-floor');
    rooms.newSecondFloor.forEach(roomNumber => {
        newSecondFloorContainer.appendChild(createRoomCard(roomNumber));
    });

    const newThirdFloorContainer = document.getElementById('new-third-floor');
    rooms.newThirdFloor.forEach(roomNumber => {
        newThirdFloorContainer.appendChild(createRoomCard(roomNumber));
    });
}

// Batch processor for handling operations
class BatchProcessor {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.timeout = null;
    }

    add(operation) {
        this.queue.push(operation);
        this.scheduleProcess();
    }

    scheduleProcess() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        
        this.timeout = setTimeout(() => this.processBatch(), 2000);
    }

    async processBatch() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        showLoading();

        try {
            const operations = [...this.queue];
            this.queue = [];

            operations.forEach(op => op.updateLocal());
            await updateJSONBin();
            const message = operations.map(op => op.getMessage()).join('\n');
            await sendTelegramMessage(message);
            operations.forEach(op => op.updateUI());

        } catch (error) {
            console.error('Error processing batch:', error);
            alert('Some operations failed. Please try again.');
        } finally {
            this.isProcessing = false;
            hideLoading();
        }
    }
}

const batchProcessor = new BatchProcessor();

// Pending changes bar
function showPendingChangesBar() {
    const pendingBar = document.querySelector('.pending-changes-bar') || createPendingChangesBar();
    const count = Object.keys(pendingChanges.statusUpdates).length;
    
    if (count > 0) {
        pendingBar.style.display = 'flex';
        pendingBar.querySelector('.pending-count').textContent = count;
    } else {
        pendingBar.style.display = 'none';
    }
}

function createPendingChangesBar() {
    const bar = document.createElement('div');
    bar.className = 'pending-changes-bar';
    bar.innerHTML = `
        <div class="pending-message">
            <span class="pending-count">0</span> pending changes
        </div>
        <div class="pending-actions">
            <button class="submit-changes-btn" onclick="submitAllChanges()">
                <i class="fas fa-save"></i> Submit All Changes
            </button>
            <button class="cancel-changes-btn" onclick="cancelAllChanges()">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
    `;
    document.body.appendChild(bar);
    return bar;
}

// Handle status toggle
function handleStatusToggle(roomNumber, isChecked) {
    const status = isChecked ? 'checked-in' : 'checked-out';
    updateRoomStatus(roomNumber, status);
}

// Update room status
async function updateRoomStatus(roomNumber, status) {
    pendingChanges.statusUpdates[roomNumber] = status;
    const roomCard = document.getElementById(`room-${roomNumber}`);
    roomCard.classList.add('pending');
    showPendingChangesBar();
}

// Submit all changes
async function submitAllChanges() {
    showLoading();
    
    try {
        Object.entries(pendingChanges.statusUpdates).forEach(([roomNumber, status]) => {
            if (!roomStatus[roomNumber]) {
                roomStatus[roomNumber] = { status: status, notes: [] };
            } else {
                roomStatus[roomNumber].status = status;
            }
        });

        await updateJSONBin();

        const messages = Object.entries(pendingChanges.statusUpdates).map(([room, status]) =>
            status === 'checked-in' ? 
                `🏨 Room ${room} has been checked in` :
                `🔑 Room ${room} has been checked out`
        );
        
        if (messages.length > 0) {
            await sendTelegramMessage(messages.join('\n'));
        }

        Object.entries(pendingChanges.statusUpdates).forEach(([roomNumber, status]) => {
            updateRoomCardUI(roomNumber, status);
        });

        pendingChanges = { statusUpdates: {} };
        showPendingChangesBar();
        
        document.querySelectorAll('.room-card.pending').forEach(card => {
            card.classList.remove('pending');
        });

    } catch (error) {
        console.error('Error submitting changes:', error);
        alert('Failed to submit changes. Please try again.');
    } finally {
        hideLoading();
    }
}

// Cancel all changes
function cancelAllChanges() {
    pendingChanges = { statusUpdates: {} };
    document.querySelectorAll('.room-card.pending').forEach(card => {
        card.classList.remove('pending');
    });
    showPendingChangesBar();
}

// Load initial room status
async function loadRoomStatus() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/rooms`);
        if (!response.ok) throw new Error('Failed to load room status');
        const data = await response.json();
        roomStatus = data;

        Object.entries(roomStatus).forEach(([roomNumber, roomData]) => {
            updateRoomCardUI(roomNumber, roomData.status);
        });

    } catch (error) {
        console.error('Error loading room status:', error);
        alert('Failed to load room status. Please refresh the page.');
    } finally {
        hideLoading();
    }
}

// Add note
function addNote(roomNumber) {
    const note = prompt('Enter note for Room ' + roomNumber + ':');
    if (note) {
        const newNote = {
            text: note,
            timestamp: new Date().toISOString()
        };

        if (!roomStatus[roomNumber]) {
            roomStatus[roomNumber] = { status: 'checked-out', notes: [] };
        }
        if (!roomStatus[roomNumber].notes) {
            roomStatus[roomNumber].notes = [];
        }

        roomStatus[roomNumber].notes.push(newNote);
        updateRoomCardUI(roomNumber, roomStatus[roomNumber].status);

        updateJSONBin()
            .then(() => sendTelegramMessage(`📝 New note for Room ${roomNumber}:\n${note}`))
            .catch(error => {
                console.error('Error saving note:', error);
                alert('Failed to save note. Please try again.');
            });
    }
}

// Update JSONBin
async function updateJSONBin() {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(roomStatus)
    });

    if (!response.ok) throw new Error('Failed to update status');
}

// Send Telegram message
async function sendTelegramMessage(message) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!response.ok) throw new Error('Failed to send Telegram message');
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}

// View notes
function viewNotes(roomNumber) {
    const notes = roomStatus[roomNumber]?.notes || [];
    
    const modalContent = document.createElement('div');
    modalContent.className = 'notes-modal';
    
    modalContent.innerHTML = `
        <h2>Notes for Room ${roomNumber}</h2>
        <div class="notes-list">
            ${notes.map((note, index) => `
                <div class="note-item">
                    <div class="note-text">${note.text}</div>
                    <div class="note-timestamp">${new Date(note.timestamp).toLocaleString()}</div>
                    <button class="delete-note-btn" onclick="deleteNote('${roomNumber}', ${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('') || '<p>No notes available</p>'}
        </div>
        <div class="modal-buttons">
            <button class="add-note-btn" onclick="addNote('${roomNumber}')">
                <i class="fas fa-plus"></i> Add New Note
            </button>
            <button class="clear-notes-btn" onclick="clearAllNotes('${roomNumber}')">
                <i class="fas fa-trash-alt"></i> Clear All Notes
            </button>
        </div>
        <button class="close-modal-btn" onclick="closeNotesModal()">Close</button>
    `;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Delete note
async function deleteNote(roomNumber, index) {
    const confirmed = confirm('Are you sure you want to delete this note?');
    if (!confirmed) return;

    showLoading();
    try {
        roomStatus[roomNumber].notes.splice(index, 1);
        await updateJSONBin();
        await sendTelegramMessage(`🗑️ Note deleted from Room ${roomNumber}`);
        closeNotesModal();
        updateRoomCardUI(roomNumber, roomStatus[roomNumber].status);
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note. Please try again.');
    } finally {
        hideLoading();
    }
}

// Close modal
function closeNotesModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Clear all notes for a room
async function clearAllNotes(roomNumber) {
    const confirmed = confirm(`Are you sure you want to delete all notes for Room ${roomNumber}?`);
    if (!confirmed) return;

    showLoading();
    try {
        roomStatus[roomNumber].notes = [];
        await updateJSONBin();
        await sendTelegramMessage(`🗑️ All notes cleared for Room ${roomNumber}`);
        closeNotesModal();
        updateRoomCardUI(roomNumber, roomStatus[roomNumber].status);
    } catch (error) {
        console.error('Error clearing notes:', error);
        alert('Failed to clear notes. Please try again.');
    } finally {
        hideLoading();
    }
}

// Clear all notes for all rooms
async function clearAllNotes() {
    const confirmed = confirm('Are you sure you want to clear all notes from all rooms?');
    if (!confirmed) return;

    showLoading();
    try {
        Object.keys(roomStatus).forEach(roomNumber => {
            if (roomStatus[roomNumber]) {
                roomStatus[roomNumber].notes = [];
            }
        });

        await updateJSONBin();
        await sendTelegramMessage('🗑️ All notes have been cleared from all rooms');

        Object.keys(roomStatus).forEach(roomNumber => {
            if (roomStatus[roomNumber]) {
                updateRoomCardUI(roomNumber, roomStatus[roomNumber].status);
            }
        });

        alert('All notes have been cleared successfully');

    } catch (error) {
        console.error('Error clearing all notes:', error);
        alert('Failed to clear all notes. Please try again.');
    } finally {
        hideLoading();
    }
}

// Checkout all rooms
async function checkoutAllRooms() {
    const confirmed = confirm('Are you sure you want to check out all rooms?');
    if (!confirmed) return;

    showLoading();
    try {
        Object.keys(roomStatus).forEach(roomNumber => {
            if (roomStatus[roomNumber]?.status === 'checked-in') {
                roomStatus[roomNumber].status = 'checked-out';
            }
        });

        await updateJSONBin();
        await sendTelegramMessage('🔑 All rooms have been checked out');

        Object.keys(roomStatus).forEach(roomNumber => {
            updateRoomCardUI(roomNumber, roomStatus[roomNumber].status);
        });

    } catch (error) {
        console.error('Error checking out all rooms:', error);
        alert('Failed to check out all rooms. Please try again.');
    } finally {
        hideLoading();
    }
}

// Initialize building switcher
function initializeBuildingSwitcher() {
    const buttons = document.querySelectorAll('.building-btn');
    const buildings = {
        main: document.getElementById('main-building'),
        new: document.getElementById('new-building')
    };

    buildings.main.style.display = 'block';
    buildings.main.style.opacity = '1';
    buildings.main.style.transform = 'translateY(0)';

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const buildingToShow = button.dataset.building;
            Object.entries(buildings).forEach(([key, building]) => {
                if (key === buildingToShow) {
                    building.style.display = 'block';
                    building.offsetHeight;
                    building.style.opacity = '1';
                    building.style.transform = 'translateY(0)';
                } else {
                    building.style.opacity = '0';
                    building.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        building.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

// Initialize scroll header
function initializeScrollHeader() {
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 50) {
            header.classList.add('condensed');
        } else {
            header.classList.remove('condensed');
        }
        
        lastScrollTop = scrollTop;
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    populateRooms();
    loadRoomStatus();
    initializeBuildingSwitcher();
    initializeScrollHeader();
    document.getElementById('checkout-all-btn').addEventListener('click', checkoutAllRooms);
    document.getElementById('clear-all-notes-btn').addEventListener('click', clearAllNotes);
});
