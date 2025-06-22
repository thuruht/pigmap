/**
 * Notification System for PigMap
 * Provides a clean way to show temporary notification messages to users
 */

class NotificationManager {
  constructor() {
    // Create notification container if it doesn't exist
    this.container = document.getElementById('notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a notification
   * @param {string} message - The message to display
   * @param {string} type - The notification type (success, error, warning, info)
   * @param {number} duration - How long to show the notification in ms
   * @returns {HTMLElement} The notification element
   */
  show(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to container
    this.container.appendChild(notification);
    
    // Set timeout to remove
    setTimeout(() => {
      notification.classList.add('hide');
      
      // Remove from DOM after animation completes
      setTimeout(() => {
        if (notification.parentNode === this.container) {
          this.container.removeChild(notification);
        }
      }, 300); // Match the CSS transition duration
    }, duration);
    
    return notification;
  }
  
  /**
   * Show a success notification
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the notification in ms
   */
  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }
  
  /**
   * Show an error notification
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the notification in ms
   */
  error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  }
  
  /**
   * Show a warning notification
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the notification in ms
   */
  warning(message, duration = 5000) {
    return this.show(message, 'warning', duration);
  }
  
  /**
   * Show an info notification
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the notification in ms
   */
  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }
}

// Create a global instance
window.notificationManager = new NotificationManager();

// Helper function for quick access
window.showNotification = (message, type = 'info', duration = 5000) => {
  return window.notificationManager.show(message, type, duration);
};
