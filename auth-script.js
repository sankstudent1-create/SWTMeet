// Auth Page JavaScript

// DOM Elements
const authTabs = document.querySelectorAll('.auth-tab');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signinFormElement = document.getElementById('signinForm');
const signupFormElement = document.getElementById('signupForm');
const authMessage = document.getElementById('authMessage');
const logoLoader = document.getElementById('logoLoader');
const oauthButtons = document.querySelectorAll('.btn-oauth');

// Tab Switching
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding form
        if (tabName === 'signin') {
            signinForm.classList.add('active');
            signupForm.classList.remove('active');
        } else {
            signupForm.classList.add('active');
            signinForm.classList.remove('active');
        }
        
        // Clear messages
        hideMessage();
    });
});

// Sign In Form Handler
signinFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    showLoader();
    
    try {
        const { data, error } = await AuthService.signIn(email, password);
        
        if (error) throw error;
        
        showMessage('Sign in successful! Redirecting...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        hideLoader();
        showMessage(error.message || 'Failed to sign in. Please try again.', 'error');
    }
});

// Sign Up Form Handler
signupFormElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long!', 'error');
        return;
    }
    
    showLoader();
    
    try {
        const { data, error } = await AuthService.signUp(email, password, fullName);
        
        if (error) throw error;
        
        showMessage('Account created successfully! Please check your email to verify your account.', 'success');
        
        // Switch to sign in tab after 3 seconds
        setTimeout(() => {
            document.querySelector('[data-tab="signin"]').click();
            hideLoader();
        }, 3000);
        
    } catch (error) {
        hideLoader();
        showMessage(error.message || 'Failed to create account. Please try again.', 'error');
    }
});

// OAuth Sign In Handlers
oauthButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const provider = button.dataset.provider;
        
        showLoader();
        
        try {
            const { data, error } = await AuthService.signInWithOAuth(provider);
            
            if (error) throw error;
            
            // OAuth will redirect automatically
            showMessage(`Redirecting to ${provider}...`, 'success');
            
        } catch (error) {
            hideLoader();
            showMessage(error.message || `Failed to sign in with ${provider}.`, 'error');
        }
    });
});

// Message Display Functions
function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `auth-message show ${type}`;
}

function hideMessage() {
    authMessage.className = 'auth-message';
}

// Loader Functions
function showLoader() {
    logoLoader.classList.add('active');
}

function hideLoader() {
    logoLoader.classList.remove('active');
}

// Check if user is already logged in
async function checkAuthStatus() {
    const session = await AuthService.getSession();
    
    if (session) {
        // User is already logged in, redirect to dashboard
        window.location.href = 'index.html';
    }
}

// Handle OAuth callback
async function handleOAuthCallback() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (accessToken) {
        showLoader();
        showMessage('Authentication successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    handleOAuthCallback();
});

// Listen for auth state changes
AuthService.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user);
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
    }
});
