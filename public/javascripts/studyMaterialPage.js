const form = document.getElementById('uploadForm');
    const messageDiv = document.getElementById('message');
    const materialsContainer = document.getElementById('materialsContainer');
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryDiv = document.getElementById('newCategoryDiv');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const fileInput = document.getElementById('file');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const searchInput = document.getElementById('searchInput');
    const loadingSpinner = document.getElementById('loadingSpinner');

    let allMaterials = [];

    // File upload drag and drop functionality
    fileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUploadArea.classList.add('drag-over');
    });

    fileUploadArea.addEventListener('dragleave', () => {
      fileUploadArea.classList.remove('drag-over');
    });

    fileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUploadArea.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        updateFileUploadText(files[0].name);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        updateFileUploadText(e.target.files[0].name);
      }
    });

    function updateFileUploadText(fileName) {
      const textEl = fileUploadArea.querySelector('.file-upload-text p');
      textEl.textContent = `Selected: ${fileName}`;
      fileUploadArea.classList.add('file-selected');
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterMaterials(searchTerm);
    });    function filterMaterials(searchTerm) {
      const filteredMaterials = allMaterials.filter(material => 
        material.title.toLowerCase().includes(searchTerm) ||
        material.category.toLowerCase().includes(searchTerm) ||
        material.level.toLowerCase().includes(searchTerm)
      );
      displayMaterials(filteredMaterials);
    }

    // Loading spinner functions
    function showLoadingSpinner() {
      loadingSpinner.classList.add('show');
      document.body.style.overflow = 'hidden';
    }

    function hideLoadingSpinner() {
      loadingSpinner.classList.remove('show');
      document.body.style.overflow = 'auto';
    }

    function showMessage(message, type) {
      const iconMap = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'info': 'info-circle'
      };
      
      const icon = iconMap[type] || 'info-circle';
      messageDiv.innerHTML = `<div class="message ${type}"><i class="fas fa-${icon}"></i>${message}</div>`;
      
      // Auto-hide message after 5 seconds for success/info, keep error messages longer
      const timeout = type === 'error' ? 8000 : 5000;
      setTimeout(() => {
        messageDiv.innerHTML = '';
      }, timeout);
    }const fetchMaterials = async () => {
      try {
        const res = await fetch('/material/fetch');
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Fetched data:', data);
        
        materialsContainer.innerHTML = '';

        // Check if the response has data property and if it's an array
        if (data.data && Array.isArray(data.data)) {
          allMaterials = data.data; // Update global variable
          
          if (data.data.length === 0) {
            materialsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><p>No study materials uploaded yet.</p></div>';
            return;
          }
          
          displayMaterials(data.data);
        } else {
          console.error('Unexpected data format:', data);
          materialsContainer.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Unexpected data format received</p></div>';
        }

      } catch (err) {
        console.error('Fetch error:', err);
        materialsContainer.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to fetch materials. Please try again.</p></div>';
      }
    };

    function displayMaterials(materials) {
      materialsContainer.innerHTML = '';

      if (materials.length === 0) {
        materialsContainer.innerHTML = '<div class="empty-state"><i class="fas fa-book-open"></i><p>No study materials found</p></div>';
        return;
      }

      materials.forEach((material, index) => {
        const div = document.createElement('div');
        div.className = 'material-card';
        div.style.animationDelay = `${index * 0.1}s`;
        
        const fileIcon = material.type === 'pdf' ? 'fa-file-pdf' : 'fa-file-image';
        const levelColor = getLevelColor(material.level);
          div.innerHTML = `
          <div class="material-header">
            <div class="file-icon">
              <i class="fas ${fileIcon}"></i>
            </div>
            <div class="material-actions">
              <button class="action-btn" onclick="viewMaterial('${material.url}')" title="View Material">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn" onclick="downloadMaterial('${material.url}')" title="Download Material">
                <i class="fas fa-download"></i>
              </button>
              <button class="action-btn delete-btn" onclick="deleteMaterial('${material._id}')" title="Delete Material">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="material-content">
            <h3>${material.title}</h3>
            <div class="material-meta">
              <span class="category-tag">${material.category}</span>
              <span class="level-tag" style="background-color: ${levelColor}">${material.level}</span>
            </div>
            <div class="material-date">
              <i class="fas fa-calendar-alt"></i>
              ${new Date(material.createdAt).toLocaleDateString()}
            </div>
          </div>
        `;
        materialsContainer.appendChild(div);
      });
    }

    function getLevelColor(level) {
      const colors = {
        'Senior Batch': '#8B5CF6',
        'Prarambhik': '#10B981',
        'Praveshika Pratham': '#3B82F6',
        'Praveshika Purna': '#6366F1',
        'Madhyama Pratham': '#8B5CF6',
        'Madhyama Purna': '#A855F7',
        'Visharad Pratham': '#EC4899',
        'Visharad Purna': '#EF4444',
        'Alankar Pratham': '#F59E0B',
        'Alankar Purna': '#10B981'
      };
      return colors[level] || '#6B7280';
    }

    function viewMaterial(url) {
      window.open(url, '_blank');
    }

    function downloadMaterial(url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.click();
    }    async function deleteMaterial(materialId) {
      // Validate materialId
      if (!materialId || materialId === 'undefined') {
        showMessage('Error: Invalid material ID. Please refresh the page and try again.', 'error');
        return;
      }

      // Show confirmation dialog
      if (!confirm('Are you sure you want to delete this study material? This action cannot be undone.')) {
        return;
      }

      try {
        showLoadingSpinner();
        
        console.log('Deleting material with ID:', materialId); // Debug log
        
        const response = await fetch(`/material/delete/${materialId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showMessage(result.message || 'Material deleted successfully!', 'success');
          fetchMaterials(); // Refresh the materials list
        } else {
          showMessage(result.message || 'Failed to delete material. Please try again.', 'error');
        }

      } catch (error) {
        console.error('Delete error:', error);
        showMessage('Failed to delete material. Please check your connection and try again.', 'error');
      } finally {
        hideLoadingSpinner();
      }
    }form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      try {
        const formData = new FormData(form);

        if (categorySelect.value === '__new__') {
          formData.set('category', newCategoryInput.value.trim());
        }

        // Show loading spinner and disable button
        showLoadingSpinner();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        const response = await fetch('/material/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok) {
          showMessage(result.message || 'Material uploaded successfully!', 'success');
          form.reset();
          fileUploadArea.classList.remove('file-selected');
          fileUploadArea.querySelector('.file-upload-text p').textContent = 'Click to browse or drag and drop your file here';
          newCategoryDiv.style.display = 'none';
          fetchMaterials(); // Refresh the materials list
        } else {
          showMessage(result.message || 'Upload failed. Please try again.', 'error');
        }

      } catch (error) {
        console.error('Upload error:', error);
        showMessage('Upload failed. Please check your connection and try again.', 'error');
      } finally {
        // Hide loading spinner and re-enable button
        hideLoadingSpinner();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });

    // Category dropdown functionality
    categorySelect.addEventListener('change', () => {
      if (categorySelect.value === '__new__') {
        newCategoryDiv.style.display = 'block';
        newCategoryInput.required = true;
      } else {
        newCategoryDiv.style.display = 'none';
        newCategoryInput.required = false;
      }
    });    // Fetch categories for dropdown
    const fetchCategories = async () => {
      try {
        const response = await fetch('/material/categories');
        const result = await response.json();
        
        if (response.ok && result.categories) {
          // Clear existing options except the default ones
          const defaultOptions = categorySelect.innerHTML;
          categorySelect.innerHTML = defaultOptions;
          
          // Add categories from backend
          result.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.insertBefore(option, categorySelect.lastElementChild);
          });
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    // Initialize
    fetchMaterials();
    fetchCategories();