// Raise Hand Feature
// Add this to meeting.html: <script src="raise-hand.js"></script>

// ==================== GLOBAL STATE ====================

let handRaised = false;
let raiseHandChannel = null;
const raisedHands = new Set(); // Track who has hands raised

// ==================== SETUP ====================

function setupRaiseHand() {
    console.log('Setting up raise hand feature...');
    
    // Create Supabase Realtime channel for raise hand
    raiseHandChannel = supabaseClient
        .channel(`raise-hand:${meetingId}`)
        .on('broadcast', { event: 'hand-raised' }, ({ payload }) => {
            console.log('Hand raised:', payload);
            handleHandRaised(payload);
        })
        .on('broadcast', { event: 'hand-lowered' }, ({ payload }) => {
            console.log('Hand lowered:', payload);
            handleHandLowered(payload);
        })
        .subscribe((status) => {
            console.log('Raise hand channel status:', status);
        });
}

// ==================== TOGGLE RAISE HAND ====================

window.toggleRaiseHand = async function() {
    console.log('✋ toggleRaiseHand called');
    
    // Check if channel is initialized
    if (!raiseHandChannel) {
        console.error('❌ Raise hand channel not initialized');
        if (window.showNotification) {
            window.showNotification('Raise hand feature not ready yet', 'error');
        }
        return;
    }
    
    // Check required globals
    if (!window.currentParticipantId) {
        console.error('❌ currentParticipantId not set for raise hand!');
        if (window.showNotification) {
            window.showNotification('Cannot raise hand - not properly initialized', 'error');
        }
        return;
    }
    
    handRaised = !handRaised;
    console.log('✋ Hand raised state:', handRaised);
    
    // Get user name from global window object with fallbacks
    const userName = window.currentUser?.user_metadata?.full_name || 
                     window.currentUser?.email?.split('@')[0] || 
                     window.participants?.find(p => p.id === window.currentParticipantId)?.guest_name ||
                     'Guest';
    
    console.log('✋ Raise hand from:', userName, '(Participant ID:', window.currentParticipantId?.substring(0, 8) + '...)');
    
    const button = document.getElementById('toggle-raise-hand');
    const buttonText = document.getElementById('raise-hand-text');
    
    if (handRaised) {
        // Raise hand
        await raiseHandChannel.send({
            type: 'broadcast',
            event: 'hand-raised',
            payload: {
                participantId: window.currentParticipantId,
                userName: userName,
                timestamp: Date.now()
            }
        });
        
        if (button) button.classList.add('active');
        if (buttonText) buttonText.textContent = 'Lower Hand';
        
        console.log('✅ Hand raised successfully');
        if (window.showNotification) {
            window.showNotification('Hand raised', 'success');
        }
    } else {
        // Lower hand
        await raiseHandChannel.send({
            type: 'broadcast',
            event: 'hand-lowered',
            payload: {
                participantId: window.currentParticipantId,
                userName: userName
            }
        });
        
        if (button) button.classList.remove('active');
        if (buttonText) buttonText.textContent = 'Raise Hand';
        
        console.log('✅ Hand lowered successfully');
        if (window.showNotification) {
            window.showNotification('Hand lowered', 'info');
        }
    }
};

// ==================== HANDLE HAND RAISED ====================

function handleHandRaised(payload) {
    raisedHands.add(payload.participantId);
    
    // Update participant list UI
    updateParticipantHandStatus(payload.participantId, true);
    
    // Notify host and show raised hand indicator
    console.log(`✋ ${payload.userName} raised their hand`);
    
    if (window.userRole === 'host' && payload.participantId !== window.currentParticipantId) {
        if (window.showNotification) {
            window.showNotification(`✋ ${payload.userName} raised their hand`, 'info');
        } else {
            console.log(`[NOTIFICATION] ✋ ${payload.userName} raised their hand`);
        }
    }
    
    // Also show in console for all participants
    if (payload.participantId !== window.currentParticipantId) {
        console.log(`👥 Participant "${payload.userName}" has their hand raised`);
    }
}

function handleHandLowered(payload) {
    raisedHands.delete(payload.participantId);
    
    // Update participant list UI
    updateParticipantHandStatus(payload.participantId, false);
}

// ==================== UPDATE UI ====================

function updateParticipantHandStatus(participantId, raised) {
    // Find participant in list
    const participantElement = document.querySelector(`[data-participant-id="${participantId}"]`);
    
    if (participantElement) {
        let handIcon = participantElement.querySelector('.hand-raised-icon');
        
        if (raised) {
            if (!handIcon) {
                handIcon = document.createElement('span');
                handIcon.className = 'hand-raised-icon';
                handIcon.textContent = '✋';
                handIcon.title = 'Hand raised';
                participantElement.querySelector('.participant-info').appendChild(handIcon);
            }
        } else {
            if (handIcon) {
                handIcon.remove();
            }
        }
    }
}

// ==================== CLEANUP ====================

function cleanupRaiseHand() {
    if (raiseHandChannel) {
        raiseHandChannel.unsubscribe();
        raiseHandChannel = null;
    }
    
    handRaised = false;
    raisedHands.clear();
}

// ==================== EXPORT ====================

window.RaiseHand = {
    setupRaiseHand,
    cleanupRaiseHand,
    toggleRaiseHand,
    raisedHands
};

console.log('Raise hand module loaded');
