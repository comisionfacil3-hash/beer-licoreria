// ========================================
// MÓDULO DE COMPRAS - BEER LICORERÍA
// ========================================

let productosDisponibles = [];
let productosCompra = [];
let compraIdEliminar = null;
let tipoCompraActual = 'productos';

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Detectar en qué página estamos
    const esListado = document.getElementById('tablaCompras');
    const esFormulario = document.getElementById('formCompra');
    
    if (esListado) {
        inicializarListado();
    }
    
    if (esFormulario) {
        inicializarFormulario();
    }
    
    // Conectar Socket.IO para actualizaciones en tiempo real
    if (typeof io !== 'undefined') {
        const socket = io();
        
        socket.on('compra_creada', function(data) {
            if (esListado) {
                mostrarToast('Nueva compra registrada', 'success');
                cargarCompras();
            }
        });
        
        socket.on('compra_eliminada', function(data) {
            if (esListado) {
                mostrarToast('Compra eliminada', 'warning');
                cargarCompras();
            }
        });
    }
});

// ========================================
// FUNCIONES PARA LISTADO DE COMPRAS
// ========================================

function inicializarListado() {
    // Cargar compras al iniciar
    cargarCompras();
    
    // Event listeners para filtros
    document.getElementById('btnFiltrar').addEventListener('click', aplicarFiltros);
    document.getElementById('btnLimpiar').addEventListener('click', limpiarFiltros);
    document.getElementById('btnBuscar').addEventListener('click', aplicarFiltros);
    document.getElementById('btnExportar').addEventListener('click', exportarExcel);
    
    // Enter en búsqueda
    document.getElementById('filtroBuscar').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            aplicarFiltros();
        }
    });
    
    // Confirmar eliminar
    const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
    if (btnConfirmarEliminar) {
        btnConfirmarEliminar.addEventListener('click', confirmarEliminar);
    }
    
    // Imprimir
    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', imprimirDetalle);
    }
    
    // Establecer fechas por defecto (últimos 30 días)
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('filtroHasta').value = hoy.toISOString().split('T')[0];
    document.getElementById('filtroDesde').value = hace30Dias.toISOString().split('T')[0];
}

function cargarCompras() {
    const tipo = document.getElementById('filtroTipo').value;
    const desde = document.getElementById('filtroDesde').value;
    const hasta = document.getElementById('filtroHasta').value;
    const buscar = document.getElementById('filtroBuscar').value;
    
    // Construir URL con parámetros
    let url = '/api/compras?';
    if (tipo) url += `tipo=${tipo}&`;
    if (desde) url += `desde=${desde}&`;
    if (hasta) url += `hasta=${hasta}&`;
    if (buscar) url += `buscar=${buscar}&`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarCompras(data.compras);
                actualizarEstadisticas(data.estadisticas);
            } else {
                mostrarToast('Error al cargar compras', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarToast('Error de conexión', 'danger');
        });
}

