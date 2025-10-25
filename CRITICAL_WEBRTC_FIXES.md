# 🔧 Critical WebRTC & Participant Fixes

## 🐛 Issues Identified

### 1. **Video Not Showing Between Participants (No Refresh)**
**Problem**: Participants join but don't see each other's video until page refresh.
**Root Cause**: WebRTC peer connections not being established when new participants join. No signaling mechanism to create peer connections between existing and new participants.

### 2. **Duplicate Participant on Refresh**
**Problem**: When page refreshes, a phantom 3rd participant appears.
**Root Cause**: On refresh, the code checks for existing participant but the `.single()` query fails when multiple records exist (from previous sessions), causing a new participant to be inserted instead of updating.

### 3. **Registered Users Show as "Participant"**
**Problem**: Database users show generic "Participant" name instead of real names.
**Root Cause**: The Supabase query uses `users(...)` join but the data isn't being accessed correctly. Need to fetch from Supabase Auth `auth.users` table or properly join with `public.users`.

### 4. **Screen Sharing Shows Placeholder**
**Problem**: Screen share button works but shows placeholder, not actual screen content.
**Root Cause**: Screen share track is added to peer connections but the video element isn't being created/updated to display the screen stream. VideoManager needs to handle screen share streams differently.

---

## ✅ Solutions

### Fix 1: WebRTC Peer Connection Establishment

**Problem**: No peer connections created when participants join.

**Solution**: Implement proper WebRTC signaling flow:

```javascript
// When a new participant joins (detected via realtime):
1. Existing participants create offers and send to new participant
2. New participant receives offers, creates answers
3. ICE candidates exchanged
4. Peer connections established
5. Media tracks flow between peers
```

**Implementation**:
```javascript
// In handleParticipantJoined():
async function handleParticipantJoined(participant) {
    console.log('✅ Participant joined:', participant);
    
    // Reload participants list
    await loadParticipants();
    
    // If this is not us, establish WebRTC connection
    const isCurrentUser = (currentUser && participant.user_id === currentUser.id) || 
                          participant.id === currentParticipantId;
    
    if (!isCurrentUser && participant.status === 'admitted') {
        // Create peer connection and send offer
        if (window.WebRTC && window.WebRTC.createPeerConnection) {
            await window.WebRTC.createPeerConnection(participant.id);
            console.log(`🔗 Created peer connection for: ${participant.id}`);
        }
    }
    
    // Show notification
    if (!isCurrentUser && hasInitialLoad) {
        const userName = participant.users?.full_name || 
                        participant.user?.full_name || 
                        participant.guest_name || 
                        'Someone';
        showNotification(`${userName} joined the meeting`, 'info');
    }
}
```

### Fix 2: Prevent Duplicate Participants on Refresh

**Problem**: `.single()` fails when multiple records exist, causing new insert.

**Solution**: Use `.maybeSingle()` and handle multiple records by cleaning up old ones:

```javascript
// Check if participant already exists
const { data: existingParticipants, error: checkError } = await supabaseClient
    .from('participants')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('user_id', currentUser.id)
    .order('joined_at', { ascending: false });

if (existingParticipants && existingParticipants.length > 0) {
    // Use the most recent participant record
    const existingParticipant = existingParticipants[0];
    currentParticipantId = existingParticipant.id;
    
    // Clean up any duplicate old records
    if (existingParticipants.length > 1) {
        const oldIds = existingParticipants.slice(1).map(p => p.id);
        await supabaseClient
            .from('participants')
            .delete()
            .in('id', oldIds);
        console.log(`🧹 Cleaned up ${oldIds.length} duplicate participant records`);
    }
    
    // Update the current participant record
    await supabaseClient
        .from('participants')
        .update({
            status: userRole === 'host' ? 'admitted' : (meeting.waiting_room_enabled ? 'waiting' : 'admitted'),
            role: userRole,
            joined_at: new Date().toISOString(),
            left_at: null
        })
        .eq('id', existingParticipant.id);
}
```

