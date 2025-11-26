/* ========================================
   BEER LICORERÍA - MÓDULO DE PRODUCTOS
   JavaScript específico para gestión de productos
   ======================================== */

// ===== VARIABLES GLOBALES =====
let todosLosProductos = [];
let productosFiltrados = [];

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Módulo de productos iniciado');
    cargarProductos();
    
    // Event listeners para filtros
    document.getElementById('searchInput').addEventListener('input', aplicarFiltros);
    document.getElementById('filterCategoria').addEventListener('change', aplicarFiltros);
    document.getElementById('filterStock').addEventListener('change', aplicarFiltros);
});

// ===== CARGAR PRODUCTOS =====
async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        
        const data = await response.json();
        todosLosProductos = data.productos || [];
        productosFiltrados = todosLosProductos;
        
        mostrarProductos(productosFiltrados);
        actualizarEstadisticas();
        
        console.log(`✅ ${todosLosProductos.length} productos cargados`);
    } catch (error) {
        console.error('Error:', error);
        Notification.error('Error al cargar los productos');
        mostrarMensajeVacio();
    }
}

// ===== MOSTRAR PRODUCTOS EN LA TABLA =====
function mostrarProductos(productos) {
    const tbody = document.getElementById('productosTableBody');
    const noProductos = document.getElementById('noProductos');
    const table = document.getElementById('productosTable');
    
    if (productos.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        noProductos.classList.remove('d-none');
        document.getElementById('resultadosInfo').textContent = 'Mostrando 0 productos';
        return;
    }
    
    table.style.display = 'table';
    noProductos.classList.add('d-none');
    
    tbody.innerHTML = productos.map(producto => {
        const stockBajo = producto.stock <= producto.stock_minimo;
        const stockAgotado = producto.stock === 0;
        const rowClass = stockBajo && !stockAgotado ? 'low-stock-row' : '';
        
        let stockBadge = '';
        if (stockAgotado) {
            stockBadge = '<span class="badge bg-danger stock-badge">Agotado</span>';
        } else if (stockBajo) {
            stockBadge = '<span class="badge bg-warning stock-badge">Stock bajo</span>';
        } else {
            stockBadge = '<span class="badge bg-success stock-badge">Disponible</span>';
        }
        
        const imagenUrl = producto.imagen ? 
            `/static/${producto.imagen}` : 
            '/static/uploads/productos/default.png';
        
        return `
            <tr class="${rowClass}">
                <td>
                    <img src="${imagenUrl}" alt="${producto.nombre}" 
                         class="product-image"
                         onerror="this.src='/static/uploads/productos/default.png'">
                </td>
                <td>
                    <strong>${producto.nombre}</strong>
                    ${producto.descripcion ? `<br><small class="text-muted">${producto.descripcion.substring(0, 50)}${producto.descripcion.length > 50 ? '...' : ''}</small>` : ''}
                </td>
                <td>
                    <span class="badge bg-secondary">${producto.categoria}</span>
                </td>
                <td>${producto.unidad}</td>
                <td>${Format.currency(producto.precio_compra)}</td>
                <td><strong>${Format.currency(producto.precio_venta)}</strong></td>
                <td>
                    <strong class="${stockAgotado ? 'text-danger' : stockBajo ? 'text-warning' : 'text-success'}">
                        ${producto.stock}
                    </strong>
                    <br>
                    ${stockBadge}
                </td>
                <td class="text-center action-buttons">
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="editarProducto(${producto.id})"
                            title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="confirmarEliminar(${producto.id}, '${producto.nombre}')"
                            title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('resultadosInfo').textContent = 
        `Mostrando ${productos.length} producto${productos.length !== 1 ? 's' : ''}`;
}

// ===== APLICAR FILTROS =====
function aplicarFiltros() {
    const busqueda = document.getElementById('searchInput').value.toLowerCase();
    const categoria = document.getElementById('filterCategoria').value;
    const stock = document.getElementById('filterStock').value;
    
    productosFiltrados = todosLosProductos.filter(producto => {
        // Filtro de búsqueda
        const coincideBusqueda = 
            producto.nombre.toLowerCase().includes(busqueda) ||
            (producto.descripcion && producto.descripcion.toLowerCase().includes(busqueda)) ||
            producto.categoria.toLowerCase().includes(busqueda);
        
        // Filtro de categoría
        const coincideCategoria = !categoria || producto.categoria === categoria;
        
        // Filtro de stock
        let coincideStock = true;
        if (stock === 'disponible') {
            coincideStock = producto.stock > producto.stock_minimo;
        } else if (stock === 'bajo') {
            coincideStock = producto.stock > 0 && producto.stock <= producto.stock_minimo;
        } else if (stock === 'agotado') {
            coincideStock = producto.stock === 0;
        }
        
        return coincideBusqueda && coincideCategoria && coincideStock;
    });
    
    mostrarProductos(productosFiltrados);
}

// ===== LIMPIAR FILTROS =====
function limpiarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterCategoria').value = '';
    document.getElementById('filterStock').value = '';
    aplicarFiltros();
}

// ===== ACTUALIZAR ESTADÍSTICAS =====
function actualizarEstadisticas() {
    const total = todosLosProductos.length;
    const valorTotal = todosLosProductos.reduce((sum, p) => sum + (p.precio_venta * p.stock), 0);
    const stockBajo = todosLosProductos.filter(p => p.stock > 0 && p.stock <= p.stock_minimo).length;
    const categorias = [...new Set(todosLosProductos.map(p => p.categoria))].length;
    
    document.getElementById('totalProductos').textContent = total;
    document.getElementById('valorTotal').textContent = Format.currency(valorTotal);
    document.getElementById('stockBajo').textContent = stockBajo;
    document.getElementById('totalCategorias').textContent = categorias;
}

// ===== EDITAR PRODUCTO =====
function editarProducto(id) {
    window.location.href = `/producto/editar/${id}`;
}

// ===== CONFIRMAR ELIMINACIÓN =====
function confirmarEliminar(id, nombre) {
    document.getElementById('deleteProductName').textContent = nombre;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
    
    document.getElementById('confirmDeleteBtn').onclick = function() {
        eliminarProducto(id);
        modal.hide();
    };
}

// ===== ELIMINAR PRODUCTO =====
async function eliminarProducto(id) {
    try {
        const response = await fetch(`/api/producto/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al eliminar producto');
        }
        
        const data = await response.json();
        
        if (data.success) {
            Notification.success('Producto eliminado correctamente');
            cargarProductos(); // Recargar lista
            
            // Emitir evento WebSocket
            if (typeof socket !== 'undefined') {
                socket.emit('producto_eliminado', { id: id });
            }
        } else {
            throw new Error(data.message || 'Error al eliminar');
        }
    } catch (error) {
        console.error('Error:', error);
        Notification.error('Error al eliminar el producto');
    }
}

