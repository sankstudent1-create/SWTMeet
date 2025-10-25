// ==================== VIDEO GRID MANAGER ====================
// Clean, simple video grid management from scratch

// Global state
const videoManager = {
    videoGrid: null,
    localVideo: null,
    remoteVideos: new Map(), // participantId -> video element
    screenShareActive: false,
    screenShareVideo: null
};

// ==================== INITIALIZATION ====================

function initializeVideoManager() {
    videoManager.videoGrid = document.getElementById('video-grid');
    
    if (!videoManager.videoGrid) {
        console.error('Video grid not found');
        return;
    }
    
    console.log('Video manager initialized');
}

// ==================== LOCAL VIDEO (SELF VIEW) ====================

function displayLocalVideo(stream) {
    // Remove existing self-view if any
    const existingSelfView = document.getElementById('self-view');
    if (existingSelfView) {
        existingSelfView.remove();
    }
    
    // Create self-view container
    const container = document.createElement('div');
    container.id = 'self-view';
    container.className = 'video-participant';
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true; // Mute own audio
    video.playsInline = true;
    
    // Create name label
    const nameLabel = document.createElement('span');
    nameLabel.className = 'participant-name';
    nameLabel.textContent = 'You';
    
    // Assemble
    container.appendChild(video);
    container.appendChild(nameLabel);
    
    // Add to grid
    videoManager.videoGrid.appendChild(container);
    videoManager.localVideo = container;
    
    console.log('✅ Local video displayed');
    
    // Refresh smart layout
    if (window.SmartLayout) {
        setTimeout(() => window.SmartLayout.refresh(), 100);
    }
}

// ==================== REMOTE VIDEO ====================

function displayRemoteVideo(participantId, stream, participantName = 'Participant') {
    // Check if already exists
    if (videoManager.remoteVideos.has(participantId)) {
        console.log('Remote video already exists for:', participantId);
        return;
    }
    
    // Create container
    const container = document.createElement('div');
    container.className = 'video-participant remote-participant';
    container.dataset.participantId = participantId;
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    
    // Create name label
    const nameLabel = document.createElement('span');
    nameLabel.className = 'participant-name';
    nameLabel.textContent = participantName;
    
    // Assemble
    container.appendChild(video);
    container.appendChild(nameLabel);
    
    // Add to grid (before self-view if it exists and is in the DOM)
    const selfView = document.getElementById('self-view');
    if (selfView && selfView.parentNode === videoManager.videoGrid) {
        videoManager.videoGrid.insertBefore(container, selfView);
    } else {
        videoManager.videoGrid.appendChild(container);
    }
    
    // Store reference
    videoManager.remoteVideos.set(participantId, container);
    
    console.log('✅ Remote video displayed for:', participantName);
    
    // Refresh smart layout
    if (window.SmartLayout) {
        setTimeout(() => window.SmartLayout.refresh(), 100);
    }
}

// ==================== REMOVE VIDEO ====================

function removeRemoteVideo(participantId) {
    const container = videoManager.remoteVideos.get(participantId);
    
    if (container) {
        // Stop video
        const video = container.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        // Remove from DOM
        container.remove();
        
        // Remove from map
        videoManager.remoteVideos.delete(participantId);
        
        console.log('✅ Removed video for:', participantId);
        
        // Refresh smart layout
        if (window.SmartLayout) {
            setTimeout(() => window.SmartLayout.refresh(), 100);
        }
    }
}

// ==================== SCREEN SHARE ====================

function displayScreenShare(stream, participantName = 'You') {
    // Validate stream
    if (!stream || !stream.getVideoTracks || stream.getVideoTracks().length === 0) {
        console.warn('⚠️ Invalid screen share stream, ignoring');
        return;
    }
    
    // Remove existing screen share
    if (videoManager.screenShareVideo) {
        videoManager.screenShareVideo.remove();
    }
    
    // Create screen share container
    const container = document.createElement('div');
    container.id = 'screen-share-display';
    container.className = 'video-participant screen-share';
    
    // Create video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // Mute screen share audio to prevent echo
    
    // Create label
    const label = document.createElement('span');
    label.className = 'participant-name';
    label.textContent = `📺 ${participantName}'s Screen`;
    
    // Assemble
    container.appendChild(video);
    container.appendChild(label);
    
    // Add to grid (at the beginning)
    videoManager.videoGrid.insertBefore(container, videoManager.videoGrid.firstChild);
    videoManager.screenShareVideo = container;
    videoManager.screenShareActive = true;
    
    console.log('✅ Screen share displayed for:', participantName);
    
    // Refresh smart layout
    if (window.SmartLayout) {
        setTimeout(() => window.SmartLayout.refresh(), 100);
    }
}

