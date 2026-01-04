document.addEventListener('DOMContentLoaded', () => {
    const context = window.__VERIFICATION_CONTEXT__ || {};
    const isVerified = context.isVerified === true || context.isVerified === 'true';
    const googleEnabled = context.googleEnabled === true || context.googleEnabled === 'true';
    const googleButton = document.querySelector('[data-google-button]');

    if (googleButton && !isVerified && googleEnabled) {
        googleButton.addEventListener('click', () => {
            googleButton.classList.add('loading');
            googleButton.setAttribute('aria-busy', 'true');

            const primaryText = googleButton.querySelector('strong');
            const secondaryText = googleButton.querySelector('small');

            if (primaryText) {
                primaryText.textContent = 'Connecting to Google...';
            }

            if (secondaryText) {
                secondaryText.textContent = 'Please approve the sign-in popup to continue.';
            }
        });
    }
});
