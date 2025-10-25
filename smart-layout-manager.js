// ==================== SMART LAYOUT MANAGER ====================
// Intelligent video grid that adapts to screen size and participant count
// No scrollbars - auto-resize tiles and paginate if needed

const SmartLayout = {
    currentPage: 0,
    totalPages: 1,
    tilesPerPage: 9,
    screenShareActive: false,
    
    // Calculate optimal tile size based on participant count
    calculateLayout(participantCount, hasScreenShare) {
        const container = document.getElementById('video-grid');
        if (!container) return null;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight - 120; // Reserve space for footer
        
        // Reserve space for screen share if active
        let availableWidth = containerWidth;
        let availableHeight = containerHeight;
        
        if (hasScreenShare) {
            // Screen share on right side (65% width)
            availableWidth = containerWidth * 0.32; // Left 32% for cameras
            this.screenShareActive = true;
        } else {
            this.screenShareActive = false;
        }
        
        // Calculate optimal grid layout
        const layout = this.getOptimalGrid(participantCount, availableWidth, availableHeight);
        
        return layout;
    },
    
    // Get optimal grid configuration
    getOptimalGrid(count, width, height) {
        if (count === 0) return { cols: 1, rows: 1, tileWidth: width, tileHeight: height };
        
        let bestLayout = null;
        let bestWaste = Infinity;
        
        // Try different grid configurations
        for (let cols = 1; cols <= count; cols++) {
            const rows = Math.ceil(count / cols);
            
            // Calculate tile size maintaining 16:9 aspect ratio
            const tileWidth = width / cols;
            const tileHeight = height / rows;
            
            // Prefer 16:9 aspect ratio
            const aspectRatio = tileWidth / tileHeight;
            const idealAspect = 16 / 9;
            const waste = Math.abs(aspectRatio - idealAspect);
            
            if (waste < bestWaste && rows <= 4) { // Max 4 rows
                bestWaste = waste;
                bestLayout = { cols, rows, tileWidth, tileHeight };
            }
        }
        
        return bestLayout;
    },
    
    // Apply layout to video grid
    applyLayout(layout, hasScreenShare) {
        const container = document.getElementById('video-grid');
        if (!container) return;
        
        if (hasScreenShare) {
            // Split layout: cameras on left, screen share on right
            container.style.display = 'flex';
            container.style.flexDirection = 'row';
            container.style.gap = '12px';
            container.style.padding = '12px';
            container.style.overflow = 'hidden';
            
            // Create camera grid container
            let cameraGrid = document.getElementById('camera-grid');
            if (!cameraGrid) {
                cameraGrid = document.createElement('div');
                cameraGrid.id = 'camera-grid';
                cameraGrid.style.cssText = `
                    flex: 0 0 32%;
                    display: grid;
                    gap: 8px;
                    align-content: start;
                    overflow-y: auto;
                    max-height: 100%;
                `;
            }
            
            // Create screen share container
            let screenShareContainer = document.getElementById('screen-share-container');
            if (!screenShareContainer) {
                screenShareContainer = document.createElement('div');
                screenShareContainer.id = 'screen-share-container';
                screenShareContainer.style.cssText = `
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #000;
                    border-radius: 12px;
                    overflow: hidden;
                    min-height: 0;
                `;
            }
            
            // Set camera grid layout
            cameraGrid.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
            cameraGrid.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;
            
            // Move all video participants to camera grid
            const videos = Array.from(container.querySelectorAll('.video-participant:not(.screen-share)'));
            videos.forEach(video => {
                if (video.parentElement !== cameraGrid) {
                    cameraGrid.appendChild(video);
                }
            });
            
            // Move screen share to screen share container
            const screenShare = container.querySelector('.screen-share, #screen-share-display');
            if (screenShare && screenShare.parentElement !== screenShareContainer) {
                screenShareContainer.appendChild(screenShare);
            }
            
            // Rebuild container structure
            container.innerHTML = '';
            container.appendChild(cameraGrid);
            container.appendChild(screenShareContainer);
            
        } else {
            // Normal grid layout
            container.style.display = 'grid';
            container.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
            container.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;
            container.style.gap = '12px';
            container.style.padding = '12px';
            container.style.overflow = 'hidden';
            
            // Remove split containers if they exist
            const cameraGrid = document.getElementById('camera-grid');
            const screenShareContainer = document.getElementById('screen-share-container');
            
            if (cameraGrid) {
                // Move videos back to main container
                const videos = Array.from(cameraGrid.children);
                videos.forEach(video => container.appendChild(video));
                cameraGrid.remove();
            }
            
            if (screenShareContainer) {
                screenShareContainer.remove();
            }
        }
        
        // Update pagination if needed
        this.updatePagination();
    },
    
    // Update pagination controls
    updatePagination() {
        const container = document.getElementById('video-grid');
        if (!container) return;
        
        const videos = container.querySelectorAll('.video-participant:not(.screen-share)');
        const totalVideos = videos.length;
        
        this.totalPages = Math.ceil(totalVideos / this.tilesPerPage);
        
        // Show/hide pagination controls
        let paginationDiv = document.getElementById('video-pagination');
        if (!paginationDiv && this.totalPages > 1) {
            paginationDiv = document.createElement('div');
            paginationDiv.id = 'video-pagination';
            paginationDiv.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 10px;
                background: rgba(0, 0, 0, 0.8);
                padding: 10px 20px;
                border-radius: 25px;
                z-index: 90;
            `;
            
            paginationDiv.innerHTML = `
                <button id="prev-page" style="background: var(--color-primary); border: none; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer;">
                    ← Prev
                </button>
                <span id="page-indicator" style="color: white; display: flex; align-items: center; padding: 0 10px;">
                    Page 1 of ${this.totalPages}
                </span>
                <button id="next-page" style="background: var(--color-primary); border: none; color: white; padding: 8px 16px; border-radius: 20px; cursor: pointer;">
                    Next →
                </button>
            `;
            
            document.body.appendChild(paginationDiv);
            
            // Add event listeners
            document.getElementById('prev-page').addEventListener('click', () => this.previousPage());
            document.getElementById('next-page').addEventListener('click', () => this.nextPage());
        } else if (paginationDiv && this.totalPages <= 1) {
            paginationDiv.remove();
        }
        
        this.showCurrentPage();
    },
    
    // Show current page of videos
    showCurrentPage() {
        const container = document.getElementById('video-grid');
        if (!container) return;
        
        const videos = Array.from(container.querySelectorAll('.video-participant:not(.screen-share)'));
        const startIndex = this.currentPage * this.tilesPerPage;
        const endIndex = startIndex + this.tilesPerPage;
        
        videos.forEach((video, index) => {
            if (index >= startIndex && index < endIndex) {
                video.style.display = 'flex';
            } else {
                video.style.display = 'none';
            }
        });
        
        // Update page indicator
        const indicator = document.getElementById('page-indicator');
        if (indicator) {
            indicator.textContent = `Page ${this.currentPage + 1} of ${this.totalPages}`;
        }
        
        // Disable buttons at boundaries
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        if (prevBtn) prevBtn.disabled = this.currentPage === 0;
        if (nextBtn) nextBtn.disabled = this.currentPage === this.totalPages - 1;
    },
    
    // Navigate to previous page
    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.showCurrentPage();
        }
    },
    
    // Navigate to next page
    nextPage() {
        if (this.currentPage < this.totalPages - 1) {
            this.currentPage++;
            this.showCurrentPage();
        }
    },
    
    // Recalculate and apply layout
    refresh() {
        const container = document.getElementById('video-grid');
        if (!container) return;
        
        const videos = container.querySelectorAll('.video-participant:not(.screen-share)');
        const screenShare = container.querySelector('.screen-share, #screen-share-display');
        const hasScreenShare = screenShare !== null;
        
        const layout = this.calculateLayout(videos.length, hasScreenShare);
        if (layout) {
            this.applyLayout(layout, hasScreenShare);
        }
    }
};

// Auto-refresh layout on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        SmartLayout.refresh();
    }, 250);
});

// Export globally
window.SmartLayout = SmartLayout;

console.log('✅ Smart Layout Manager loaded');
