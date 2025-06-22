    // Add a comment to a report
    async function addComment(reportId) {
      try {
        const popup = document.querySelector(`.comments-list[data-report-id="${reportId}"]`).closest('.leaflet-popup-content');
        if (!popup) return;
        
        const commentInput = popup.querySelector('.comment-input');
        const commentText = commentInput.value.trim();
        const mediaFile = popup.querySelector('.comment-media').files[0];
        
        if (!commentText && !mediaFile) {
          alert("Please enter a comment or attach a photo/video.");
          return;
        }
        
        const commentData = {
          reportId,
          text: commentText,
          timestamp: Date.now()
        };
        
        const formData = new FormData();
        formData.append('comment', JSON.stringify(commentData));
        
        if (mediaFile) {
          formData.append('media', mediaFile);
        }
        
        const response = await fetch(`/api/reports/${reportId}/comments`, {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Clear the input
          commentInput.value = '';
          popup.querySelector('.comment-media').value = '';
          
          // Reload comments
          loadComments(reportId);
        } else {
          alert("Error: " + (result.error || "Failed to add comment"));
        }
      } catch (error) {
        console.error("Error adding comment:", error);
        alert("Failed to add comment. Please try again.");
      }
    }
