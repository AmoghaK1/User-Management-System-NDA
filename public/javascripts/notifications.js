// Auto-dismiss notifications after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const messages = document.querySelectorAll('.error-message, .success-message');
    
    messages.forEach(message => {
        setTimeout(() => {
            message.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                message.style.display = 'none';
            }, 500);
        }, 5000); // 5 seconds
    });
});

// Add fadeOut animation to your CSS
document.head.insertAdjacentHTML('beforeend', `
    <style>
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; transform: translate(-50%, -10px); }
        }
    </style>
`);