function mostrarCompras(compras) {
    // Mostrar en tabla (desktop)
    const tablaCompras = document.getElementById('tablaCompras');
    tablaCompras.innerHTML = '';
    
    if (compras.length === 0) {
        tablaCompras.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="bi bi-inbox fs-1 text-muted"></i>
                    <p class="mt-2">No se encontraron compras</p>
                </td>
            </tr>
        `;
        document.getElementById('listaMovil').innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-inbox fs-1 text-muted"></i>
                <p class="mt-2">No se encontraron compras</p>
            </div>
        `;
        return;
    }
    
    // Llenar tabla desktop
    compras.forEach(compra => {
        const badgeClass = compra.tipo === 'productos' ? 'badge-productos' :
                          compra.tipo === 'insumos' ? 'badge-insumos' : 'badge-gastos';
        
        const fila = `
            <tr class="fade-in">
                <td>${compra.id}</td>
                <td>${formatearFecha(compra.fecha)}</td>
                <td><span class="badge badge-tipo ${badgeClass}">${capitalizar(compra.tipo)}</span></td>
                <td>${compra.descripcion || '-'}</td>
                <td>${compra.proveedor || '-'}</td>
                <td>${capitalizar(compra.metodo_pago)}</td>
                <td class="fw-bold">Bs. ${formatearNumero(compra.monto)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalle(${compra.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarCompra(${compra.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tablaCompras.innerHTML += fila;
    });
    
    // Llenar lista móvil
    const listaMovil = document.getElementById('listaMovil');
    listaMovil.innerHTML = '';
    
    compras.forEach(compra => {
        const badgeClass = compra.tipo === 'productos' ? 'badge-productos' :
                          compra.tipo === 'insumos' ? 'badge-insumos' : 'badge-gastos';
        
        const item = `
            <div class="compra-item fade-in">
                <div class="compra-header">
                    <span class="badge badge-tipo ${badgeClass}">${capitalizar(compra.tipo)}</span>
                    <span class="text-muted">#${compra.id}</span>
                </div>
                <div class="compra-body">
                    <div><strong>Proveedor:</strong> ${compra.proveedor || '-'}</div>
                    <div><strong>Descripción:</strong> ${compra.descripcion || '-'}</div>
                    <div><strong>Fecha:</strong> ${formatearFecha(compra.fecha)}</div>
                    <div><strong>Pago:</strong> ${capitalizar(compra.metodo_pago)}</div>
                </div>
                <div class="compra-footer">
                    <h5 class="mb-0 text-primary">Bs. ${formatearNumero(compra.monto)}</h5>
                    <div>
                        <button class="btn btn-sm btn-info me-2" onclick="verDetalle(${compra.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarCompra(${compra.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        listaMovil.innerHTML += item;
    });
}

function actualizarEstadisticas(stats) {
    document.getElementById('totalHoy').textContent = formatearNumero(stats.totalHoy || 0);
    document.getElementById('totalMes').textContent = formatearNumero(stats.totalMes || 0);
    document.getElementById('totalGastos').textContent = formatearNumero(stats.totalGastos || 0);
    document.getElementById('totalGeneral').textContent = formatearNumero(stats.totalGeneral || 0);
}

function verDetalle(id) {
    fetch(`/api/compra/${id}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mostrarDetalleModal(data.compra, data.detalles);
            } else {
                mostrarToast('Error al cargar detalle', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarToast('Error de conexión', 'danger');
        });
}

function mostrarDetalleModal(compra, detalles) {
    const badgeClass = compra.tipo === 'productos' ? 'badge-productos' :
                       compra.tipo === 'insumos' ? 'badge-insumos' : 'badge-gastos';
    
    let detalleHTML = `
        <div class="mb-3">
            <span class="badge badge-tipo ${badgeClass} me-2">${capitalizar(compra.tipo)}</span>
            <span class="text-muted">Compra #${compra.id}</span>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <p><strong>Proveedor:</strong> ${compra.proveedor || '-'}</p>
                <p><strong>Método de Pago:</strong> ${capitalizar(compra.metodo_pago)}</p>
            </div>
            <div class="col-md-6">
                <p><strong>Fecha:</strong> ${formatearFechaCompleta(compra.fecha)}</p>
                <p><strong>Monto Total:</strong> Bs. ${formatearNumero(compra.monto)}</p>
            </div>
        </div>
        
        <p><strong>Descripción:</strong> ${compra.descripcion || '-'}</p>
    `;
    
    // Si es compra de productos, mostrar detalles
    if (compra.tipo === 'productos' && detalles && detalles.length > 0) {
        detalleHTML += `
            <hr>
            <h6>Productos Comprados:</h6>
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>P. Unitario</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        detalles.forEach(item => {
            detalleHTML += `
                <tr>
                    <td>${item.producto_nombre}</td>
                    <td>${item.cantidad}</td>
                    <td>Bs. ${formatearNumero(item.precio_unitario)}</td>
                    <td>Bs. ${formatearNumero(item.subtotal)}</td>
                </tr>
            `;
        });
        
        detalleHTML += `
                </tbody>
            </table>
        `;
    }
    
    document.getElementById('detalleCompra').innerHTML = detalleHTML;
    
    const modal = new bootstrap.Modal(document.getElementById('modalDetalle'));
    modal.show();
}

function eliminarCompra(id) {
    compraIdEliminar = id;
    const modal = new bootstrap.Modal(document.getElementById('modalEliminar'));
    modal.show();
}

