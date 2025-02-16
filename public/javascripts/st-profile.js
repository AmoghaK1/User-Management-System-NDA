// Client-side JavaScript
document.addEventListener('DOMContentLoaded', () => {
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
    window.showProfileForm = () => {
        document.getElementById('editProfileForm').classList.remove('hidden');
        document.getElementById('changePasswordForm').classList.add('hidden');
    };

    window.showPasswordForm = () => {
        document.getElementById('editProfileForm').classList.add('hidden');
        document.getElementById('changePasswordForm').classList.remove('hidden');
    };

    // Edit modal functions
    window.openEditModal = () => {
        const modal = document.getElementById('editModal');
        modal.classList.remove('hidden');
        
        // Pre-fill form with current values
        const form = document.getElementById('editProfileForm');
        const fields = ['name', 'email', 'student_ph_no', 'father_ph_no', 'mother_ph_no'];
        fields.forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            const currentValue = document.querySelector(`[data-field="${field}"]`).textContent;
            input.value = currentValue;
        });

        // Show profile form by default when opening modal
        showProfileForm();
    };

    window.closeEditModal = () => {
        document.getElementById('editModal').classList.add('hidden');
    };

    // Handle profile form submission
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/profile/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const updatedData = await response.json();
                // Update UI with new values
                Object.keys(updatedData).forEach(field => {
                    const element = document.querySelector(`[data-field="${field}"]`);
                    if (element) {
                        element.textContent = updatedData[field];
                    }
                });
                closeEditModal();
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    });

    // Handle password change form submission
    document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword'),
            confirmPassword: formData.get('confirmPassword')
        };
    
        // Client-side validation
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("New passwords don't match!");
            return;
        }
    
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Changing Password...';
    
        // Get the base URL of your API
        const apiUrl = '/api/profile/change-password';
        console.log('Attempting to send request to:', apiUrl);
        console.log('Request payload:', JSON.stringify(passwordData, null, 2));
    
        try {
            console.log('Sending request...');
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add a custom header to help identify the request in network tab
                    'X-Request-Type': 'password-change'
                },
                body: JSON.stringify(passwordData),
                // Add these options to help debug potential CORS issues
                credentials: 'include',
                mode: 'cors'
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', [...response.headers.entries()]);
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);
    
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                console.log('Response data:', data);
            } else {
                throw new Error('Expected JSON response but got: ' + contentType);
            }
    
            if (data.success) {
                alert('Password changed successfully!');
                closeEditModal();
                e.target.reset();
            } else {
                alert(data.error || 'Failed to change password');
            }
        } catch (error) {
            console.error('Detailed error information:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            
            let errorMessage = 'Network error occurred. ';
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'The server appears to be unavailable. Please check if the backend service is running.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage += 'This might be a CORS issue. Please check the server configuration.';
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