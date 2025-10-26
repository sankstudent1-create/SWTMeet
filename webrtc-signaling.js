// WebRTC Signaling and Peer Connection Management
// Add this to meeting.html: <script src="webrtc-signaling.js"></script>

// ==================== CONFIGURATION ====================

const ICE_SERVERS = {
    iceServers: [
        // Google's free STUN servers
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // For production, add TURN servers here
        // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
    ]
};

// ==================== GLOBAL STATE ====================

// Use existing peerConnections from meeting-script.js if available
const webrtcPeerConnections = window.peerConnections || {}; // participantId -> RTCPeerConnection
window.webrtcPeerConnections = webrtcPeerConnections;
const remoteStreams = {}; // participantId -> MediaStream
let signalingChannel = null;

// ==================== SIGNALING ====================

function setupSignaling() {
    console.log('Setting up WebRTC signaling...');
    
    // Create Supabase Realtime channel for signaling
    signalingChannel = supabaseClient
        .channel(`webrtc:${meetingId}`)
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
            console.log('Received offer from:', payload.from);
            await handleOffer(payload);
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
            console.log('Received answer from:', payload.from);
            await handleAnswer(payload);
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            console.log('Received ICE candidate from:', payload.from);
            await handleIceCandidate(payload);
        })
        .on('broadcast', { event: 'user-joined' }, async ({ payload }) => {
            console.log('User joined:', payload.participantId);
            await createPeerConnection(payload.participantId);
        })
        .on('broadcast', { event: 'user-left' }, ({ payload }) => {
            console.log('User left:', payload.participantId);
            removePeerConnection(payload.participantId);
        })
        .subscribe(async (status) => {
            console.log('Signaling channel status:', status);
            
            if (status === 'SUBSCRIBED') {
                // Announce our presence
                await signalingChannel.send({
                    type: 'broadcast',
                    event: 'user-joined',
                    payload: {
                        participantId: currentParticipantId,
                        userName: currentUser?.user_metadata?.full_name || currentUser?.email || 'Guest'
                    }
                });
                
                // Create peer connections for existing participants
                for (const participant of participants) {
                    if (participant.id !== currentParticipantId) {
                        await createPeerConnection(participant.id);
                    }
                }
            }
        });
}

// ==================== PEER CONNECTION MANAGEMENT ====================

