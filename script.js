document.addEventListener('DOMContentLoaded', () => {
  let salesData = [];
  let transactionHistory = [];
  let expensesData = [];

  function formatearMiles(input) {
    let valor = input.value;
    valor = valor.replace(/\D/g, ""); 
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    input.value = valor;
  }

  const priceInput = document.getElementById('unit-price');
  if (priceInput) priceInput.addEventListener('input', () => formatearMiles(priceInput));

  const expenseInput = document.getElementById('expense-amount');
  if (expenseInput) expenseInput.addEventListener('input', () => formatearMiles(expenseInput));

  const salesForm = document.getElementById('sales-form');
  const expensesForm = document.getElementById('expenses-form'); 
  const salesTableBody = document.getElementById('sales-table-body');
  const historyTableBody = document.getElementById('history-table-body');
  const dailySalesTotalElement = document.getElementById('daily-sales-total'); 
  const dailyTotalFooter = document.getElementById('daily-total'); 
  const totalProductsSoldElement = document.getElementById('total-products-sold');
  const totalRefundsElement = document.getElementById('total-refunds');
  const clearFormButton = document.getElementById('clear-form');
  const searchSalesInput = document.getElementById('search-sales');
  const exportExcelBtn = document.getElementById('export-excel-btn');
  const clearSalesBtn = document.getElementById('clear-sales');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const alertContainer = document.getElementById('alert-container');

  loadFromLocalStorage();
  updateSalesTable();
  updateTransactionHistory();
  updateSummary();

  if (salesForm) {
    salesForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const productName = document.getElementById('product-name').value.trim();
      const paymentMethod = (document.getElementById('payment-method') && document.getElementById('payment-method').value) || 'N/A';

      const unitPriceRaw = document.getElementById('unit-price').value;
      const unitPrice = Number(unitPriceRaw.replace(/\./g, "")); 

      const quantity = parseInt(document.getElementById('quantity').value, 10);

      if (!productName || isNaN(unitPrice) || isNaN(quantity) || quantity <= 0 || unitPrice <= 0) {
        showAlert('Completa correctamente el formulario de venta.', 'warning');
        return;
      }

      const sale = {
        id: Date.now(),
        productName,
        paymentMethod,
        unitPrice,
        quantity,
        total: unitPrice * quantity,
        date: new Date().toISOString(),
        refunded: false
      };

      salesData.push(sale);
      transactionHistory.push({ ...sale, type: 'Venta' });

      updateSalesTable();
      updateTransactionHistory();
      updateSummary();
      saveToLocalStorage();
      showAlert('Venta registrada correctamente', 'success');

      salesForm.reset();
      document.getElementById('quantity').value = 1;
    });
  }

  if (expensesForm) {
    // Formatear el valor del gasto con puntos
const expenseAmountInput = document.getElementById("expense-amount");

expenseAmountInput.addEventListener("input", function () {
    let raw = this.value.replace(/\./g, "");

    // Solo números
    if (!/^\d*$/.test(raw)) return;

    // Formatear con puntos
    if (raw !== "") {
        this.value = new Intl.NumberFormat("es-CO").format(raw);
    } else {
        this.value = "";
    }
});

    expensesForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const descriptionEl = document.getElementById('expense-description');
      const amountEl = document.getElementById('expense-amount');
      const description = descriptionEl ? descriptionEl.value.trim() : '';

      const amountRaw = amountEl.value;
      const amount = Number(amountRaw.replace(/\./g, "")); 

      if (!description || isNaN(amount) || amount <= 0) {
        showAlert('Ingresa una descripción y un valor válido para el gasto', 'warning');
        return;
      }

      const expense = {
        id: Date.now(),
        type: 'Gasto',
        description,
        total: amount,
        date: new Date().toISOString()
      };

      expensesData.push(expense);
      transactionHistory.push(expense);

      updateTransactionHistory();
      updateSummary();
      saveToLocalStorage();
      showAlert('Gasto registrado correctamente', 'info');

      expensesForm.reset();
    });
  }

  if (clearFormButton) {
    clearFormButton.addEventListener('click', () => {
      if (salesForm) salesForm.reset();
      const q = document.getElementById('quantity');
      if (q) q.value = 1;
    });
  }

  if (searchSalesInput) {
    searchSalesInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      updateSalesTable(term);
    });
  }

