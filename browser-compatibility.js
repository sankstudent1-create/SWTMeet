// Browser Compatibility Detection and Fixes
// Add this to meeting.html: <script src="browser-compatibility.js"></script>

const BrowserCompat = {
    // Detect browser type
    detect() {
        const ua = navigator.userAgent;
        
        const browsers = {
            isSafari: /^((?!chrome|android).)*safari/i.test(ua),
            isChrome: /chrome/i.test(ua) && !/edg/i.test(ua) && !/brave/i.test(ua),
            isBrave: navigator.brave && typeof navigator.brave.isBrave === 'function',
            isFirefox: /firefox/i.test(ua),
            isEdge: /edg/i.test(ua),
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isMobile: /Mobile|Android/i.test(ua)
        };
        
        // Store detected browser
        this.browser = browsers;
        
        console.log('🔍 Browser detected:', 
            browsers.isBrave ? 'Brave' :
            browsers.isSafari ? 'Safari' :
            browsers.isFirefox ? 'Firefox' :
            browsers.isChrome ? 'Chrome' :
            browsers.isEdge ? 'Edge' : 'Unknown'
        );
        
        return browsers;
    },
    
    // Check if browser supports all required features
    checkSupport() {
        const support = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
            RTCPeerConnection: !!(window.RTCPeerConnection),
            webRTC: !!(navigator.mediaDevices && window.RTCPeerConnection),
            isSecureContext: window.isSecureContext
        };
        
        console.log('✅ Browser support:', support);
        
        return support;
    },
    
    // Apply browser-specific fixes
    applyFixes() {
        const browser = this.browser || this.detect();
        
        // Safari-specific fixes
        if (browser.isSafari || browser.isIOS) {
            console.log('🔧 Applying Safari compatibility fixes...');
            this.fixSafari();
        }
        
        // Brave-specific fixes
        if (browser.isBrave) {
            console.log('🔧 Applying Brave compatibility fixes...');
            this.fixBrave();
        }
        
        // Firefox-specific fixes
        if (browser.isFirefox) {
            console.log('🔧 Applying Firefox compatibility fixes...');
            this.fixFirefox();
        }
    },
    
    // Safari-specific compatibility fixes
    fixSafari() {
        // Fix 1: Ensure videos autoplay by adding playsinline
        const style = document.createElement('style');
        style.textContent = `
            video {
                -webkit-playsinline: true;
                playsinline: true;
            }
        `;
        document.head.appendChild(style);
        
        // Fix 2: Override video display to handle Safari's autoplay policy
        const originalDisplayRemote = window.VideoManager?.displayRemote;
        if (originalDisplayRemote) {
            window.VideoManager.displayRemote = function(participantId, stream, participantName) {
                originalDisplayRemote.call(this, participantId, stream, participantName);
                
                // Force play for Safari
                setTimeout(() => {
                    const video = document.querySelector(`[data-participant-id="${participantId}"] video`);
                    if (video) {
                        video.play().catch(e => {
                            console.warn('Safari autoplay blocked, user interaction required:', e);
                        });
                    }
                }, 100);
            };
        }
        
        // Fix 3: Warn if not on HTTPS
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.warn('⚠️ Safari requires HTTPS for WebRTC. Current protocol:', window.location.protocol);
            this.showWarning('Safari requires HTTPS for video calls. Please use a secure connection.');
        }
        
        console.log('✅ Safari fixes applied');
    },
    
    // Brave-specific compatibility fixes
    async fixBrave() {
        // Check if Brave is blocking WebRTC
        try {
            const isBrave = await navigator.brave?.isBrave();
            if (isBrave) {
                console.log('🦁 Brave browser detected');
                
                // Warn user about Shields
                this.showInfo(
                    'Brave Users: If video doesn\'t work, click the Brave Shield icon and select "Shields Down for this site"',
                    8000
                );
            }
        } catch (e) {
            console.log('Could not verify Brave status:', e);
        }
        
        console.log('✅ Brave fixes applied');
    },
    
    // Firefox-specific compatibility fixes
    fixFirefox() {
        // Firefox handles WebRTC well, but may need connection refresh
        console.log('✅ Firefox - no specific fixes needed');
    },
    
    // Show warning banner
    showWarning(message) {
        const banner = document.createElement('div');
        banner.className = 'browser-warning';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ff4444;
            color: white;
            padding: 12px 20px;
            text-align: center;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        banner.textContent = `⚠️ ${message}`;
        
        document.body.prepend(banner);
        
        // Auto-remove after 10 seconds
        setTimeout(() => banner.remove(), 10000);
    },
    
    // Show info banner
    showInfo(message, duration = 5000) {
        const banner = document.createElement('div');
        banner.className = 'browser-info';
        banner.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #2196F3;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-align: center;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            max-width: 600px;
        `;
        banner.textContent = `ℹ️ ${message}`;
        
        document.body.appendChild(banner);
        
        // Auto-remove
        setTimeout(() => {
            banner.style.transition = 'opacity 0.3s';
            banner.style.opacity = '0';
            setTimeout(() => banner.remove(), 300);
        }, duration);
    },
    
    // Test WebRTC connectivity
    async testWebRTC() {
        console.log('🧪 Testing WebRTC connectivity...');
        
        const results = {
            cameraAccess: false,
            microphoneAccess: false,
            screenShareSupport: false,
            iceConnection: false
        };
        
        // Test 1: Camera access
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            results.cameraAccess = true;
            console.log('✅ Camera access: OK');
        } catch (e) {
            console.error('❌ Camera access failed:', e.message);
            results.cameraAccessError = e.message;
        }
        
        // Test 2: Microphone access
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            results.microphoneAccess = true;
            console.log('✅ Microphone access: OK');
        } catch (e) {
            console.error('❌ Microphone access failed:', e.message);
            results.microphoneAccessError = e.message;
        }
        
        // Test 3: Screen share support
        if (navigator.mediaDevices.getDisplayMedia) {
            results.screenShareSupport = true;
            console.log('✅ Screen share support: OK');
        } else {
            console.error('❌ Screen share not supported');
        }
        
        // Test 4: ICE connection (create dummy peer connection)
        try {
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            
            // Wait for ICE gathering
            await new Promise((resolve) => {
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        results.iceConnection = true;
                        console.log('✅ ICE connection: OK');
                        pc.close();
                        resolve();
                    }
                };
                
                // Create dummy offer to start ICE gathering
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    if (!results.iceConnection) {
                        console.error('❌ ICE connection: TIMEOUT');
                    }
                    pc.close();
                    resolve();
                }, 5000);
            });
        } catch (e) {
            console.error('❌ ICE connection failed:', e.message);
            results.iceConnectionError = e.message;
        }
        
        console.log('🧪 WebRTC test results:', results);
        return results;
    },
    
    // Get recommended browser message
    getRecommendation() {
        const browser = this.browser || this.detect();
        
        if (browser.isSafari) {
            return 'For best experience, consider using Chrome or Firefox instead of Safari.';
        }
        
        if (browser.isBrave) {
            return 'Brave detected: Please disable Shields for this site if video doesn\'t work.';
        }
        
        if (browser.isIOS) {
            return 'iOS Safari has limited WebRTC support. Some features may not work.';
        }
        
        return 'Browser is compatible.';
    }
};

// Auto-initialize when script loads
(function() {
    console.log('🔧 Browser Compatibility module loaded');
    
    // Detect browser
    BrowserCompat.detect();
    
    // Check support
    const support = BrowserCompat.checkSupport();
    
    // Show warnings if not fully supported
    if (!support.webRTC) {
        BrowserCompat.showWarning('Your browser does not support WebRTC. Please use a modern browser.');
    } else if (!support.isSecureContext && window.location.hostname !== 'localhost') {
        BrowserCompat.showWarning('WebRTC requires HTTPS. Please use a secure connection.');
    }
    
    // Apply browser-specific fixes
    BrowserCompat.applyFixes();
    
    // Show recommendation for known problematic browsers
    const recommendation = BrowserCompat.getRecommendation();
    if (recommendation !== 'Browser is compatible.') {
        console.warn('⚠️', recommendation);
    }
})();

// Export globally
window.BrowserCompat = BrowserCompat;
