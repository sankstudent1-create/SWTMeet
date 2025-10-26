# Browser Compatibility Guide for SWTMeet

## Current Status
- ✅ **Firefox**: Working (after restart)
- ⚠️ **Brave**: Issues reported
- ❌ **Safari**: Issues reported

## Why Different Browsers Behave Differently

### 1. **Brave Browser Issues**
Brave has **aggressive privacy protection** that blocks WebRTC by default:

**Problem**: 
- WebRTC IP leak protection blocks peer connections
- Fingerprinting protection blocks device access
- Shields block ICE candidates

**Solutions**:
```
1. Click the Brave Shield icon (lion) in address bar
2. Turn OFF "Block fingerprinting"
3. Or go to: brave://settings/privacy
4. Set "WebRTC IP handling policy" to "Default"
5. Refresh the page (Ctrl+Shift+R)
```

**Alternative**: Add site exception
```
brave://settings/content/all
→ Find your meeting site
→ Allow camera, microphone, and notifications
```

---

### 2. **Safari Browser Issues**
Safari has **multiple WebRTC limitations**:

#### Issue A: Requires HTTPS (not HTTP)
- **Problem**: Safari blocks WebRTC on non-secure connections
- **Solution**: Use HTTPS or localhost (127.0.0.1)

#### Issue B: Strict Autoplay Policy
- **Problem**: Videos don't autoplay without user interaction
- **Solution**: User must click something first

#### Issue C: Limited getDisplayMedia() Support
- **Problem**: Screen sharing API behaves differently
- **Solution**: Additional error handling needed

#### Issue D: Track Label Detection
- **Problem**: Screen share tracks don't have "screen" in label
- **Solution**: Use multiple detection methods (already in code)

#### Issue E: Codec Compatibility
- **Problem**: Safari prefers H.264, may not support VP8/VP9
- **Solution**: Add explicit codec preferences

---

## Required User Actions

### For Brave Users:
```bash
1. Open meeting site
2. Click Brave Shield icon (top right)
3. Select "Shields Down for this site"
4. Refresh page (Ctrl+Shift+R)
5. Allow camera/microphone when prompted
```

### For Safari Users:
```bash
1. Safari → Settings → Websites → Camera → Allow
2. Safari → Settings → Websites → Microphone → Allow  
3. Safari → Settings → Websites → Auto-Play → Allow All Auto-Play
4. Ensure site is using HTTPS (not HTTP)
5. Refresh page (Cmd+Shift+R)
```

---

## Technical Differences

### WebRTC Implementation by Browser

| Feature | Chrome/Brave | Firefox | Safari |
|---------|--------------|---------|--------|
| STUN/TURN | ✅ Full | ✅ Full | ⚠️ Limited |
| ICE Candidates | ✅ Fast | ✅ Fast | ⚠️ Slow |
| Screen Share | ✅ Full | ✅ Full | ⚠️ Limited |
| Unified Plan SDP | ✅ Default | ✅ Default | ⚠️ Partial |
| Track Labels | ✅ Detailed | ✅ Detailed | ❌ Generic |
| Multiple Streams | ✅ Yes | ✅ Yes | ⚠️ Issues |

### Browser-Specific Quirks

**Brave**:
- Blocks WebRTC IP leak by default
- Requires explicit permission for peer connections
- May block ICE candidate gathering

**Safari**:
- Doesn't label screen share tracks properly (uses generic "camera")
- Requires HTTPS for WebRTC (localhost is OK)
- Has strict autoplay policies
- Slower ICE connection establishment
- May freeze on track changes

**Firefox**:
- Good WebRTC support overall
- May cache peer connections (requires restart)
- Handles renegotiation well

---

## Code Already Handles Most Issues

Your code already has multiple detection methods:

```javascript
// From webrtc-signaling.js lines 141-162
const isKnownScreenShare = streamId && window.screenShareStreamIds.has(streamId);
const labelIndicatesScreen = event.track.kind === 'video' && 
                             (event.track.label.toLowerCase().includes('screen') ||
                              event.track.label.toLowerCase().includes('window') ||
                              event.track.label.toLowerCase().includes('monitor') ||
                              event.track.label.toLowerCase().includes('display'));
const isDifferentStream = streamId && remoteStreams[participantId]?.id && 
                         streamId !== remoteStreams[participantId]?.id;
```

This ensures screen sharing works even when Safari doesn't label tracks correctly!

---

## Quick Test Checklist

### Before Testing:
- [ ] Site is on HTTPS (or localhost)
- [ ] Camera/microphone permissions granted
- [ ] Browser updated to latest version
- [ ] No VPN or proxy interfering

### Brave Specific:
- [ ] Shields down for the site
- [ ] WebRTC not blocked in privacy settings
- [ ] Fingerprinting protection disabled

### Safari Specific:
- [ ] Auto-play allowed
- [ ] Camera/microphone allowed in Safari settings
- [ ] Not using Private Browsing mode

---

## Still Not Working?

### Console Errors to Check:
```bash
# Open Developer Console (F12 or Cmd+Option+I)

Look for:
- "NotAllowedError" → Permission denied
- "NotFoundError" → Camera/microphone not found  
- "ICE failed" → Connection blocked
- "Track ended" → Stream stopped unexpectedly
```

### Brave Debug:
```bash
brave://webrtc-internals/
→ Check ICE candidate gathering
→ Look for "failed" or "disconnected" states
```

### Safari Debug:
```bash
Safari → Develop → Show JavaScript Console
→ Check for autoplay errors
→ Look for SSL/HTTPS warnings
```

---

## Recommended Browser Order

For best experience:
1. **Chrome** - Best WebRTC support
2. **Firefox** - Good support, privacy-focused
3. **Brave** - Requires shield adjustment
4. **Edge** - Chromium-based, good support
5. **Safari** - Limited support, requires workarounds

---

## Summary

**Your Issues**:
- Brave: Privacy features blocking WebRTC
- Safari: Limited WebRTC implementation

**Quick Fixes**:
1. Brave: Turn off Shields for your site
2. Safari: Check HTTPS and permissions
3. Both: Clear cache and refresh

**Your code is already robust** - it handles browser differences well with multiple detection methods!
