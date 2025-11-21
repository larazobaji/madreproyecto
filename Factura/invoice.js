const clientNameInput = document.getElementById('client-name');
const invoiceDateInput = document.getElementById('invoice-date');
const sellerInput = document.getElementById('seller');
const invoiceTableBody = document.getElementById('invoice-table-body');
const addRowButton = document.getElementById('add-row');
const clearAllButton = document.getElementById('clear-all');
const downloadPdfButton = document.getElementById('download-pdf');
const downloadJpgButton = document.getElementById('download-jpg');
const statusMessage = document.getElementById('status-message');

const previewClientName = document.getElementById('preview-client-name');
const previewDate = document.getElementById('preview-date');
const previewSeller = document.getElementById('preview-seller');

const CURRENT_INVOICE_KEY = 'invoiceData';
const MAX_ROWS_PAGE_1 = 12;
const MAX_ROWS_REST = 20;

const today = new Date();
invoiceDateInput.value = today.toISOString().split('T')[0];
previewDate.textContent = formatDate(today);

function formatDate(date) {
    if (!date || isNaN(new Date(date).getTime())) return '[Fecha]';
    const d = new Date(date);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return d.toLocaleDateString('es-ES', options);
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;

    setTimeout(() => {
        statusMessage.textContent = 'Los datos se guardan automáticamente';
        statusMessage.className = 'status-message info';
    }, 3000);
}

function addTableRow() {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" class="table-input" data-field="code" placeholder="Código"></td>
        <td><input type="text" class="table-input" data-field="quantity" placeholder="Cantidad"></td>
        <td><input type="text" class="table-input" data-field="detail" placeholder="Detalle"></td>
        <td><input type="text" class="table-input" data-field="observations" placeholder="Observaciones"></td>
    `;
    invoiceTableBody.appendChild(newRow);

    const inputs = newRow.querySelectorAll('.table-input');
    inputs.forEach(input => {
        input.addEventListener('input', saveToLocalStorage);
        input.addEventListener('keydown', handleEnterKey);
    });

    saveToLocalStorage();
}

function handleEnterKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const currentRow = e.target.closest('tr');
        const rows = Array.from(invoiceTableBody.querySelectorAll('tr'));
        const isLastRow = rows.indexOf(currentRow) === rows.length - 1;

        if (isLastRow) {
            addTableRow();
            const lastRow = invoiceTableBody.lastElementChild;
            const firstInput = lastRow.querySelector('input');
            firstInput.focus();
        } else {
            const inputs = Array.from(currentRow.querySelectorAll('input'));
            const currentInputIndex = inputs.indexOf(e.target);

            if (currentInputIndex < inputs.length - 1) {
                inputs[currentInputIndex + 1].focus();
            } else {
                const nextRow = rows[rows.indexOf(currentRow) + 1];
                if (nextRow) {
                    nextRow.querySelector('input').focus();
                }
            }
        }
    }
}

function clearAllData() {
    if (confirm('¿Está seguro de que desea limpiar todos los datos?')) {
        clientNameInput.value = '';
        sellerInput.value = '';
        invoiceDateInput.value = today.toISOString().split('T')[0];

        previewClientName.textContent = '[Nombre del cliente]';
        previewSeller.textContent = '[Vendedora]';
        previewDate.textContent = formatDate(today);

        invoiceTableBody.innerHTML = '';
        addTableRow();

        localStorage.removeItem(CURRENT_INVOICE_KEY);
        showStatus('Todos los datos han sido eliminados', 'success');
    }
}

function saveToLocalStorage() {
    const invoiceData = {
        clientName: clientNameInput.value,
        date: invoiceDateInput.value,
        seller: sellerInput.value,
        items: []
    };

    const rows = invoiceTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const item = {
            code: inputs[0].value,
            quantity: inputs[1].value,
            detail: inputs[2].value,
            observations: inputs[3].value
        };
        invoiceData.items.push(item);
    });

    localStorage.setItem(CURRENT_INVOICE_KEY, JSON.stringify(invoiceData));
    showStatus('Datos guardados automáticamente', 'info');
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem(CURRENT_INVOICE_KEY);
    if (savedData) {
        const invoiceData = JSON.parse(savedData);

        clientNameInput.value = invoiceData.clientName || '';
        invoiceDateInput.value = invoiceData.date || today.toISOString().split('T')[0];
        sellerInput.value = invoiceData.seller || '';

        previewClientName.textContent = invoiceData.clientName || '[Nombre del cliente]';
        previewSeller.textContent = invoiceData.seller || '[Vendedora]';

        if (invoiceData.date) {
            const date = new Date(invoiceData.date);
            previewDate.textContent = formatDate(date);
        }

        if (invoiceData.items && invoiceData.items.length > 0) {
            invoiceTableBody.innerHTML = '';
            invoiceData.items.forEach(item => {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td><input type="text" class="table-input" data-field="code" value="${item.code || ''}" placeholder="Código"></td>
                    <td><input type="text" class="table-input" data-field="quantity" value="${item.quantity || ''}" placeholder="Cantidad"></td>
                    <td><input type="text" class="table-input" data-field="detail" value="${item.detail || ''}" placeholder="Detalle"></td>
                    <td><input type="text" class="table-input" data-field="observations" value="${item.observations || ''}" placeholder="Observaciones"></td>
                `;
                invoiceTableBody.appendChild(newRow);
            });
        }
    }

    const tableInputs = document.querySelectorAll('.table-input');
    tableInputs.forEach(input => {
        input.addEventListener('input', saveToLocalStorage);
        input.addEventListener('keydown', handleEnterKey);
    });

    if (invoiceTableBody.children.length === 0) {
        addTableRow();
    }

    showStatus('Datos cargados automáticamente', 'success');
}

