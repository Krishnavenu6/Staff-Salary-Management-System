/**
 * Staff Salary Management System
 * 
 * This script handles all functionality for managing staff salary records
 * including adding, editing, deleting, searching and exporting data.
 */

/**
 * Utility Functions
 * These small helper functions are used throughout the application
 */

// Format a number as currency with 2 decimal places
const formatCurrency = (value) => parseFloat(value).toFixed(2);

// Validate that a value is a positive number
const validateNumber = (value) => !isNaN(value) && value >= 0;

/**
 * Display a toast notification using SweetAlert2
 * @param {string} icon - The icon type (success, error, warning, info)
 * @param {string} title - The message to display
 */
const showToast = (icon, title) => {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
    Toast.fire({ icon, title });
};

// Self-executing function to create a scope and prevent global namespace pollution
(function() {
    // Wait until the DOM is fully loaded before accessing elements
    document.addEventListener('DOMContentLoaded', function() {
        /**
         * DOM Element References
         * Cache all the DOM elements we'll need to interact with
         */
        const salaryForm = document.getElementById('salaryForm');
        const clientSelect = document.getElementById('clientSelect');
        const designationSelect = document.getElementById('designationSelect');
        const basicInput = document.getElementById('basic');
        const hraInput = document.getElementById('hra');
        const daInput = document.getElementById('da');
        const otherAllowanceInput = document.getElementById('otherAllowance');
        const submitBtn = document.getElementById('submitBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const resetFormBtn = document.getElementById('resetForm');
        const salaryTableBody = document.getElementById('salaryTableBody');
        const searchInput = document.getElementById('searchInput');
        const exportBtn = document.getElementById('exportBtn');
        const addClientBtn = document.getElementById('addClientBtn');

        // Assign DOM elements to global variables for access in other functions
        window.salaryForm = salaryForm;
        window.clientSelect = clientSelect;
        window.designationSelect = designationSelect;
        window.basicInput = basicInput;
        window.hraInput = hraInput;
        window.daInput = daInput;
        window.otherAllowanceInput = otherAllowanceInput;
        window.submitBtn = submitBtn;
        window.cancelBtn = cancelBtn;
        window.resetFormBtn = resetFormBtn;
        window.salaryTableBody = salaryTableBody;
        window.searchInput = searchInput;
        window.exportBtn = exportBtn;
        window.addClientBtn = addClientBtn;

        /**
         * Application State
         * Initial dataset loaded from localStorage or fallback to sample data
         */
        let salaryRecords = JSON.parse(localStorage.getItem('salaryRecords')) || [];
        let clientsList = JSON.parse(localStorage.getItem('clientsList')) || [
            'SAMASHTI', 
            'ABC Corporation', 
            'XYZ Inc.', 
            'PQR Ltd.', 
            'MNO Enterprises'
        ];
        let editIndex = -1;

        /**
         * Render the salary records in the table
         */
        function renderRecords(records = salaryRecords) {
            console.log('Rendering', records.length, 'records');
            
            // Use DocumentFragment to prevent flickering by batching DOM updates
            const fragment = document.createDocumentFragment();
            
            // Initialize the totals
            let totalBasic = 0;
            let totalHRA = 0;
            let totalDA = 0;
            let totalOther = 0;
            
            // Clear the existing table content only once
            salaryTableBody.innerHTML = '';
            
            if (!records || records.length === 0) {
                // If no records, display a message
                const row = document.createElement('tr');
                row.innerHTML = `<td colspan="8" class="text-center">No salary records found</td>`;
                fragment.appendChild(row);
            } else {
                // Populate the table with records
                records.forEach((record, index) => {
                    // Update totals (ensure they're valid numbers)
                    totalBasic += isNaN(record.basic) ? 0 : Number(record.basic);
                    totalHRA += isNaN(record.hra) ? 0 : Number(record.hra);
                    totalDA += isNaN(record.da) ? 0 : Number(record.da);
                    totalOther += isNaN(record.otherAllowance) ? 0 : Number(record.otherAllowance);
                    
                    // Create table row
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${index + 1}</td>
                        <td>${record.client || 'N/A'}</td>
                        <td>${record.designation}</td>
                        <td class="text-end">${formatCurrency(record.basic)}</td>
                        <td class="text-end">${formatCurrency(record.hra)}</td>
                        <td class="text-end">${formatCurrency(record.da)}</td>
                        <td class="text-end">${formatCurrency(record.otherAllowance)}</td>
                        <td>
                            <div class="d-flex gap-2 justify-content-center">
                                <button class="btn btn-outline-primary btn-sm edit-btn" data-index="${index}">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-btn" data-index="${index}">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    `;
                    
                    // Add event listeners to buttons before appending to fragment
                    const editBtn = row.querySelector('.edit-btn');
                    const deleteBtn = row.querySelector('.delete-btn');
                    
                    editBtn.addEventListener('click', function() {
                        editRecord(index);
                    });
                    
                    deleteBtn.addEventListener('click', function() {
                        deleteRecord(index);
                    });
                    
                    fragment.appendChild(row);
                });
                
                // Update the totals displayed in the footer - with safeguards against NaN
                document.getElementById('totalBasic').textContent = formatCurrency(totalBasic);
                document.getElementById('totalHRA').textContent = formatCurrency(totalHRA);
                document.getElementById('totalDA').textContent = formatCurrency(totalDA);
                document.getElementById('totalOther').textContent = formatCurrency(totalOther);
            }
            
            // Append all rows at once to minimize reflows and repaints
            salaryTableBody.appendChild(fragment);
        }

        /**
         * Filter records based on search input
         */
        function filterRecords() {
            const searchTerm = searchInput.value.toLowerCase();
            
            if (searchTerm === '') {
                // If search field is empty, show all records
                renderRecords();
            } else {
                // Filter records that match the search term (by client or designation)
                const filteredRecords = salaryRecords.filter(record => {
                    return (record.client && record.client.toLowerCase().includes(searchTerm)) || 
                        record.designation.toLowerCase().includes(searchTerm);
                });
                
                // Render filtered records
                renderRecords(filteredRecords);
            }
        }

        /**
         * Handle form submission - Add or Update a record
         */
        function handleFormSubmit(e) {
            e.preventDefault();
            
            // Form validation
            if (!salaryForm.checkValidity()) {
                e.stopPropagation();
                salaryForm.classList.add('was-validated');
                return;
            }
            
            // Get form values and format numeric values
            const record = {
                client: clientSelect.value,
                designation: designationSelect.value,
                basic: parseFloat(basicInput.value),
                hra: parseFloat(hraInput.value),
                da: parseFloat(daInput.value),
                otherAllowance: parseFloat(otherAllowanceInput.value)
            };
            
            // Validate all numeric fields to ensure they are numbers
            if (isNaN(record.basic) || isNaN(record.hra) || isNaN(record.da) || isNaN(record.otherAllowance)) {
                showToast('error', 'Please enter valid numbers for all salary fields');
                return;
            }
            
            try {
                if (editIndex !== -1) {
                    // Update existing record
                    salaryRecords[editIndex] = record;
                    editIndex = -1;
                    submitBtn.textContent = 'Save Record';
                    cancelBtn.classList.add('d-none');
                    showToast('success', 'Record updated successfully');
                } else {
                    // Add new record
                    salaryRecords.push(record);
                    showToast('success', 'Record added successfully');
                }
                
                // Save to localStorage - wrap in try/catch to handle potential storage issues
                try {
                    localStorage.setItem('salaryRecords', JSON.stringify(salaryRecords));
                } catch (storageError) {
                    console.error('LocalStorage error:', storageError);
                    showToast('warning', 'Your data was processed but could not be saved permanently');
                }
                
                // Refresh table with the updated records
                renderRecords();
                
                // Reset form
                salaryForm.reset();
                salaryForm.classList.remove('was-validated');
            } catch (error) {
                console.error('Error:', error);
                showToast('error', 'An error occurred: ' + error.message);
            }
        }

        /**
         * Edit an existing salary record
         * Populates the form with record data and switches to edit mode
         * @param {number} index - The index of the record to edit
         */
        function editRecord(index) {
            const record = salaryRecords[index];
            if (record) {
                // Populate form fields with current values
                clientSelect.value = record.client;
                designationSelect.value = record.designation;
                basicInput.value = record.basic;
                hraInput.value = record.hra;
                daInput.value = record.da;
                otherAllowanceInput.value = record.otherAllowance;
                
                // Set form state to edit mode
                editIndex = index;
                submitBtn.textContent = 'Update Record';
                cancelBtn.classList.remove('d-none');
                
                // Focus on the first field
                clientSelect.focus();
            }
        }

        /**
         * Delete a salary record with confirmation dialog
         * @param {number} index - The index of the record to delete
         */
        function deleteRecord(index) {
            // Show confirmation dialog before deleting
            Swal.fire({
                title: 'Are you sure?',
                text: 'This record will be permanently deleted!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Find and remove the record
                    salaryRecords.splice(index, 1);
                    
                    // Update storage and UI
                    localStorage.setItem('salaryRecords', JSON.stringify(salaryRecords));
                    renderRecords();
                    showToast('success', 'Record deleted successfully!');
                }
            });
        }

        /**
         * Export salary records to Excel
         */
        function exportToExcel() {
            try {
                // Transform data for Excel export
                const data = salaryRecords.map(record => ({
                    'Client': record.client || 'N/A',
                    'Designation': record.designation,
                    'Basic': record.basic,
                    'HRA': record.hra,
                    'DA': record.da,
                    'Other Allowance': record.otherAllowance,
                    'Total': record.basic + record.hra + record.da + record.otherAllowance
                }));

                // Create Excel worksheet from data array
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Salary Records');
                
                // Generate filename with current date
                const fileName = `Salary_Records_${new Date().toISOString().slice(0, 10)}.xlsx`;
                
                // Trigger download
                XLSX.writeFile(wb, fileName);
                showToast('success', 'Exported successfully');
            } catch (error) {
                console.error('Export error:', error);
                showToast('error', 'Export failed');
            }
        }

        /**
         * Initialize client dropdown with existing clients
         */
        function initializeClientDropdown() {
            // Clear existing options except for the first default option
            while (clientSelect.options.length > 1) {
                clientSelect.remove(1);
            }
            
            // Add client options from the clientsList array
            clientsList.forEach(client => {
                const option = document.createElement('option');
                option.value = client;
                option.textContent = client;
                clientSelect.appendChild(option);
            });
        }

        /**
         * Add new client to the list
         */
        function addClient() {
            const newClientName = document.getElementById('newClientName').value.trim();
            
            if (!newClientName) {
                showToast('error', 'Please enter a client name');
                return;
            }
            
            // Check if client already exists
            if (!clientsList.includes(newClientName)) {
                // Add new client to dropdown
                clientsList.push(newClientName);
                localStorage.setItem('clientsList', JSON.stringify(clientsList));
                
                // Update dropdown
                const option = document.createElement('option');
                option.value = newClientName;
                option.textContent = newClientName;
                clientSelect.appendChild(option);
                
                // Select the new client
                clientSelect.value = newClientName;
                
                showToast('success', `Client "${newClientName}" added successfully`);
            } else {
                showToast('warning', 'This client already exists');
            }
        }

        /**
         * Event Listeners for UI Components
         */
        
        // Live search functionality
        searchInput.addEventListener('input', filterRecords);

        // Form submission handler
        salaryForm.addEventListener('submit', handleFormSubmit);
        
        // Reset form button handler
        resetFormBtn.addEventListener('click', () => {
            // Clear form and reset state
            salaryForm.reset();
            salaryForm.classList.remove('was-validated');
            editIndex = -1;
            submitBtn.textContent = 'Save Record';
            cancelBtn.classList.add('d-none');
        });
        
        // Cancel edit button handler
        cancelBtn.addEventListener('click', () => {
            // Exit edit mode without saving changes
            salaryForm.reset();
            salaryForm.classList.remove('was-validated');
            editIndex = -1;
            submitBtn.textContent = 'Save Record';
            cancelBtn.classList.add('d-none');
        });

        // Export to Excel button handler
        exportBtn.addEventListener('click', exportToExcel);

        // Add Client button handler
        addClientBtn.addEventListener('click', () => {
            // Show modal for adding new client
            const addClientModal = new bootstrap.Modal(document.getElementById('addClientModal'));
            document.getElementById('newClientName').value = '';
            addClientModal.show();
        });
        
        // Save Client button handler
        document.getElementById('saveClientBtn').addEventListener('click', () => {
            addClient();
            // Close the modal after adding
            const modalEl = document.getElementById('addClientModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        });

        /**
         * Generate dummy data for initial display
         * @returns {Array} Array of sample salary records
         */
        function generateDummyData() {
            return [
                {
                    client: 'SAMASHTI',
                    designation: 'Sr. Facility Executive_1_Active',
                    basic: 10.00,
                    hra: 20.00,
                    da: 30.00,
                    otherAllowance: 40.00
                },
                {
                    client: 'ABC Corporation',
                    designation: 'Facility Executive_1_Active',
                    basic: 7.00,
                    hra: 8.00,
                    da: 9.00,
                    otherAllowance: 10.00
                },
                {
                    client: 'XYZ Inc.',
                    designation: 'Supervisor_1_Active',
                    basic: 11.00,
                    hra: 12.00,
                    da: 13.00,
                    otherAllowance: 14.00
                },
                {
                    client: 'PQR Ltd.',
                    designation: 'Janitor_1_Active',
                    basic: 15.00,
                    hra: 16.00,
                    da: 17.00,
                    otherAllowance: 18.00
                },
                {
                    client: 'MNO Enterprises',
                    designation: 'Office Assistant_1_Active',
                    basic: 19.00,
                    hra: 20.00,
                    da: 21.00,
                    otherAllowance: 22.00
                },
                {
                    client: 'SAMASHTI',
                    designation: 'Pantry Boy_1_Active',
                    basic: 23.00,
                    hra: 24.00,
                    da: 25.00,
                    otherAllowance: 26.00
                }
            ];
        }

        /**
         * Initialize the application
         */
        function init() {
            // Initialize client dropdown
            initializeClientDropdown();
            
            // Load records from localStorage or use dummy data if none exist
            try {
                const storedRecords = localStorage.getItem('salaryRecords');
                if (storedRecords) {
                    salaryRecords = JSON.parse(storedRecords);
                    console.log('Loaded records:', salaryRecords);
                } else {
                    // Load dummy data if no records exist
                    salaryRecords = generateDummyData();
                    localStorage.setItem('salaryRecords', JSON.stringify(salaryRecords));
                    console.log('Initialized with dummy data:', salaryRecords.length, 'records');
                    showToast('info', 'Sample data loaded for demonstration');
                }
            } catch (error) {
                console.error('Error loading records:', error);
                showToast('error', 'Could not load saved records');
                // Fall back to dummy data if there's an error
                salaryRecords = generateDummyData();
            }
            
            // Render initial records
            renderRecords();
            
            // Add debugging information
            console.log('Application initialized with', salaryRecords.length, 'records');
        }

        // Start the application when the DOM is fully loaded
        init();
    });
})();