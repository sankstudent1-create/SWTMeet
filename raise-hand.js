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
    if (!raiseHandChannel) {
        console.error('Raise hand channel not initialized');
        return;
    }
    
    handRaised = !handRaised;
    
    const userName = currentUser?.user_metadata?.full_name || 
                     currentUser?.email?.split('@')[0] || 
                     'Guest';
    
    const button = document.getElementById('toggle-raise-hand');
    const buttonText = document.getElementById('raise-hand-text');
    
    if (handRaised) {
        // Raise hand
        await raiseHandChannel.send({
            type: 'broadcast',
            event: 'hand-raised',
            payload: {
                participantId: currentParticipantId,
                userName: userName,
                timestamp: Date.now()
            }
        });
        
        if (button) button.classList.add('active');
        if (buttonText) buttonText.textContent = 'Lower Hand';
        
        showNotification('Hand raised', 'success');
    } else {
        // Lower hand
        await raiseHandChannel.send({
            type: 'broadcast',
            event: 'hand-lowered',
            payload: {
                participantId: currentParticipantId,
                userName: userName
            }
        });
        
        if (button) button.classList.remove('active');
        if (buttonText) buttonText.textContent = 'Raise Hand';
        
        showNotification('Hand lowered', 'info');
    }
};

// ==================== HANDLE HAND RAISED ====================

function handleHandRaised(payload) {
    raisedHands.add(payload.participantId);
    
    // Update participant list UI
    updateParticipantHandStatus(payload.participantId, true);
    
    // Notify host
    if (userRole === 'host' && payload.participantId !== currentParticipantId) {
        showNotification(`${payload.userName} raised their hand`, 'info');
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
