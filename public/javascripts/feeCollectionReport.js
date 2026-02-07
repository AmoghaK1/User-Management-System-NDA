// Fee Collection Report JavaScript

let feeCollectionChart = null;
let eventSource = null;
let isModalOpen = false;
let selectedFeeYear = new Date().getFullYear();
let feeYearSelectEl = null;
let feeYearFilterEl = null;
let pendingDetailsIdCounter = 0;
const pendingRosterData = new Map();
const pendingRosterModalState = {
    rosterId: null,
    page: 1,
    search: ''
};
const PENDING_MODAL_PAGE_SIZE = 6;
let pendingViewListenerAttached = false;

document.addEventListener('DOMContentLoaded', function() {
    // Handle fee collection card click
    const feeCollectionBtn = document.querySelector('.fee-collection-btn');
    const modal = document.getElementById('feeCollectionModal');
    const closeModal = document.querySelector('.close-modal');
    feeYearSelectEl = document.getElementById('feeYearSelect');
    feeYearFilterEl = document.getElementById('feeYearFilter');
    if (feeYearSelectEl) {
        feeYearSelectEl.addEventListener('change', function() {
            const nextYear = parseInt(feeYearSelectEl.value, 10);
            if (!isNaN(nextYear)) {
                selectedFeeYear = nextYear;
                if (isModalOpen) {
                    fetchFeeCollectionData();
                }
                document.dispatchEvent(new CustomEvent('fee-year-change', { detail: { year: selectedFeeYear } }));
            }
        });
    }
    
    if (feeCollectionBtn) {
        feeCollectionBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openFeeCollectionModal();
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            closeFeeCollectionModal();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeFeeCollectionModal();
        }
    });
});

function openFeeCollectionModal() {
    const modal = document.getElementById('feeCollectionModal');
    const loading = document.getElementById('feeCollectionLoading');
    const summaryCards = document.querySelector('.fee-summary-cards');
    const chartContainer = document.querySelector('.chart-container');
    const tableContainer = document.querySelector('.table-responsive');
    
    // Show modal and loading
    modal.style.display = 'block';
    loading.style.display = 'block';
    summaryCards.style.display = 'none';
    chartContainer.style.display = 'none';
    tableContainer.style.display = 'none';
    
    // Prevent body scroll on mobile
    if (window.innerWidth <= 768) {
        document.body.style.overflow = 'hidden';
    }
    
    isModalOpen = true;
    
    // Setup real-time updates
    setupRealTimeUpdates();
    
    // Fetch fee collection data
    fetchFeeCollectionData();
}

function closeFeeCollectionModal() {
    const modal = document.getElementById('feeCollectionModal');
    modal.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
    
    isModalOpen = false;
    
    // Destroy existing chart
    if (feeCollectionChart) {
        feeCollectionChart.destroy();
        feeCollectionChart = null;
    }
    
    // Close SSE connection
    if (eventSource) {
        eventSource.close();
        eventSource = null;
        console.log('📡 Closed real-time connection');
    }
}

function setupRealTimeUpdates() {
    // Close existing connection if any
    if (eventSource) {
        eventSource.close();
    }
    
    // Create new EventSource for real-time updates
    eventSource = new EventSource('/fee-collection-sse');
    
    eventSource.onopen = function(event) {
        console.log('📡 Real-time connection established for fee collection updates');
    };
    
    eventSource.addEventListener('payment-update', function(event) {
        const data = JSON.parse(event.data);
        console.log('💰 Real-time payment update received:', data);
        
        if (isModalOpen) {
            // Show notification
            showUpdateNotification('Payment received! Updating fee collection data...');
            
            // Refresh data after a short delay to allow database update to complete
            setTimeout(() => {
                fetchFeeCollectionData();
            }, 1000);
        }
    });
    
    eventSource.addEventListener('fee-collection-refresh', function(event) {
        const data = JSON.parse(event.data);
        console.log('📊 Fee collection refresh event:', data);
        
        if (isModalOpen) {
            fetchFeeCollectionData();
        }
    });
    
    eventSource.onerror = function(event) {
        console.error('📡 Real-time connection error:', event);
    };
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
            console.log('📡 Real-time fee collection updates connected');
        }
    };
}