async function createPeerConnection(participantId) {
    if (webrtcPeerConnections[participantId]) {
        console.log('Peer connection already exists for:', participantId);
        return;
    }
    
    console.log('Creating peer connection for:', participantId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    webrtcPeerConnections[participantId] = pc;
    
    // Add local stream tracks to peer connection
    if (localStream) {
        localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
            console.log('Added local track:', track.kind);
        });
    }
    
    // If screen share is active, add screen share tracks (video + audio) to late joiner
    if (window.currentScreenShare && window.currentScreenShare.active) {
        const screenVideoTrack = window.currentScreenShare.videoTrack || window.currentScreenShare.stream.getVideoTracks()[0];
        const screenAudioTracks = window.currentScreenShare.audioTracks || window.currentScreenShare.stream.getAudioTracks();
        
        if (screenVideoTrack && screenVideoTrack.readyState === 'live') {
            try {
                // Initialize sender storage
                if (!window.screenShareSenders) window.screenShareSenders = {};
                if (!window.screenShareSenders[participantId]) {
                    window.screenShareSenders[participantId] = [];
                }
                
                // Add video track
                const videoSender = pc.addTrack(screenVideoTrack, window.currentScreenShare.stream);
                window.screenShareSenders[participantId].push(videoSender);
                
                // Add audio tracks if available
                if (screenAudioTracks && screenAudioTracks.length > 0) {
                    screenAudioTracks.forEach(audioTrack => {
                        if (audioTrack.readyState === 'live') {
                            const audioSender = pc.addTrack(audioTrack, window.currentScreenShare.stream);
                            window.screenShareSenders[participantId].push(audioSender);
                            console.log('🔊 Added screen audio track to late joiner:', participantId);
                        }
                    });
                }
                
                // Add stream ID to known screen share IDs
                if (!window.screenShareStreamIds) window.screenShareStreamIds = new Set();
                window.screenShareStreamIds.add(window.currentScreenShare.stream.id);
                
                console.log('✅ Added active screen share to late joiner:', participantId, 
                    '(Video: ✅, Audio:', screenAudioTracks?.length || 0, 'tracks)',
                    'Stream ID:', window.currentScreenShare.stream.id);
            } catch (err) {
                console.error('❌ Failed to add screen share to new peer:', err);
            }
        }
    }
    
    // Track which streams we've seen for this participant
    if (!remoteStreams[participantId]) {
        remoteStreams[participantId] = new MediaStream();
    }
    
    // Track screen share streams separately
    if (!window.remoteScreenShares) {
        window.remoteScreenShares = {};
    }
    
    // Handle incoming remote stream
    pc.ontrack = (event) => {
        console.log('Received remote track from:', participantId, event.track.kind, 'label:', event.track.label, 'stream ID:', event.streams[0]?.id);
        
        const stream = event.streams[0];
        const streamId = stream?.id;
        
        // Initialize screen share stream IDs set
        if (!window.screenShareStreamIds) {
            window.screenShareStreamIds = new Set();
        }
        
        // Detect screen share by multiple methods:
        // 1. Stream ID is in the known screen share IDs set
        // 2. Track label contains screen/window/monitor
        // 3. Stream ID is different from the main camera stream AND we already have camera
        const isKnownScreenShare = streamId && window.screenShareStreamIds.has(streamId);
        
        const labelIndicatesScreen = event.track.kind === 'video' && 
                                     (event.track.label.toLowerCase().includes('screen') ||
                                      event.track.label.toLowerCase().includes('window') ||
                                      event.track.label.toLowerCase().includes('monitor') ||
                                      event.track.label.toLowerCase().includes('display'));
        
        // Check if this is a different stream than the camera stream
        const isDifferentStream = streamId && remoteStreams[participantId]?.id && streamId !== remoteStreams[participantId]?.id;
        
        // Check if we already have a camera video track for this participant
        const alreadyHasCameraVideo = remoteStreams[participantId]?.getVideoTracks().length > 0;
        
        const isScreenShare = event.track.kind === 'video' && 
                             (isKnownScreenShare || 
                              labelIndicatesScreen || 
                              (isDifferentStream && alreadyHasCameraVideo));
        
        if (isScreenShare && stream) {
            // This is a screen share track - display separately
            console.log('📺 Received screen share from:', participantId, 'Stream ID:', streamId);
            
            // Store screen share stream
            window.remoteScreenShares[participantId] = stream;
            
            if (window.VideoManager) {
                const participant = window.participants?.find(p => p.id === participantId);
                const participantName = participant?.user?.user_metadata?.full_name || 
                                       participant?.user?.email?.split('@')[0] || 
                                       participant?.guest_name ||
                                       'Participant';
                
                // CRITICAL: Check if screen share already exists and update it
                const existingScreenShare = document.getElementById('screen-share-display');
                if (existingScreenShare) {
                    const video = existingScreenShare.querySelector('video');
                    if (video) {
                        console.log('🔄 Updating existing screen share video element with new stream');
                        video.srcObject = stream;
                        // Force video to play in case it was paused
                        video.play().catch(e => console.warn('Video play failed:', e));
                    }
                } else {
                    // Create new screen share display
                    window.VideoManager.displayScreenShare(stream, participantName);
                }
            }
        } else {
            // Regular camera/audio track
            // Initialize remote stream if it doesn't exist
            if (!remoteStreams[participantId]) {
                remoteStreams[participantId] = stream || new MediaStream();
            }
            
            // Add track if it's not already in the stream
            if (stream && !remoteStreams[participantId].getTracks().includes(event.track)) {
                remoteStreams[participantId] = stream;
            }
            
            // Store the stream ID for comparison
            if (!remoteStreams[participantId].id && streamId) {
                Object.defineProperty(remoteStreams[participantId], 'id', {
                    value: streamId,
                    writable: false
                });
            }
            
            // Only display video when we have video tracks
            if (event.track.kind === 'video') {
                // Add track ended handler to detect freezing
                event.track.onended = () => {
                    console.log('⚠️ Video track ended for:', participantId);
                    // Remove the video element
                    if (window.VideoManager) {
                        window.VideoManager.removeRemote(participantId);
                    }
                };
                
                if (window.VideoManager) {
                    const participant = window.participants?.find(p => p.id === participantId);
                    const participantName = participant?.user?.user_metadata?.full_name || 
                                           participant?.user?.email?.split('@')[0] || 
                                           participant?.guest_name ||
                                           'Participant';
                    
                    // CRITICAL: Check if video element already exists and update it
                    const existingVideo = document.getElementById(`video-${participantId}`);
                    if (existingVideo) {
                        const video = existingVideo.querySelector('video');
                        if (video) {
                            console.log('🔄 Updating existing video element for:', participantName, 'with new stream');
                            video.srcObject = remoteStreams[participantId];
                            // Force video to play in case it was paused
                            video.play().catch(e => console.warn('Video play failed:', e));
                        }
                    } else {
                        // Create new video display
                        console.log('📹 Displaying remote video for:', participantName, 'Stream:', remoteStreams[participantId]);
                        window.VideoManager.displayRemote(participantId, remoteStreams[participantId], participantName);
                    }
                }
            }
        }
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate to:', participantId);
            signalingChannel.send({
                type: 'broadcast',
                event: 'ice-candidate',
                payload: {
                    from: currentParticipantId,
                    to: participantId,
                    candidate: event.candidate
                }
            });
        }
    };
    
    // Monitor ICE connection state for automatic recovery
    pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for ${participantId}:`, pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed') {
            console.log(`🔄 ICE connection failed for ${participantId}, attempting restart...`);
            // Attempt ICE restart
            pc.restartIce();
        } else if (pc.iceConnectionState === 'disconnected') {
            console.log(`⚠️ ICE connection disconnected for ${participantId}, monitoring...`);
            // Give it 5 seconds to reconnect before restarting
            setTimeout(() => {
                if (pc.iceConnectionState === 'disconnected') {
                    console.log(`🔄 Still disconnected, restarting ICE for ${participantId}...`);
                    pc.restartIce();
                }
            }, 5000);
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log(`✅ ICE connection established for ${participantId}`);
        }
    };
    
    // Monitor connection state
    pc.onconnectionstatechange = () => {
        console.log(`Connection state for ${participantId}:`, pc.connectionState);
        
        if (pc.connectionState === 'failed') {
            console.log(`❌ Connection failed for ${participantId}`);
            // Optionally notify user
            if (window.showNotification) {
                window.showNotification(`Connection lost with participant`, 'warning');
            }
        }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
        console.log('Connection state with', participantId, ':', pc.connectionState);
        
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            console.log('Connection failed/disconnected, attempting to reconnect...');
            // Optionally implement reconnection logic
        }
    };
    
    // Create initial offer
    try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // CRITICAL: Include screen share info in initial offer for late joiners
        const offerPayload = {
            from: currentParticipantId,
            to: participantId,
            offer: offer,
            isScreenShare: window.currentScreenShare && window.currentScreenShare.active,
            screenShareStreamId: window.currentScreenShare?.stream?.id
        };
        
        signalingChannel.send({
            type: 'broadcast',
            event: 'offer',
            payload: offerPayload
        });
        
        console.log('Sent offer to:', participantId, offerPayload.isScreenShare ? '(with screen share)' : '');
    } catch (err) {
        console.error('Error creating offer:', err);
    }
}

async function handleOffer(payload) {
    // Only handle offers meant for us
    if (payload.to !== currentParticipantId) return;
    
    const participantId = payload.from;
    
    // CRITICAL: Store screen share stream ID if this is a screen share offer
    if (payload.isScreenShare && payload.screenShareStreamId) {
        if (!window.screenShareStreamIds) {
            window.screenShareStreamIds = new Set();
        }
        window.screenShareStreamIds.add(payload.screenShareStreamId);
        console.log(`📺 Marked stream ${payload.screenShareStreamId} as screen share from ${participantId}`);
    }
    
    // Get or create peer connection
    let pc = webrtcPeerConnections[participantId];
    
    if (!pc) {
        pc = new RTCPeerConnection(ICE_SERVERS);
        webrtcPeerConnections[participantId] = pc;
        
        // Add local stream tracks
        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }
        
        // Handle incoming remote stream
        pc.ontrack = (event) => {
            console.log('Received remote track from:', participantId, event.track.kind, 'label:', event.track.label, 'stream ID:', event.streams[0]?.id);
            
            const stream = event.streams[0];
            const streamId = stream?.id;
            
            // Initialize screen share stream IDs set
            if (!window.screenShareStreamIds) {
                window.screenShareStreamIds = new Set();
            }
            
            // Check if this is a screen share based on registered stream IDs
            const isKnownScreenShare = streamId && window.screenShareStreamIds.has(streamId);
            
            const labelIndicatesScreen = event.track.kind === 'video' && 
                                         (event.track.label.toLowerCase().includes('screen') ||
                                          event.track.label.toLowerCase().includes('window') ||
                                          event.track.label.toLowerCase().includes('monitor') ||
                                          event.track.label.toLowerCase().includes('display'));
            
            const isDifferentStream = streamId && remoteStreams[participantId]?.id && streamId !== remoteStreams[participantId]?.id;
            const alreadyHasCameraVideo = remoteStreams[participantId]?.getVideoTracks().length > 0;
            
            const isScreenShare = event.track.kind === 'video' && 
                                 (isKnownScreenShare || 
                                  labelIndicatesScreen || 
                                  (isDifferentStream && alreadyHasCameraVideo));
            
            if (isScreenShare && stream) {
                // This is a screen share track - display separately
                console.log('📺 Received screen share from:', participantId, 'Stream ID:', streamId);
                
                if (window.VideoManager) {
                    const participant = window.participants?.find(p => p.id === participantId);
                    const participantName = participant?.user?.user_metadata?.full_name || 
                                           participant?.user?.email?.split('@')[0] || 
                                           participant?.guest_name ||
                                           'Participant';
                    
                    window.VideoManager.displayScreenShare(stream, participantName);
                }
            } else {
                // Regular camera/audio track
                if (!remoteStreams[participantId]) {
                    remoteStreams[participantId] = stream || new MediaStream();
                } else if (stream) {
                    remoteStreams[participantId] = stream;
                }
                
                // Only display video when we have video tracks
                if (event.track.kind === 'video' && window.VideoManager) {
                    const participant = window.participants?.find(p => p.id === participantId);
                    const participantName = participant?.user?.user_metadata?.full_name || 
                                           participant?.user?.email?.split('@')[0] || 
                                           participant?.guest_name ||
                                           'Participant';
                    
                    window.VideoManager.displayRemote(participantId, remoteStreams[participantId], participantName);
                }
            }
        };
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                signalingChannel.send({
                    type: 'broadcast',
                    event: 'ice-candidate',
                    payload: {
                        from: currentParticipantId,
                        to: participantId,
                        candidate: event.candidate
                    }
                });
            }
        };
    }
    
    // Use the peer connection (already assigned above)
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log('Sending answer to:', participantId);
        await signalingChannel.send({
            type: 'broadcast',
            event: 'answer',
            payload: {
                from: currentParticipantId,
                to: participantId,
                answer: answer
            }
        });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

async function handleAnswer(payload) {
    // Only handle answers meant for us
    if (payload.to !== currentParticipantId) return;
    
    const participantId = payload.from;
    const pc = webrtcPeerConnections[participantId];
    
    if (!pc) {
        console.error('No peer connection found for:', participantId);
        return;
    }
    
    try {
        // Only set remote description if we're in the right state
        if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            console.log('Set remote description for:', participantId);
        } else {
            console.log('Ignoring answer, wrong signaling state:', pc.signalingState);
        }
    } catch (error) {
        console.error('Error handling answer:', error);
    }
}

async function handleIceCandidate(payload) {
    // Only handle ICE candidates meant for us
    if (payload.to !== currentParticipantId) return;
    
    const participantId = payload.from;
    const pc = webrtcPeerConnections[participantId];
    
    if (!pc) {
        console.error('No peer connection found for:', participantId);
        return;
    }
    
    try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        console.log('Added ICE candidate from:', participantId);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
}

function removePeerConnection(participantId) {
    const pc = webrtcPeerConnections[participantId];
    if (pc) {
        pc.close();
        delete webrtcPeerConnections[participantId];
    }
    
    if (remoteStreams[participantId]) {
        remoteStreams[participantId].getTracks().forEach(track => track.stop());
        delete remoteStreams[participantId];
    }
    
    // Use VideoManager to remove video
    if (window.VideoManager) {
        window.VideoManager.removeRemote(participantId);
    }
}

// ==================== CLEANUP ====================

function cleanupWebRTC() {
    console.log('Cleaning up WebRTC connections...');
    
    // Close all peer connections
    Object.keys(webrtcPeerConnections).forEach(participantId => {
        removePeerConnection(participantId);
    });
    
    // Unsubscribe from signaling channel
    if (signalingChannel) {
        signalingChannel.unsubscribe();
        signalingChannel = null;
    }
}

// ==================== EXPORT ====================

window.WebRTC = {
    setupSignaling,
    createPeerConnection,
    cleanupWebRTC,
    peerConnections: webrtcPeerConnections,
    remoteStreams,
    get signalingChannel() {
        return signalingChannel;
    }
};

console.log('WebRTC signaling module loaded');
