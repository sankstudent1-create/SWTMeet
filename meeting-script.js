// ==================== GLOBAL STATE ====================
let currentUser = null;
let currentMeeting = null;
let meetingId = null;
let userRole = 'participant'; // host, moderator, participant
let localStream = null;
let peerConnections = {};
window.peerConnections = peerConnections; // Expose for WebRTC utilities
let participants = [];
let chatMessages = [];
let isAudioMuted = false;
let isVideoStopped = false;
let meetingLocked = false;
let participantSubscription = null;
let meetingSubscription = null;
let chatSubscription = null;
let currentParticipantId = null; // Store our participant ID for tracking

// --- DOM Elements ---
const sidebar = document.getElementById('sidebar');
const videoGrid = document.getElementById('video-grid');
const participantsList = document.getElementById('participants-list');
const chatMessagesContainer = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const meetingTitleEl = document.getElementById('meeting-title');
const meetingCodeEl = document.getElementById('meeting-code');
const selfViewEl = document.getElementById('self-view');

let currentPanel = 'participants'; // Default panel

function toggleSidebar(panel) {
    if (panel) {
        // If a panel is specified (e.g., from control bar)
        // And the sidebar is open, but showing the *other* panel
        if (document.body.classList.contains('sidebar-open') && currentPanel !== panel) {
            showPanel(panel); // Just switch panels
            return;
        }
        // Otherwise, set the current panel and toggle the sidebar
        currentPanel = panel;
        showPanel(panel);
    }
    
    document.body.classList.toggle('sidebar-open');
}

