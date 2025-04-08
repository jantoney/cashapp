import { transactions, showToast, formatCurrency, markUnsavedChanges, unsavedChanges, updateUnsavedBanner, clearTransactions, addTransaction, setUnsavedChanges, formatDate, renderCategoryBadge } from './utils.js';
import { fsDocRef, fsCategoriesDocRef, setDoc } from './firebase-config.js';
import { drawGraph } from './chart.js';
import { createCategoryDropdown, openCategoryModal, getCategoryById, getCategories, categories } from './categories.js';

// Flag to track whether hidden transactions should be shown
let showHiddenTransactions = false;
// Flag to track if transactions should be grouped by category
let groupByCategory = true; // Set to true by default

// Create transaction edit modal in DOM
function createEditModal() {
  // Check if modal already exists to avoid duplicates
  if (document.getElementById('editTransactionModal')) return;
  
  const modalHtml = `
    <div id="editTransactionModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Edit Transaction</h4>
          <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          <form id="editTransactionForm">
            <input type="hidden" id="editTransactionIndex">
            
            <div class="form-group">
              <label for="editDescription">Description</label>
              <input type="text" id="editDescription" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label for="editDate">Date</label>
              <input type="date" id="editDate" class="form-control" required>
            </div>
            
            <div class="form-group">
              <label for="editAmount">Amount</label>
              <input type="number" id="editAmount" class="form-control" step="0.01" min="0" required>
            </div>
            
            <div class="form-group">
              <label>Transaction Type</label>
              <div class="toggle-group">
                <button type="button" id="editTypeIn" class="toggle-btn">Money In</button>
                <button type="button" id="editTypeOut" class="toggle-btn">Money Out</button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="editCategoryContainer">Category</label>
              <div class="d-flex align-items-center">
                <div id="editCategoryContainer" style="flex-grow: 1;"></div>
                <button type="button" id="manageEditCategories" class="btn btn-light btn-sm ml-10">
                  <i class="fas fa-cog"></i> Manage
                </button>
              </div>
            </div>
            
            <div id="editRecurringFields">
              <div class="form-group">
                <label for="editPeriod">Recurrence</label>
                <select id="editPeriod" class="form-control">
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="editEndDate">End Date (optional)</label>
                <input type="date" id="editEndDate" class="form-control">
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" id="saveEditTransaction" class="btn btn-primary">Save Changes</button>
              <button type="button" id="cancelEditTransaction" class="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Set up event listeners
  document.querySelector('.close-modal').addEventListener('click', closeEditModal);
  document.getElementById('cancelEditTransaction').addEventListener('click', closeEditModal);
  document.getElementById('saveEditTransaction').addEventListener('click', saveEditTransaction);
  document.getElementById('manageEditCategories').addEventListener('click', openCategoryModal);
  
  // Event listeners for toggle buttons
  document.getElementById('editTypeIn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('editTypeOut').classList.remove('active');
  });

  document.getElementById('editTypeOut').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('editTypeIn').classList.remove('active');
  });
}

// Close the modal
function closeEditModal() {
  const modal = document.getElementById('editTransactionModal');
  modal.style.display = 'none';
}

// Save the edited transaction
function saveEditTransaction() {
  const index = parseInt(document.getElementById('editTransactionIndex').value);
  const tx = transactions[index];
  const description = document.getElementById('editDescription').value;
  const date = document.getElementById('editDate').value;
  const amount = parseFloat(document.getElementById('editAmount').value);
  const categorySelect = document.querySelector('#editCategoryContainer select');
  const categoryId = categorySelect ? categorySelect.value : null;
  
  if (!description || !date || isNaN(amount)) {
    showToast('Please fill in all required fields correctly.');
    return;
  }
  
  // Determine if money in or out
  const isMoneyIn = document.getElementById('editTypeIn').classList.contains('active');
  const finalAmount = isMoneyIn ? Math.abs(amount) : -Math.abs(amount);
  
  // Update transaction
  if (tx.recurring) {
    const period = document.getElementById('editPeriod').value;
    const endDate = document.getElementById('editEndDate').value;
    
    transactions[index] = { 
      description: description, 
      date: date, 
      endDate: endDate || null, 
      amount: finalAmount, 
      recurring: true, 
      period: period, 
      hidden: tx.hidden,
      categoryId: categoryId
    };
  } else {
    transactions[index] = { 
      description: description, 
      date: date, 
      amount: finalAmount, 
      recurring: false, 
      period: null, 
      hidden: tx.hidden,
      categoryId: categoryId
    };
  }
  
  updateTransactionsTable();
  markUnsavedChanges();
  closeEditModal();
  showToast('Transaction updated successfully.');
}

// Update transactions table
function updateTransactionsTable() {
  // Ensure the edit modal exists in the DOM
  createEditModal();
  
  if (groupByCategory) {
    updateTransactionsTableByCategory();
    return;
  }
  
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  const tbody = document.getElementById('transactionTableBody');
  tbody.innerHTML = '';
  transactions.forEach((tx, index) => {
    // Skip hidden transactions unless showHiddenTransactions is true
    if (tx.hidden && !showHiddenTransactions) return;
    
    const tr = document.createElement('tr');
    // Highlight hidden transactions with a class when they're shown
    if (tx.hidden) {
      tr.classList.add('hidden-transaction');
    }
    
    tr.innerHTML = `
      <td>
        ${tx.description}
        <div>${renderCategoryBadge(tx.categoryId)}</div>
      </td>
      <td>${tx.date}${tx.recurring && tx.endDate ? ' to ' + tx.endDate : ''}</td>
      <td class="amount-cell">${formatCurrency(tx.amount)}</td>
      <td>${tx.recurring ? 'Yes' : 'No'}</td>
      <td>${tx.period ? tx.period : ''}</td>
      <td><input type="checkbox" class="hide-checkbox" data-index="${index}" ${tx.hidden ? 'checked' : ''}></td>
      <td>
        <button class="edit-btn" data-index="${index}">Edit</button>
        <button class="delete-btn" data-index="${index}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Update the button text to reflect current state
  updateToggleHiddenButton();
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      editTransaction(parseInt(this.getAttribute('data-index')));
    });
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteTransaction(parseInt(this.getAttribute('data-index')));
    });
  });
  document.querySelectorAll('.hide-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const index = parseInt(this.getAttribute('data-index'));
      transactions[index].hidden = this.checked;
      markUnsavedChanges();
      drawGraph();
    });
  });
  drawGraph();
}

