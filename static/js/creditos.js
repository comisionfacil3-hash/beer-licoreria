// ===== MÓDULO DE CRÉDITOS =====

let creditosData = [];
let estadoFiltro = 'todos';
let busquedaTexto = '';

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('Módulo de créditos cargado');
    
    // Cargar estadísticas y créditos
    cargarEstadisticas();
    cargarCreditos();
    
    // Event listeners
    document.getElementById('filtroEstado').addEventListener('change', function() {
        estadoFiltro = this.value;
        cargarCreditos();
    });
    
    document.getElementById('busquedaCredito').addEventListener('input', function() {
        busquedaTexto = this.value;
        if (busquedaTexto.length >= 3 || busquedaTexto.length === 0) {
            cargarCreditos();
        }
    });
    
    document.getElementById('btnBuscar').addEventListener('click', function() {
        cargarCreditos();
    });
    
    document.getElementById('btnRefrescar').addEventListener('click', function() {
        cargarEstadisticas();
        cargarCreditos();
        mostrarToast('Datos actualizados', 'success');
    });
    
    document.getElementById('btnExportar').addEventListener('click', exportarCreditos);
    
    // Botón de resumen por cliente
    document.getElementById('btnResumenCliente').addEventListener('click', mostrarResumenClientes);
    
    // Modal de pago
    document.getElementById('btnConfirmarPago').addEventListener('click', procesarPagoRapido);
    
    // Botones de monto rápido
    document.getElementById('btnPagoTotal').addEventListener('click', function() {
        const saldo = parseFloat(document.getElementById('saldoPago').textContent.replace('Bs. ', ''));
        document.getElementById('montoPago').value = saldo.toFixed(2);
    });
    
    document.getElementById('btnPago50').addEventListener('click', function() {
        const saldo = parseFloat(document.getElementById('saldoPago').textContent.replace('Bs. ', ''));
        document.getElementById('montoPago').value = (saldo * 0.5).toFixed(2);
    });
    
    // Inicializar tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // WebSocket para actualizaciones en tiempo real
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('pago_credito_registrado', function(data) {
            console.log('Pago registrado:', data);
            cargarEstadisticas();
            cargarCreditos();
            mostrarToast('Nuevo pago registrado', 'success');
        });
        
        socket.on('credito_creado', function(data) {
            console.log('Nuevo crédito:', data);
            cargarEstadisticas();
            cargarCreditos();
            mostrarToast('Nuevo crédito registrado', 'warning');
        });
    }
});

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        const response = await fetch('/api/creditos/estadisticas');
        const stats = await response.json();
        
        // Actualizar cards
        document.getElementById('totalPendiente').textContent = `Bs. ${stats.total_pendiente.toFixed(2)}`;
        document.getElementById('cantidadPendiente').textContent = stats.creditos_pendientes;
        
        document.getElementById('totalVencido').textContent = `Bs. ${stats.total_vencido.toFixed(2)}`;
        document.getElementById('cantidadVencidos').textContent = stats.creditos_vencidos;
        
        document.getElementById('cobradoMes').textContent = `Bs. ${stats.cobrado_mes.toFixed(2)}`;
        document.getElementById('totalClientes').textContent = stats.total_clientes;
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Cargar lista de créditos
async function cargarCreditos() {
    try {
        // Construir URL con parámetros
        const params = new URLSearchParams();
        if (estadoFiltro !== 'todos') params.append('estado', estadoFiltro);
        if (busquedaTexto) params.append('busqueda', busquedaTexto);
        
        const response = await fetch(`/api/creditos?${params}`);
        creditosData = await response.json();
        
        renderizarCreditos();
        
    } catch (error) {
        console.error('Error al cargar créditos:', error);
        document.getElementById('listaCreditos').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error al cargar los créditos
            </div>
        `;
    }
}

// Renderizar lista de créditos
function renderizarCreditos() {
    const container = document.getElementById('listaCreditos');
    
    if (creditosData.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-inbox fs-1 text-muted"></i>
                <p class="mt-3 text-muted">No se encontraron créditos</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group">';
    
    creditosData.forEach(credito => {
        const diasVencido = calcularDiasVencido(credito.fecha_credito);
        const porcentajePagado = ((credito.monto_pagado / credito.monto_total) * 100).toFixed(0);
        
        html += `
            <div class="list-group-item credito-card ${credito.estado} mb-2" 
                 onclick="verDetalleCredito(${credito.id})">
                
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="cliente-info">
                        <i class="bi bi-person-circle fs-4"></i>
                        <div>
                            <strong>${credito.cliente_nombre}</strong>
                            ${credito.cliente_telefono ? `<br><small class="text-muted">${credito.cliente_telefono}</small>` : ''}
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge estado-badge 
                            ${credito.estado === 'pendiente' ? 'bg-danger' : 
                              credito.estado === 'parcial' ? 'bg-warning text-dark' : 'bg-success'}">
                            ${credito.estado.toUpperCase()}
                        </span>
                        ${diasVencido > 30 && credito.estado !== 'pagado' ? 
                            `<div class="dias-vencido mt-1">${diasVencido} días</div>` : ''}
                    </div>
                </div>
                
                <div class="row mb-2">
                    <div class="col-6">
                        <small class="text-muted">Total</small><br>
                        <span class="fw-bold">Bs. ${credito.monto_total.toFixed(2)}</span>
                    </div>
                    <div class="col-6 text-end">
                        <small class="text-muted">Pendiente</small><br>
                        <span class="monto-credito text-danger">Bs. ${credito.saldo_pendiente.toFixed(2)}</span>
                    </div>
                </div>
                
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar ${porcentajePagado == 100 ? 'bg-success' : 'bg-warning'}" 
                         style="width: ${porcentajePagado}%">
                        ${porcentajePagado}%
                    </div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <small class="text-muted">
                        <i class="bi bi-calendar"></i> ${formatearFecha(credito.fecha_credito)}
                    </small>
                    ${credito.estado !== 'pagado' ? `
                        <button class="btn btn-sm btn-success" 
                                onclick="event.stopPropagation(); abrirModalPagoRapido(${credito.id}, '${credito.cliente_nombre}', ${credito.saldo_pendiente})">
                            <i class="bi bi-cash"></i> Pagar
                        </button>
                    ` : `
                        <span class="badge bg-success">
                            <i class="bi bi-check-circle"></i> Pagado
                        </span>
                    `}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Ver detalle de crédito
function verDetalleCredito(id) {
    window.location.href = `/credito/${id}`;
}

// Abrir modal de pago rápido
function abrirModalPagoRapido(creditoId, cliente, saldo) {
    document.getElementById('creditoIdPago').value = creditoId;
    document.getElementById('clientePago').textContent = cliente;
    document.getElementById('saldoPago').textContent = `Bs. ${saldo.toFixed(2)}`;
    document.getElementById('montoPago').value = '';
    document.getElementById('montoPago').max = saldo;
    
    const modal = new bootstrap.Modal(document.getElementById('modalPagoRapido'));
    modal.show();
}

// Procesar pago rápido
async function procesarPagoRapido() {
    const creditoId = document.getElementById('creditoIdPago').value;
    const monto = parseFloat(document.getElementById('montoPago').value);
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;
    
    if (!monto || monto <= 0) {
        mostrarToast('Por favor ingrese un monto válido', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/creditos/${creditoId}/pagar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                monto: monto,
                metodo_pago: metodoPago
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('modalPagoRapido')).hide();
            
            // Mostrar éxito
            mostrarToast('Pago registrado exitosamente', 'success');
            
            // Recargar datos
            cargarEstadisticas();
            cargarCreditos();
            
            // Limpiar formulario
            document.getElementById('formPagoRapido').reset();
        } else {
            mostrarToast('Error: ' + (data.error || 'No se pudo registrar el pago'), 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al procesar el pago', 'danger');
    }
}

// Mostrar resumen de clientes
async function mostrarResumenClientes() {
    try {
        // Obtener lista única de clientes con deuda
        const clientesUnicos = [...new Set(creditosData
            .filter(c => c.estado !== 'pagado')
            .map(c => c.cliente_nombre))];
        
        if (clientesUnicos.length === 0) {
            mostrarToast('No hay clientes con créditos pendientes', 'info');
            return;
        }
        
        // Crear modal con resumen
        let html = `
            <div class="modal fade" id="modalResumenClientes" tabindex="-1">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-warning">
                            <h5 class="modal-title">
                                <i class="bi bi-people"></i> Resumen por Cliente
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="list-group">
        `;
        
        for (const cliente of clientesUnicos) {
            const creditosCliente = creditosData.filter(c => 
                c.cliente_nombre === cliente && c.estado !== 'pagado'
            );
            
            const totalDeuda = creditosCliente.reduce((sum, c) => sum + c.saldo_pendiente, 0);
            
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${cliente}</h6>
                            <small class="text-muted">${creditosCliente.length} crédito(s) pendiente(s)</small>
                        </div>
                        <div class="text-end">
                            <span class="fs-5 fw-bold text-danger">Bs. ${totalDeuda.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="mt-2">
                        ${creditosCliente.map(c => `
                            <small class="d-block">
                                • Crédito #${c.id} - Bs. ${c.saldo_pendiente.toFixed(2)} 
                                (${formatearFecha(c.fecha_credito)})
                            </small>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += `
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = html;
        document.body.appendChild(modalContainer);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalResumenClientes'));
        modal.show();
        
        // Limpiar al cerrar
        document.getElementById('modalResumenClientes').addEventListener('hidden.bs.modal', function() {
            modalContainer.remove();
        });
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al generar resumen', 'danger');
    }
}

// Exportar créditos a Excel
function exportarCreditos() {
    window.location.href = '/api/creditos/exportar';
    mostrarToast('Exportando créditos...', 'info');
}

// Calcular días vencidos
function calcularDiasVencido(fechaCredito) {
    const fecha = new Date(fechaCredito);
    const hoy = new Date();
    const diferencia = hoy - fecha;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

// Formatear fecha
function formatearFecha(fecha) {
    const opciones = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

// Mostrar toast
function mostrarToast(mensaje, tipo = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${tipo} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${mensaje}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 3000
    });
    
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Crear contenedor de toasts
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}