// --- Panel Switching (Chat/Participants) ---
function showPanel(panelName) {
    currentPanel = panelName;
    
    // Update Tab Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[onclick="showPanel('${panelName}')"]`).classList.add('active');
    
    // Update Content Panels
    document.querySelectorAll('.sidebar-content').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${panelName}-panel`).classList.add('active');
}


// ==================== MEDIA CONTROLS ====================

// Toggle Microphone
document.getElementById('toggle-mic')?.addEventListener('click', async function(e) {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        isAudioMuted = !isAudioMuted;
        audioTrack.enabled = !isAudioMuted;
        
        this.classList.toggle('active', isAudioMuted);
        const span = this.querySelector('span');
        if (span) {
            span.textContent = isAudioMuted ? 'Unmute' : 'Mute';
        }
        
        showNotification(isAudioMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
    }
});

// Toggle Video
document.getElementById('toggle-video')?.addEventListener('click', async function(e) {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        isVideoStopped = !isVideoStopped;
        videoTrack.enabled = !isVideoStopped;
        
        this.classList.toggle('active', isVideoStopped);
        const span = this.querySelector('span');
        if (span) {
            span.textContent = isVideoStopped ? 'Start Video' : 'Stop Video';
        }
        
        showNotification(isVideoStopped ? 'Video stopped' : 'Video started', 'info');
    }
});

// Toggle Screen Share
let screenStream = null;
let screenShareActive = false;

document.getElementById('toggle-share')?.addEventListener('click', async function(e) {
    try {
        // Check if screen sharing is allowed
        if (!currentMeeting?.screen_sharing_enabled) {
            showNotification('Screen sharing is disabled for this meeting', 'error');
            return;
        }
        
        // Check if only host can share
        if (currentMeeting?.screen_sharing_host_only && userRole !== 'host') {
            showNotification('Only the host can share screen in this meeting', 'error');
            return;
        }
        
        if (!screenShareActive) {
            // Use VideoManager for screen share
            if (window.VideoManager) {
                screenStream = await window.VideoManager.startScreenShare();
                
                screenShareActive = true;
                this.classList.add('active');
                const span = this.querySelector('span');
                if (span) span.textContent = 'Stop Sharing';
                
                showNotification('Screen sharing started and broadcasting', 'success');
                
                // Handle when user stops sharing via browser UI
                screenStream.getVideoTracks()[0].onended = () => {
                    if (window.VideoManager) {
                        window.VideoManager.stopScreenShare();
                    }
                    screenShareActive = false;
                    this.classList.remove('active');
                    if (span) span.textContent = 'Share';
                    showNotification('Screen sharing stopped', 'info');
                };
            }
        } else {
            // Stop screen share
            if (window.VideoManager) {
                await window.VideoManager.stopScreenShare();
            }
            screenShareActive = false;
            this.classList.remove('active');
            const span = this.querySelector('span');
            if (span) span.textContent = 'Share';
            showNotification('Screen sharing stopped', 'info');
        }
    } catch (error) {
        console.error('Error sharing screen:', error);
        if (error.name === 'NotAllowedError') {
            showNotification('Screen sharing cancelled. Please click "Share" in the browser dialog to share your screen.', 'info');
        } else if (error.name === 'NotFoundError') {
            showNotification('No screen sharing source available', 'error');
        } else if (error.name === 'AbortError') {
            showNotification('Screen sharing cancelled', 'info');
        } else {
            showNotification('Failed to share screen: ' + error.message, 'error');
        }
    }
});

// Note: Screen share display now handled by VideoManager

// Toggle Recording
document.getElementById('toggle-record')?.addEventListener('click', function(e) {
    if (userRole !== 'host' && !currentMeeting?.recording_enabled) {
        showNotification('Only host can start recording', 'error');
        return;
    }
    
    this.classList.toggle('active');
    const isRecording = this.classList.contains('active');
    showNotification(isRecording ? 'Recording started' : 'Recording stopped', isRecording ? 'success' : 'info');
});

// Toggle Reactions
document.getElementById('toggle-reactions')?.addEventListener('click', function(e) {
    showNotification('Reactions feature coming soon!', 'info');
});

// Toggle Security
document.getElementById('toggle-security')?.addEventListener('click', function(e) {
    if (userRole !== 'host') {
        showNotification('Only host can access security settings', 'error');
        return;
    }
    
    showSecurityMenu();
});


// --- Simple Clock ---
function updateTime() {
    const timeDisplay = document.getElementById('time-display');
    const now = new Date();
    timeDisplay.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateTime, 1000);
updateTime(); // Initial call

// --- Initialize Meeting ---
async function initializeMeeting() {
    try {
        // Get meeting ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        meetingId = urlParams.get('id');
        
        if (!meetingId) {
            alert('No meeting ID provided');
            window.location.href = 'index.html';
            return;
        }
        
        // Get current user
        currentUser = await AuthService.getCurrentUser();
        
        // Load meeting details
        const { data: meeting, error } = await DatabaseService.getMeeting(meetingId);
        
        if (error || !meeting) {
            alert('Meeting not found');
            window.location.href = 'index.html';
            return;
        }
        
        currentMeeting = meeting;
        
        // Determine user role
        if (currentUser && currentUser.id === meeting.host_id) {
            userRole = 'host';
        } else {
            userRole = 'participant';
        }
        
        // Update meeting title
        const meetingInfo = document.querySelector('.meeting-info span:first-child');
        if (meetingInfo) {
            meetingInfo.textContent = meeting.title;
        }
        
        // Add participant to database
        if (currentUser) {
            await DatabaseService.addParticipant(meetingId, currentUser.id, userRole);
        } else {
            // Guest user - prompt for name
            const guestName = prompt('Enter your name to join:');
            if (!guestName) {
                window.location.href = 'index.html';
                return;
            }
            // TODO: Add guest participant
        }
        
        // Check if waiting room is enabled
        if (meeting.waiting_room_enabled && userRole !== 'host') {
            showWaitingRoom();
        } else {
            // Join meeting directly
            await joinMeetingRoom();
        }
        
        // Subscribe to meeting changes
        DatabaseService.subscribeMeetingChanges(meetingId, handleMeetingUpdate);
        DatabaseService.subscribeParticipantChanges(meetingId, handleParticipantUpdate);
        
        // Update meeting status to active if host
        if (userRole === 'host' && meeting.status === 'scheduled') {
            await DatabaseService.updateMeetingStatus(meetingId, 'active');
        }
        
    } catch (error) {
        console.error('Error initializing meeting:', error);
        alert('Failed to join meeting');
        window.location.href = 'index.html';
    }
}

// --- Show Waiting Room ---
function showWaitingRoom() {
    const waitingRoom = document.getElementById('waitingRoom');
    const meetingContainer = document.querySelector('.meeting-container');
    const waitingRoomTitle = document.getElementById('waitingRoomTitle');
    
    if (waitingRoom && meetingContainer) {
        waitingRoom.style.display = 'flex';
        meetingContainer.style.display = 'none';
        
        if (waitingRoomTitle && currentMeeting) {
            waitingRoomTitle.textContent = currentMeeting.title;
        }
        
        console.log('Waiting for admission. Participant ID:', currentParticipantId);
        showNotification('Waiting for host to admit you...', 'info');
        
        // Subscribe to participant status changes via Realtime
        const admissionChannel = supabaseClient
            .channel(`admission:${meetingId}:${Date.now()}`)
            .on('postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'participants',
                    filter: `id=eq.${currentParticipantId}`
                },
                async (payload) => {
                    console.log('Realtime: My participant status changed:', payload);
                    
                    if (payload.new.status === 'admitted') {
                        console.log('Realtime: Admitted! Joining meeting...');
                        admissionChannel.unsubscribe();
                        clearInterval(pollInterval);
                        waitingRoom.style.display = 'none';
                        meetingContainer.style.display = 'flex';
                        await joinMeetingRoom();
                        showNotification('You have been admitted to the meeting!', 'success');
                    } else if (payload.new.status === 'denied') {
                        console.log('Realtime: Denied entry');
                        admissionChannel.unsubscribe();
                        clearInterval(pollInterval);
                        showNotification('You were denied entry to the meeting', 'error');
                        setTimeout(() => window.location.href = 'index.html', 2000);
                    }
                }
            )
            .subscribe((status) => {
                console.log('Admission channel status:', status);
            });
        
        // Fallback: Poll every 2 seconds in case Realtime doesn't work
        const pollInterval = setInterval(async () => {
            try {
                console.log('Polling: Checking admission status...');
                const { data, error } = await supabaseClient
                    .from('participants')
                    .select('status')
                    .eq('id', currentParticipantId)
                    .single();
                
                if (error) {
                    console.error('Polling error:', error);
                    return;
                }
                
                console.log('Polling: Current status:', data.status);
                
                if (data.status === 'admitted') {
                    console.log('Polling: Admitted! Joining meeting...');
                    clearInterval(pollInterval);
                    admissionChannel.unsubscribe();
                    waitingRoom.style.display = 'none';
                    meetingContainer.style.display = 'flex';
                    await joinMeetingRoom();
                    showNotification('You have been admitted to the meeting!', 'success');
                } else if (data.status === 'denied') {
                    console.log('Polling: Denied entry');
                    clearInterval(pollInterval);
                    admissionChannel.unsubscribe();
                    showNotification('You were denied entry to the meeting', 'error');
                    setTimeout(() => window.location.href = 'index.html', 2000);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 2000);
    }
}

// Leave Waiting Room
window.leaveWaitingRoom = function() {
    if (confirm('Are you sure you want to leave?')) {
        window.location.href = 'index.html';
    }
};

// Load Waiting Room Participants (Host Only)
async function loadWaitingRoomParticipants() {
    if (userRole !== 'host') return;
    
    try {
        const { data, error } = await supabaseClient
            .from('participants')
            .select(`
                *,
                user:users(full_name, email)
            `)
            .eq('meeting_id', meetingId)
            .eq('status', 'waiting')
            .order('joined_at', { ascending: true });
        
        if (error) throw error;
        
        const waitingList = document.getElementById('waitingRoomList');
        const waitingPanel = document.getElementById('waitingRoomPanel');
        const waitingCount = document.getElementById('waitingCount');
        
        if (data && data.length > 0) {
            if (waitingPanel) waitingPanel.style.display = 'block';
            if (waitingCount) waitingCount.textContent = data.length;
            
            if (waitingList) {
                waitingList.innerHTML = data.map(p => {
                    const userName = p.user?.full_name || p.guest_name || 'Guest';
                    const joinTime = new Date(p.joined_at);
                    const waitingTime = Math.floor((Date.now() - joinTime.getTime()) / 1000 / 60);
                    
                    return `
                        <div class="waiting-participant-item">
                            <div class="waiting-participant-info">
                                <div class="waiting-participant-name">${userName}</div>
                                <div class="waiting-participant-time">Waiting ${waitingTime} min</div>
                            </div>
                            <div class="waiting-participant-actions">
                                <button class="btn-admit" onclick="admitParticipant('${p.id}')">Admit</button>
                                <button class="btn-deny" onclick="denyParticipant('${p.id}')">Deny</button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            if (waitingPanel) waitingPanel.style.display = 'none';
            if (waitingCount) waitingCount.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading waiting room:', error);
    }
}

