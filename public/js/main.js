// Custom JavaScript for Twoem Online Productions

document.addEventListener('DOMContentLoaded', function() {
    console.log('Twoem Online Productions website script loaded.');

    // Example: Add active class to navbar links based on current page
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentLocation) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });

    // Add more custom JS interactions here as the site develops

    // Flash Message Modal Logic
    const flashMessageContainer = document.getElementById('flashMessageDataContainer');
    const flashModalElement = document.getElementById('flashMessageModal');

    if (flashMessageContainer && flashModalElement) {
        const messages = flashMessageContainer.querySelectorAll('.flash-message-data');
        if (messages.length > 0) {
            const modal = new bootstrap.Modal(flashModalElement);
            const modalBody = flashModalElement.querySelector('#flashMessageModalBody');
            const modalTitle = flashModalElement.querySelector('#flashMessageModalLabel');

            // For now, show the first message. Could extend to queue or show multiple.
            const firstMessage = messages[0];
            const type = firstMessage.dataset.type;
            const content = firstMessage.dataset.content;

            modalBody.innerHTML = content; // Use innerHTML as content might have HTML (e.g. from retrieveStudentCredentials)

            let titleText = 'Notification';
            let headerClass = 'modal-header'; // Default

            // Clear existing background/text color classes from header before adding new ones
            const modalHeader = flashModalElement.querySelector('.modal-header');
            modalHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info', 'text-white', 'text-dark');

            if (type === 'success') {
                titleText = 'Success!';
                headerClass = 'modal-header bg-success text-white';
            } else if (type === 'danger') {
                titleText = 'Error!';
                headerClass = 'modal-header bg-danger text-white';
            } else if (type === 'info') {
                titleText = 'Information';
                headerClass = 'modal-header bg-info text-dark';
            } else { // Default or other types
                 headerClass = 'modal-header'; // Keep default if no specific type matched
            }

            modalTitle.textContent = titleText;
            modalHeader.className = headerClass;

            modal.show();

            // Optional: Remove the message data from DOM after displaying to prevent re-show on back button if not careful
            // flashMessageContainer.innerHTML = ''; // Clear it
        }
    }

    // Specific handling for admin login required modal (triggered by query param)
    const urlParams = new URLSearchParams(window.location.search);
    const authError = urlParams.get('error'); // Gets the first 'error' param
    const loginRequiredMessages = [
        "Authentication required. Please login.",
        "Session expired. Please login again." // Add other messages if middleware sends different ones
    ];

    if (authError && loginRequiredMessages.some(msg => authError.includes(msg)) && flashModalElement && window.location.pathname.includes('/admin/login')) {
        // Check if a generic flash message modal is already queued to avoid double modals
        const isFlashModalAlreadyQueued = flashMessageContainer && flashMessageContainer.querySelectorAll('.flash-message-data').length > 0;

        if (!isFlashModalAlreadyQueued) {
            const modal = new bootstrap.Modal(flashModalElement);
            const modalBody = flashModalElement.querySelector('#flashMessageModalBody');
            const modalTitle = flashModalElement.querySelector('#flashMessageModalLabel');
            const modalHeader = flashModalElement.querySelector('.modal-header');

            modalBody.innerHTML = authError; // Display the exact error message from query
            modalTitle.textContent = "Authentication Required";

            modalHeader.classList.remove('bg-success', 'bg-danger', 'bg-info', 'text-white', 'text-dark');
            modalHeader.className = 'modal-header bg-warning text-dark';

            modal.show();
        }
    }
     // Password visibility toggle
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    togglePasswordButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const passwordInput = document.getElementById(targetId);
            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    passwordInput.type = 'password';
                    this.innerHTML = '<i class="fas fa-eye"></i>';
                }
            }
        });
    });
});