function confirmarEliminar() {
    if (!compraIdEliminar) return;
    
    fetch(`/api/compra/${compraIdEliminar}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarToast('Compra eliminada correctamente', 'success');
            cargarCompras();
            bootstrap.Modal.getInstance(document.getElementById('modalEliminar')).hide();
        } else {
            mostrarToast(data.message || 'Error al eliminar', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'danger');
    });
}

function aplicarFiltros() {
    cargarCompras();
}

function limpiarFiltros() {
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroBuscar').value = '';
    
    const hoy = new Date();
    const hace30Dias = new Date(hoy.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    document.getElementById('filtroHasta').value = hoy.toISOString().split('T')[0];
    document.getElementById('filtroDesde').value = hace30Dias.toISOString().split('T')[0];
    
    cargarCompras();
}

function exportarExcel() {
    const tipo = document.getElementById('filtroTipo').value;
    const desde = document.getElementById('filtroDesde').value;
    const hasta = document.getElementById('filtroHasta').value;
    
    let url = '/api/compras/exportar?';
    if (tipo) url += `tipo=${tipo}&`;
    if (desde) url += `desde=${desde}&`;
    if (hasta) url += `hasta=${hasta}`;
    
    window.location.href = url;
    mostrarToast('Exportando compras a Excel...', 'info');
}

function imprimirDetalle() {
    window.print();
}

// ========================================
// FUNCIONES PARA FORMULARIO DE COMPRAS
// ========================================

function inicializarFormulario() {
    // Cargar productos disponibles
    cargarProductos();
    
    // Event listeners para tabs
    document.getElementById('productos-tab').addEventListener('click', () => cambiarTipo('productos'));
    document.getElementById('insumos-tab').addEventListener('click', () => cambiarTipo('insumos'));
    document.getElementById('gastos-tab').addEventListener('click', () => cambiarTipo('gastos'));
    
    // Búsqueda de productos
    document.getElementById('buscarProducto').addEventListener('input', filtrarProductos);
    
    // Actualizar total
    document.getElementById('montoTotal').addEventListener('input', actualizarTotal);
    
    // Submit del formulario
    document.getElementById('formCompra').addEventListener('submit', procesarCompra);
}

function cambiarTipo(tipo) {
    tipoCompraActual = tipo;
    document.getElementById('tipoCompra').value = tipo;
    
    // Limpiar productos si cambia de tipo
    if (tipo !== 'productos') {
        productosCompra = [];
        actualizarListaCompra();
    }
}

function cargarProductos() {
    fetch('/api/productos')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                productosDisponibles = data.productos;
                mostrarProductos(productosDisponibles);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            mostrarToast('Error al cargar productos', 'danger');
        });
}

function mostrarProductos(productos) {
    const lista = document.getElementById('listaProductos');
    lista.innerHTML = '';
    
    if (productos.length === 0) {
        lista.innerHTML = '<p class="text-muted text-center">No hay productos disponibles</p>';
        return;
    }
    
    productos.forEach(producto => {
        const item = document.createElement('div');
        item.className = 'producto-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${producto.nombre}</strong>
                    <small class="text-muted ms-2">Stock: ${producto.stock}</small>
                </div>
                <button class="btn btn-sm btn-primary" onclick="agregarProducto(${producto.id})">
                    <i class="bi bi-plus"></i>
                </button>
            </div>
        `;
        lista.appendChild(item);
    });
}

function filtrarProductos() {
    const busqueda = document.getElementById('buscarProducto').value.toLowerCase();
    const productosFiltrados = productosDisponibles.filter(p => 
        p.nombre.toLowerCase().includes(busqueda)
    );
    mostrarProductos(productosFiltrados);
}

function agregarProducto(id) {
    const producto = productosDisponibles.find(p => p.id === id);
    if (!producto) return;
    
    // Verificar si ya está en la lista
    const existente = productosCompra.find(p => p.id === id);
    if (existente) {
        existente.cantidad++;
    } else {
        productosCompra.push({
            id: producto.id,
            nombre: producto.nombre,
            cantidad: 1,
            precio: producto.precio_compra || 0
        });
    }
    
    actualizarListaCompra();
}