// New function to display transactions grouped by category
function updateTransactionsTableByCategory() {
  const tbody = document.getElementById('transactionTableBody');
  tbody.innerHTML = '';
  
  // Get all categories
  const categories = getCategories();
  
  // Add "Uncategorized" for transactions without a category
  categories.push({ id: 'uncategorized', name: 'Uncategorized', color: '#cccccc', icon: 'fa-question' });
  
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Group transactions by category
  categories.forEach(category => {
    // Filter transactions for this category
    const categoryTransactions = sortedTransactions.filter(tx => {
      // Handle uncategorized transactions
      if (category.id === 'uncategorized') {
        return !tx.categoryId && (!tx.hidden || showHiddenTransactions);
      }
      return tx.categoryId === category.id && (!tx.hidden || showHiddenTransactions);
    });
    
    // Skip categories with no transactions
    if (categoryTransactions.length === 0) return;
    
    // Create category header row
    const catHeaderRow = document.createElement('tr');
    catHeaderRow.className = 'category-header';
    catHeaderRow.style.backgroundColor = category.color + '20'; // Add transparency
    catHeaderRow.style.borderTop = `2px solid ${category.color}`;
    
    catHeaderRow.innerHTML = `
      <td colspan="7">
        <div style="display: flex; align-items: center;">
          <div class="category-icon" style="background-color: ${category.color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
            <i class="fas ${category.icon}" style="color: white; font-size: 12px;"></i>
          </div>
          <span style="font-weight: bold;">${category.name}</span>
          <span style="margin-left: 10px; font-size: 0.8em; color: #666;">(${categoryTransactions.length} transactions)</span>
        </div>
      </td>
    `;
    
    tbody.appendChild(catHeaderRow);
    
    // Calculate category total
    const categoryTotal = categoryTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const catTotalRow = document.createElement('tr');
    catTotalRow.className = 'category-total';
    catTotalRow.style.backgroundColor = category.color + '10'; // More transparency
    
    catTotalRow.innerHTML = `
      <td colspan="2"><strong>Category Total:</strong></td>
      <td class="amount-cell"><strong>${formatCurrency(categoryTotal)}</strong></td>
      <td colspan="4"></td>
    `;
    
    tbody.appendChild(catTotalRow);
    
    // Add transactions for this category
    categoryTransactions.forEach((tx, index) => {
      const originalIndex = transactions.indexOf(tx);
      const tr = document.createElement('tr');
      
      // Highlight hidden transactions
      if (tx.hidden) {
        tr.classList.add('hidden-transaction');
      }
      
      tr.innerHTML = `
        <td style="padding-left: 30px;">
          ${tx.description}
        </td>
        <td>${tx.date}${tx.recurring && tx.endDate ? ' to ' + tx.endDate : ''}</td>
        <td class="amount-cell">${formatCurrency(tx.amount)}</td>
        <td>${tx.recurring ? 'Yes' : 'No'}</td>
        <td>${tx.period ? tx.period : ''}</td>
        <td><input type="checkbox" class="hide-checkbox" data-index="${originalIndex}" ${tx.hidden ? 'checked' : ''}></td>
        <td>
          <button class="edit-btn" data-index="${originalIndex}">Edit</button>
          <button class="delete-btn" data-index="${originalIndex}">Delete</button>
        </td>
      `;
      
      tbody.appendChild(tr);
    });
    
    // Add a separator row
    const separatorRow = document.createElement('tr');
    separatorRow.innerHTML = '<td colspan="7" style="height: 10px;"></td>';
    tbody.appendChild(separatorRow);
  });
  
  // Update the button text to reflect current state
  updateToggleHiddenButton();
  
  // Add event listeners to buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      editTransaction(parseInt(this.getAttribute('data-index')));
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteTransaction(parseInt(this.getAttribute('data-index')));
    });
  });
  
  document.querySelectorAll('.hide-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const index = parseInt(this.getAttribute('data-index'));
      transactions[index].hidden = this.checked;
      markUnsavedChanges();
      drawGraph();
    });
  });
  
  drawGraph();
}

