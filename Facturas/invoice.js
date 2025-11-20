// Referencias a elementos DOM
const clientNameInput = document.getElementById('client-name');
const invoiceDateInput = document.getElementById('invoice-date');
const sellerInput = document.getElementById('seller');
const invoiceTableBody = document.getElementById('invoice-table-body');
const addRowButton = document.getElementById('add-row');
const clearAllButton = document.getElementById('clear-all');
const downloadPdfButton = document.getElementById('download-pdf');
const downloadJpgButton = document.getElementById('download-jpg');
const statusMessage = document.getElementById('status-message');

// Elementos de vista previa
const previewClientName = document.getElementById('preview-client-name');
const previewDate = document.getElementById('preview-date');
const previewSeller = document.getElementById('preview-seller');

// Fecha de hoy
const today = new Date();

// --- Funciones Auxiliares ---

// Función para formatear fecha
function formatDate(date) {
    if (!date || isNaN(date.getTime())) {
        return '[Fecha]';
    }
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
}

// Mostrar mensaje de estado
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    
    setTimeout(() => {
        statusMessage.textContent = 'Los datos se guardan automáticamente';
        statusMessage.className = 'status-message info';
    }, 3000);
}

// --- Lógica de la Tabla y Almacenamiento ---

// Agregar nueva fila a la tabla
function addTableRow() {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" class="table-input" data-field="code" placeholder="Código"></td>
        <td><input type="text" class="table-input" data-field="quantity" placeholder="Cantidad"></td>
        <td><input type="text" class="table-input" data-field="detail" placeholder="Detalle"></td>
        <td><input type="text" class="table-input" data-field="observations" placeholder="Observaciones"></td>
    `;
    invoiceTableBody.appendChild(newRow);
    
    // Agregar event listeners a los nuevos inputs
    const inputs = newRow.querySelectorAll('.table-input');
    inputs.forEach(input => {
        input.addEventListener('input', saveToLocalStorage);
        input.addEventListener('keydown', handleEnterKey);
    });
    
    saveToLocalStorage();
}

// Manejar la tecla Enter en los inputs de la tabla
function handleEnterKey(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // Evitar el comportamiento predeterminado del formulario
        addTableRow();
        // Enfocar el primer input de la nueva fila
        const lastRow = invoiceTableBody.lastElementChild;
        const firstInput = lastRow.querySelector('input');
        firstInput.focus();
    }
}

// Limpiar todos los datos
function clearAllData() {
    if (confirm('¿Está seguro de que desea limpiar todos los datos?')) {
        clientNameInput.value = '';
        sellerInput.value = '';
        invoiceDateInput.value = today.toISOString().split('T')[0];
        
        previewClientName.textContent = '[Nombre del cliente]';
        previewSeller.textContent = '[Vendedora]';
        previewDate.textContent = formatDate(today);
        
        // Limpiar tabla excepto la primera fila
        invoiceTableBody.innerHTML = '';
        addTableRow(); // Añadir la fila inicial
        
        localStorage.removeItem('invoiceData');
        showStatus('Todos los datos han sido eliminados', 'success');
    }
}

// Guardar datos en localStorage
function saveToLocalStorage() {
    const invoiceData = {
        clientName: clientNameInput.value,
        date: invoiceDateInput.value,
        seller: sellerInput.value,
        items: []
    };
    
    // Recopilar datos de la tabla
    const rows = invoiceTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const item = {
            code: inputs[0].value,
            quantity: inputs[1].value,
            detail: inputs[2].value,
            observations: inputs[3].value
        };
        // Solo guardar si hay algún valor en la fila
        if (Object.values(item).some(val => val.trim() !== '')) {
            invoiceData.items.push(item);
        }
    });
    
    localStorage.setItem('invoiceData', JSON.stringify(invoiceData));
    showStatus('Datos guardados automáticamente', 'info');
}

// Cargar datos desde localStorage
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('invoiceData');
    
    // Valores predeterminados
    invoiceDateInput.value = today.toISOString().split('T')[0];
    previewDate.textContent = formatDate(today);

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
        
        // Cargar datos de la tabla
        invoiceTableBody.innerHTML = '';
        if (invoiceData.items && invoiceData.items.length > 0) {
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
    
    // Asegurar que siempre haya al menos una fila (o cargar la inicial si no hay datos)
    if (invoiceTableBody.children.length === 0) {
        addTableRow();
    }
    
    // Agregar event listeners a los inputs de la tabla (existentes y cargados)
    const tableInputs = document.querySelectorAll('.table-input');
    tableInputs.forEach(input => {
        input.addEventListener('input', saveToLocalStorage);
        input.addEventListener('keydown', handleEnterKey);
    });
    
    if (savedData) {
        showStatus('Datos cargados automáticamente', 'success');
    }
}

// --- Lógica de Generación de PDF (Paginación por 12 Filas) ---

// Función auxiliar para generar el HTML multi-página con paginación de 12 filas
function generateMultiPageInvoice(invoiceData) {
    const maxRowsPerPage = 12;
    // Filtrar items vacíos para la paginación
    const items = invoiceData.items.filter(item => 
        item.code || item.quantity || item.detail || item.observations
    );
    const totalPages = Math.ceil(items.length / maxRowsPerPage);
    let htmlContent = '';

    // Obtener la estructura HTML de la plantilla
    const headerHtml = document.querySelector('.invoice-header').outerHTML;
    const detailHtmlTemplate = document.querySelector('.invoice-details').outerHTML;
    const tableHeaderHtml = document.querySelector('.invoice-table thead').outerHTML;

    // Valores de datos fijos
    const clientName = invoiceData.clientName || '[Nombre del cliente]';
    const dateStr = formatDate(new Date(invoiceData.date));
    const seller = invoiceData.seller || '[Vendedora]';

    for (let page = 0; page < totalPages; page++) {
        const start = page * maxRowsPerPage;
        const end = start + maxRowsPerPage;
        const pageItems = items.slice(start, end);

        let tableBodyHtml = '<tbody>';
        
        // Agregar filas de datos para la página actual
        pageItems.forEach(item => {
            tableBodyHtml += `
                <tr>
                    <td>${item.code}</td>
                    <td>${item.quantity}</td>
                    <td>${item.detail}</td>
                    <td>${item.observations}</td>
                </tr>
            `;
        });

        // Rellenar con filas vacías solo en la última página para mantener el formato A4
        if (page === totalPages - 1) {
            const emptyRows = maxRowsPerPage - pageItems.length;
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

        // Reemplazar los valores en el HTML de detalles
        const detailHtml = detailHtmlTemplate
            .replace('[Nombre del cliente]', clientName)
            .replace('[Fecha]', dateStr)
            .replace('[Vendedora]', seller);

        // Estructura de la página de la factura
        const pageHtml = `
            <div class="invoice-page" style="width: 210mm; min-height: 297mm; padding: 20mm; background-color: white; color: #000; font-family: Arial, sans-serif;">
                ${headerHtml}
                ${detailHtml}
                
                <p style="text-align: right; margin-bottom: 5px; font-size: 12px;">Página ${page + 1} de ${totalPages}</p>

                <table class="invoice-table" style="width: 100%; border-collapse: collapse; margin-bottom: 20px; color: #000; font-size: 14px;">
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
    const savedData = localStorage.getItem('invoiceData');

    if (!savedData || JSON.parse(savedData).items.filter(item => Object.values(item).some(val => val.trim() !== '')).length === 0) {
        showStatus('No hay productos para generar la factura.', 'danger');
        return;
    }
    const invoiceData = JSON.parse(savedData);
    
    // 1. Generar el HTML multi-página basado en la división de 12 filas
    const multiPageHtml = generateMultiPageInvoice(invoiceData);
    
    // 2. Crear un contenedor temporal fuera de la vista para renderizar el HTML
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm'; // Asegurar que el ancho sea A4
    tempContainer.innerHTML = multiPageHtml;
    document.body.appendChild(tempContainer);

    const pages = tempContainer.querySelectorAll('.invoice-page');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297; 
    
    try {
        for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i];
            
            // Generar Canvas para cada página individual
            const canvas = await html2canvas(pageElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: 794, // Ancho forzado para A4 en px (~210mm)
            });
            
            const imgData = canvas.toDataURL('image/png');
            
            if (i > 0) {
                pdf.addPage();
            }

            // Agregar la imagen de la página al PDF
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
        
        // 4. Descargar
        pdf.save(`factura-${clientNameInput.value || 'cliente'}.pdf`);
        showStatus('PDF descargado correctamente', 'success');

    } catch (error) {
        console.error('Error al generar PDF:', error);
        showStatus('Error al generar el PDF', 'danger');
    } finally {
        // 5. Limpiar el contenedor temporal
        document.body.removeChild(tempContainer);
    }
}

