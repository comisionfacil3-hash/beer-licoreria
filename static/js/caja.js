// ===== MÓDULO DE CAJA =====

let cajaActual = null;
let movimientosCaja = [];
let resumenCaja = {};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('Módulo de caja cargado');
    
    // Verificar si hay caja abierta
    verificarCajaActual();
    
    // WebSocket para actualizaciones en tiempo real
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('caja_abierta', function(data) {
            console.log('Caja abierta:', data);
            mostrarToast('Caja abierta exitosamente', 'success');
            setTimeout(() => location.reload(), 1500);
        });
        
        socket.on('caja_cerrada', function(data) {
            console.log('Caja cerrada:', data);
            mostrarToast('Caja cerrada exitosamente', 'info');
            setTimeout(() => location.reload(), 1500);
        });
        
        socket.on('venta_creada', function(data) {
            if (cajaActual) {
                console.log('Nueva venta registrada');
                actualizarResumen();
                actualizarMovimientos();
            }
        });

        socket.on('compra_creada', function(data) {
            if (cajaActual) {
                console.log('Nueva compra registrada');
                actualizarResumen();
                actualizarMovimientos();
                mostrarToast('Compra registrada en caja', 'info');
            }
        });
        
        socket.on('compra_creada', function(data) {
            if (cajaActual) {
                console.log('Nueva compra registrada');
                actualizarResumen();
                actualizarMovimientos();
            }
        });
        
        socket.on('pago_credito_registrado', function(data) {
            if (cajaActual) {
                console.log('Nuevo pago de crédito');
                actualizarResumen();
                actualizarMovimientos();
            }
        });
        
        socket.on('retiro_caja', function(data) {
            if (cajaActual) {
                console.log('Retiro registrado');
                actualizarResumen();
                actualizarMovimientos();
                mostrarToast('Retiro registrado', 'warning');
            }
        });
    }
});

// Verificar caja actual
async function verificarCajaActual() {
    try {
        const response = await fetch('/api/caja/actual');
        const data = await response.json();
        
        if (data.caja) {
            cajaActual = data.caja;
            movimientosCaja = data.movimientos || [];
            resumenCaja = data.resumen || {};
            
            actualizarInterfaz();
        }
        
    } catch (error) {
        console.error('Error al verificar caja:', error);
    }
}

// Actualizar interfaz con datos de caja
function actualizarInterfaz() {
    if (!cajaActual) return;
    
    // Actualizar resumen
    actualizarResumen();
    
    // Actualizar movimientos
    actualizarMovimientos();
}

// Actualizar resumen
async function actualizarResumen() {
    if (!cajaActual) return;
    
    try {
        const response = await fetch('/api/caja/actual');
        const data = await response.json();
        
        resumenCaja = data.resumen || {};
        movimientosCaja = data.movimientos || [];
        
        // Actualizar efectivo actual
        document.getElementById('efectivoActual').textContent = 
            `Bs. ${(resumenCaja.efectivo_actual || 0).toFixed(2)}`;
        
        // Actualizar totales
        document.getElementById('totalIngresos').textContent = 
            `Bs. ${(resumenCaja.total_ingresos || 0).toFixed(2)}`;
        document.getElementById('totalEgresos').textContent = 
            `Bs. ${(resumenCaja.total_egresos || 0).toFixed(2)}`;
        
        // Actualizar desglose de ingresos
        document.getElementById('ingresosEfectivo').textContent = 
            `Bs. ${(resumenCaja.ingresos_efectivo || 0).toFixed(2)}`;
        document.getElementById('ingresosQr').textContent = 
            `Bs. ${(resumenCaja.ingresos_qr || 0).toFixed(2)}`;
        document.getElementById('ingresosMixto').textContent = 
            `Bs. ${(resumenCaja.ingresos_mixto || 0).toFixed(2)}`;
        
        // Actualizar desglose de egresos
        document.getElementById('egresosEfectivo').textContent = 
            `Bs. ${(resumenCaja.egresos_efectivo || 0).toFixed(2)}`;
        document.getElementById('egresosOtros').textContent = 
            `Bs. ${(resumenCaja.egresos_otros || 0).toFixed(2)}`;
        
        // Actualizar contadores
        document.getElementById('numVentas').textContent = resumenCaja.num_ventas || 0;
        document.getElementById('numCompras').textContent = resumenCaja.num_compras || 0;
        document.getElementById('numPagos').textContent = resumenCaja.num_pagos || 0;
        
        // Actualizar badge de movimientos
        document.getElementById('countMovimientos').textContent = movimientosCaja.length;
        
    } catch (error) {
        console.error('Error al actualizar resumen:', error);
    }
}

