import { showToast, formatDate, markUnsavedChanges, transactions, setDefaultGraphDates, clearTransactions, addTransaction, setUnsavedChanges } from './utils.js';
import { drawGraph } from './chart.js';
import { updateTransactionsTable, loadFromFirestore, saveToFirestore } from './transactions.js';
import { initializeAuth } from './auth.js';

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Set default dates for the graph
  setDefaultGraphDates();
  
  // Initialize authentication
  initializeAuth();

  // Event listeners for toggle buttons - Money In/Out for recurring transactions
  document.getElementById('recurringTypeIn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('recurringTypeOut').classList.remove('active');
  });

  document.getElementById('recurringTypeOut').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('recurringTypeIn').classList.remove('active');
  });

  // Event listeners for toggle buttons - Money In/Out for one-off transactions
  document.getElementById('oneoffTypeIn').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('oneoffTypeOut').classList.remove('active');
  });

  document.getElementById('oneoffTypeOut').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('oneoffTypeIn').classList.remove('active');
  });

  // Add recurring transaction
  document.getElementById('addRecurring').addEventListener('click', function() {
    const description = document.getElementById('recurringDesc').value;
    const startDate = document.getElementById('recurringStartDate').value;
    const endDate = document.getElementById('recurringEndDate').value;
    const period = document.getElementById('recurringPeriod').value;
    const amountInput = document.getElementById('recurringAmount').value;
    
    if (!description || !startDate || !amountInput) {
      showToast('Please fill in all required fields.');
      return;
    }
    
    const amount = parseFloat(amountInput);
    if (isNaN(amount)) {
      showToast('Please enter a valid amount.');
      return;
    }
    
    // Check if it's money in or out
    const isMoneyIn = document.getElementById('recurringTypeIn').classList.contains('active');
    const finalAmount = isMoneyIn ? Math.abs(amount) : -Math.abs(amount);
    
    // Add to transactions array
    transactions.push({
      description: description,
      date: startDate,
      endDate: endDate, // Include the end date
      amount: finalAmount,
      recurring: true,
      period: period,
      hidden: false
    });
    
    // Update UI
    updateTransactionsTable();
    markUnsavedChanges();
    
    // Clear form
    document.getElementById('recurringDesc').value = '';
    document.getElementById('recurringAmount').value = '';
    document.getElementById('recurringEndDate').value = '';
    
    showToast('Recurring transaction added.');
  });

  // Add one-off transaction
  document.getElementById('addOneoff').addEventListener('click', function() {
    const description = document.getElementById('oneoffDesc').value;
    const date = document.getElementById('oneoffDate').value;
    const amountInput = document.getElementById('oneoffAmount').value;
    
    if (!description || !date || !amountInput) {
      showToast('Please fill in all fields.');
      return;
    }
    
    const amount = parseFloat(amountInput);
    if (isNaN(amount)) {
      showToast('Please enter a valid amount.');
      return;
    }
    
    // Check if it's money in or out
    const isMoneyIn = document.getElementById('oneoffTypeIn').classList.contains('active');
    const finalAmount = isMoneyIn ? Math.abs(amount) : -Math.abs(amount);
    
    // Add to transactions array
    transactions.push({
      description: description,
      date: date,
      amount: finalAmount,
      recurring: false,
      period: null,
      hidden: false
    });
    
    // Update UI
    updateTransactionsTable();
    markUnsavedChanges();
    
    // Clear form
    document.getElementById('oneoffDesc').value = '';
    document.getElementById('oneoffAmount').value = '';
    
    showToast('One-off transaction added.');
  });

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
  document.getElementById('saveFirestore').addEventListener('click', saveToFirestore);
});
