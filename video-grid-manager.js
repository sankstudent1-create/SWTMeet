// Video Grid Manager - Advanced Layout & Controls
// Handles pagination, view modes, pinning, and screen share layout

// ==================== GLOBAL STATE ====================

let currentView = 'gallery'; // gallery, speaker, pinned
let pinnedParticipantId = null;
let currentPage = 0;
let participantsPerPage = 9;
let gridScreenShareActive = false;
let gridScreenShareParticipantId = null;

// ==================== VIEW MODES ====================

window.switchView = function(viewMode) {
    currentView = viewMode;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewMode}"]`)?.classList.add('active');
    
    // Apply view
    applyViewLayout();
    
    console.log('Switched to view:', viewMode);
};

function applyViewLayout() {
    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) return;
    
    // Remove existing layout classes
    videoGrid.classList.remove('gallery-view', 'speaker-view', 'pinned-view');
    
    switch(currentView) {
        case 'gallery':
            videoGrid.classList.add('gallery-view');
            showGalleryView();
            break;
        case 'speaker':
            videoGrid.classList.add('speaker-view');
            showSpeakerView();
            break;
        case 'pinned':
            videoGrid.classList.add('pinned-view');
            showPinnedView();
            break;
    }
}

// ==================== GALLERY VIEW ====================

function showGalleryView() {
    const videoGrid = document.getElementById('video-grid');
    const allVideos = Array.from(videoGrid.querySelectorAll('.video-participant'));
    
    // If screen share active, show it prominently
    if (gridScreenShareActive) {
        arrangeWithScreenShare(allVideos);
    } else {
        arrangeGalleryGrid(allVideos);
    }
}

function arrangeGalleryGrid(videos) {
    const totalVideos = videos.length;
    const videoGrid = document.getElementById('video-grid');
    
    // Calculate grid layout
    let cols, rows;
    if (totalVideos <= 1) {
        cols = 1; rows = 1;
    } else if (totalVideos <= 4) {
        cols = 2; rows = 2;
    } else if (totalVideos <= 6) {
        cols = 3; rows = 2;
    } else if (totalVideos <= 9) {
        cols = 3; rows = 3;
    } else {
        cols = 4; rows = 3;
    }
    
    videoGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    videoGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    // Show current page
    const startIdx = currentPage * participantsPerPage;
    const endIdx = startIdx + participantsPerPage;
    
    videos.forEach((video, idx) => {
        if (idx >= startIdx && idx < endIdx) {
            video.style.display = 'block';
        } else {
            video.style.display = 'none';
        }
    });
    
    updatePagination(videos.length);
}

function arrangeWithScreenShare(videos) {
    const videoGrid = document.getElementById('video-grid');
    const screenShare = videoGrid.querySelector('.screen-share');
    const otherVideos = videos.filter(v => !v.classList.contains('screen-share'));
    
    if (screenShare) {
        // Screen share takes 75% width, participants on side
        videoGrid.style.gridTemplateColumns = '3fr 1fr';
        videoGrid.style.gridTemplateRows = 'auto';
        
        screenShare.style.gridColumn = '1';
        screenShare.style.gridRow = '1';
        screenShare.style.display = 'block';
        
        // Create sidebar for participants
        let sidebar = videoGrid.querySelector('.participants-sidebar');
        if (!sidebar) {
            sidebar = document.createElement('div');
            sidebar.className = 'participants-sidebar';
            videoGrid.appendChild(sidebar);
        }
        
        sidebar.style.gridColumn = '2';
        sidebar.style.gridRow = '1';
        sidebar.innerHTML = '';
        
        // Add participants to sidebar
        otherVideos.forEach(video => {
            sidebar.appendChild(video.cloneNode(true));
            video.style.display = 'none';
        });
    }
}

// ==================== SPEAKER VIEW ====================

function showSpeakerView() {
    const videoGrid = document.getElementById('video-grid');
    const allVideos = Array.from(videoGrid.querySelectorAll('.video-participant'));
    
    if (allVideos.length === 0) return;
    
    // First video is large (speaker), others small at bottom
    videoGrid.style.gridTemplateColumns = '1fr';
    videoGrid.style.gridTemplateRows = '4fr 1fr';
    
    allVideos.forEach((video, idx) => {
        if (idx === 0) {
            video.style.gridColumn = '1';
            video.style.gridRow = '1';
            video.style.display = 'block';
        } else if (idx <= 4) {
            video.style.gridColumn = '1';
            video.style.gridRow = '2';
            video.style.display = 'block';
        } else {
            video.style.display = 'none';
        }
    });
}

// ==================== PINNED VIEW ====================

