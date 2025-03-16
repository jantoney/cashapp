// Global variables
let transactions = []; 
let unsavedChanges = false;

// Toast notification function
function showToast(message) {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  // Trigger reflow before adding the show class
  toast.offsetHeight;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 300); // Wait for fade out animation
  }, 3000);
}

// Utility: Format a date to YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Utility: Format number as AUD currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(value);
}

// Update unsaved banner (fixed at top)
function updateUnsavedBanner() {
  const banner = document.getElementById('unsavedBanner');
  if (banner) {
    banner.style.display = unsavedChanges ? 'block' : 'none';
    console.log("Banner update called, unsaved changes:", unsavedChanges); // Add debug log
  } else {
    console.warn("Unsaved banner element not found");
  }
}

function markUnsavedChanges() {
  unsavedChanges = true;
  updateUnsavedBanner();
  // Will need to call drawGraph from chart.js
}

// Helper functions to modify global variables
function clearTransactions() {
  transactions.length = 0;
}

function addTransaction(tx) {
  transactions.push(tx);
}

function setUnsavedChanges(value) {
  unsavedChanges = value;
  updateUnsavedBanner();
}

// Set default graph dates: start today, end 3 months later
function setDefaultGraphDates() {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 3);
  document.getElementById('graphStartDate').value = formatDate(today);
  document.getElementById('graphEndDate').value = formatDate(endDate);
}

export { 
  transactions, 
  unsavedChanges, 
  showToast, 
  formatDate, 
  formatCurrency, 
  updateUnsavedBanner, 
  markUnsavedChanges, 
  setDefaultGraphDates,
  clearTransactions,
  addTransaction,
  setUnsavedChanges
};
