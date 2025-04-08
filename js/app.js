import { showToast, formatDate, markUnsavedChanges, transactions, setDefaultGraphDates, clearTransactions, addTransaction, setUnsavedChanges } from './utils.js';
import { drawGraph } from './chart.js';
import { updateTransactionsTable, loadFromFirestore, saveToFirestore, saveAllToFirestore, rebaseTransactions, toggleHiddenTransactions, toggleGroupByCategory } from './transactions.js';
import { initializeAuth } from './auth.js';
import { createCategoryDropdown, openCategoryModal, initializeCategories } from './categories.js';

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Set default dates for the graph
  setDefaultGraphDates();
  
  // Initialize authentication
  initializeAuth();
  
  // Initialize categories
  initializeCategories();

  // Set up event listeners for the toggle buttons in the modal
  initializeTransactionTypeToggles();
  
  // Setup date pickers with today's date
  initializeDatePickers();
  
  // Create category dropdowns for both transaction forms
  createCategoryDropdown('recurringCategoryContainer');
  createCategoryDropdown('oneoffCategoryContainer');
  
  // Event listeners for "Manage Categories" buttons
  document.getElementById('manageRecurringCategories').addEventListener('click', openCategoryModal);
  document.getElementById('manageOneoffCategories').addEventListener('click', openCategoryModal);

  // Add transaction modal open/close
  const addTransactionModal = document.getElementById('addTransactionModal');
  document.getElementById('openAddTransactionModal').addEventListener('click', function() {
    addTransactionModal.style.display = 'block';
  });
  
  document.querySelector('#addTransactionModal .close-modal').addEventListener('click', function() {
    addTransactionModal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === addTransactionModal) {
      addTransactionModal.style.display = 'none';
    }
  });

  // Add recurring transaction
  document.getElementById('addRecurring').addEventListener('click', addRecurringTransaction);

  // Add one-off transaction
  document.getElementById('addOneoff').addEventListener('click', addOneoffTransaction);
  
  // Toggle grouping by category
  document.getElementById('toggleGroupCategoriesBtn').addEventListener('click', toggleGroupByCategory);

  // Manage Categories button
  document.getElementById('manageCategoriesBtn').addEventListener('click', openCategoryModal);

  // Update graph button
  document.getElementById('updateGraph').addEventListener('click', drawGraph);

  // Preset timeframe buttons
  document.querySelectorAll('.preset-button').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.preset-button').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-light');
      });
      this.classList.remove('btn-light');
      this.classList.add('btn-primary');
      const months = parseInt(this.getAttribute('data-months'));
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(endDate.getMonth() + months);
      document.getElementById('graphStartDate').value = formatDate(today);
      document.getElementById('graphEndDate').value = formatDate(endDate);
      drawGraph();
    });
  });

  // Copy Graph as Image
  document.getElementById('copyGraph').addEventListener('click', function() {
    const canvas = document.getElementById('cashflowChart');
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    offscreenCanvas.toBlob(function(blob) {
      if (!blob) {
        showToast('Failed to create image blob.');
        return;
      }
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item]).then(() => {
        showToast('Graph image copied to clipboard!');
      }).catch(err => {
        console.error(err);
        showToast('Failed to copy graph image.');
      });
    });
  });

  // File operations - Open local file
  document.getElementById('openFile').addEventListener('click', async function(){
    try {
      const [fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'JSON Files', accept: {'application/json': ['.json']} }] });
      const file = await fileHandle.getFile();
      const contents = await file.text();
      // Clear transactions array and add all items from file
      clearTransactions();
      const fileData = JSON.parse(contents);
      fileData.forEach(tx => addTransaction(tx));
      updateTransactionsTable();
      setUnsavedChanges(false);
    } catch (err) {
      console.error(err);
      showToast('Error opening file.');
    }
  });
  
  // File operations - Save local file
  document.getElementById('saveFile').addEventListener('click', async function(){
    try {
      let fileHandle = await window.showSaveFilePicker({ types: [{ description: 'JSON Files', accept: {'application/json': ['.json']} }], excludeAcceptAllOption: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(transactions, null, 2));
      await writable.close();
      showToast('File saved successfully.');
      setUnsavedChanges(false);
      console.log("Saved file, unsaved changes:", unsavedChanges); // Add debug log
    } catch (err) {
      console.error(err);
      showToast('Error saving file.');
    }
  });

  // Firestore operations
  document.getElementById('loadFirestore').addEventListener('click', loadFromFirestore);
  document.getElementById('saveFirestore').addEventListener('click', saveAllToFirestore);
  
  // Save button in unsaved changes banner
  document.getElementById('saveAllBtn').addEventListener('click', saveAllToFirestore);
  
  // Rebase functionality
  document.getElementById('rebaseBtn').addEventListener('click', rebaseTransactions);
  
  // Toggle hidden transactions visibility
  document.getElementById('toggleHiddenBtn').addEventListener('click', toggleHiddenTransactions);
  
  // Toggle grouping by category
  const toggleBtn = document.getElementById('toggleGroupCategoriesBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = '<i class="fas fa-list"></i> Show by Date';
  }
});