// Admit Participant (Host Only)
window.admitParticipant = async function(participantId) {
    if (userRole !== 'host') {
        showNotification('Only host can admit participants', 'error');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ status: 'admitted' })
            .eq('id', participantId);
        
        if (error) throw error;
        
        showNotification('Participant admitted', 'success');
        await loadWaitingRoomParticipants();
    } catch (error) {
        console.error('Error admitting participant:', error);
        showNotification('Failed to admit participant', 'error');
    }
};

// Deny Participant (Host Only)
window.denyParticipant = async function(participantId) {
    if (userRole !== 'host') {
        showNotification('Only host can deny participants', 'error');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('participants')
            .update({ status: 'denied' })
            .eq('id', participantId);
        
        if (error) throw error;
        
        showNotification('Participant denied', 'success');
        await loadWaitingRoomParticipants();
    } catch (error) {
        console.error('Error denying participant:', error);
        showNotification('Failed to deny participant', 'error');
    }
};

// Close Waiting Room Panel
window.closeWaitingRoomPanel = function() {
    const waitingPanel = document.getElementById('waitingRoomPanel');
    if (waitingPanel) {
        waitingPanel.style.display = 'none';
    }
};

// --- Join Meeting Room ---
async function joinMeetingRoom() {
    try {
        // Request media permissions
        await requestMediaPermissions();
        
        // Load participants
        await loadParticipants();
        
        // Show host controls if user is host
        if (userRole === 'host') {
            showHostControls();
        }
        
        // Initialize new features
        if (typeof WebRTC !== 'undefined') {
            WebRTC.setupSignaling();
            console.log('WebRTC initialized');
        }
        
        if (typeof Reactions !== 'undefined') {
            Reactions.setupReactions();
            console.log('Reactions initialized');
        }
        
        if (typeof RaiseHand !== 'undefined') {
            RaiseHand.setupRaiseHand();
            console.log('Raise hand initialized');
        }
        
        console.log('Joined meeting successfully');
    } catch (error) {
        console.error('Error joining meeting room:', error);
    }
}