### Fix 3: Fetch Real User Names from Supabase

**Problem**: User names not showing correctly from database.

**Solution**: Fetch user data from Supabase Auth and merge with participants:

```javascript
async function loadParticipants() {
    try {
        // Load participants with user data
        const { data, error } = await supabaseClient
            .from('participants')
            .select(`
                *,
                users(full_name, email, avatar_url)
            `)
            .eq('meeting_id', meetingId)
            .eq('status', 'admitted')
            .order('joined_at', { ascending: true });
        
        if (error) throw error;
        
        // For each participant, fetch additional auth data if needed
        const participantsWithNames = await Promise.all(data.map(async (p) => {
            if (p.user_id && !p.users?.full_name) {
                // Fetch from Supabase Auth
                try {
                    const { data: authUser } = await supabaseClient.auth.admin.getUserById(p.user_id);
                    if (authUser) {
                        p.auth_user = {
                            email: authUser.email,
                            full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0]
                        };
                    }
                } catch (authError) {
                    console.error('Error fetching auth user:', authError);
                }
            }
            return p;
        }));
        
        participants = participantsWithNames || [];
        window.participants = participants;
        
        console.log('✅ Loaded participants:', participants.length, participants);
        
        updateParticipantsList();
    } catch (error) {
        console.error('Error loading participants:', error);
    }
}

// Update name resolution in updateParticipantsList():
const userName = p.users?.full_name || 
                p.user?.full_name || 
                p.auth_user?.full_name ||
                p.users?.email?.split('@')[0] || 
                p.user?.email?.split('@')[0] || 
                p.auth_user?.email?.split('@')[0] ||
                p.guest_name || 
                'Participant';
```

### Fix 4: Screen Share Visual Display

**Problem**: Screen share track added but not displayed.

**Solution**: Update VideoManager to handle screen share streams:

