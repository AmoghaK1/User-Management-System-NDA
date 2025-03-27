// Auto-dismiss notifications with improved functionality
document.addEventListener('DOMContentLoaded', function() {
    const messages = document.querySelectorAll('.error-message, .success-message, #flash-error');
    
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
        
        // Ensure message positioning
        message.style.position = 'fixed';
        message.style.top = '20px';
        message.style.left = '50%';
        message.style.transform = 'translateX(-50%)';
        
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

// Add improved styles to CSS
const style = document.createElement('style');
style.textContent = `
@keyframes fadeOut {
    from { 
        opacity: 1; 
        transform: translate(-50%, 0);
    }
    to { 
        opacity: 0; 
        transform: translate(-50%, -20px);
    }
}

.error-message .flash-close, 
.success-message .flash-close, 
#flash-error .flash-close {
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: rgba(0,0,0,0.5);
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.3s ease;
}

.error-message .flash-close:hover, 
.success-message .flash-close:hover, 
#flash-error .flash-close:hover {
    background: rgba(0,0,0,0.1);
    color: rgba(0,0,0,0.8);
}

.error-message .flash-close:active, 
.success-message .flash-close:active, 
#flash-error .flash-close:active {
    background: rgba(0,0,0,0.2);
}
`;
document.head.appendChild(style);