// Actualizar movimientos
async function actualizarMovimientos() {
    if (!cajaActual) return;
    
    try {
        const response = await fetch(`/api/caja/movimientos/${cajaActual.id}`);
        movimientosCaja = await response.json();
        
        renderizarMovimientos();
        
    } catch (error) {
        console.error('Error al actualizar movimientos:', error);
    }
}

// Renderizar movimientos
function renderizarMovimientos() {
    const container = document.getElementById('listaMovimientos');
    
    if (!container) return;
    
    if (movimientosCaja.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-inbox fs-3 text-muted"></i>
                <p class="mt-2 text-muted">No hay movimientos registrados</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group list-group-flush">';
    
    movimientosCaja.forEach(mov => {
        const tipoIcon = mov.tipo === 'ingreso' ? 'arrow-down-circle' : 'arrow-up-circle';
        const tipoColor = mov.tipo === 'ingreso' ? 'success' : 'danger';
        const signo = mov.tipo === 'ingreso' ? '+' : '-';
        
        html += `
            <div class="movimiento-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="d-flex gap-3">
                        <div>
                            <i class="bi bi-${tipoIcon} fs-4 text-${tipoColor}"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${mov.concepto}</div>
                            <small class="text-muted">
                                ${formatearFecha(mov.fecha)}
                                ${mov.metodo_pago ? ` • ${mov.metodo_pago}` : ''}
                            </small>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="tipo-badge ${mov.tipo}">
                            ${signo} Bs. ${mov.monto.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Actualizar badge
    document.getElementById('countMovimientos').textContent = movimientosCaja.length;
}

// Abrir modal de apertura
function abrirModalApertura() {
    document.getElementById('montoInicial').value = '0';
    const modal = new bootstrap.Modal(document.getElementById('modalApertura'));
    modal.show();
}

// Confirmar apertura de caja
async function confirmarApertura() {
    const montoInicial = parseFloat(document.getElementById('montoInicial').value) || 0;
    
    try {
        const response = await fetch('/api/caja/abrir', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                monto_inicial: montoInicial
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('modalApertura')).hide();
            
            // Mostrar éxito
            mostrarToast('Caja abierta exitosamente', 'success');
            
            // Recargar página
            setTimeout(() => location.reload(), 1500);
        } else {
            mostrarToast('Error: ' + (data.error || 'No se pudo abrir la caja'), 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al abrir la caja', 'danger');
    }
}

// Abrir modal de cierre
async function abrirModalCierre() {
    if (!cajaActual) return;
    
    // Actualizar datos antes de mostrar
    await actualizarResumen();
    
    // Mostrar efectivo esperado
    const efectivoEsperado = resumenCaja.efectivo_actual || 0;
    document.getElementById('efectivoEsperado').textContent = `Bs. ${efectivoEsperado.toFixed(2)}`;
    
    // Mostrar total de operaciones
    const totalOperaciones = (resumenCaja.num_ventas || 0) + 
                           (resumenCaja.num_compras || 0) + 
                           (resumenCaja.num_pagos || 0);
    document.getElementById('totalOperaciones').textContent = totalOperaciones;
    
    // Limpiar campo de efectivo contado
    document.getElementById('efectivoContado').value = '';
    document.getElementById('diferenciaCaja').style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('modalCierre'));
    modal.show();
}

// Calcular diferencia
function calcularDiferencia() {
    const efectivoEsperado = resumenCaja.efectivo_actual || 0;
    const efectivoContado = parseFloat(document.getElementById('efectivoContado').value) || 0;
    const diferencia = efectivoContado - efectivoEsperado;
    
    const diferenciaDiv = document.getElementById('diferenciaCaja');
    
    if (efectivoContado > 0) {
        let mensaje = '';
        let clase = '';
        
        if (Math.abs(diferencia) < 0.01) {
            mensaje = '✓ Caja cuadrada';
            clase = 'exacto';
        } else if (diferencia < 0) {
            mensaje = `⚠ Faltante: Bs. ${Math.abs(diferencia).toFixed(2)}`;
            clase = 'faltante';
        } else {
            mensaje = `✓ Sobrante: Bs. ${diferencia.toFixed(2)}`;
            clase = 'sobrante';
        }
        
        diferenciaDiv.innerHTML = `
            <div class="diferencia-display ${clase}">
                ${mensaje}
            </div>
        `;
        diferenciaDiv.style.display = 'block';
    } else {
        diferenciaDiv.style.display = 'none';
    }
}

// Confirmar cierre de caja
async function confirmarCierre() {
    const efectivoContado = parseFloat(document.getElementById('efectivoContado').value);
    
    if (!efectivoContado || efectivoContado < 0) {
        mostrarToast('Por favor ingrese el efectivo contado', 'warning');
        return;
    }
    
    // Confirmar acción
    if (!confirm('¿Está seguro de cerrar la caja? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/caja/cerrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                efectivo_contado: efectivoContado
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('modalCierre')).hide();
            
            // Mostrar resultado
            const resultado = data.resultado;
            let mensaje = `Caja cerrada. `;
            
            if (Math.abs(resultado.diferencia) < 0.01) {
                mensaje += 'La caja está cuadrada.';
            } else if (resultado.diferencia < 0) {
                mensaje += `Faltante: Bs. ${Math.abs(resultado.diferencia).toFixed(2)}`;
            } else {
                mensaje += `Sobrante: Bs. ${resultado.diferencia.toFixed(2)}`;
            }
            
            mostrarToast(mensaje, 'info');
            
            // Recargar página
            setTimeout(() => location.reload(), 2000);
        } else {
            mostrarToast('Error: ' + (data.error || 'No se pudo cerrar la caja'), 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al cerrar la caja', 'danger');
    }
}

// Abrir modal de retiro
function abrirModalRetiro() {
    document.getElementById('montoRetiro').value = '';
    document.getElementById('conceptoRetiro').value = '';
    
    const modal = new bootstrap.Modal(document.getElementById('modalRetiro'));
    modal.show();
}

// Confirmar retiro
async function confirmarRetiro() {
    const monto = parseFloat(document.getElementById('montoRetiro').value);
    const concepto = document.getElementById('conceptoRetiro').value.trim();
    
    if (!monto || monto <= 0) {
        mostrarToast('Por favor ingrese un monto válido', 'warning');
        return;
    }
    
    if (!concepto) {
        mostrarToast('Por favor ingrese el concepto del retiro', 'warning');
        return;
    }
    
    // Verificar si hay suficiente efectivo
    if (monto > (resumenCaja.efectivo_actual || 0)) {
        mostrarToast('No hay suficiente efectivo en caja', 'danger');
        return;
    }
    
    try {
        const response = await fetch('/api/caja/retiro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                monto: monto,
                concepto: concepto
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Cerrar modal
            bootstrap.Modal.getInstance(document.getElementById('modalRetiro')).hide();
            
            // Mostrar éxito
            mostrarToast('Retiro registrado exitosamente', 'success');
            
            // Actualizar interfaz
            actualizarResumen();
            actualizarMovimientos();
            
            // Limpiar formulario
            document.getElementById('formRetiro').reset();
        } else {
            mostrarToast('Error: ' + (data.error || 'No se pudo registrar el retiro'), 'danger');
        }
        
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al registrar el retiro', 'danger');
    }
}

// Formatear fecha
function formatearFecha(fecha) {
    const opciones = { 
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(fecha).toLocaleTimeString('es-ES', opciones);
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