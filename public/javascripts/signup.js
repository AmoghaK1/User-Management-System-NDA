function validateForm() {
    // Name validation
    const nameInput = document.getElementById('name');
    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    if (!nameRegex.test(nameInput.value.trim())) {
        showError('name', 'Name must be 2-50 characters long and contain only letters');
        return false;
    }

    // Email validation
    const emailInput = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.value.trim())) {
        showError('email', 'Please enter a valid email address');
        return false;
    }

    // Birthdate and Age validation
    const birthdateInput = document.getElementById('birthdate');
    const ageInput = document.getElementById('age');
    const birthdate = new Date(birthdateInput.value);
    const today = new Date();
    
    if (birthdateInput.value === '') {
        showError('birthdate', 'Please select a birthdate');
        return false;
    }

    // Age calculation
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }

    // Age restrictions (e.g., 5-70 years)
    if (age < 5 || age > 70) {
        showError('birthdate', 'Age must be between 5 and 70 years');
        return false;
    }

    // Phone number validation (10 digits)
    const studentPhoneInput = document.getElementById('student_ph_no');
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(studentPhoneInput.value.trim())) {
        showError('student_ph_no', 'Phone number must be 10 digits and start with 6-9');
        return false;
    }

    // Mother's phone number validation
    const motherPhoneInput = document.getElementById('mother_ph_no');
    if (!phoneRegex.test(motherPhoneInput.value.trim())) {
        showError('mother_ph_no', 'Mother\'s phone number must be 10 digits and start with 6-9');
        return false;
    }

    // Father's phone number validation
    const fatherPhoneInput = document.getElementById('father_ph_no');
    if (!phoneRegex.test(fatherPhoneInput.value.trim())) {
        showError('father_ph_no', 'Father\'s phone number must be 10 digits and start with 6-9');
        return false;
    }

    // Exam level validation
    const examLevelInput = document.getElementById('exam_level');
    if (examLevelInput.value === '') {
        showError('exam_level', 'Please select an exam level');
        return false;
    }

    // Password validation
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Password strength requirements
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(passwordInput.value)) {
        showError('password', 'Password must be at least 8 characters long, contain uppercase, lowercase, number, and special character');
        return false;
    }

    // Password match validation
    if (passwordInput.value !== confirmPasswordInput.value) {
        showError('confirmPassword', 'Passwords do not match');
        return false;
    }

    return true;
}

// Function to show error messages
function showError(inputId, message) {
    // Remove any existing error messages
    const existingError = document.getElementById(`${inputId}-error`);
    if (existingError) {
        existingError.remove();
    }

    // Find the input element
    const inputElement = document.getElementById(inputId);
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.id = `${inputId}-error`;
    errorElement.className = 'error';
    errorElement.textContent = message;
    
    // Insert error message after the input
    inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
    
    // Highlight the input
    inputElement.classList.add('input-error');
    
    // Remove error styling when user starts typing
    inputElement.addEventListener('input', function() {
        inputElement.classList.remove('input-error');
        errorElement.remove();
    });
}

// Add event listener to form submission
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Clear previous error messages
    const existingErrors = document.querySelectorAll('.error');
    existingErrors.forEach(error => error.remove());
    
    // Validate form
    if (validateForm()) {
        // If validation passes, submit the form
        this.submit();
    }
});

// Real-time age calculation
document.getElementById('birthdate').addEventListener('change', function() {
    calculateAge();
});

function calculateAge() {
    const birthdateInput = document.getElementById('birthdate');
    const ageInput = document.getElementById('age');
    
    const birthdate = new Date(birthdateInput.value);
    const today = new Date();
    
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }
    
    ageInput.value = age;
}
