// PigMap.org Modals System
// This file contains code for handling modal dialogs in the application

class ModalManager {
    constructor() {
        this.modalContainer = document.getElementById('modal-container');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        
        // Create modal elements if they don't exist
        if (!this.modalContainer) {
            this.modalContainer = document.createElement('div');
            this.modalContainer.id = 'modal-container';
            document.body.appendChild(this.modalContainer);
        }
        
        if (!this.modalBackdrop) {
            this.modalBackdrop = document.createElement('div');
            this.modalBackdrop.id = 'modal-backdrop';
            this.modalBackdrop.className = 'hidden';
            this.modalBackdrop.addEventListener('click', () => this.closeCurrentModal());
            document.body.appendChild(this.modalBackdrop);
        }
        
        // Close modal when Escape key is pressed
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeCurrentModal();
        });
    }
    
    // Show a modal with the given content
    showModal(title, content, options = {}) {
        // Clear any existing modals
        this.modalContainer.innerHTML = '';
        
        // Create modal elements
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h2');
        modalTitle.textContent = title;
        modalHeader.appendChild(modalTitle);
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close';
        closeButton.innerHTML = '&times;';
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.addEventListener('click', () => this.closeCurrentModal());
        modalHeader.appendChild(closeButton);
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        // Content can be a string or a DOM element
        if (typeof content === 'string') {
            modalBody.innerHTML = content;
        } else {
            modalBody.appendChild(content);
        }
        
        // Add footer if there are actions
        let modalFooter = null;
        if (options.actions && options.actions.length > 0) {
            modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            
            options.actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `btn ${action.class || ''}`;
                button.textContent = action.text;
                button.addEventListener('click', () => {
                    if (action.callback) action.callback();
                    if (action.closeOnClick !== false) this.closeCurrentModal();
                });
                modalFooter.appendChild(button);
            });
        }
        
        // Assemble the modal
        modal.appendChild(modalHeader);
        modal.appendChild(modalBody);
        if (modalFooter) modal.appendChild(modalFooter);
        
        // Add custom class if provided
        if (options.modalClass) {
            modal.classList.add(options.modalClass);
        }
        
        // Add to DOM and show
        this.modalContainer.appendChild(modal);
        this.modalBackdrop.classList.remove('hidden');
        
        // Return the modal element in case the caller needs to manipulate it
        return modal;
    }
    
    // Show an info modal with a message
    showInfoModal(title, message, onClose = null) {
        return this.showModal(title, message, {
            actions: [
                {
                    text: 'OK',
                    callback: onClose,
                    class: 'btn-primary'
                }
            ]
        });
    }
    
    // Show a confirmation modal with Yes/No buttons
    showConfirmModal(title, message, onConfirm, onCancel = null) {
        return this.showModal(title, message, {
            actions: [
                {
                    text: 'No',
                    callback: onCancel,
                    class: 'btn-secondary'
                },
                {
                    text: 'Yes',
                    callback: onConfirm,
                    class: 'btn-primary'
                }
            ]
        });
    }
    
    // Show a form modal
    showFormModal(title, formElement, onSubmit) {
        // Handle form submission
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            if (onSubmit) {
                onSubmit(new FormData(formElement));
            }
            this.closeCurrentModal();
        });
        
        // Show the modal with the form
        return this.showModal(title, formElement, {
            modalClass: 'modal-form'
        });
    }
    
    // Close the currently open modal
    closeCurrentModal() {
        this.modalBackdrop.classList.add('hidden');
        this.modalContainer.innerHTML = '';
    }
}

// Export the ModalManager class
window.ModalManager = ModalManager;