function actualizarListaCompra() {
    const container = document.getElementById('itemsCompra');
    
    if (productosCompra.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay productos agregados</p>';
        return;
    }
    
    let html = '';
    let total = 0;
    
    productosCompra.forEach((item, index) => {
        const subtotal = item.cantidad * item.precio;
        total += subtotal;
        
        html += `
            <div class="producto-agregado">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${item.nombre}</strong>
                        <div class="mt-1">
                            <input type="number" class="form-control form-control-sm d-inline-block me-2" 
                                   style="width: 80px" value="${item.cantidad}" min="1"
                                   onchange="actualizarCantidad(${index}, this.value)">
                            <span>x</span>
                            <input type="number" class="form-control form-control-sm d-inline-block ms-2" 
                                   style="width: 100px" value="${item.precio}" min="0" step="0.01"
                                   onchange="actualizarPrecio(${index}, this.value)">
                            <span class="ms-2">= Bs. ${formatearNumero(subtotal)}</span>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="quitarProducto(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Actualizar el total si es compra de productos
    if (tipoCompraActual === 'productos') {
        document.getElementById('montoTotal').value = total.toFixed(2);
        actualizarTotal();
    }
}

function actualizarCantidad(index, cantidad) {
    productosCompra[index].cantidad = parseInt(cantidad) || 1;
    actualizarListaCompra();
}

function actualizarPrecio(index, precio) {
    productosCompra[index].precio = parseFloat(precio) || 0;
    actualizarListaCompra();
}

function quitarProducto(index) {
    productosCompra.splice(index, 1);
    actualizarListaCompra();
}

function actualizarTotal() {
    const monto = parseFloat(document.getElementById('montoTotal').value) || 0;
    document.getElementById('totalResumen').textContent = formatearNumero(monto);
}

function procesarCompra(e) {
    e.preventDefault();
    
    // Validaciones
    if (tipoCompraActual === 'productos' && productosCompra.length === 0) {
        mostrarToast('Debe agregar al menos un producto', 'warning');
        return;
    }
    
    // Preparar datos
    const formData = new FormData(e.target);
    const datos = {
        tipo: tipoCompraActual,
        proveedor: formData.get('proveedor'),
        monto: parseFloat(formData.get('monto')),
        metodo_pago: formData.get('metodo_pago'),
        fecha: formData.get('fecha'),
        observaciones: formData.get('observaciones')
    };
    
    // Agregar descripción según el tipo
    if (tipoCompraActual === 'insumos') {
        datos.descripcion = formData.get('descripcion_insumo');
    } else if (tipoCompraActual === 'gastos') {
        const tipoGasto = formData.get('tipo_gasto');
        const descripcionGasto = formData.get('descripcion_gasto');
        datos.descripcion = `${tipoGasto}: ${descripcionGasto}`;
    }
    
    // Si es compra de productos, agregar los items
    if (tipoCompraActual === 'productos') {
        datos.items = productosCompra.map(item => ({
            producto_id: item.id,
            producto_nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.cantidad * item.precio
        }));
    }
    
    // Enviar al servidor
    fetch('/api/compras', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            mostrarToast('Compra registrada correctamente', 'success');
            setTimeout(() => {
                window.location.href = '/compras';
            }, 1500);
        } else {
            // AGREGAR ESTE IF:
            if (data.message && data.message.includes('caja')) {
                mostrarToast('⚠️ CAJA CERRADA. Abre la caja primero.', 'danger');
                setTimeout(() => {
                    window.location.href = '/caja';
                }, 2000);
            } else {
                mostrarToast(data.message || 'Error al registrar compra', 'danger');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'danger');
    });
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function formatearNumero(numero) {
    return new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(numero);
}

function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatearFechaCompleta(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-BO', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalizar(texto) {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function mostrarToast(mensaje, tipo = 'info') {
    const toastEl = document.getElementById('toastNotificacion');
    const toastBody = document.getElementById('toastMensaje');
    
    if (toastEl && toastBody) {
        // Cambiar color según tipo
        toastEl.className = `toast bg-${tipo === 'danger' ? 'danger' : tipo === 'warning' ? 'warning' : tipo === 'success' ? 'success' : 'primary'} text-white`;
        toastBody.textContent = mensaje;
        
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    }
}

// ========================================
// FIN DEL MÓDULO DE COMPRAS
// ========================================