// Initialize date pickers with today's date
function initializeDatePickers() {
  const today = new Date();
  const todayStr = formatDate(today);
  
  document.getElementById('recurringStartDate').value = todayStr;
  document.getElementById('oneoffDate').value = todayStr;
}

// Initialize the money in/out toggle buttons
function initializeTransactionTypeToggles() {
  // Recurring transaction type toggles
  document.getElementById('recurringTypeIn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('recurringTypeOut').classList.remove('active');
  });

  document.getElementById('recurringTypeOut').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('recurringTypeIn').classList.remove('active');
  });
  
  // One-off transaction type toggles
  document.getElementById('oneoffTypeIn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('oneoffTypeOut').classList.remove('active');
  });

  document.getElementById('oneoffTypeOut').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('oneoffTypeIn').classList.remove('active');
  });
}

// Add a recurring transaction from the modal
function addRecurringTransaction() {
  const description = document.getElementById('recurringDesc').value;
  const startDate = document.getElementById('recurringStartDate').value;
  const endDate = document.getElementById('recurringEndDate').value;
  const period = document.getElementById('recurringPeriod').value;
  const amount = parseFloat(document.getElementById('recurringAmount').value);
  const categorySelect = document.querySelector('#recurringCategoryContainer select');
  const categoryId = categorySelect ? categorySelect.value : null;
  
  if (!description || !startDate || isNaN(amount) || amount <= 0) {
    showToast('Please fill in all required fields correctly.');
    return;
  }
  
  // Determine if money in or out based on which toggle button is active
  const isMoneyIn = document.getElementById('recurringTypeIn').classList.contains('active');
  const finalAmount = isMoneyIn ? Math.abs(amount) : -Math.abs(amount);
  
  // Create the transaction object
  const newTransaction = {
    description: description,
    date: startDate,
    endDate: endDate || null,
    amount: finalAmount,
    recurring: true,
    period: period,
    hidden: false,
    categoryId: categoryId
  };
  
  // Add to transactions array
  addTransaction(newTransaction);
  
  // Update the table and mark changes as unsaved
  updateTransactionsTable();
  markUnsavedChanges();
  
  // Clear the form and close the modal
  resetTransactionForm('recurring');
  document.getElementById('addTransactionModal').style.display = 'none';
  
  showToast('Recurring transaction added successfully.');
}

// Add a one-off transaction from the modal
function addOneoffTransaction() {
  const description = document.getElementById('oneoffDesc').value;
  const date = document.getElementById('oneoffDate').value;
  const amount = parseFloat(document.getElementById('oneoffAmount').value);
  const categorySelect = document.querySelector('#oneoffCategoryContainer select');
  const categoryId = categorySelect ? categorySelect.value : null;
  
  if (!description || !date || isNaN(amount) || amount <= 0) {
    showToast('Please fill in all required fields correctly.');
    return;
  }
  
  // Determine if money in or out based on which toggle button is active
  const isMoneyIn = document.getElementById('oneoffTypeIn').classList.contains('active');
  const finalAmount = isMoneyIn ? Math.abs(amount) : -Math.abs(amount);
  
  // Create the transaction object
  const newTransaction = {
    description: description,
    date: date,
    amount: finalAmount,
    recurring: false,
    period: null,
    hidden: false,
    categoryId: categoryId
  };
  
  // Add to transactions array
  addTransaction(newTransaction);
  
  // Update the table and mark changes as unsaved
  updateTransactionsTable();
  markUnsavedChanges();
  
  // Clear the form and close the modal
  resetTransactionForm('oneoff');
  document.getElementById('addTransactionModal').style.display = 'none';
  
  showToast('One-off transaction added successfully.');
}

// Reset the transaction form after submission
function resetTransactionForm(type) {
  if (type === 'recurring') {
    document.getElementById('recurringDesc').value = '';
    document.getElementById('recurringAmount').value = '';
    document.getElementById('recurringEndDate').value = '';
    // Don't reset the start date or period
  } else {
    document.getElementById('oneoffDesc').value = '';
    document.getElementById('oneoffAmount').value = '';
    // Don't reset the date
  }
}

// Initialize UI
loadFromFirestore();