function showUpdateNotification(message) {
    // Simple notification without complex animations
    let notification = document.getElementById('feeUpdateNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'feeUpdateNotification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 500;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

async function fetchFeeCollectionData() {
    try {
        const fetchTime = new Date();
        console.log(`🌐 Making API call to fetch fee collection data at: ${fetchTime.toLocaleString()}`);
        
        // Add cache-busting parameter to ensure fresh data
        const response = await fetch(`/fee-collection-data?year=${selectedFeeYear}&t=${Date.now()}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Successfully received fee collection data:', result.data);
            displayFeeCollectionData(result.data);
        } else {
            console.error('❌ API returned error:', result);
            showError('Failed to fetch fee collection data');
        }
    } catch (error) {
        console.error('❌ Network error fetching fee collection data:', error);
        showError('Error loading fee collection data');
    }
}

function displayFeeCollectionData(data) {
    const loading = document.getElementById('feeCollectionLoading');
    const summaryCards = document.querySelector('.fee-summary-cards');
    const chartContainer = document.querySelector('.chart-container');
    const tableContainer = document.querySelector('.table-responsive');
    
    // Hide loading
    loading.style.display = 'none';
    updateYearFilter(data.availableYears || [], data.year);
    
    // Update summary cards
    updateSummaryCards(data.summary);
    summaryCards.style.display = 'grid';
    
    // Create chart
    createFeeCollectionChart(data.quarterlyData, data.year);
    chartContainer.style.display = 'block';
    
    // Create table
    createFeeCollectionTable(data.quarterlyData);
    tableContainer.style.display = 'block';
}

function updateSummaryCards(summary) {
    document.getElementById('totalCollection').textContent = `₹${formatCurrency(summary.totalYearCollection)}`;
    document.getElementById('currentQuarterCollection').textContent = `₹${formatCurrency(summary.currentQuarterCollection || 0)}`;
    document.getElementById('pendingCollection').textContent = `₹${formatCurrency(summary.totalPendingAmount)}`;
}

function createFeeCollectionChart(quarterlyData, year) {
    const ctx = document.getElementById('feeCollectionChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (feeCollectionChart) {
        feeCollectionChart.destroy();
    }
    
    const quarters = quarterlyData.map(data => data.quarter);
    const collections = quarterlyData.map(data => data.collection);
    const percentages = quarterlyData.map(data => data.collectionPercentage);
    
    // Mobile-specific chart configuration
    const isMobile = window.innerWidth <= 768;
    
    feeCollectionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: quarters,
            datasets: [{
                label: 'Fee Collection (₹)',
                data: collections,
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                yAxisID: 'y'
            }, {
                label: 'Collection Percentage (%)',
                data: percentages,
                type: 'line',
                borderColor: 'rgba(56, 239, 125, 1)',
                backgroundColor: 'rgba(56, 239, 125, 0.1)',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: `Quarterly Fee Collection Report - ${year || new Date().getFullYear()}`,
                    font: {
                        size: isMobile ? 12 : 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: isMobile ? 10 : 12
                        },
                        boxWidth: isMobile ? 15 : 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Collection: ₹${formatCurrency(context.parsed.y)}`;
                            } else {
                                return `Collection Rate: ${context.parsed.y}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: !isMobile,
                        text: 'Quarters'
                    },
                    ticks: {
                        font: {
                            size: isMobile ? 9 : 11
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: !isMobile,
                        text: 'Amount (₹)'
                    },
                    ticks: {
                        font: {
                            size: isMobile ? 8 : 10
                        },
                        callback: function(value) {
                            return isMobile ? '₹' + (value/1000) + 'k' : '₹' + formatCurrency(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: !isMobile,
                        text: 'Percentage (%)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        font: {
                            size: isMobile ? 8 : 10
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function createFeeCollectionTable(quarterlyData) {
    console.log('📅 Frontend received quarters in order:', quarterlyData.map(q => `${q.quarterIndex}-${q.quarter}`).join(', '));
    
    if ($.fn.DataTable.isDataTable('#feeCollectionTable')) {
        $('#feeCollectionTable').DataTable().destroy();
    }
    
    $('#feeCollectionTable').empty();
    
    const sortedQuarterlyData = [...quarterlyData].sort((a, b) => a.quarterIndex - b.quarterIndex);
    console.log('📅 After sorting by quarterIndex:', sortedQuarterlyData.map(q => `${q.quarterIndex}-${q.quarter}`).join(', '));
    
    pendingDetailsIdCounter = 0;
    pendingRosterData.clear();
    const tableData = sortedQuarterlyData.map((data) => {
        const percentageClass = getPercentageClass(data.collectionPercentage);
        const quarterLabel = `<div class="month-cell">${data.quarter}</div>`;
        const pendingStudentsCell = createPendingStudentsCell(data.pendingDetails, data.pendingStudents, data.quarter);
        
        return [
            quarterLabel,
            `<div class="collection-cell">
                <span class="collection-amount">₹${formatCurrency(data.collection)}</span>
            </div>`,
            `<div class="student-count">${data.totalStudents}</div>`,
            `<div class="student-count">${data.paidStudents}</div>`,
            pendingStudentsCell,
            `<div class="percentage-container">
                <span class="percentage-badge ${percentageClass}">${data.collectionPercentage}%</span>
                <div class="progress-bar-mini">
                    <div class="progress-fill-mini" style="width: ${data.collectionPercentage}%"></div>
                </div>
            </div>`
        ];
    });
    
    const defaultPageLength = sortedQuarterlyData.length || 4;

    const dataTable = $('#feeCollectionTable').DataTable({
        data: tableData,
        columns: [
            { title: 'Quarter', orderable: false },
            { title: 'Collection Amount', orderable: true },
            { title: 'Total Students', orderable: true },
            { title: 'Paid Students', orderable: true },
            { title: 'Pending Students', orderable: true },
            { title: 'Collection Rate', orderable: true }
        ],
        dom: 'Bfrtip',
        buttons: [
            {
                extend: 'excel',
                text: window.innerWidth > 768 ? 'Export Excel' : 'Excel',
                className: 'btn btn-success btn-sm dt-button'
            },
            {
                extend: 'pdf',
                text: window.innerWidth > 768 ? 'Export PDF' : 'PDF',
                className: 'btn btn-danger btn-sm dt-button'
            }
        ],
        responsive: true,
        pageLength: defaultPageLength,
        ordering: false,
        language: {
            search: 'Search quarters:',
            lengthMenu: 'Show _MENU_ quarters per page',
            info: 'Showing _START_ to _END_ of _TOTAL_ quarters',
            searchPlaceholder: 'Search quarters...'
        },
        drawCallback: function() {
            if (window.innerWidth <= 768) {
                $('.dataTables_filter input').attr('placeholder', 'Search quarters...');
                $('.dt-button').addClass('btn-sm');
            }
            attachPendingRosterListeners();
        }
    });
}

function getPercentageClass(percentage) {
    if (percentage >= 80) return 'percentage-high';
    if (percentage >= 50) return 'percentage-medium';
    return 'percentage-low';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN').format(amount);
}

function createPendingStudentsCell(pendingDetails, pendingCount, quarterLabel) {
    const normalizedCount = typeof pendingCount === 'number' ? pendingCount : 0;
    const details = Array.isArray(pendingDetails) ? pendingDetails : [];

    if (details.length === 0) {
        return `<div class="pending-cell-simple"><span class="pending-count-zero">${normalizedCount}</span></div>`;
    }

    const rosterId = `pending-roster-${++pendingDetailsIdCounter}`;
    pendingRosterData.set(rosterId, {
        quarterLabel,
        pendingCount: normalizedCount,
        students: details.map(detail => ({
            studentName: detail.studentName || 'Unknown Student',
            pendingMonths: Array.isArray(detail.pendingMonths) ? detail.pendingMonths : []
        }))
    });

    return `
        <div class="pending-cell-simple">
            <span class="pending-count-num">${normalizedCount}</span>
            <button type="button" class="pending-view-btn" data-roster-id="${rosterId}">View</button>
        </div>
    `;
}

function createPendingPreview(details) {
    const previewLimit = getPendingPreviewLimit();
    const previewDetails = details.slice(0, previewLimit);
    if (previewDetails.length === 0) {
        return '<div class="pending-empty">No preview available</div>';
    }

    return previewDetails.map(detail => {
        const studentName = escapeHtml(detail.studentName || 'Unknown Student');
        const firstMonth = Array.isArray(detail.pendingMonths) && detail.pendingMonths.length
            ? detail.pendingMonths[0]
            : 'Month N/A';
        return `
            <div class="pending-preview-item">
                <span class="pending-preview-name">${studentName}</span>
                <span class="pending-preview-month">${escapeHtml(firstMonth)}</span>
            </div>
        `;
    }).join('');
}

function getPendingPreviewLimit() {
    return window.innerWidth <= 768 ? 1 : 3;
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) {
        return '';
    }

    return String(unsafe).replace(/[&<>"']/g, (char) => {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapeMap[char] || char;
    });
}

function attachPendingRosterListeners() {
    if (pendingViewListenerAttached) {
        return;
    }

    document.addEventListener('click', (event) => {
        const viewButton = event.target.closest('.pending-view-btn');
        if (viewButton) {
            const rosterId = viewButton.getAttribute('data-roster-id');
            if (rosterId) {
                openPendingRosterModal(rosterId);
            }
            return;
        }

        const modalEl = document.getElementById('pendingRosterModal');
        if (modalEl && modalEl.classList.contains('visible')) {
            if (event.target.matches('[data-action="pending-modal-close"]') || event.target === modalEl) {
                closePendingRosterModal();
            } else if (event.target.matches('[data-action="pending-prev"]')) {
                changePendingRosterPage(-1);
            } else if (event.target.matches('[data-action="pending-next"]')) {
                changePendingRosterPage(1);
            }
        }
    });

    pendingViewListenerAttached = true;
}

function ensurePendingRosterModal() {
    if (document.getElementById('pendingRosterModal')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'pendingRosterModal';
    modal.className = 'pending-roster-modal';
    modal.innerHTML = `
        <div class="pending-roster-dialog" role="dialog" aria-modal="true" aria-labelledby="pendingRosterTitle">
            <div class="pending-roster-header">
                <div>
                    <h3 id="pendingRosterTitle" class="pending-roster-title">Pending Students</h3>
                    <p class="pending-roster-count"></p>
                </div>
                <button type="button" class="pending-roster-close" data-action="pending-modal-close" aria-label="Close">×</button>
            </div>
            <div class="pending-roster-body">
                <input type="search" class="pending-roster-search" placeholder="Search by name or month" aria-label="Search pending students" />
                <ul class="pending-roster-list"></ul>
            </div>
            <div class="pending-roster-footer">
                <button type="button" class="pending-roster-nav" data-action="pending-prev">Previous</button>
                <span class="pending-roster-page-info"></span>
                <button type="button" class="pending-roster-nav" data-action="pending-next">Next</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.pending-roster-search').addEventListener('input', (event) => {
        pendingRosterModalState.search = event.target.value;
        pendingRosterModalState.page = 1;
        renderPendingRosterModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('visible')) {
            closePendingRosterModal();
        }
    });
}

function openPendingRosterModal(rosterId) {
    const data = pendingRosterData.get(rosterId);
    if (!data) {
        return;
    }

    ensurePendingRosterModal();
    pendingRosterModalState.rosterId = rosterId;
    pendingRosterModalState.page = 1;
    pendingRosterModalState.search = '';

    const modal = document.getElementById('pendingRosterModal');
    modal.querySelector('.pending-roster-search').value = '';
    renderPendingRosterModal();
    modal.classList.add('visible');
    document.body.classList.add('pending-modal-open');
}

function closePendingRosterModal() {
    const modal = document.getElementById('pendingRosterModal');
    if (!modal) {
        return;
    }
    modal.classList.remove('visible');
    document.body.classList.remove('pending-modal-open');
}

function renderPendingRosterModal() {
    const modal = document.getElementById('pendingRosterModal');
    if (!modal || !pendingRosterModalState.rosterId) {
        return;
    }

    const data = pendingRosterData.get(pendingRosterModalState.rosterId);
    if (!data) {
        return;
    }

    const titleEl = modal.querySelector('.pending-roster-title');
    const countEl = modal.querySelector('.pending-roster-count');
    const listEl = modal.querySelector('.pending-roster-list');
    const pageInfoEl = modal.querySelector('.pending-roster-page-info');

    titleEl.textContent = `${data.quarterLabel} Pending Fees`;
    countEl.textContent = `${data.pendingCount} student${data.pendingCount === 1 ? '' : 's'} pending`;

    const normalizedSearch = pendingRosterModalState.search.trim().toLowerCase();
    const filteredStudents = data.students.filter(student => {
        if (!normalizedSearch) {
            return true;
        }
        const nameMatch = (student.studentName || '').toLowerCase().includes(normalizedSearch);
        const monthsMatch = (student.pendingMonths || []).some(month => (month || '').toLowerCase().includes(normalizedSearch));
        return nameMatch || monthsMatch;
    });

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PENDING_MODAL_PAGE_SIZE));
    pendingRosterModalState.page = Math.min(pendingRosterModalState.page, totalPages);
    const startIndex = (pendingRosterModalState.page - 1) * PENDING_MODAL_PAGE_SIZE;
    const paginated = filteredStudents.slice(startIndex, startIndex + PENDING_MODAL_PAGE_SIZE);

    if (paginated.length === 0) {
        listEl.innerHTML = '<li class="pending-roster-empty">No students match your search.</li>';
    } else {
        listEl.innerHTML = paginated.map(student => {
            const months = student.pendingMonths && student.pendingMonths.length
                ? student.pendingMonths.map(month => `<span class="pending-month-badge">${escapeHtml(month)}</span>`).join('')
                : '<span class="pending-month-badge pending-month-badge-empty">Month N/A</span>';
            return `
                <li class="pending-roster-item">
                    <div class="pending-roster-item-head">
                        <span class="pending-roster-name">${escapeHtml(student.studentName || 'Unknown Student')}</span>
                    </div>
                    <div class="pending-months">${months}</div>
                </li>
            `;
        }).join('');
    }

    pageInfoEl.textContent = `Page ${pendingRosterModalState.page} of ${totalPages}`;
    modal.querySelector('[data-action="pending-prev"]').disabled = pendingRosterModalState.page <= 1;
    modal.querySelector('[data-action="pending-next"]').disabled = pendingRosterModalState.page >= totalPages;
}

function changePendingRosterPage(delta) {
    const modal = document.getElementById('pendingRosterModal');
    if (!modal || !modal.classList.contains('visible')) {
        return;
    }
    pendingRosterModalState.page = Math.max(1, pendingRosterModalState.page + delta);
    renderPendingRosterModal();
}

function showError(message) {
    const loading = document.getElementById('feeCollectionLoading');
    loading.innerHTML = `<div class="alert alert-danger">${message}</div>`;
}

function updateYearFilter(years, activeYear) {
    const normalizedYears = (years && years.length ? years : [activeYear]).filter(Boolean).sort((a, b) => b - a);
    selectedFeeYear = activeYear;
    if (feeYearSelectEl) {
        feeYearSelectEl.innerHTML = normalizedYears
            .map(year => `<option value="${year}">${year}</option>`)
            .join('');
        feeYearSelectEl.value = activeYear;
    }
    if (feeYearFilterEl) {
        feeYearFilterEl.style.display = 'flex';
    }
    document.dispatchEvent(new CustomEvent('fee-year-change', { detail: { year: activeYear } }));
}