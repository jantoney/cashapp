import { categories } from './categories.js';

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

// Utility: Format a date to YYYY-MM-DD in local timezone
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Utility: Format number as AUD currency
function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(value);
}

// Update unsaved banner (fixed at top)
function updateUnsavedBanner() {
  const banner = document.getElementById('unsavedBanner');
  if (banner) {
    banner.style.display = unsavedChanges ? 'flex' : 'none';
    //console.log("Banner update called, unsaved changes:", unsavedChanges); // Add debug log
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
  // Ensure all required fields are present
  const sanitizedTx = {
    description: tx.description || '',
    date: tx.date || '',
    amount: tx.amount || 0,
    recurring: tx.recurring === true,
    period: tx.recurring ? (tx.period || null) : null,
    hidden: tx.hidden === true,
    categoryId: tx.categoryId || null,
    // Only include endDate if it has a value
    ...(tx.endDate && tx.endDate.trim() !== '' ? { endDate: tx.endDate } : { endDate: null })
  };
  
  transactions.push(sanitizedTx);
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

// Render a category badge
function renderCategoryBadge(categoryId) {
  if (!categoryId) return '';
  
  const category = categories.find(cat => cat.id === categoryId);
  if (!category) return '';
  
  return `
    <span class="category-badge" style="background-color: ${category.color}">
      <i class="fas ${category.icon}"></i>${category.name}
    </span>
  `;
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
  setUnsavedChanges,
  renderCategoryBadge
};
