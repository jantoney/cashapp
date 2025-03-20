import { transactions, showToast, formatCurrency, markUnsavedChanges, unsavedChanges, updateUnsavedBanner, clearTransactions, addTransaction, setUnsavedChanges } from './utils.js';
import { fsDocRef, setDoc } from './firebase-config.js';
import { drawGraph } from './chart.js';

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
            
            <div id="editRecurringFields">
              <div class="form-group">
                <label for="editPeriod">Recurrence</label>
                <select id="editPeriod" class="form-control">
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
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
      hidden: tx.hidden 
    };
  } else {
    transactions[index] = { 
      description: description, 
      date: date, 
      amount: finalAmount, 
      recurring: false, 
      period: null, 
      hidden: tx.hidden 
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
  
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
  const tbody = document.getElementById('transactionTableBody');
  tbody.innerHTML = '';
  transactions.forEach((tx, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tx.description}</td>
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
          sanitized[key] = key === 'endDate' || key === 'period' ? null : '';
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

export { updateTransactionsTable, editTransaction, deleteTransaction, loadFromFirestore, saveToFirestore };