if (exportExcelBtn) {
  exportExcelBtn.addEventListener('click', () => {
    if (salesData.length === 0 && transactionHistory.length === 0 && expensesData.length === 0) {
      showAlert('No hay datos para exportar', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();

    const wsSalesData = [
      ['Producto', 'Método de Pago', 'Precio', 'Cantidad', 'Total', 'Estado']
    ];

    salesData.forEach(s => {
      wsSalesData.push([
        s.productName,
        s.paymentMethod || 'N/A',
        formatMoney(s.unitPrice),   
        s.quantity,
        formatMoney(s.total),       
        s.refunded ? 'Reembolsado' : 'Activo'
      ]);
    });

    wsSalesData.push([]);
    wsSalesData.push([
      'TOTAL VENTAS', '', '', '',
      formatMoney(salesData.filter(s => !s.refunded).reduce((a, s) => a + s.total, 0)),
      ''
    ]);

    const wsSales = XLSX.utils.aoa_to_sheet(wsSalesData);

    Object.keys(wsSales).forEach(key => {
      if (wsSales[key].v) wsSales[key].t = 's';
    });

    XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas');

    const totalVentas = salesData.filter(s => !s.refunded).reduce((a, s) => a + s.total, 0);
    const totalGastos = expensesData.reduce((a, g) => a + g.total, 0);
    const totalReembolsos = salesData.filter(s => s.refunded).reduce((a, s) => a + s.total, 0);
    const resultadoFinal = totalVentas - totalGastos;

    const wsSummaryData = [
      ['Resumen Diario'],
      [],
      ['Concepto', 'Valor'],
      ['Total Ventas', formatMoney(totalVentas)],
      ['Total Reembolsos', formatMoney(totalReembolsos)],
      ['Total Gastos', formatMoney(totalGastos)],
      [],
      ['Resultado Final del Día', formatMoney(resultadoFinal)]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);

    Object.keys(wsSummary).forEach(key => {
      if (wsSummary[key].v) wsSummary[key].t = 's';
    });

    wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Diario');


    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_comercial_${date}.xlsx`);

    showAlert('Archivo Excel generado con puntos correctamente', 'success');
  });
}

function formatMoney(num) {
  return num.toLocaleString('es-CO');
}

  if (clearSalesBtn) {
    clearSalesBtn.addEventListener('click', () => {
      if (!confirm('¿Seguro que quieres eliminar TODAS las ventas?')) return;
      salesData = [];
      transactionHistory = transactionHistory.filter(t => t.type !== 'Venta');
      updateSalesTable();
      updateSummary();
      saveToLocalStorage();
      showAlert('Ventas eliminadas correctamente', 'warning');
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (!confirm('¿Seguro que quieres eliminar TODO el historial?')) return;
      transactionHistory = [];
      expensesData = []; 
      updateTransactionHistory();
      updateSummary();
      saveToLocalStorage();
      showAlert('Historial eliminado correctamente', 'info');
    });
  }

  function updateSalesTable(filter = '') {
    if (!salesTableBody) return;
    salesTableBody.innerHTML = '';
    const filtered = filter
      ? salesData.filter(s => (s.productName || '').toLowerCase().includes(filter) || (s.paymentMethod || '').toLowerCase().includes(filter))
      : salesData;

    if (filtered.length === 0) {
      salesTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay ventas registradas</td></tr>`;
      return;
    }

    let dailyTotal = 0;
    filtered.forEach(sale => {
      if (!sale.refunded) dailyTotal += sale.total;
      const tr = document.createElement('tr');
      tr.className = sale.refunded ? 'bg-red-50' : 'hover:bg-gray-50';
      tr.innerHTML = `
        <td class="${sale.refunded ? 'line-through text-gray-400' : ''}">${sale.productName}</td>
        <td class="${sale.refunded ? 'line-through text-gray-400' : ''}">${sale.paymentMethod || 'N/A'}</td>
        <td>$${sale.unitPrice.toLocaleString('es-CO')}</td>
        <td>${sale.quantity}</td>
        <td>$${sale.total.toLocaleString('es-CO')}</td>
        <td>
          ${sale.refunded ? '<span class="text-red-600">Reembolsado</span>' : `
            <button class="text-blue-600 refund-btn" data-id="${sale.id}"><i class="fas fa-undo-alt"></i> Reembolsar</button>
            <button class="text-red-600 delete-btn ml-3" data-id="${sale.id}"><i class="fas fa-trash-alt"></i></button>
          `}
        </td>
      `;
      salesTableBody.appendChild(tr);
    });

    if (dailySalesTotalElement) dailySalesTotalElement.textContent = `$${dailyTotal.toLocaleString('es-CO')}`;

    document.querySelectorAll('.refund-btn').forEach(b => b.onclick = handleRefund);
    document.querySelectorAll('.delete-btn').forEach(b => b.onclick = handleDelete);
  }

  function handleRefund(e) {
    const id = +e.target.closest('button').dataset.id;
    const sale = salesData.find(s => s.id === id);
    if (sale && !sale.refunded) {
      sale.refunded = true;
      transactionHistory.push({ ...sale, type: 'Reembolso', date: new Date().toISOString() });
      updateSalesTable();
      updateTransactionHistory();
      updateSummary();
      saveToLocalStorage();
      showAlert('Reembolso realizado', 'info');
    }
  }

  function handleDelete(e) {
    if (!confirm('¿Eliminar esta venta?')) return;
    const id = +e.target.closest('button').dataset.id;
    salesData = salesData.filter(s => s.id !== id);
    transactionHistory = transactionHistory.filter(t => !(t.type === 'Venta' && t.id === id));
    updateSalesTable();
    updateTransactionHistory();
    updateSummary();
    saveToLocalStorage();
    showAlert('Venta eliminada', 'warning');
  }

  function updateTransactionHistory() {
    if (!historyTableBody) return;
    historyTableBody.innerHTML = '';
    if (transactionHistory.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay transacciones</td></tr>`;
      return;
    }

    transactionHistory.slice().reverse().forEach(t => {
      const d = new Date(t.date);
      const typeColor =
        t.type === 'Venta' ? 'bg-green-100 text-green-700' :
        t.type === 'Reembolso' ? 'bg-blue-100 text-blue-700' :
        'bg-red-100 text-red-700';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</td>
        <td><span class="px-2 py-1 rounded text-xs ${typeColor}">${t.type}</span></td>
        <td>${t.productName || t.description || '-'}</td>
        <td>${t.paymentMethod || '-'}</td>
        <td>${t.quantity || '-'}</td>
        <td>$${t.total.toLocaleString('es-CO')}</td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  function updateSummary() {
    const sales = salesData.filter(s => !s.refunded);
    const refunds = salesData.filter(s => s.refunded);
    const expenses = expensesData || [];

    const totalSales = sales.reduce((a, s) => a + s.total, 0);
    const totalExpenses = expenses.reduce((a, e) => a + e.total, 0);
    const netTotal = totalSales - totalExpenses;
    const productsSold = sales.reduce((a, s) => a + s.quantity, 0);
    const refundsCount = refunds.length;

    if (dailySalesTotalElement) dailySalesTotalElement.textContent = `$${totalSales.toLocaleString('es-CO')}`;
    if (dailyTotalFooter) dailyTotalFooter.textContent = `$${netTotal.toLocaleString('es-CO')}`;
    if (totalProductsSoldElement) totalProductsSoldElement.textContent = productsSold;
    if (totalRefundsElement) totalRefundsElement.textContent = refundsCount;
  }

  function saveToLocalStorage() {
    localStorage.setItem('salesData', JSON.stringify(salesData));
    localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
    localStorage.setItem('expensesData', JSON.stringify(expensesData));
  }

  function loadFromLocalStorage() {
    salesData = JSON.parse(localStorage.getItem('salesData')) || [];
    transactionHistory = JSON.parse(localStorage.getItem('transactionHistory')) || [];
    expensesData = JSON.parse(localStorage.getItem('expensesData')) || [];
  }

  function showAlert(message, type = 'info') {
    if (!alertContainer) {
      alert(message);
      return;
    }
    const colors = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800',
      error: 'bg-red-100 text-red-800'
    };
    const alert = document.createElement('div');
    alert.className = `p-2 mb-2 rounded ${colors[type] || colors.info}`;
    alert.textContent = message;
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }

});
