// Enhanced Error Handler and Feature Detection for All Browsers
// Add this to meeting.html after browser-compatibility.js

const EnhancedErrorHandler = {
    
    // Enhanced getUserMedia with detailed error handling
    async getUserMedia(constraints) {
        console.log('📹 Requesting media access:', constraints);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Media access granted');
            return { success: true, stream };
        } catch (error) {
            console.error('❌ Media access error:', error.name, error.message);
            
            // Browser-specific error messages
            const errorDetails = this.getMediaErrorDetails(error, constraints);
            
            // Show user-friendly notification
            if (window.showNotification) {
                window.showNotification(errorDetails.message, 'error');
            } else {
                alert(errorDetails.message);
            }
            
            return { 
                success: false, 
                error: error.name,
                message: errorDetails.message,
                solution: errorDetails.solution
            };
        }
    },
    
    // Get detailed error information
    getMediaErrorDetails(error, constraints) {
        const requestedVideo = constraints.video;
        const requestedAudio = constraints.audio;
        
        const errorMap = {
            'NotFoundError': {
                message: `${requestedVideo ? 'Camera' : ''} ${requestedVideo && requestedAudio ? 'and' : ''} ${requestedAudio ? 'Microphone' : ''} not found`,
                solution: 'Please connect a camera/microphone and refresh the page.',
                action: 'Check Device Connection'
            },
            'NotAllowedError': {
                message: 'Permission denied to access camera/microphone',
                solution: 'Click the camera icon in your browser address bar and allow access.',
                action: 'Allow Camera/Microphone Access'
            },
            'NotReadableError': {
                message: 'Camera/microphone is already in use',
                solution: 'Close other apps using your camera/microphone and try again.',
                action: 'Close Other Apps'
            },
            'OverconstrainedError': {
                message: 'Camera/microphone doesn\'t meet requirements',
                solution: 'Your device camera/microphone doesn\'t support the requested quality.',
                action: 'Try Lower Quality Settings'
            },
            'NotSupportedError': {
                message: 'Your browser doesn\'t support video calls',
                solution: 'Please use Chrome, Firefox, Safari, or Edge browser.',
                action: 'Update/Change Browser'
            },
            'AbortError': {
                message: 'Camera/microphone access was cancelled',
                solution: 'Please allow access when prompted.',
                action: 'Allow Access'
            },
            'SecurityError': {
                message: 'Camera/microphone blocked by browser security',
                solution: 'Ensure you\'re using HTTPS (not HTTP) or localhost.',
                action: 'Use Secure Connection'
            },
            'TypeError': {
                message: 'Invalid media constraints',
                solution: 'This is a technical issue. Please refresh the page.',
                action: 'Refresh Page'
            }
        };
        
        return errorMap[error.name] || {
            message: 'Failed to access camera/microphone: ' + error.message,
            solution: 'Please check your browser settings and try again.',
            action: 'Check Settings'
        };
    },
    
    // Enhanced getDisplayMedia for screen sharing
    async getDisplayMedia(constraints) {
        console.log('📺 Requesting screen share access');
        
        // Check if supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            const message = 'Screen sharing is not supported in your browser';
            console.error('❌', message);
            
            if (window.showNotification) {
                window.showNotification(message, 'error');
            }
            
            return {
                success: false,
                error: 'NotSupportedError',
                message
            };
        }
        
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
            console.log('✅ Screen share access granted');
            return { success: true, stream };
        } catch (error) {
            console.error('❌ Screen share error:', error.name, error.message);
            
            const errorDetails = this.getScreenShareErrorDetails(error);
            
            if (window.showNotification) {
                window.showNotification(errorDetails.message, 'warning');
            }
            
            return {
                success: false,
                error: error.name,
                message: errorDetails.message,
                solution: errorDetails.solution
            };
        }
    },
    
    // Get screen share error details
    getScreenShareErrorDetails(error) {
        const errorMap = {
            'NotAllowedError': {
                message: 'Screen sharing permission denied',
                solution: 'Click "Share" when prompted to share your screen.'
            },
            'NotFoundError': {
                message: 'No screen available to share',
                solution: 'Please select a screen, window, or tab to share.'
            },
            'NotSupportedError': {
                message: 'Screen sharing not supported in your browser',
                solution: 'Please use Chrome, Firefox, or Edge for screen sharing.'
            },
            'AbortError': {
                message: 'Screen sharing cancelled',
                solution: 'Click the screen share button again to retry.'
            },
            'InvalidStateError': {
                message: 'Screen sharing already active',
                solution: 'Stop current screen share before starting a new one.'
            }
        };
        
        return errorMap[error.name] || {
            message: 'Screen sharing failed: ' + error.message,
            solution: 'Please try again or refresh the page.'
        };
    },
    
    // Feature detection with progressive enhancement
    detectFeatures() {
        const features = {
            // Core WebRTC
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
            RTCPeerConnection: !!window.RTCPeerConnection,
            
            // Advanced features
            mediaRecorder: !!window.MediaRecorder,
            webAudio: !!(window.AudioContext || window.webkitAudioContext),
            canvas: !!document.createElement('canvas').getContext,
            
            // Security
            isSecureContext: window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost',
            
            // Device info
            mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
            
            // Overall support
            webRTCSupported: false
        };
        
        // Check overall WebRTC support
        features.webRTCSupported = features.getUserMedia && features.RTCPeerConnection;
        
        console.log('🔍 Feature Detection Results:', features);
        
        // Store globally
        window.supportedFeatures = features;
        
        return features;
    },
    
    // Apply UI changes based on feature support
    applyFeatureBasedUI() {
        const features = window.supportedFeatures || this.detectFeatures();
        
        // Hide unsupported features
        if (!features.getDisplayMedia) {
            console.warn('⚠️ Screen sharing not supported, hiding button');
            const screenShareBtn = document.getElementById('toggle-screen-share');
            if (screenShareBtn) {
                screenShareBtn.style.display = 'none';
            }
        }
        
        if (!features.mediaRecorder) {
            console.warn('⚠️ Recording not supported, hiding button');
            const recordBtn = document.getElementById('toggle-recording');
            if (recordBtn) {
                recordBtn.style.display = 'none';
            }
        }
        
        if (!features.isSecureContext && window.location.hostname !== 'localhost') {
            console.error('❌ Not a secure context (HTTPS required)');
            this.showSecurityWarning();
        }
        
        if (!features.webRTCSupported) {
            console.error('❌ WebRTC not supported');
            this.showUnsupportedBrowserError();
        }
    },
    
    // Show security warning for HTTP connections
    showSecurityWarning() {
        const warning = document.createElement('div');
        warning.id = 'security-warning';
        warning.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #ff4444, #cc0000);
            color: white;
            padding: 15px 20px;
            text-align: center;
            z-index: 99999;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: slideDown 0.3s ease-out;
        `;
        
        warning.innerHTML = `
            <div style="max-width: 1200px; margin: 0 auto;">
                🔒 <strong>Security Warning:</strong> This site requires HTTPS for video calls. 
                Current URL: ${window.location.protocol}//${window.location.host}
                <br><small>Camera and microphone access will be blocked on HTTP connections.</small>
            </div>
        `;
        
        document.body.prepend(warning);
    },
    
    // Show unsupported browser error
    showUnsupportedBrowserError() {
        const overlay = document.createElement('div');
        overlay.id = 'unsupported-browser-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; padding: 40px; max-width: 600px;">
                <h1 style="font-size: 48px; margin-bottom: 20px;">🚫</h1>
                <h2 style="font-size: 28px; margin-bottom: 15px;">Browser Not Supported</h2>
                <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px; color: #ccc;">
                    Your browser doesn't support WebRTC video calls. 
                    Please use one of these modern browsers:
                </p>
                <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                    <a href="https://www.google.com/chrome/" target="_blank" 
                       style="background: #4285F4; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        Download Chrome
                    </a>
                    <a href="https://www.mozilla.org/firefox/" target="_blank"
                       style="background: #FF7139; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        Download Firefox
                    </a>
                    <a href="https://www.microsoft.com/edge" target="_blank"
                       style="background: #0078D7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        Download Edge
                    </a>
                </div>
                <p style="margin-top: 30px; font-size: 14px; color: #888;">
                    Detected Browser: ${navigator.userAgent}
                </p>
            </div>
        `;
        
        document.body.appendChild(overlay);
    },
    
    // Test connectivity to STUN/TURN servers
    async testICEConnectivity() {
        console.log('🧪 Testing ICE connectivity...');
        
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            let candidateFound = false;
            
            return new Promise((resolve) => {
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        candidateFound = true;
                        console.log('✅ ICE candidate found:', event.candidate.type);
                        pc.close();
                        resolve({ success: true, candidate: event.candidate });
                    }
                };
                
                // Create dummy offer to start ICE gathering
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .catch(err => {
                        console.error('❌ Failed to create offer:', err);
                        pc.close();
                        resolve({ success: false, error: err.message });
                    });
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    if (!candidateFound) {
                        console.error('❌ ICE gathering timeout - possible firewall/network issue');
                        pc.close();
                        resolve({ 
                            success: false, 
                            error: 'ICE gathering timeout',
                            message: 'Network may be blocking WebRTC. Check firewall settings.'
                        });
                    }
                }, 5000);
            });
        } catch (error) {
            console.error('❌ ICE connectivity test failed:', error);
            return { success: false, error: error.message };
        }
    }
};

// Auto-initialize when DOM is ready
(function() {
    console.log('🔧 Enhanced Error Handler loaded');
    
    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEnhancedHandler);
    } else {
        initializeEnhancedHandler();
    }
    
    function initializeEnhancedHandler() {
        // Detect features
        const features = EnhancedErrorHandler.detectFeatures();
        
        // Apply UI changes based on features
        setTimeout(() => {
            EnhancedErrorHandler.applyFeatureBasedUI();
        }, 500); // Wait for DOM to be fully ready
        
        // Test ICE connectivity in background
        EnhancedErrorHandler.testICEConnectivity().then(result => {
            if (!result.success) {
                console.warn('⚠️ ICE connectivity issue detected:', result.message);
            }
        });
    }
})();

// Export globally
window.EnhancedErrorHandler = EnhancedErrorHandler;

console.log('✅ Enhanced Error Handler module loaded');