function removeScreenShare() {
    if (videoManager.screenShareVideo) {
        // Stop video
        const video = videoManager.screenShareVideo.querySelector('video');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        
        // Remove from DOM
        videoManager.screenShareVideo.remove();
        videoManager.screenShareVideo = null;
        videoManager.screenShareActive = false;
        
        console.log('✅ Screen share removed');
        
        // Refresh smart layout
        if (window.SmartLayout) {
            setTimeout(() => window.SmartLayout.refresh(), 100);
        }
    }
}

// ==================== UPDATE VIDEO STREAM ====================

function updateVideoStream(participantId, newStream) {
    const container = videoManager.remoteVideos.get(participantId);
    
    if (container) {
        const video = container.querySelector('video');
        if (video) {
            video.srcObject = newStream;
            console.log('✅ Updated video stream for:', participantId);
        }
    }
}

// ==================== SCREEN SHARE BROADCASTING ====================

let screenShareStream = null;
let screenShareSenders = {}; // Track screen share senders per peer

async function startScreenShareBroadcast() {
    try {
        // Get screen share stream
        screenShareStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: "always",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: true
        });
        
        // Display locally
        displayScreenShare(screenShareStream, 'You');
        
        // ADD screen share track to all peer connections (don't replace camera)
        const screenTrack = screenShareStream.getVideoTracks()[0];
        
        // Mark the stream as screen share for detection
        screenShareStream._isScreenShare = true;
        
        // Store screen share stream ID globally for detection
        if (!window.screenShareStreamIds) {
            window.screenShareStreamIds = new Set();
        }
        window.screenShareStreamIds.add(screenShareStream.id);
        
        if (window.webrtcPeerConnections) {
            let addedCount = 0;
            const renegotiationPromises = [];
            
            // Add track to all peers and trigger renegotiation
            for (const [peerId, pc] of Object.entries(window.webrtcPeerConnections)) {
                try {
                    // Add screen track as a NEW sender (keeps camera track)
                    const sender = pc.addTrack(screenTrack, screenShareStream);
                    screenShareSenders[peerId] = sender;
                    addedCount++;
                    console.log(`✅ Screen track added to peer: ${peerId} with stream ID: ${screenShareStream.id}`);
                    
                    // CRITICAL: Trigger renegotiation by creating a new offer
                    // This is required when adding tracks to existing connections
                    const renegPromise = (async () => {
                        try {
                            const offer = await pc.createOffer();
                            await pc.setLocalDescription(offer);
                            
                            // Send the new offer via Supabase Realtime
                            if (window.signalingChannel) {
                                await window.signalingChannel.send({
                                    type: 'broadcast',
                                    event: 'offer',
                                    payload: {
                                        from: window.currentParticipantId,
                                        to: peerId,
                                        offer: offer,
                                        isScreenShare: true,  // CRITICAL: Flag this as screen share
                                        screenShareStreamId: screenShareStream.id  // Send stream ID
                                    }
                                });
                                console.log(`🔄 Renegotiation offer sent to ${peerId} for screen share (Stream ID: ${screenShareStream.id})`);
                            } else {
                                console.error(`❌ No signaling channel for ${peerId}`);
                            }
                        } catch (renegErr) {
                            console.error(`❌ Renegotiation failed for ${peerId}:`, renegErr);
                        }
                    })();
                    
                    renegotiationPromises.push(renegPromise);
                    
                } catch (err) {
                    console.error(`❌ Failed to add screen to ${peerId}:`, err);
                }
            }
            
            console.log(`📺 Broadcasting screen to ${addedCount} participants with stream ID: ${screenShareStream.id}`);
            
            // Wait for all renegotiations to complete
            await Promise.allSettled(renegotiationPromises);
            console.log(`✅ All renegotiation offers sent for screen share`);
        }
        
        // Store screen share state globally for late joiners
        window.currentScreenShare = {
            stream: screenShareStream,
            track: screenTrack,
            participantId: window.currentParticipantId,
            active: true
        };
        
        // Also expose senders globally for webrtc-signaling
        window.screenShareSenders = screenShareSenders;
        
        // Handle when user stops sharing
        screenTrack.onended = () => {
            stopScreenShareBroadcast();
        };
        
        return screenShareStream;
        
    } catch (error) {
        console.error('❌ Screen share error:', error);
        throw error;
    }
}