// Descargar como JPG (usa la vista previa única, no la lógica de paginación)
async function downloadAsJPG() {
    const element = document.getElementById('invoice-preview');
    
    // Asegurar que la escala esté a 1 antes de la captura para dimensiones correctas
    const originalTransform = element.style.transform;
    element.style.transform = 'scale(1)';

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
    } finally {
        element.style.transform = originalTransform;
    }
}

// --- Event Listeners y Carga Inicial ---

// Inicializar la fecha y la vista previa
invoiceDateInput.value = today.toISOString().split('T')[0];
previewDate.textContent = formatDate(today);

// Event Listeners para los inputs de datos
clientNameInput.addEventListener('input', function() {
    previewClientName.textContent = this.value || '[Nombre del cliente]';
    saveToLocalStorage();
});

invoiceDateInput.addEventListener('change', function() {
    const date = new Date(this.value);
    previewDate.textContent = formatDate(date);
    saveToLocalStorage();
});

sellerInput.addEventListener('input', function() {
    previewSeller.textContent = this.value || '[Vendedora]';
    saveToLocalStorage();
});

// Event Listeners para botones
addRowButton.addEventListener('click', addTableRow);
clearAllButton.addEventListener('click', clearAllData);
downloadPdfButton.addEventListener('click', downloadAsPDF);
downloadJpgButton.addEventListener('click', downloadAsJPG);

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', loadFromLocalStorage);

// Guardar automáticamente cada 10 segundos
setInterval(saveToLocalStorage, 10000);