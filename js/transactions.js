import { transactions, showToast, formatCurrency, markUnsavedChanges, unsavedChanges, updateUnsavedBanner, clearTransactions, addTransaction, setUnsavedChanges } from './utils.js';
import { fsDocRef, setDoc } from './firebase-config.js';
import { drawGraph } from './chart.js';

// Update transactions table
function updateTransactionsTable() {
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

// Edit a transaction
function editTransaction(index) {
  const tx = transactions[index];
  const newDescription = prompt("Edit description:", tx.description);
  if (newDescription === null) return;
  const newDate = prompt("Edit date (YYYY-MM-DD):", tx.date);
  if (newDate === null) return;
  const newAmount = prompt("Edit amount:", Math.abs(tx.amount));
  if (newAmount === null) return;
  let newAmountNum = parseFloat(newAmount);
  if (isNaN(newAmountNum)) { showToast("Invalid amount."); return; }
  const newType = prompt("Enter type ('in' for Money In, 'out' for Money Out):", (tx.amount < 0) ? "out" : "in");
  if (newType === null || (newType !== "in" && newType !== "out")) { showToast("Invalid type."); return; }
  newAmountNum = (newType === "out") ? -Math.abs(newAmountNum) : Math.abs(newAmountNum);
  if (tx.recurring) {
    const newPeriod = prompt("Edit period (weekly, fortnightly, monthly):", tx.period);
    if (newPeriod === null) return;
    const newEndDate = prompt("Edit end date (YYYY-MM-DD, leave empty if none):", tx.endDate || "");
    transactions[index] = { 
      description: newDescription, 
      date: newDate, 
      endDate: newEndDate, 
      amount: newAmountNum, 
      recurring: true, 
      period: newPeriod, 
      hidden: tx.hidden 
    };
  } else {
    transactions[index] = { 
      description: newDescription, 
      date: newDate, 
      amount: newAmountNum, 
      recurring: false, 
      period: null, 
      hidden: tx.hidden 
    };
  }
  updateTransactionsTable();
  markUnsavedChanges();
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