// ===== EXPORTAR A EXCEL =====
async function exportarExcel() {
    try {
        Notification.info('Generando archivo Excel...');
        
        const response = await fetch('/api/productos/exportar');
        
        if (!response.ok) {
            throw new Error('Error al exportar');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productos_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Notification.success('Archivo Excel descargado correctamente');
    } catch (error) {
        console.error('Error:', error);
        Notification.error('Error al exportar a Excel');
    }
}

// ===== WEBSOCKET EVENTS =====
if (typeof socket !== 'undefined') {
    // Escuchar cuando se agrega un nuevo producto
    socket.on('producto_agregado', function(data) {
        console.log('Nuevo producto agregado:', data);
        cargarProductos(); // Recargar lista
    });
    
    // Escuchar cuando se actualiza un producto
    socket.on('producto_actualizado', function(data) {
        console.log('Producto actualizado:', data);
        cargarProductos(); // Recargar lista
    });
    
    // Escuchar cuando se elimina un producto
    socket.on('producto_eliminado', function(data) {
        console.log('Producto eliminado:', data);
        cargarProductos(); // Recargar lista
    });
}

// ===== MENSAJE CUANDO NO HAY PRODUCTOS =====
function mostrarMensajeVacio() {
    const tbody = document.getElementById('productosTableBody');
    const noProductos = document.getElementById('noProductos');
    const table = document.getElementById('productosTable');
    
    tbody.innerHTML = '';
    table.style.display = 'none';
    noProductos.classList.remove('d-none');
    document.getElementById('resultadosInfo').textContent = 'Mostrando 0 productos';
}

console.log('✅ productos.js cargado correctamente');