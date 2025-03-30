// notifications.js - Shared functionality
document.addEventListener('DOMContentLoaded', function() {
    const messages = document.querySelectorAll('.error-message, .success-message, #flash-error, #flash-success');
    
    messages.forEach(message => {
        // Create close button if not already present
        let closeButton = message.querySelector('.flash-close');
        if (!closeButton) {
            closeButton = document.createElement('button');
            closeButton.innerHTML = '&times;';
            closeButton.classList.add('flash-close');
            closeButton.setAttribute('aria-label', 'Close message');
            message.appendChild(closeButton);
        }
        
        // Function to dismiss message
        const dismissMessage = () => {
            message.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => {
                message.remove();
            }, 500);
        };
        
        // Add close button event listener
        closeButton.addEventListener('click', dismissMessage);
        
        // Auto-dismiss after 5 seconds
        const autoHideTimeout = setTimeout(dismissMessage, 5000);
        
        // Pause auto-hide on hover
        message.addEventListener('mouseenter', () => {
            clearTimeout(autoHideTimeout);
        });
        
        // Resume auto-hide when mouse leaves
        message.addEventListener('mouseleave', () => {
            setTimeout(dismissMessage, 5000);
        });
    });
});