```javascript
// In video-manager.js - startScreenShareBroadcast():
async function startScreenShareBroadcast() {
    try {
        const screenTrack = screenShareStream.getVideoTracks()[0];
        
        if (window.webrtcPeerConnections) {
            let addedCount = 0;
            for (const [peerId, pc] of Object.entries(window.webrtcPeerConnections)) {
                try {
                    const sender = pc.addTrack(screenTrack, screenShareStream);
                    screenShareSenders[peerId] = sender;
                    addedCount++;
                    console.log(`✅ Screen track added to peer: ${peerId}`);
                    
                    // Renegotiate
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (window.signalingChannel) {
                        await window.signalingChannel.send({
                            type: 'broadcast',
                            event: 'offer',
                            payload: {
                                from: window.currentParticipantId,
                                to: peerId,
                                offer: offer,
                                isScreenShare: true  // Flag for screen share
                            }
                        });
                    }
                } catch (err) {
                    console.error(`❌ Failed to add screen to ${peerId}:`, err);
                }
            }
            
            // Display screen share locally
            displayScreenShareLocally(screenShareStream);
            
            console.log(`📺 Broadcasting screen to ${addedCount} participants`);
        }
    } catch (error) {
        console.error('Error broadcasting screen share:', error);
    }
}

// New function to display screen share
function displayScreenShareLocally(stream) {
    // Create or update screen share video element
    let screenVideo = document.getElementById('screen-share-display');
    if (!screenVideo) {
        screenVideo = document.createElement('video');
        screenVideo.id = 'screen-share-display';
        screenVideo.autoplay = true;
        screenVideo.playsInline = true;
        screenVideo.muted = true;
        screenVideo.style.width = '100%';
        screenVideo.style.height = '100%';
        screenVideo.style.objectFit = 'contain';
        
        // Add to video grid or dedicated screen share area
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            const screenContainer = document.createElement('div');
            screenContainer.className = 'video-container screen-share-container';
            screenContainer.appendChild(screenVideo);
            videoGrid.prepend(screenContainer);
        }
    }
    
    screenVideo.srcObject = stream;
    console.log('📺 Screen share displayed locally');
}

// Handle incoming screen share from remote participants
function handleRemoteScreenShare(participantId, stream) {
    console.log(`📺 Received screen share from: ${participantId}`);
    
    // Create video element for remote screen share
    let screenVideo = document.getElementById(`screen-${participantId}`);
    if (!screenVideo) {
        screenVideo = document.createElement('video');
        screenVideo.id = `screen-${participantId}`;
        screenVideo.autoplay = true;
        screenVideo.playsInline = true;
        screenVideo.style.width = '100%';
        screenVideo.style.height = '100%';
        screenVideo.style.objectFit = 'contain';
        
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
            const screenContainer = document.createElement('div');
            screenContainer.className = 'video-container screen-share-container';
            screenContainer.setAttribute('data-participant-id', participantId);
            screenContainer.setAttribute('data-type', 'screen');
            
            // Add participant name label
            const nameLabel = document.createElement('div');
            nameLabel.className = 'participant-name';
            nameLabel.textContent = `${getParticipantName(participantId)}'s Screen`;
            
            screenContainer.appendChild(screenVideo);
            screenContainer.appendChild(nameLabel);
            videoGrid.prepend(screenContainer);
        }
    }
    
    screenVideo.srcObject = stream;
    console.log('✅ Remote screen share displayed');
}
```

---

## 📊 Implementation Checklist

### Phase 1: Fix Duplicate Participants
- [ ] Change `.single()` to fetch all matching participants
- [ ] Use most recent participant record
- [ ] Clean up old duplicate records
- [ ] Test: Refresh page multiple times, verify only 1 participant entry

### Phase 2: Fix User Names
- [ ] Enhance `loadParticipants()` to fetch auth user data
- [ ] Update name resolution logic with fallback chain
- [ ] Test: Registered users show real names, not "Participant"

### Phase 3: Fix WebRTC Connections
- [ ] Add peer connection creation in `handleParticipantJoined()`
- [ ] Implement proper signaling flow
- [ ] Test: Join from 2 browsers, see video immediately without refresh

### Phase 4: Fix Screen Share Display
- [ ] Add `displayScreenShareLocally()` function
- [ ] Add `handleRemoteScreenShare()` function
- [ ] Update `startScreenShareBroadcast()` to display locally
- [ ] Update WebRTC signaling to handle screen share flag
- [ ] Test: Share screen, see actual content (not placeholder)

---

## 🧪 Testing Plan

### Test 1: No Duplicate Participants
```
1. User A joins meeting
2. Refresh page 3 times
3. ✅ Expected: Only 1 participant entry for User A
4. ✅ Expected: No phantom participants
```

### Test 2: Real User Names
```
1. User A (registered) joins meeting
2. User B (registered) joins meeting
3. Guest C joins meeting
4. ✅ Expected: User A shows real name from database
5. ✅ Expected: User B shows real name from database
6. ✅ Expected: Guest C shows entered guest name
```

### Test 3: Instant Video Connection
```
1. User A joins meeting
2. User B joins meeting (no refresh)
3. ✅ Expected: User A sees User B's video immediately
4. ✅ Expected: User B sees User A's video immediately
5. ✅ Expected: No refresh needed
```

### Test 4: Screen Share Visual
```
1. User A shares screen
2. ✅ Expected: User A sees their own screen share
3. ✅ Expected: User B sees User A's actual screen content
4. ✅ Expected: Not a placeholder, real visual content
```

---

## 🎯 Expected Results

**Before Fixes:**
- ❌ No video between participants
- ❌ Duplicate participants on refresh
- ❌ Users show as "Participant"
- ❌ Screen share shows placeholder

**After Fixes:**
- ✅ Instant video connection
- ✅ No duplicates, clean participant list
- ✅ Real names from database/auth
- ✅ Actual screen share content visible

---

**Fix Date**: 2025-10-26  
**Priority**: CRITICAL  
**Status**: READY TO IMPLEMENT
