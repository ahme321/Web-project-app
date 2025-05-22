document.addEventListener('DOMContentLoaded', () => {
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        // Store token in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('isAuthenticated', 'true');
        
        // Redirect to home page after 3 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3001);
    } else {
        // If no token, redirect to login page
        window.location.href = 'login.html';
    }
    
    // Manual redirect button
    document.getElementById('redirect-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});