function generateMultiPageHtml(invoiceData) {
    const items = invoiceData.items.filter(item =>
        item.code || item.quantity || item.detail || item.observations
    );

    let totalPages = 0;
    let remainingItems = items.length;

    if (remainingItems > 0) {
        totalPages = 1;
        remainingItems -= MAX_ROWS_PAGE_1;

        if (remainingItems > 0) {
            totalPages += Math.ceil(remainingItems / MAX_ROWS_REST);
        }
    } else {
        return '';
    }

    let htmlContent = '';
    let itemIndex = 0;

    const mainHeaderHtml = document.querySelector('.invoice-main-header').outerHTML;
    const detailHtmlTemplate = document.querySelector('.invoice-details').outerHTML;
    const tableHeaderHtml = document.querySelector('.invoice-table thead').outerHTML;

    const clientName = invoiceData.clientName || '[Nombre del cliente]';
    const dateStr = formatDate(invoiceData.date);
    const seller = invoiceData.seller || '[Vendedora]';

    for (let page = 0; page < totalPages; page++) {
        const isFirstPage = (page === 0);
        const maxRows = isFirstPage ? MAX_ROWS_PAGE_1 : MAX_ROWS_REST;

        const pageItems = items.slice(itemIndex, itemIndex + maxRows);
        itemIndex += pageItems.length;

        let tableBodyHtml = '<tbody>';

        pageItems.forEach(item => {
            tableBodyHtml += `
                <tr>
                    <td>${item.code || '&nbsp;'}</td>
                    <td>${item.quantity || '&nbsp;'}</td>
                    <td>${item.detail || '&nbsp;'}</td>
                    <td>${item.observations || '&nbsp;'}</td>
                </tr>
            `;
        });

        if (page === totalPages - 1) {
            const emptyRows = maxRows - pageItems.length;
            for (let i = 0; i < emptyRows; i++) {
                tableBodyHtml += `
                    <tr>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>
                `;
            }
        }

        tableBodyHtml += '</tbody>';

        let headerContent = '';
        let detailContent = '';
        let pageNumberHtml = '';
        let pageClass = '';

        if (isFirstPage) {
            headerContent = mainHeaderHtml;
            detailContent = detailHtmlTemplate
                .replace('[Nombre del cliente]', clientName)
                .replace('[Fecha]', dateStr)
                .replace('[Vendedora]', seller);
            pageNumberHtml = `<p style="text-align: right; margin-bottom: 5px; margin-top: 0; font-size: 12px;">Página ${page + 1} de ${totalPages}</p>`;
            pageClass = '';
        } else {
            // Páginas subsiguientes: Solo tabla y número de página.
            headerContent = `<div style="height: 10px;"></div>`;
            detailContent = `<div style="height: 10px; margin-bottom: 0;"></div>`;
            pageNumberHtml = `<p style="text-align: right; margin-bottom: 5px; margin-top: 0; font-size: 12px;">Página ${page + 1} de ${totalPages}</p>`;
            pageClass = 'page-content-only';
        }

        const pageHtml = `
            <div class="invoice-page ${pageClass}" style="width: 210mm; min-height: 297mm; padding: 20mm; background-color: white; color: #000; font-family: Arial, sans-serif;">
                ${headerContent}
                ${detailContent}
                
                ${pageNumberHtml}

                <table class="invoice-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; color: #000; font-size: 14px; margin-top: 0;">
                    ${tableHeaderHtml}
                    ${tableBodyHtml}
                </table>
            </div>
        `;
        htmlContent += pageHtml;
    }

    return htmlContent;
}

