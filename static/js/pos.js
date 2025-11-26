/* ========================================
   BEER LICORERÍA - POS MEJORADO
   Versión optimizada para móviles
   ======================================== */

// ===== VARIABLES GLOBALES =====
let productos = [];
let carrito = [];
let totalVenta = 0;
let cartDrawerOpen = false;

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 POS Mejorado iniciado');
    cargarProductos();
    inicializarEventos();
});

// ===== CARGAR PRODUCTOS =====
async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        const data = await response.json();
        
        if (data.success) {
            productos = data.productos.filter(p => p.stock > 0);
            mostrarProductos(productos);
            console.log(`✅ ${productos.length} productos disponibles`);
        }
    } catch (error) {
        console.error('Error:', error);
        Notification.error('Error al cargar productos');
    }
}

// ===== MOSTRAR PRODUCTOS =====
function mostrarProductos(listaProductos) {
    const grid = document.getElementById('productosGrid');
    const noProductosMsg = document.getElementById('noProductosMsg');
    
    if (listaProductos.length === 0) {
        grid.innerHTML = '';
        noProductosMsg.classList.remove('d-none');
        return;
    }
    
    noProductosMsg.classList.add('d-none');
    
    grid.innerHTML = listaProductos.map(producto => {
        const stockBajo = producto.stock <= producto.stock_minimo;
        const imagenUrl = producto.imagen ? 
            `/static/${producto.imagen}` : 
            '/static/uploads/productos/default.png';
        
        return `
            <div class="col-6 col-md-4 col-lg-4">
                <div class="card producto-card h-100 shadow-sm" onclick="agregarAlCarrito(${producto.id})">
                    <img src="${imagenUrl}" class="producto-img" alt="${producto.nombre}"
                         onerror="this.src='/static/uploads/productos/default.png'">
                    <div class="card-body p-2">
                        <h6 class="mb-1 small">${producto.nombre}</h6>
                        <small class="${stockBajo ? 'text-warning' : 'text-success'}">
                            <i class="bi bi-box"></i> ${producto.stock}
                        </small>
                    </div>
                    <div class="producto-price text-center">
                        ${Format.currency(producto.precio_venta)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== BÚSQUEDA =====
const searchInput = document.getElementById('searchProducto');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const termino = this.value.toLowerCase();
        const filtrados = productos.filter(p => 
            p.nombre.toLowerCase().includes(termino) ||
            p.categoria.toLowerCase().includes(termino)
        );
        mostrarProductos(filtrados);
    });
}

// ===== AGREGAR AL CARRITO =====
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p.id === productoId);
    if (!producto) return;
    
    const itemExistente = carrito.find(item => item.id === productoId);
    
    if (itemExistente) {
        if (itemExistente.cantidad >= producto.stock) {
            Notification.warning(`Stock máximo: ${producto.stock}`);
            return;
        }
        itemExistente.cantidad++;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio_venta,
            precio_original: producto.precio_venta,
            cantidad: 1,
            stock: producto.stock
        });
    }
    
    actualizarCarrito();
    Notification.success(`✅ ${producto.nombre}`);
    
    // En móvil, abrir carrito automáticamente
    if (window.innerWidth < 992 && !cartDrawerOpen) {
        toggleCart();
    }
}

// ===== ACTUALIZAR CARRITO =====
function actualizarCarrito() {
    const contenidoCarrito = generarContenidoCarrito();
    
    // Desktop
    document.getElementById('carritoItems').innerHTML = contenidoCarrito;
    
    // Mobile
    document.getElementById('carritoItemsMobile').innerHTML = contenidoCarrito;
    
    // Badges y contadores
    const count = carrito.length;
    const items = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    document.getElementById('cartBadge').textContent = count;
    document.getElementById('totalItems').textContent = `${items} item${items !== 1 ? 's' : ''}`;
    document.getElementById('totalItemsMobile').textContent = `${items} item${items !== 1 ? 's' : ''}`;
    
    // Botones
    const btnProcesar = document.getElementById('btnProcesar');
    const btnProcesarMobile = document.getElementById('btnProcesarMobile');
    const btnLimpiar = document.getElementById('btnLimpiar');
    
    if (carrito.length === 0) {
        if (btnProcesar) btnProcesar.disabled = true;
        if (btnProcesarMobile) btnProcesarMobile.disabled = true;
        if (btnLimpiar) btnLimpiar.disabled = true;
    } else {
        if (btnProcesar) btnProcesar.disabled = false;
        if (btnProcesarMobile) btnProcesarMobile.disabled = false;
        if (btnLimpiar) btnLimpiar.disabled = false;
    }
    
    calcularTotales();
}

// ===== GENERAR HTML DEL CARRITO =====
function generarContenidoCarrito() {
    if (carrito.length === 0) {
        return `
            <div class="empty-cart">
                <i class="bi bi-cart-x" style="font-size: 4rem;"></i>
                <p class="mt-3 h5">Carrito vacío</p>
                <small>Toca un producto para agregarlo</small>
            </div>
        `;
    }
    
    return carrito.map(item => `
        <div class="cart-item-card">
            <div class="cart-item-header">
                <div class="cart-item-name">${item.nombre}</div>
                <button class="btn btn-danger btn-delete-item" onclick="eliminarDelCarrito(${item.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            
            <!-- PRECIO EDITABLE -->
            <div class="price-editor">
                <label class="price-editor-label">
                    <i class="bi bi-pencil"></i> Precio unitario (Editable):
                </label>
                <div class="price-input-group">
                    <span class="fw-bold">Bs.</span>
                    <input type="number" class="form-control price-input" 
                           value="${item.precio.toFixed(2)}" 
                           step="0.01" min="0.01"
                           onchange="cambiarPrecio(${item.id}, this.value)"
                           onfocus="this.select()">
                </div>
            </div>
            
            <!-- CANTIDAD -->
            <div class="quantity-controls">
                <button class="btn btn-outline-danger qty-btn" onclick="cambiarCantidad(${item.id}, -1)">
                    <i class="bi bi-dash"></i>
                </button>
                <div class="qty-display">${item.cantidad}</div>
                <button class="btn btn-outline-success qty-btn" onclick="cambiarCantidad(${item.id}, 1)">
                    <i class="bi bi-plus"></i>
                </button>
            </div>
            
            <!-- SUBTOTAL -->
            <div class="item-subtotal">
                <small class="d-block" style="font-size: 0.85rem;">Subtotal:</small>
                ${Format.currency(item.precio * item.cantidad)}
            </div>
            
            <small class="text-muted d-block text-center mt-2">
                <i class="bi bi-box"></i> Stock disponible: ${item.stock}
            </small>
        </div>
    `).join('');
}

// ===== CAMBIAR PRECIO =====
function cambiarPrecio(productoId, nuevoPrecio) {
    const item = carrito.find(i => i.id === productoId);
    if (!item) return;
    
    const precio = parseFloat(nuevoPrecio) || item.precio_original;
    
    if (precio <= 0) {
        Notification.warning('El precio debe ser mayor a 0');
        item.precio = item.precio_original;
    } else {
        item.precio = precio;
        Notification.success('Precio actualizado');
    }
    
    actualizarCarrito();
}

// ===== CAMBIAR CANTIDAD =====
function cambiarCantidad(productoId, cambio) {
    const item = carrito.find(i => i.id === productoId);
    if (!item) return;
    
    const nuevaCantidad = item.cantidad + cambio;
    
    if (nuevaCantidad < 1) {
        eliminarDelCarrito(productoId);
        return;
    }
    
    if (nuevaCantidad > item.stock) {
        Notification.warning(`Stock máximo: ${item.stock}`);
        return;
    }
    
    item.cantidad = nuevaCantidad;
    actualizarCarrito();
}

// ===== ELIMINAR DEL CARRITO =====
function eliminarDelCarrito(productoId) {
    if (confirm('¿Eliminar este producto?')) {
        carrito = carrito.filter(i => i.id !== productoId);
        actualizarCarrito();
        Notification.info('Producto eliminado');
    }
}

// ===== LIMPIAR CARRITO =====
function limpiarCarrito() {
    if (carrito.length === 0) return;
    
    if (confirm('¿Vaciar todo el carrito?')) {
        carrito = [];
        actualizarCarrito();
        Notification.info('Carrito vaciado');
    }
}

// ===== TOGGLE CARRITO (MÓVIL) =====
function toggleCart() {
    const drawer = document.getElementById('cartDrawer');
    cartDrawerOpen = !cartDrawerOpen;
    
    if (cartDrawerOpen) {
        drawer.classList.add('open');
    } else {
        drawer.classList.remove('open');
    }
}

// ===== CALCULAR TOTALES =====
function calcularTotales() {
    totalVenta = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    
    document.getElementById('total').textContent = Format.currency(totalVenta);
    document.getElementById('totalMobile').textContent = Format.currency(totalVenta);
}

// ===== INICIALIZAR EVENTOS =====
function inicializarEventos() {
    document.querySelectorAll('input[name="metodoPago"]').forEach(radio => {
        radio.addEventListener('change', cambiarMetodoPago);
    });
    
    const montoRecibido = document.getElementById('montoRecibido');
    if (montoRecibido) montoRecibido.addEventListener('input', calcularCambio);
    
    const montoEfectivoMixto = document.getElementById('montoEfectivoMixto');
    const montoQRMixto = document.getElementById('montoQRMixto');
    if (montoEfectivoMixto) montoEfectivoMixto.addEventListener('input', calcularPagoMixto);
    if (montoQRMixto) montoQRMixto.addEventListener('input', calcularPagoMixto);
    
    document.getElementById('btnConfirmarVenta').addEventListener('click', confirmarVenta);
}

// ===== ABRIR MODAL VENTA =====
function abrirModalVenta() {
    if (carrito.length === 0) return;
    
    // Cerrar carrito en móvil
    if (cartDrawerOpen) {
        toggleCart();
    }
    
    const resumenTotal = document.getElementById('resumenTotal');
    const resumenItems = document.getElementById('resumenItems');
    
    if (resumenTotal) resumenTotal.textContent = Format.currency(totalVenta);
    if (resumenItems) resumenItems.textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    // Resetear
    document.getElementById('montoRecibido').value = '';
    document.getElementById('cambio').value = '0.00';
    document.getElementById('clienteNombre').value = '';
    document.getElementById('clienteTelefono').value = '';
    document.getElementById('montoEfectivoMixto').value = '';
    document.getElementById('montoQRMixto').value = '';
    
    document.getElementById('pagoEfectivo').checked = true;
    cambiarMetodoPago();
    
    const modal = new bootstrap.Modal(document.getElementById('modalProcesarVenta'));
    modal.show();
}

// ===== CAMBIAR MÉTODO DE PAGO =====
function cambiarMetodoPago() {
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;
    
    document.getElementById('camposEfectivo').style.display = 'none';
    document.getElementById('camposQR').style.display = 'none';
    document.getElementById('camposCredito').style.display = 'none';
    document.getElementById('camposMixto').style.display = 'none';
    
    if (metodoPago === 'efectivo') {
        document.getElementById('camposEfectivo').style.display = 'block';
    } else if (metodoPago === 'qr') {
        document.getElementById('camposQR').style.display = 'block';
    } else if (metodoPago === 'credito') {
        document.getElementById('camposCredito').style.display = 'block';
    } else if (metodoPago === 'mixto') {
        document.getElementById('camposMixto').style.display = 'block';
        calcularPagoMixto();
    }
}

// ===== CALCULAR CAMBIO =====
function calcularCambio() {
    const montoRecibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
    const cambio = montoRecibido - totalVenta;
    document.getElementById('cambio').value = cambio.toFixed(2);
}

// ===== CALCULAR PAGO MIXTO =====
function calcularPagoMixto() {
    const efectivo = parseFloat(document.getElementById('montoEfectivoMixto').value) || 0;
    const qr = parseFloat(document.getElementById('montoQRMixto').value) || 0;
    const falta = totalVenta - (efectivo + qr);
    document.getElementById('faltaPagar').textContent = Format.currency(Math.max(0, falta));
}

// ===== CONFIRMAR VENTA =====
async function confirmarVenta() {
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked').value;
    
    let datosVenta = {
        total: totalVenta,
        metodo_pago: metodoPago,
        items: carrito.map(item => ({
            producto_id: item.id,
            producto_nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio,
            subtotal: item.precio * item.cantidad
        }))
    };
    
    // Validaciones según método
    if (metodoPago === 'efectivo') {
        const montoRecibido = parseFloat(document.getElementById('montoRecibido').value);
        if (!montoRecibido || montoRecibido < totalVenta) {
            Notification.error('El monto recibido debe ser igual o mayor al total');
            return;
        }
        datosVenta.monto_efectivo = totalVenta;
        datosVenta.monto_qr = 0;
    } else if (metodoPago === 'qr') {
        datosVenta.monto_efectivo = 0;
        datosVenta.monto_qr = totalVenta;
    } else if (metodoPago === 'credito') {
        const clienteNombre = document.getElementById('clienteNombre').value.trim();
        if (!clienteNombre) {
            Notification.error('Ingresa el nombre del cliente');
            return;
        }
        datosVenta.cliente_nombre = clienteNombre;
        datosVenta.cliente_telefono = document.getElementById('clienteTelefono').value.trim();
        datosVenta.monto_efectivo = 0;
        datosVenta.monto_qr = 0;
    } else if (metodoPago === 'mixto') {
        const efectivo = parseFloat(document.getElementById('montoEfectivoMixto').value) || 0;
        const qr = parseFloat(document.getElementById('montoQRMixto').value) || 0;
        
        if ((efectivo + qr) < totalVenta) {
            Notification.error('La suma debe ser igual al total');
            return;
        }
        datosVenta.monto_efectivo = efectivo;
        datosVenta.monto_qr = qr;
    }
    
    try {
        Utils.loading(true);
        
        const response = await fetch('/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosVenta)
        });
        
        const data = await response.json();
        Utils.loading(false);
        
        if (data.success) {
            Notification.success('¡Venta registrada exitosamente!');
            
            bootstrap.Modal.getInstance(document.getElementById('modalProcesarVenta')).hide();
            
            carrito = [];
            actualizarCarrito();
            cargarProductos();
            
            if (typeof socket !== 'undefined') {
                socket.emit('venta_realizada', { id: data.venta_id, total: totalVenta });
            }
        } else {
            // AGREGAR ESTE IF:
            if (data.message && data.message.includes('caja')) {
                Notification.error('⚠️ CAJA CERRADA. Abre la caja primero.');
                setTimeout(() => {
                    window.location.href = '/caja';
                }, 2000);
            } else {
                Notification.error(data.message || 'Error al procesar la venta');
            }
        }
    } catch (error) {
        Utils.loading(false);
        console.error('Error:', error);
        Notification.error('Error al procesar la venta');
    }
}

console.log('✅ POS Mejorado cargado');