// Toggle grouping by category
function toggleGroupByCategory() {
  groupByCategory = !groupByCategory;
  
  const btn = document.getElementById('toggleGroupCategoriesBtn');
  if (btn) {
    if (groupByCategory) {
      btn.innerHTML = '<i class="fas fa-list"></i> Show by Date';
    } else {
      btn.innerHTML = '<i class="fas fa-tags"></i> Group by Category';
    }
  }
  
  updateTransactionsTable();
  showToast(groupByCategory ? 'Transactions grouped by category' : 'Transactions shown by date');
}

// Toggle showing/hiding hidden transactions
function toggleHiddenTransactions() {
  showHiddenTransactions = !showHiddenTransactions;
  updateTransactionsTable();
  showToast(showHiddenTransactions ? 'Showing hidden transactions' : 'Hidden transactions are now hidden');
}

// Update the toggle button text based on the current state
function updateToggleHiddenButton() {
  const toggleButton = document.getElementById('toggleHiddenBtn');
  const toggleText = document.getElementById('toggleHiddenText');
  
  if (toggleButton && toggleText) {
    if (showHiddenTransactions) {
      toggleText.textContent = 'Hide Hidden';
      toggleButton.querySelector('i').className = 'fas fa-eye-slash';
    } else {
      toggleText.textContent = 'Show Hidden';
      toggleButton.querySelector('i').className = 'fas fa-eye';
    }
  }
}

// Edit a transaction - updated to use modal
function editTransaction(index) {
  const tx = transactions[index];
  const modal = document.getElementById('editTransactionModal');
  
  // Populate the form
  document.getElementById('editTransactionIndex').value = index;
  document.getElementById('editDescription').value = tx.description;
  document.getElementById('editDate').value = tx.date;
  document.getElementById('editAmount').value = Math.abs(tx.amount);
  
  // Set money in/out toggle
  if (tx.amount >= 0) {
    document.getElementById('editTypeIn').classList.add('active');
    document.getElementById('editTypeOut').classList.remove('active');
  } else {
    document.getElementById('editTypeOut').classList.add('active');
    document.getElementById('editTypeIn').classList.remove('active');
  }
  
  // Create category dropdown with the current category selected
  createCategoryDropdown('editCategoryContainer', tx.categoryId);
  
  // Show/hide recurring fields based on transaction type
  const recurringFields = document.getElementById('editRecurringFields');
  if (tx.recurring) {
    recurringFields.style.display = 'block';
    document.getElementById('editPeriod').value = tx.period || 'monthly';
    document.getElementById('editEndDate').value = tx.endDate || '';
  } else {
    recurringFields.style.display = 'none';
  }
  
  // Show the modal
  modal.style.display = 'block';
}

// Delete a transaction
function deleteTransaction(index) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions.splice(index, 1);
    updateTransactionsTable();
    markUnsavedChanges();
  }
}

