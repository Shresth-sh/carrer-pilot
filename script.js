
// Button animation
document.querySelectorAll('.cta-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = 'scale(1)', 150);
    });
});

// Login alert
const loginBtn = document.querySelector('.login .cta-btn');
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        alert('Login functionality coming soon!');
    });
}
