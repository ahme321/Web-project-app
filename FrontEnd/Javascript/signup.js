 document.addEventListener('DOMContentLoaded', () => {
            const signupForm = document.getElementById('signup-form');
            const googleSignupBtn = document.getElementById('google-signup-btn');
            
            // Handle regular signup
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                const name = document.getElementById('name').value;
                const username = document.getElementById('username').value;
                
                // Validate passwords match
                if (password !== confirmPassword) {
                    alert('Passwords do not match!');
                    return;
                }
                
                try {
                    const response = await apiRequest('/auth/signup', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password, name, username })
                    });
                    
                    if (!response) return;
                    const data = await response.json();
                    
                    if (response.ok) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('isAuthenticated', 'true');
                        localStorage.setItem('user', JSON.stringify(data.user));
                        window.location.href = 'index.html';
                    } else {
                        alert(data.message || 'Signup failed');
                    }
                } catch (error) {
                    console.error('Signup error:', error);
                    alert('An error occurred during signup');
                }
            });
            
            // Handle Google signup
            googleSignupBtn.addEventListener('click', () => {
                window.location.href = `${config.API_URL}/auth/google`;
            });
        });
    