// Load from Firestore
function loadFromFirestore() {
  import('./firebase-config.js').then(({ onSnapshot }) => {
    onSnapshot(fsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        // Clear transactions array and add all items from Firestore
        clearTransactions(); // Use helper instead of transactions.length = 0
        const firestoreData = docSnap.data().transactions || [];
        firestoreData.forEach(tx => addTransaction(tx)); // Use helper instead of transactions.push(tx)
        updateTransactionsTable();
        // Use helper function instead of direct assignment
        setUnsavedChanges(false);
      } else {
        clearTransactions();
        setDoc(fsDocRef, { transactions: [] });
      }
    }, (error) => {
      console.error("Cloud snapshot error: ", error);
    });
  });
}

// Save to Firestore
async function saveToFirestore() {
  try {
    // Sanitize transactions data to remove any undefined values
    const sanitizedTransactions = transactions.map(tx => {
      // Create a new object with all properties from the transaction
      const sanitized = {};
      Object.keys(tx).forEach(key => {
        // Only include properties with defined values
        if (tx[key] !== undefined) {
          sanitized[key] = tx[key];
        } else {
          // Replace undefined with null or empty string as appropriate
          sanitized[key] = key === 'endDate' || key === 'period' || key === 'categoryId' ? null : '';
        }
      });
      return sanitized;
    });

    await setDoc(fsDocRef, { transactions: sanitizedTransactions });
    showToast('Saved to Cloud successfully.');
    setUnsavedChanges(false);
  } catch (err) {
    console.error("Firestore error:", err);
    showToast(`Error saving to Cloud: ${err.code} - ${err.message}`);
  }
}

// Save both categories and transactions to Firestore
async function saveAllToFirestore() {
  try {
    // Save categories first
    try {
      await setDoc(fsCategoriesDocRef, { categories });
      
      // Then save transactions
      const sanitizedTransactions = transactions.map(tx => {
        // Create a new object with all properties from the transaction
        const sanitized = {};
        Object.keys(tx).forEach(key => {
          // Only include properties with defined values
          if (tx[key] !== undefined) {
            sanitized[key] = tx[key];
          } else {
            // Replace undefined with null or empty string as appropriate
            sanitized[key] = key === 'endDate' || key === 'period' || key === 'categoryId' ? null : '';
          }
        });
        return sanitized;
      });

      await setDoc(fsDocRef, { transactions: sanitizedTransactions });
      showToast('All data saved to Cloud successfully.');
      setUnsavedChanges(false);
    } catch (err) {
      console.error("Error in saveAllToFirestore:", err);
      showToast(`Error saving data: ${err.message}`);
    }
  } catch (err) {
    console.error("Firestore error:", err);
    showToast(`Error saving to Cloud: ${err.message}`);
  }
}

// Rebase functionality - sets a new starting balance and hides old transactions
function rebaseTransactions() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to beginning of day
  const todayStr = formatDate(today);
  
  // Prompt the user for a new starting balance
  const newBalanceStr = prompt("Enter new starting balance:", "0.00");
  if (newBalanceStr === null) return; // User canceled
  
  // Parse and validate the new balance
  const newBalance = parseFloat(newBalanceStr);
  if (isNaN(newBalance)) {
    showToast("Please enter a valid number for the starting balance.");
    return;
  }
  
  // Process transactions
  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    txDate.setHours(0, 0, 0, 0);
    
    if (!tx.recurring && txDate < today) {
      // Hide non-recurring transactions before today
      tx.hidden = true;
    }
    // We don't modify recurring transaction dates - they'll maintain their original schedule
  });
  
  // Add a new starting balance transaction
  const rebaseTransaction = {
    description: "Starting Balance (Rebase)",
    date: todayStr,
    amount: newBalance,
    recurring: false,
    period: null,
    hidden: false,
    categoryId: 'income' // Default to income category
  };
  
  addTransaction(rebaseTransaction);
  updateTransactionsTable();
  markUnsavedChanges();
  showToast("Account rebased with new starting balance. Recurring transactions maintain their original schedule.");
}

// Update transactions table when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Default to grouped by category view as requested
  const toggleBtn = document.getElementById('toggleGroupCategoriesBtn');
  if (toggleBtn) {
    toggleBtn.innerHTML = '<i class="fas fa-list"></i> Show by Date';
  }
  updateTransactionsTable();
});

// Export functions
export { 
  updateTransactionsTable, 
  editTransaction, 
  deleteTransaction, 
  loadFromFirestore, 
  saveToFirestore, 
  saveAllToFirestore,
  rebaseTransactions, 
  toggleHiddenTransactions,
  toggleGroupByCategory
};
