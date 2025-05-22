document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const googleLoginBtn = document.getElementById('google-login-btn');
    
    // Handle regular login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validate input
        if (!email || !password) {
            alert('Please enter both email and password');
            return;
        }
        
        try {
            console.log('Starting login attempt...');
            console.log('API URL:', `${config.API_URL}/auth/login`);
            
            const requestData = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emailOrUsername: email, password })
            };
            
            console.log('Sending request with data:', { email, password: '***' });
            
            const response = await fetch(`${config.API_URL}/auth/login`, requestData);
            console.log('Raw response:', response);
            
            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server error response:', errorData);
                try {
                    const errorJson = JSON.parse(errorData);
                    alert(errorJson.message || 'Login failed. Please check your credentials.');
                } catch (e) {
                    alert('Login failed. Please try again.');
                }
                return;
            }
            
            const data = await response.json();
            console.log('Login successful, received data:', { ...data, token: '***' });
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('user', JSON.stringify(data.user));
            
            console.log('Redirecting to index.html...');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            alert('An error occurred during login. Please check your network connection and try again.');
        }
    });
    
    // Handle Google login
    googleLoginBtn.addEventListener('click', () => {
        window.location.href = `${config.API_URL}/auth/google`;
    });
});