function showPinnedView() {
    if (!pinnedParticipantId) {
        showGalleryView();
        return;
    }
    
    const videoGrid = document.getElementById('video-grid');
    const pinnedVideo = videoGrid.querySelector(`[data-participant-id="${pinnedParticipantId}"]`);
    const otherVideos = Array.from(videoGrid.querySelectorAll('.video-participant'))
        .filter(v => v.dataset.participantId !== pinnedParticipantId);
    
    if (pinnedVideo) {
        videoGrid.style.gridTemplateColumns = '3fr 1fr';
        videoGrid.style.gridTemplateRows = 'auto';
        
        pinnedVideo.style.gridColumn = '1';
        pinnedVideo.style.gridRow = '1';
        pinnedVideo.style.display = 'block';
        
        // Others on side
        otherVideos.forEach((video, idx) => {
            if (idx < 6) {
                video.style.gridColumn = '2';
                video.style.gridRow = '1';
                video.style.display = 'block';
            } else {
                video.style.display = 'none';
            }
        });
    }
}

// ==================== PIN CONTROLS ====================

window.pinParticipant = function(participantId) {
    if (pinnedParticipantId === participantId) {
        // Unpin
        pinnedParticipantId = null;
        showNotification('Participant unpinned', 'info');
    } else {
        // Pin
        pinnedParticipantId = participantId;
        currentView = 'pinned';
        showNotification('Participant pinned', 'success');
    }
    
    applyViewLayout();
};

window.unpinAll = function() {
    pinnedParticipantId = null;
    currentView = 'gallery';
    applyViewLayout();
    showNotification('All participants unpinned', 'info');
};

// ==================== PAGINATION ====================

function updatePagination(totalVideos) {
    const totalPages = Math.ceil(totalVideos / participantsPerPage);
    const paginationEl = document.getElementById('video-pagination');
    
    if (!paginationEl) return;
    
    if (totalPages <= 1) {
        paginationEl.style.display = 'none';
        return;
    }
    
    paginationEl.style.display = 'flex';
    paginationEl.innerHTML = `
        <button onclick="previousPage()" ${currentPage === 0 ? 'disabled' : ''}>
            ← Previous
        </button>
        <span>Page ${currentPage + 1} of ${totalPages}</span>
        <button onclick="nextPage()" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
            Next →
        </button>
    `;
}

window.previousPage = function() {
    if (currentPage > 0) {
        currentPage--;
        applyViewLayout();
    }
};

window.nextPage = function() {
    const videoGrid = document.getElementById('video-grid');
    const allVideos = videoGrid.querySelectorAll('.video-participant');
    const totalPages = Math.ceil(allVideos.length / participantsPerPage);
    
    if (currentPage < totalPages - 1) {
        currentPage++;
        applyViewLayout();
    }
};

// ==================== SCREEN SHARE HANDLING ====================

window.notifyScreenShareStart = function(participantId) {
    gridScreenShareActive = true;
    gridScreenShareParticipantId = participantId;
    applyViewLayout();
};

window.notifyScreenShareStop = function() {
    gridScreenShareActive = false;
    gridScreenShareParticipantId = null;
    applyViewLayout();
};

// ==================== REARRANGE ====================

window.moveVideoUp = function(participantId) {
    const videoGrid = document.getElementById('video-grid');
    const video = videoGrid.querySelector(`[data-participant-id="${participantId}"]`);
    const prevVideo = video?.previousElementSibling;
    
    if (video && prevVideo) {
        videoGrid.insertBefore(video, prevVideo);
        showNotification('Video moved up', 'info');
    }
};

window.moveVideoDown = function(participantId) {
    const videoGrid = document.getElementById('video-grid');
    const video = videoGrid.querySelector(`[data-participant-id="${participantId}"]`);
    const nextVideo = video?.nextElementSibling;
    
    if (video && nextVideo) {
        videoGrid.insertBefore(nextVideo, video);
        showNotification('Video moved down', 'info');
    }
};

// ==================== FULLSCREEN ====================

window.toggleFullscreen = function(participantId) {
    const video = document.querySelector(`[data-participant-id="${participantId}"]`);
    
    if (!video) return;
    
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        video.requestFullscreen().catch(err => {
            console.error('Fullscreen error:', err);
        });
    }
};

// ==================== INITIALIZATION ====================

function initializeVideoGrid() {
    // Set default view
    currentView = 'gallery';
    currentPage = 0;
    
    // Don't apply layout immediately - let videos load first
    console.log('Video grid manager initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeVideoGrid);
} else {
    initializeVideoGrid();
}

// ==================== EXPORT ====================

window.VideoGridManager = {
    switchView,
    pinParticipant,
    unpinAll,
    previousPage,
    nextPage,
    notifyScreenShareStart,
    notifyScreenShareStop,
    moveVideoUp,
    moveVideoDown,
    toggleFullscreen
};

console.log('Video grid manager module loaded');