async function stopScreenShareBroadcast() {
    try {
        // Remove screen share display
        removeScreenShare();
        
        // Remove stream ID from known screen shares
        if (window.screenShareStreamIds && screenShareStream) {
            window.screenShareStreamIds.delete(screenShareStream.id);
        }
        
        // Remove screen share track from all peer connections (keep camera)
        if (window.webrtcPeerConnections) {
            let removedCount = 0;
            
            // Remove track from all peers and trigger renegotiation
            for (const [peerId, pc] of Object.entries(window.webrtcPeerConnections)) {
                const sender = screenShareSenders[peerId];
                
                if (sender) {
                    try {
                        pc.removeTrack(sender);
                        delete screenShareSenders[peerId];
                        removedCount++;
                        console.log(`✅ Removed screen track from peer: ${peerId}`);
                        
                        // CRITICAL: Trigger renegotiation after removing track
                        (async () => {
                            try {
                                const offer = await pc.createOffer();
                                await pc.setLocalDescription(offer);
                                
                                // Send the new offer via Supabase Realtime
                                if (window.signalingChannel) {
                                    await window.signalingChannel.send({
                                        type: 'broadcast',
                                        event: 'offer',
                                        payload: {
                                            from: window.currentParticipantId,
                                            to: peerId,
                                            offer: offer
                                        }
                                    });
                                    console.log(`🔄 Renegotiation offer sent to ${peerId} after screen stop`);
                                }
                            } catch (renegErr) {
                                console.error(`❌ Renegotiation failed for ${peerId}:`, renegErr);
                            }
                        })();
                        
                    } catch (err) {
                        console.error(`❌ Failed to remove screen from ${peerId}:`, err);
                    }
                }
            }
            
            console.log(`📹 Removed screen from ${removedCount} participants`);
        }
        
        // Stop screen share stream
        if (screenShareStream) {
            screenShareStream.getTracks().forEach(track => track.stop());
            screenShareStream = null;
        }
        
        // Clear global screen share state
        if (window.currentScreenShare) {
            window.currentScreenShare.active = false;
            window.currentScreenShare = null;
        }
        
    } catch (error) {
        console.error('❌ Stop screen share error:', error);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function getVideoCount() {
    return {
        local: videoManager.localVideo ? 1 : 0,
        remote: videoManager.remoteVideos.size,
        screenShare: videoManager.screenShareActive ? 1 : 0,
        total: (videoManager.localVideo ? 1 : 0) + videoManager.remoteVideos.size + (videoManager.screenShareActive ? 1 : 0)
    };
}

function clearAllVideos() {
    // Remove all remote videos
    videoManager.remoteVideos.forEach((container, participantId) => {
        removeRemoteVideo(participantId);
    });
    
    // Remove screen share
    removeScreenShare();
    
    // Remove local video
    if (videoManager.localVideo) {
        videoManager.localVideo.remove();
        videoManager.localVideo = null;
    }
    
    console.log('✅ All videos cleared');
}

// ==================== EXPORT ====================

window.VideoManager = {
    init: initializeVideoManager,
    displayLocal: displayLocalVideo,
    displayRemote: displayRemoteVideo,
    removeRemote: removeRemoteVideo,
    displayScreenShare: displayScreenShare,
    removeScreenShare: removeScreenShare,
    updateStream: updateVideoStream,
    startScreenShare: startScreenShareBroadcast,
    stopScreenShare: stopScreenShareBroadcast,
    getCount: getVideoCount,
    clearAll: clearAllVideos,
    screenShareSenders: screenShareSenders // Expose for webrtc-signaling
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVideoManager);
} else {
    initializeVideoManager();
}

console.log('✅ Video Manager module loaded');
