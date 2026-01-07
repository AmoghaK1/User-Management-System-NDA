// Client-side JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const profileContext = window.__PROFILE_CONTEXT__ || {};
    const isVerified = profileContext.isVerified === true || profileContext.isVerified === 'true';
    const verificationUrl = profileContext.verificationUrl || '/verification';
    const profileFormFeedback = document.getElementById('profileFormFeedback');
    let profileFormFeedbackTimer = null;
    const feedbackStyles = {
        error: ['bg-red-50', 'border-red-200', 'text-red-700'],
        success: ['bg-green-50', 'border-green-200', 'text-green-700']
    };

    const removeFeedbackStyles = () => {
        if (!profileFormFeedback) return;
        Object.values(feedbackStyles).forEach((styleList) => {
            styleList.forEach(cls => profileFormFeedback.classList.remove(cls));
        });
    };

    const clearProfileFormFeedback = () => {
        if (!profileFormFeedback) return;
        if (profileFormFeedbackTimer) {
            clearTimeout(profileFormFeedbackTimer);
            profileFormFeedbackTimer = null;
        }
        removeFeedbackStyles();
        profileFormFeedback.classList.add('hidden');
        profileFormFeedback.textContent = '';
    };

    const showProfileFormFeedback = (message, type = 'error') => {
        if (!profileFormFeedback) return;
        if (profileFormFeedbackTimer) {
            clearTimeout(profileFormFeedbackTimer);
            profileFormFeedbackTimer = null;
        }
        removeFeedbackStyles();
        profileFormFeedback.textContent = message;
        const palette = feedbackStyles[type] || feedbackStyles.error;
        palette.forEach(cls => profileFormFeedback.classList.add(cls));
        profileFormFeedback.classList.remove('hidden');
        profileFormFeedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // Format DOB
    const formatDate = (isoDate) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Format all dates on page load
    const dobElement = document.querySelector('[data-field="birthdate"]');
    if (dobElement) {
        dobElement.textContent = formatDate(dobElement.textContent);
    }

    
    document.getElementById('profilePicture').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const profileImage = document.getElementById('profileImage');
        const loadingSpinner = document.getElementById('loadingSpinner');

        const formData = new FormData();
        formData.append('profilePicture', file);

        // Show loading spinner and fade out current image
        loadingSpinner.classList.remove('hidden');
        profileImage.style.opacity = "0.5";

        try {
            const response = await fetch('/api/profile/update-picture', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                profileImage.src = data.profilePicture; // Update profile picture
            } else {
                alert(data.error || 'Failed to update profile picture');
            }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert('Failed to upload profile picture');
        } finally {
            // Hide loading spinner and restore opacity
            loadingSpinner.classList.add('hidden');
            profileImage.style.opacity = "1";
        }
    });


    // Form visibility toggling functions
    const passwordLockNotice = document.getElementById('passwordLockNotice');
    const passwordTabButton = document.querySelector('[data-password-tab="true"]');
    const changePasswordFormEl = document.getElementById('changePasswordForm');

    if (!isVerified) {
        if (changePasswordFormEl) {
            changePasswordFormEl.classList.add('locked');
            changePasswordFormEl.querySelectorAll('input, button').forEach((field) => {
                field.disabled = true;
            });
        }

        if (passwordTabButton) {
            passwordTabButton.setAttribute('aria-disabled', 'true');
            passwordTabButton.title = 'Verify with Google to unlock password changes';
        }
    }

    window.showProfileForm = () => {
        document.getElementById('editProfileForm').classList.remove('hidden');
        document.getElementById('changePasswordForm').classList.add('hidden');
    };

    window.showPasswordForm = () => {
        if (!isVerified) {
            if (passwordLockNotice) {
                passwordLockNotice.classList.remove('hidden');
                passwordLockNotice.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        document.getElementById('editProfileForm').classList.add('hidden');
        document.getElementById('changePasswordForm').classList.remove('hidden');
    };

    // Edit modal functions
    window.openEditModal = () => {
        const modal = document.getElementById('editModal');
        modal.classList.remove('hidden');
        
        // Pre-fill form with current values
        const form = document.getElementById('editProfileForm');
        const fields = ['name', 'email', 'student_ph_no'];
        fields.forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            const currentValue = document.querySelector(`[data-field="${field}"]`).textContent;
            input.value = currentValue;
        });

        clearProfileFormFeedback();

        // Show profile form by default when opening modal
        showProfileForm();
    };

    window.closeEditModal = () => {
        document.getElementById('editModal').classList.add('hidden');
        clearProfileFormFeedback();
    };

    // Handle profile form submission
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        clearProfileFormFeedback();

        try {
            const response = await fetch('/api/profile/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            let payload = null;
            try {
                payload = await response.json();
            } catch (parseError) {
                console.warn('Profile update response could not be parsed as JSON.', parseError);
            }

            if (response.ok && payload) {
                const updatedFields = payload.user || payload;
                Object.keys(updatedFields).forEach(field => {
                    const element = document.querySelector(`[data-field="${field}"]`);
                    if (element) {
                        element.textContent = updatedFields[field];
                    }
                });

                if (payload.message) {
                    showProfileFormFeedback(payload.message, 'success');
                    profileFormFeedbackTimer = setTimeout(() => {
                        clearProfileFormFeedback();
                        closeEditModal();
                    }, 1600);
                } else {
                    closeEditModal();
                }
                return;
            }

            const errorMessage = payload?.error || 'Failed to update profile. Please try again.';
            showProfileFormFeedback(errorMessage, 'error');
        } catch (error) {
            console.error('Error updating profile:', error);
            showProfileFormFeedback(error.message || 'Failed to update profile. Please try again.', 'error');
        }
    });

    // Password validation function
    const validatePassword = (password) => {
        const errors = [];
        
        if (password.length < 5) {
            errors.push("Password must be at least 5 characters long");
        }
        
        if (!/(?=.*\d)/.test(password)) {
            errors.push("Password must contain at least one number");
        }
        
        return errors;
    };

    // Handle password change form submission
    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!isVerified) {
            window.location.href = verificationUrl;
            return;
        }

        const formData = new FormData(e.target);
        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword'),
            confirmPassword: formData.get('confirmPassword')
        };
    
        // Client-side validation
        if (!passwordData.currentPassword) {
            alert("Please enter your current password");
            return;
        }

        if (!passwordData.newPassword) {
            alert("Please enter a new password");
            return;
        }

        if (!passwordData.confirmPassword) {
            alert("Please confirm your new password");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("New passwords don't match!");
            return;
        }

        // Validate new password format
        const passwordErrors = validatePassword(passwordData.newPassword);
        if (passwordErrors.length > 0) {
            alert("Password validation failed:\n\n" + passwordErrors.join("\n"));
            return;
        }

        if (passwordData.currentPassword === passwordData.newPassword) {
            alert("New password must be different from current password");
            return;
        }
    
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Changing Password...';
    
        try {
            const response = await fetch('/api/profile/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(passwordData),
                credentials: 'include'
            });
            
            // Parse response data
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error('Server returned invalid response. Please try again.');
            }
    
            if (response.ok && data.success) {
                alert('Password changed successfully!');
                closeEditModal();
                e.target.reset();
            } else {
                // Handle specific error cases
                let errorMessage = 'Failed to change password';
                
                if (response.status === 401) {
                    errorMessage = 'Current password is incorrect. Check forgot password if needed.';
                } else if (response.status === 400) {
                    if (data.error && data.error.toLowerCase().includes('current password')) {
                        errorMessage = 'Current password is incorrect. Check forgot password if needed.';
                    } else if (data.error && data.error.toLowerCase().includes('password')) {
                        errorMessage = data.error;
                    } else {
                        errorMessage = data.error || 'Invalid request. Please check your input.';
                    }
                } else if (response.status === 500) {
                    errorMessage = 'Server error occurred. Please try again later.';
                } else if (data.error) {
                    errorMessage = data.error;
                }
                
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Password change error:', error);
            
            let errorMessage = 'An error occurred while changing password. ';
            
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                errorMessage += 'Please check your internet connection and try again.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage += 'Network connection failed. Please check if you are connected to the internet.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Change Password';
        }
    });

});