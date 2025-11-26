/* ========================================
   BEER LICORERÍA - HISTORIAL DE VENTAS
   JavaScript para consulta de ventas
   ======================================== */

// ===== VARIABLES GLOBALES =====
let todasLasVentas = [];
let ventasFiltradas = [];

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Historial de ventas iniciado');
    inicializarFechas();
    cargarVentas();
});

// ===== INICIALIZAR FECHAS =====
function inicializarFechas() {
    const hoy = new Date().toISOString().split('T')[0];
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    document.getElementById('fechaDesde').value = hace30Dias.toISOString().split('T')[0];
    document.getElementById('fechaHasta').value = hoy;
}

// ===== CARGAR VENTAS =====
async function cargarVentas() {
    try {
        const response = await fetch('/api/ventas');
        const data = await response.json();
        
        if (data.success) {
            todasLasVentas = data.ventas;
            ventasFiltradas = todasLasVentas;
            
            mostrarVentas(ventasFiltradas);
            calcularEstadisticas();
            
            console.log(`✅ ${todasLasVentas.length} ventas cargadas`);
        }
    } catch (error) {
        console.error('Error al cargar ventas:', error);
        Notification.error('Error al cargar las ventas');
    }
}

// ===== MOSTRAR VENTAS EN TABLA =====
function mostrarVentas(ventas) {
    const tbody = document.getElementById('ventasTableBody');
    const noVentas = document.getElementById('noVentas');
    const table = tbody.closest('table');
    
    if (ventas.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        noVentas.classList.remove('d-none');
        document.getElementById('resultadosInfo').textContent = 'Mostrando 0 ventas';
        return;
    }
    
    table.style.display = 'table';
    noVentas.classList.add('d-none');
    
    tbody.innerHTML = ventas.map(venta => {
        const fecha = new Date(venta.fecha);
        const fechaStr = fecha.toLocaleDateString('es-BO');
        const horaStr = fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
        
        // Badge para método de pago
        let metodoBadge = '';
        switch(venta.metodo_pago) {
            case 'efectivo':
                metodoBadge = '<span class="badge bg-success">Efectivo</span>';
                break;
            case 'qr':
                metodoBadge = '<span class="badge bg-primary">QR</span>';
                break;
            case 'credito':
                metodoBadge = '<span class="badge bg-warning">Crédito</span>';
                break;
            case 'mixto':
                metodoBadge = '<span class="badge bg-info">Mixto</span>';
                break;
        }
        
        const cliente = venta.cliente_nombre || '-';
        
        return `
            <tr>
                <td><strong>#${venta.id}</strong></td>
                <td>
                    ${fechaStr}<br>
                    <small class="text-muted">${horaStr}</small>
                </td>
                <td>${metodoBadge}</td>
                <td>${cliente}</td>
                <td><strong class="text-success">${Format.currency(venta.total)}</strong></td>
                <td>
                    <span class="badge bg-success">Completada</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="verDetalleVenta(${venta.id})"
                            title="Ver detalle">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('resultadosInfo').textContent = 
        `Mostrando ${ventas.length} venta${ventas.length !== 1 ? 's' : ''}`;
}

// ===== APLICAR FILTROS =====
function aplicarFiltros() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;
    const metodoPago = document.getElementById('filtroMetodoPago').value;
    
    ventasFiltradas = todasLasVentas.filter(venta => {
        const fechaVenta = new Date(venta.fecha).toISOString().split('T')[0];
        
        // Filtro de fecha
        const cumpleFecha = (!fechaDesde || fechaVenta >= fechaDesde) && 
                           (!fechaHasta || fechaVenta <= fechaHasta);
        
        // Filtro de método de pago
        const cumpleMetodo = !metodoPago || venta.metodo_pago === metodoPago;
        
        return cumpleFecha && cumpleMetodo;
    });
    
    mostrarVentas(ventasFiltradas);
    calcularEstadisticas();
}

// ===== LIMPIAR FILTROS =====
function limpiarFiltros() {
    inicializarFechas();
    document.getElementById('filtroMetodoPago').value = '';
    ventasFiltradas = todasLasVentas;
    mostrarVentas(ventasFiltradas);
    calcularEstadisticas();
}

// ===== CALCULAR ESTADÍSTICAS =====
function calcularEstadisticas() {
    const hoy = new Date().toISOString().split('T')[0];
    const mesActual = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Ventas de hoy
    const ventasHoy = todasLasVentas.filter(v => 
        new Date(v.fecha).toISOString().split('T')[0] === hoy
    );
    
    // Ventas del mes
    const ventasMes = todasLasVentas.filter(v => 
        new Date(v.fecha).toISOString().slice(0, 7) === mesActual
    );
    
    // Totales
    const totalHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0);
    const totalMes = ventasMes.reduce((sum, v) => sum + v.total, 0);
    
    // Actualizar DOM
    document.getElementById('ventasHoy').textContent = ventasHoy.length;
    document.getElementById('totalHoy').textContent = Format.currency(totalHoy);
    document.getElementById('ventasMes').textContent = ventasMes.length;
    document.getElementById('totalMes').textContent = Format.currency(totalMes);
}

// ===== VER DETALLE DE VENTA =====
async function verDetalleVenta(ventaId) {
    try {
        const response = await fetch(`/api/venta/${ventaId}`);
        const data = await response.json();
        
        if (data.success) {
            const venta = data.venta;
            const detalles = data.detalles;
            
            const fecha = new Date(venta.fecha);
            const fechaStr = fecha.toLocaleDateString('es-BO', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const horaStr = fecha.toLocaleTimeString('es-BO');
            
            let metodoPagoTexto = '';
            switch(venta.metodo_pago) {
                case 'efectivo':
                    metodoPagoTexto = `<span class="badge bg-success">Efectivo</span> ${Format.currency(venta.monto_efectivo)}`;
                    break;
                case 'qr':
                    metodoPagoTexto = `<span class="badge bg-primary">QR/Transferencia</span> ${Format.currency(venta.monto_qr)}`;
                    break;
                case 'credito':
                    metodoPagoTexto = `<span class="badge bg-warning">Crédito/Fiado</span> ${Format.currency(venta.total)}`;
                    break;
                case 'mixto':
                    metodoPagoTexto = `
                        <span class="badge bg-info">Pago Mixto</span><br>
                        <small>Efectivo: ${Format.currency(venta.monto_efectivo)}</small><br>
                        <small>QR: ${Format.currency(venta.monto_qr)}</small>
                    `;
                    break;
            }
            
            let html = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>Fecha:</strong> ${fechaStr}</p>
                        <p><strong>Hora:</strong> ${horaStr}</p>
                        <p><strong>Método de Pago:</strong><br>${metodoPagoTexto}</p>
                    </div>
                    <div class="col-md-6">
                        ${venta.cliente_nombre ? `
                            <p><strong>Cliente:</strong> ${venta.cliente_nombre}</p>
                            ${venta.cliente_telefono ? `<p><strong>Teléfono:</strong> ${venta.cliente_telefono}</p>` : ''}
                        ` : ''}
                        <p><strong>Estado:</strong> <span class="badge bg-success">Completada</span></p>
                    </div>
                </div>
                
                <h6 class="mb-3">Productos Vendidos:</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>Producto</th>
                                <th width="100" class="text-center">Cantidad</th>
                                <th width="120">Precio Unit.</th>
                                <th width="120">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${detalles.map(item => `
                                <tr>
                                    <td>${item.producto_nombre}</td>
                                    <td class="text-center">${item.cantidad}</td>
                                    <td>${Format.currency(item.precio_unitario)}</td>
                                    <td><strong>${Format.currency(item.subtotal)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="table-light">
                            <tr>
                                <td colspan="3" class="text-end"><strong>TOTAL:</strong></td>
                                <td><h5 class="mb-0 text-success">${Format.currency(venta.total)}</h5></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            
            document.getElementById('ventaId').textContent = venta.id;
            document.getElementById('detalleVentaContent').innerHTML = html;
            
            const modal = new bootstrap.Modal(document.getElementById('modalDetalleVenta'));
            modal.show();
        } else {
            Notification.error('No se pudo cargar el detalle de la venta');
        }
    } catch (error) {
        console.error('Error:', error);
        Notification.error('Error al cargar el detalle');
    }
}

// ===== EXPORTAR A EXCEL =====
async function exportarVentasExcel() {
    try {
        Notification.info('Generando archivo Excel...');
        
        const fechaDesde = document.getElementById('fechaDesde').value;
        const fechaHasta = document.getElementById('fechaHasta').value;
        
        const url = `/api/ventas/exportar?desde=${fechaDesde}&hasta=${fechaHasta}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Error al exportar');
        }
        
        const blob = await response.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlBlob;
        a.download = `ventas_${fechaDesde}_${fechaHasta}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
        
        Notification.success('Archivo Excel descargado correctamente');
    } catch (error) {
        console.error('Error:', error);
        Notification.error('Error al exportar a Excel');
    }
}

// ===== WEBSOCKET EVENTS =====
if (typeof socket !== 'undefined') {
    // Escuchar cuando se realiza una nueva venta
    socket.on('venta_realizada', function(data) {
        console.log('Nueva venta realizada:', data);
        cargarVentas(); // Recargar lista
    });
}

console.log('✅ ventas.js cargado correctamente');