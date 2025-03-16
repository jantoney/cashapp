import { transactions, formatCurrency } from './utils.js';

// Function to format numbers in a more readable form (k, M, etc.)
function formatYAxisLabel(value) {
  if (value === 0) return '$0';
  
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  } else if (absValue >= 1000) {
    return (value / 1000).toFixed(1) + 'k';
  }
  
  return value.toString();
}

// Draw or update the cashflow graph
let chart = null;
function drawGraph() {
  const startDateInput = document.getElementById('graphStartDate').value;
  const endDateInput = document.getElementById('graphEndDate').value;
  if (!startDateInput || !endDateInput) {
    showToast('Please select start and end dates for the graph.');
    return;
  }
  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);
  const dates = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  const cashflow = dates.map(date => ({ date: new Date(date), value: 0 }));
  
  transactions.forEach(tx => {
    if (tx.hidden) return;
    if (tx.recurring) {
      let recDate = new Date(tx.date);
      // Check if the transaction has an end date
      const hasEndDate = tx.endDate && tx.endDate.trim() !== '';
      const txEndDate = hasEndDate ? new Date(tx.endDate) : null;
      
      while (recDate < startDate) {
        if (tx.period === 'weekly') recDate.setDate(recDate.getDate() + 7);
        else if (tx.period === 'fortnightly') recDate.setDate(recDate.getDate() + 14);
        else if (tx.period === 'monthly') recDate.setMonth(recDate.getMonth() + 1);
      }
      
      for (let d = new Date(recDate); d <= endDate;) {
        // Check if we've passed the transaction's end date
        if (hasEndDate && d > txEndDate) break;
        
        cashflow.forEach(item => {
          if (item.date.toDateString() === d.toDateString()) item.value += tx.amount;
        });
        
        if (tx.period === 'weekly') d.setDate(d.getDate() + 7);
        else if (tx.period === 'fortnightly') d.setDate(d.getDate() + 14);
        else if (tx.period === 'monthly') d.setMonth(d.getMonth() + 1);
      }
    } else {
      const txDate = new Date(tx.date);
      if (txDate >= startDate && txDate <= endDate) {
        cashflow.forEach(item => {
          if (item.date.toDateString() === txDate.toDateString()) item.value += tx.amount;
        });
      }
    }
  });
  
  // Generate cumulative data - calculating running balance
  const cumulative = [];
  let total = 0;
  cashflow.forEach(item => { 
    total += item.value; 
    cumulative.push(total); 
  });
  
  // Optimize data points - remove unchanged values (where value is the same as previous)
  const optimizedLabels = [];
  const optimizedData = [];
  let lastValue = null;
  
  dates.forEach((date, index) => {
    const value = cumulative[index];
    
    // Always include the first point or if the value has changed
    if (lastValue === null || value !== lastValue) {
      optimizedLabels.push(date.toISOString().split('T')[0]);
      optimizedData.push(value);
      lastValue = value;
    }
  });
  
  // Draw the chart
  const ctx = document.getElementById('cashflowChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: optimizedLabels,
      datasets: [{
        label: 'Cumulative Cashflow',
        data: optimizedData,
        fill: false,
        borderColor: 'blue'
      }]
    },
    options: {
      scales: {
        x: { type: 'time', time: { unit: 'day' } },
        y: { 
          ticks: {
            callback: formatYAxisLabel
          }
        }
      },
      plugins: {
        annotation: {
          annotations: {
            zeroLine: {
              type: 'line',
              yMin: 0,
              yMax: 0,
              borderColor: 'red',
              borderWidth: 2,
              label: { enabled: true, content: '$0', position: 'start' }
            }
          }
        }
      }
    }
  });
  
  // Populate the monthly balance table
  populateMonthlyBalanceTable(startDate, endDate, cashflow, cumulative);
}

// New function to populate monthly balance table
function populateMonthlyBalanceTable(startDate, endDate, cashflow, cumulative) {
  const tableBody = document.getElementById('monthlyBalanceTable').querySelector('tbody');
  tableBody.innerHTML = '';
  
  // Start with the first actual value instead of zero
  const initialDate = new Date(startDate);
  const formattedInitialDate = initialDate.toLocaleDateString('default', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const initialBalance = cumulative[0] || 0;
  const initialRow = document.createElement('tr');
  initialRow.innerHTML = `
    <td><strong>${formattedInitialDate}</strong></td>
    <td>${formatCurrency(initialBalance)}</td>
  `;
  tableBody.appendChild(initialRow);
  
  // Generate a row for each month's end date
  let currentDate = new Date(startDate);
  let currentIndex = 0;
  
  while (currentDate <= endDate) {
    // Get the last day of the current month
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // If the last day is beyond our end date, use the end date
    if (lastDay > endDate) {
      lastDay.setTime(endDate.getTime());
    }
    
    // Skip the first month if the start date is the last day of that month
    if (lastDay.getTime() === initialDate.getTime()) {
      // Move to the first day of the next month
      currentDate = new Date(lastDay.getFullYear(), lastDay.getMonth() + 1, 1);
      continue;
    }
    
    // Find the corresponding index in our data array
    while (currentIndex < cumulative.length && 
           new Date(cashflow[currentIndex].date).getTime() < lastDay.getTime()) {
      currentIndex++;
    }
    
    // If we went one too far, go back one
    if (currentIndex > 0 && (currentIndex >= cumulative.length || 
        new Date(cashflow[currentIndex].date).getTime() > lastDay.getTime())) {
      currentIndex--;
    }
    
    const balance = currentIndex < cumulative.length ? cumulative[currentIndex] : initialBalance;
    const formattedDate = lastDay.toLocaleDateString('default', {
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    });
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${formatCurrency(balance)}</td>
    `;
    tableBody.appendChild(row);
    
    // Move to the first day of the next month
    currentDate = new Date(lastDay.getFullYear(), lastDay.getMonth() + 1, 1);
  }
}

export { drawGraph };