// --- Request Media Permissions ---
async function requestMediaPermissions() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        window.localStream = localStream;
        
        // Use VideoManager to display local video
        if (window.VideoManager) {
            window.VideoManager.displayLocal(localStream);
        }
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Could not access camera/microphone. Please check permissions.');
    }
}

// --- Load Participants ---
async function loadParticipants() {
    try {
        // Only load participants who are admitted (not waiting, not left)
        const { data, error } = await supabaseClient
            .from('participants')
            .select(`
                *,
                user:users(full_name, email, avatar_url)
            `)
            .eq('meeting_id', meetingId)
            .eq('status', 'admitted')
            .order('joined_at', { ascending: true });
        
        if (error) throw error;
        
        participants = data || [];
        window.participants = participants; // Update global reference
        updateParticipantsList();
    } catch (error) {
        console.error('Error loading participants:', error);
    }
}

// --- Update Participants List ---
function updateParticipantsList() {
    const participantsList = document.querySelector('.participants-list');
    if (!participantsList) return;
    
    participantsList.innerHTML = participants.map(p => {
        const isCurrentUser = currentUser && p.user_id === currentUser.id;
        const userName = p.user?.full_name || p.guest_name || 'Guest';
        const isHost = p.role === 'host';
        
        return `
            <div class="participant-item">
                <span class="participant-name-list">
                    ${userName}
                    ${isHost ? '<span class="host-tag">(Host)</span>' : ''}
                    ${isCurrentUser ? '<span class="host-tag">(You)</span>' : ''}
                </span>
                <div class="participant-item-controls">
                    ${userRole === 'host' && !isCurrentUser ? `
                        <button class="icon-btn-sm host-control" title="Mute ${userName}" onclick="muteParticipant('${p.id}')">
                            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path></svg>
                        </button>
                        <button class="icon-btn-sm host-control" title="More options" onclick="showParticipantMenu('${p.id}')">
                            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Update participant count
    const participantTab = document.querySelector('[onclick="showPanel(\'participants\')"]');
    if (participantTab) {
        participantTab.textContent = `Participants (${participants.length})`;
    }
}

// --- Show Host Controls ---
function showHostControls() {
    // Show mute all button
    const muteAllBtn = document.querySelector('.btn-mute-all');
    if (muteAllBtn) {
        muteAllBtn.style.display = 'block';
    }
    
    // Show host control buttons
    document.querySelectorAll('.host-control').forEach(btn => {
        btn.style.display = 'inline-flex';
    });
}

// --- Handle Meeting Update ---
function handleMeetingUpdate(payload) {
    console.log('Meeting updated:', payload);
    if (payload.new) {
        currentMeeting = payload.new;
    }
}

// --- Handle Participant Update ---
function handleParticipantUpdate(payload) {
    console.log('Participant updated:', payload);
    loadParticipants();
}

// --- Mute Participant (Host Only) ---
window.muteParticipant = function(participantId) {
    if (userRole !== 'host') return;
    
    // TODO: Implement mute participant via WebRTC
    console.log('Mute participant:', participantId);
    alert('Mute participant feature coming soon!');
};

// --- Show Participant Menu (Host Only) ---
window.showParticipantMenu = function(participantId) {
    if (userRole !== 'host') return;
    
    // TODO: Implement participant menu
    console.log('Show menu for participant:', participantId);
};

// Original leave meeting function removed - see enhanced version below

// ==================== CHAT FUNCTIONS ====================

// Send Chat Message
window.sendChatMessage = async function() {
    const message = chatInput?.value.trim();
    if (!message) return;
    
    try {
        const userName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Guest';
        
        // Add to local array immediately for instant feedback
        const newMessage = {
            id: Date.now(),
            message: message,
            author: userName,
            isOwn: true,
            created_at: new Date().toISOString()
        };
        
        chatMessages.push(newMessage);
        renderChatMessages();
        chatInput.value = '';
        
        // Save to database if user is authenticated
        if (currentUser) {
            // Get participant ID
            const participant = participants.find(p => p.user_id === currentUser.id);
            if (participant) {
                const { error } = await supabaseClient
                    .from('chat_messages')
                    .insert([{
                        meeting_id: meetingId,
                        participant_id: participant.id,
                        message: message,
                        message_type: 'text'
                    }]);
                
                if (error) console.error('Error saving chat:', error);
            }
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Failed to send message', 'error');
    }
};

// Render Chat Messages
function renderChatMessages() {
    if (!chatMessagesContainer) return;
    
    chatMessagesContainer.innerHTML = chatMessages.map(msg => `
        <div class="chat-message ${msg.isOwn ? 'self' : ''}">
            <span class="chat-author">${msg.author}</span>
            <p>${escapeHtml(msg.message)}</p>
        </div>
    `).join('');
    
    // Scroll to bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// Load Chat History
async function loadChatHistory() {
    try {
        const { data, error } = await supabaseClient
            .from('chat_messages')
            .select(`
                *,
                participant:participants(
                    user:users(full_name, email),
                    guest_name
                )
            `)
            .eq('meeting_id', meetingId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        chatMessages = (data || []).map(msg => ({
            id: msg.id,
            message: msg.message,
            author: msg.participant?.user?.full_name || msg.participant?.guest_name || 'Guest',
            isOwn: currentUser && msg.participant?.user_id === currentUser.id,
            created_at: msg.created_at
        }));
        
        renderChatMessages();
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

// ==================== HOST CONTROLS ====================

// Mute All Participants
window.muteAllParticipants = function() {
    if (userRole !== 'host') {
        showNotification('Only host can mute all participants', 'error');
        return;
    }
    
    if (confirm('Mute all participants?')) {
        showNotification('Mute all feature coming soon!', 'info');
        // TODO: Implement via WebRTC signaling
    }
};

// Toggle Meeting Lock
window.toggleMeetingLock = async function() {
    if (userRole !== 'host') {
        showNotification('Only host can lock/unlock meeting', 'error');
        return;
    }
    
    try {
        meetingLocked = !meetingLocked;
        
        // Update in database
        const { error } = await supabaseClient
            .from('meetings')
            .update({ 
                settings: { ...currentMeeting.settings, locked: meetingLocked }
            })
            .eq('id', meetingId);
        
        if (error) throw error;
        
        const lockBtn = document.getElementById('lock-text');
        if (lockBtn) {
            lockBtn.textContent = meetingLocked ? 'Unlock Meeting' : 'Lock Meeting';
        }
        
        showNotification(
            meetingLocked ? 'Meeting locked - no new participants can join' : 'Meeting unlocked',
            'success'
        );
    } catch (error) {
        console.error('Error toggling lock:', error);
        showNotification('Failed to toggle meeting lock', 'error');
    }
};

// Show Security Menu
function showSecurityMenu() {
    if (userRole !== 'host') {
        showNotification('Only host can access security settings', 'error');
        return;
    }
    
    // Open participants sidebar to show host controls
    if (!document.body.classList.contains('sidebar-open')) {
        toggleSidebar('participants');
    } else {
        showPanel('participants');
    }
    
    showNotification('Host controls available in Participants sidebar', 'info');
}

// Toggle Waiting Room
window.toggleWaitingRoom = async function() {
    if (userRole !== 'host') {
        showNotification('Only host can toggle waiting room', 'error');
        return;
    }
    
    try {
        const newWaitingRoomState = !currentMeeting.waiting_room_enabled;
        
        // Update in database
        const { error } = await supabaseClient
            .from('meetings')
            .update({ 
                waiting_room_enabled: newWaitingRoomState,
                updated_at: new Date().toISOString()
            })
            .eq('id', meetingId);
        
        if (error) throw error;
        
        currentMeeting.waiting_room_enabled = newWaitingRoomState;
        
        const waitingRoomText = document.getElementById('waiting-room-text');
        if (waitingRoomText) {
            waitingRoomText.textContent = newWaitingRoomState ? 'Disable Waiting Room' : 'Enable Waiting Room';
        }
        
        showNotification(
            newWaitingRoomState ? 'Waiting room enabled - new participants need approval' : 'Waiting room disabled',
            'success'
        );
    } catch (error) {
        console.error('Error toggling waiting room:', error);
        showNotification('Failed to toggle waiting room', 'error');
    }
};

// End Meeting for All
window.endMeetingForAll = async function() {
    if (userRole !== 'host') {
        showNotification('Only host can end meeting for all', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to end this meeting for everyone? This cannot be undone.')) {
        return;
    }
    
    try {
        const endTime = new Date();
        const startTime = currentMeeting.started_at ? new Date(currentMeeting.started_at) : endTime;
        const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);
        
        // Update meeting status to ended with end time and duration
        const { error } = await supabaseClient
            .from('meetings')
            .update({
                status: 'ended',
                ended_at: endTime.toISOString(),
                actual_duration: durationMinutes
            })
            .eq('id', meetingId);
        
        if (error) throw error;
        
        // Update all participants to left
        const { error: participantError } = await supabaseClient
            .from('participants')
            .update({ 
                status: 'left',
                left_at: endTime.toISOString()
            })
            .eq('meeting_id', meetingId)
            .eq('status', 'admitted');
        
        if (participantError) console.error('Error updating participants:', participantError);
        
        showNotification(`Meeting ended (Duration: ${durationMinutes} minutes)`, 'success');
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        console.error('Error ending meeting:', error);
        showNotification('Failed to end meeting', 'error');
    }
};

// Remove Participant
window.removeParticipant = async function(participantId) {
    if (userRole !== 'host') {
        showNotification('Only host can remove participants', 'error');
        return;
    }
    
    if (confirm('Remove this participant from the meeting?')) {
        try {
            const { error } = await DatabaseService.updateParticipantStatus(participantId, 'removed');
            if (error) throw error;
            
            showNotification('Participant removed', 'success');
            await loadParticipants();
        } catch (error) {
            console.error('Error removing participant:', error);
            showNotification('Failed to remove participant', 'error');
        }
    }
};

// ==================== UTILITY FUNCTIONS ====================

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
        font-weight: 600;
        max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy Meeting ID
document.getElementById('meeting-id-display')?.addEventListener('click', async function() {
    try {
        await navigator.clipboard.writeText(meetingId);
        showNotification('Meeting ID copied!', 'success');
    } catch (error) {
        showNotification('Failed to copy', 'error');
    }
});

// ==================== INITIALIZATION ====================

// Update Meeting UI
function updateMeetingUI() {
    if (meetingTitleEl && currentMeeting) {
        meetingTitleEl.textContent = currentMeeting.title;
    }
    
    if (meetingCodeEl) {
        meetingCodeEl.textContent = meetingId;
    }
    
    // Show host controls
    if (userRole === 'host') {
        const hostFooter = document.getElementById('host-controls-footer');
        if (hostFooter) {
            hostFooter.style.display = 'block';
        }
    }
}

// Enhanced Initialize Meeting
async function initializeMeeting() {
    try {
        // Get meeting ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        meetingId = urlParams.get('id');
        
        if (!meetingId) {
            showNotification('No meeting ID provided', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        // Get current user (may be null for guests)
        try {
            currentUser = await AuthService.getCurrentUser();
        } catch (error) {
            console.log('No authenticated user, will proceed as guest');
            currentUser = null;
        }
        
        // Load meeting details
        const { data: meeting, error } = await DatabaseService.getMeeting(meetingId);
        
        if (error || !meeting) {
            showNotification('Meeting not found', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        currentMeeting = meeting;
        
        // Determine user role
        if (currentUser && currentUser.id === meeting.host_id) {
            userRole = 'host';
        } else {
            userRole = 'participant';
        }
        
        // Update UI
        updateMeetingUI();
        
        // Check if meeting is locked
        if (meeting.settings?.locked && userRole !== 'host') {
            showNotification('This meeting is locked', 'error');
            setTimeout(() => window.location.href = 'index.html', 2000);
            return;
        }
        
        // Add or update participant in database
        if (currentUser) {
            // Check if participant already exists
            const { data: existingParticipant, error: checkError } = await supabaseClient
                .from('participants')
                .select('*')
                .eq('meeting_id', meetingId)
                .eq('user_id', currentUser.id)
                .single();
            
            if (existingParticipant) {
                // Update existing participant - rejoin
                currentParticipantId = existingParticipant.id;
                const { error: updateError } = await supabaseClient
                    .from('participants')
                    .update({
                        status: userRole === 'host' ? 'admitted' : (meeting.waiting_room_enabled ? 'waiting' : 'admitted'),
                        role: userRole,
                        joined_at: new Date().toISOString(),
                        left_at: null
                    })
                    .eq('id', existingParticipant.id);
                
                if (updateError) {
                    console.error('Error updating participant:', updateError);
                }
            } else {
                // Add new participant
                const { data: newParticipant, error: participantError } = await supabaseClient
                    .from('participants')
                    .insert([{
                        meeting_id: meetingId,
                        user_id: currentUser.id,
                        role: userRole,
                        status: userRole === 'host' ? 'admitted' : (meeting.waiting_room_enabled ? 'waiting' : 'admitted'),
                        joined_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                
                if (participantError) {
                    console.error('Error adding participant:', participantError);
                } else {
                    currentParticipantId = newParticipant.id;
                }
            }
        } else {
            // Guest user - prompt for name
            const guestName = prompt('Enter your name to join:');
            if (!guestName) {
                window.location.href = 'index.html';
                return;
            }
            
            // Add guest participant
            const { data: guestParticipant, error: guestError } = await supabaseClient
                .from('participants')
                .insert([{
                    meeting_id: meetingId,
                    guest_name: guestName,
                    role: 'participant',
                    status: meeting.waiting_room_enabled ? 'waiting' : 'admitted',
                    joined_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (guestError) {
                console.error('Error adding guest:', guestError);
            } else {
                currentParticipantId = guestParticipant.id;
            }
        }
        
        console.log('Current participant ID:', currentParticipantId);
        
        // Check if waiting room is enabled
        if (meeting.waiting_room_enabled && userRole !== 'host') {
            showWaitingRoom();
            // Still subscribe to updates while waiting
            setupRealtimeSubscriptions();
            return;
        }
        
        // Join meeting directly
        await joinMeetingRoom();
        
        // Subscribe to real-time changes
        setupRealtimeSubscriptions();
        
        // Update meeting status to active if host and record start time
        if (userRole === 'host' && meeting.status === 'scheduled') {
            await supabaseClient
                .from('meetings')
                .update({
                    status: 'active',
                    started_at: new Date().toISOString()
                })
                .eq('id', meetingId);
        }
        
        // Load chat history
        await loadChatHistory();
        
        // Load waiting room participants if host
        if (userRole === 'host') {
            await loadWaitingRoomParticipants();
            // Check for waiting participants every 5 seconds
            setInterval(loadWaitingRoomParticipants, 5000);
        }
        
        showNotification('Joined meeting successfully!', 'success');
        
    } catch (error) {
        console.error('Error initializing meeting:', error);
        showNotification('Failed to join meeting', 'error');
        setTimeout(() => window.location.href = 'index.html', 2000);
    }
}

// Setup Realtime Subscriptions
let hasInitialLoad = false;

function setupRealtimeSubscriptions() {
    // Subscribe to participant changes
    participantSubscription = DatabaseService.subscribeParticipantChanges(meetingId, (payload) => {
        console.log('Participant change:', payload);
        
        // Only show notification for new participants after initial load
        if (hasInitialLoad && payload.eventType === 'INSERT') {
            const isCurrentUser = currentUser && payload.new.user_id === currentUser.id;
            if (!isCurrentUser) {
                const userName = payload.new.user?.full_name || payload.new.guest_name || 'Someone';
                showNotification(`${userName} joined the meeting`, 'info');
            }
        }
        
        loadParticipants();
    });
    
    // Subscribe to meeting changes
    meetingSubscription = DatabaseService.subscribeMeetingChanges(meetingId, (payload) => {
        console.log('Meeting change:', payload);
        if (payload.new) {
            currentMeeting = payload.new;
            updateMeetingUI();
            
            // Check if meeting ended
            if (payload.new.status === 'ended' && userRole !== 'host') {
                showNotification('Meeting has been ended by the host', 'error');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        }
    });
    
    // Subscribe to chat messages
    chatSubscription = supabaseClient
        .channel(`chat:${meetingId}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `meeting_id=eq.${meetingId}` },
            (payload) => {
                console.log('New chat message:', payload);
                loadChatHistory();
            }
        )
        .subscribe();
    
    // Mark initial load complete after a short delay
    setTimeout(() => {
        hasInitialLoad = true;
    }, 1000);
}

// Enhanced Leave Meeting
async function leaveMeeting() {
    if (confirm('Are you sure you want to leave the meeting?')) {
        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        
        // Stop screen share if active
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }
        
        // Close peer connections
        Object.values(peerConnections).forEach(pc => pc.close());
        
        // Unsubscribe from realtime
        if (participantSubscription) participantSubscription.unsubscribe();
        if (meetingSubscription) meetingSubscription.unsubscribe();
        if (chatSubscription) chatSubscription.unsubscribe();
        
        // Cleanup new features
        if (typeof WebRTC !== 'undefined') {
            WebRTC.cleanupWebRTC();
        }
        if (typeof Reactions !== 'undefined') {
            Reactions.cleanupReactions();
        }
        if (typeof RaiseHand !== 'undefined') {
            RaiseHand.cleanupRaiseHand();
        }
        
        // Update participant status with left_at time
        if (currentUser) {
            const participant = participants.find(p => p.user_id === currentUser.id);
            if (participant) {
                await supabaseClient
                    .from('participants')
                    .update({ 
                        status: 'left',
                        left_at: new Date().toISOString()
                    })
                    .eq('id', participant.id);
            }
        }
        
        // Redirect to home
        window.location.href = 'index.html';
    }
}

// Add leave button handler
const leaveBtn = document.querySelector('.btn-leave');
if (leaveBtn) {
    leaveBtn.addEventListener('click', leaveMeeting);
}

// Initialize meeting on page load
if (typeof AuthService !== 'undefined' && typeof DatabaseService !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize VideoManager first
        if (window.VideoManager) {
            window.VideoManager.init();
        }
        // Then initialize meeting
        initializeMeeting();
    });
} else {
    console.error('Supabase services not loaded. Please include config/supabase.js');
    showNotification('Configuration error. Please reload the page.', 'error');
}