async function downloadAsPDF() {
    const { jsPDF } = window.jspdf;
    const invoiceData = {
        clientName: clientNameInput.value,
        date: invoiceDateInput.value,
        seller: sellerInput.value,
        items: []
    };

    // Recolectar datos antes de generar el HTML multipágina (esto ya se hace en saveToLocalStorage, pero lo repito para seguridad)
    const rows = invoiceTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const item = {
            code: inputs[0].value,
            quantity: inputs[1].value,
            detail: inputs[2].value,
            observations: inputs[3].value
        };
        if (Object.values(item).some(val => (val || '').trim() !== '')) {
            invoiceData.items.push(item);
        }
    });

    if (invoiceData.items.length === 0) {
        showStatus('No hay productos para generar el PDF.', 'danger');
        return;
    }

    const multiPageHtml = generateMultiPageHtml(invoiceData);

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm';
    tempContainer.innerHTML = multiPageHtml;
    document.body.appendChild(tempContainer);

    const pages = tempContainer.querySelectorAll('.invoice-page');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;

    try {
        for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i];

            const canvas = await html2canvas(pageElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: 794,
            });

            const imgData = canvas.toDataURL('image/png');

            if (i > 0) {
                pdf.addPage();
            }

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`factura-${invoiceData.clientName || 'cliente'}.pdf`);
        showStatus('PDF descargado correctamente', 'success');

    } catch (error) {
        console.error('Error al generar PDF:', error);
        showStatus('Error al generar el PDF', 'danger');
    } finally {
        document.body.removeChild(tempContainer);
    }
}

async function downloadAsJPG() {
    const element = document.getElementById('invoice-preview');

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        const link = document.createElement('a');
        link.download = `factura-${clientNameInput.value || 'cliente'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();

        showStatus('JPG descargado correctamente', 'success');
    } catch (error) {
        console.error('Error al generar JPG:', error);
        showStatus('Error al generar el JPG', 'danger');
    }
}

clientNameInput.addEventListener('input', function () {
    previewClientName.textContent = this.value || '[Nombre del cliente]';
    saveToLocalStorage();
});

invoiceDateInput.addEventListener('change', function () {
    const date = new Date(this.value);
    previewDate.textContent = formatDate(date);
    saveToLocalStorage();
});

sellerInput.addEventListener('input', function () {
    previewSeller.textContent = this.value || '[Vendedora]';
    saveToLocalStorage();
});

addRowButton.addEventListener('click', addTableRow);
clearAllButton.addEventListener('click', clearAllData);
downloadPdfButton.addEventListener('click', downloadAsPDF);
downloadJpgButton.addEventListener('click', downloadAsJPG);

const initialTableInputs = document.querySelectorAll('.table-input');
initialTableInputs.forEach(input => {
    input.addEventListener('input', saveToLocalStorage);
    input.addEventListener('keydown', handleEnterKey);
});

document.addEventListener('DOMContentLoaded', loadFromLocalStorage);

setInterval(saveToLocalStorage, 10000);