// Get all student cards for filtering
        const studentCards = document.querySelectorAll('.student-card');
        const searchInput = document.getElementById('searchInput');
        const examLevelFilter = document.getElementById('examLevelFilter');
        const clearSearch = document.getElementById('clearSearch');
        const studentGrid = document.getElementById('studentGrid');

        // Add results counter
        const resultsCounter = document.createElement('div');
        resultsCounter.className = 'results-counter';
        resultsCounter.innerHTML = `<span>Showing ${studentCards.length} students</span>`;
        studentGrid.parentNode.insertBefore(resultsCounter, studentGrid);

        function updateResultsCounter(visibleCount) {
            resultsCounter.innerHTML = `<span>Showing ${visibleCount} of ${studentCards.length} students</span>`;
        }

        function filterStudents() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            const selectedExamLevel = examLevelFilter.value.toLowerCase();
            let visibleCount = 0;

            studentCards.forEach(card => {
                const studentName = card.querySelector('.student-name').textContent.toLowerCase();
                const examLevel = card.querySelector('.exam-level').textContent.toLowerCase().trim();
                
                const matchesSearch = studentName.includes(searchTerm);
                const matchesFilter = selectedExamLevel === '' || examLevel.includes(selectedExamLevel);
                
                if (matchesSearch && matchesFilter) {
                    card.parentElement.style.display = 'block';
                    visibleCount++;
                } else {
                    card.parentElement.style.display = 'none';
                }
            });

            updateResultsCounter(visibleCount);
            
            // Show/hide clear button
            clearSearch.style.display = searchTerm || selectedExamLevel ? 'flex' : 'none';
            
            // Show empty state if no results
            showEmptyState(visibleCount === 0 && (searchTerm || selectedExamLevel));
        }

        function showEmptyState(show) {
            let emptyState = document.querySelector('.search-empty-state');
            
            if (show && !emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'search-empty-state';
                emptyState.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>No students found</h3>
                    <p>Try adjusting your search criteria</p>
                `;
                studentGrid.appendChild(emptyState);
            } else if (!show && emptyState) {
                emptyState.remove();
            }
        }

        function clearFilters() {
            searchInput.value = '';
            examLevelFilter.value = '';
            filterStudents();
            searchInput.focus();
        }

        // Event listeners
        searchInput.addEventListener('input', filterStudents);
        examLevelFilter.addEventListener('change', filterStudents);
        clearSearch.addEventListener('click', clearFilters);

        // Add keyboard shortcut for search
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });

        // Auto-populate exam level filter based on available data
        function populateExamLevelFilter() {
            const examLevels = new Set();
            studentCards.forEach(card => {
                const examLevel = card.querySelector('.exam-level').textContent.trim();
                if (examLevel) {
                    examLevels.add(examLevel);
                }
            });
            
            // Clear existing options except the first one
            const existingOptions = examLevelFilter.querySelectorAll('option:not(:first-child)');
            existingOptions.forEach(option => option.remove());
            
            // Add new options
            Array.from(examLevels).sort().forEach(level => {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = level;
                examLevelFilter.appendChild(option);
            });
        }

        // Initialize filter options
        if (studentCards.length > 0) {
            populateExamLevelFilter();
        }