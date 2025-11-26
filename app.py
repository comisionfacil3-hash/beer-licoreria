import os
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_file
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import sys

# Agregar el directorio utils al path
sys.path.append(os.path.dirname(__file__))
from utils.database import Database

# Cargar variables de entorno
load_dotenv()

# Inicializar Flask
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'beer_licoreria_secret_key_2025')

# Configuración de archivos subidos
UPLOAD_FOLDER = 'static/uploads/productos'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB máximo

# Crear carpeta de uploads si no existe
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Configurar SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Inicializar base de datos
db = Database()

# Credenciales de acceso (desde .env)
ADMIN_USER = os.getenv('ADMIN_USER', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'beer2025')

# ===== FUNCIONES AUXILIARES =====

def allowed_file(filename):
    """Verificar si el archivo tiene una extensión permitida"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ===== DECORADOR LOGIN REQUIRED =====

def login_required(f):
    """Decorador para proteger rutas"""
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            flash('Debes iniciar sesión para acceder a esta página', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ===== RUTAS DE AUTENTICACIÓN =====

@app.route('/')
def index():
    """Ruta raíz - Redirige al login o dashboard según sesión"""
    if session.get('logged_in'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Ruta de login"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USER and password == ADMIN_PASSWORD:
            session['logged_in'] = True
            session['username'] = username
            session['login_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            flash('¡Bienvenido al sistema Beer Licorería!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')
            return redirect(url_for('login'))
    
    if session.get('logged_in'):
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Cerrar sesión"""
    session.clear()
    flash('Has cerrado sesión correctamente', 'info')
    return redirect(url_for('login'))

# ===== DASHBOARD =====

@app.route('/dashboard')
@login_required
def dashboard():
    """Dashboard principal"""
    return render_template('dashboard.html')

# ===== RUTAS DE PRODUCTOS =====

@app.route('/productos')
@login_required
def productos():
    """Listado de productos"""
    return render_template('productos.html')

@app.route('/producto/nuevo', methods=['GET', 'POST'])
@login_required
def producto_nuevo():
    """Crear nuevo producto"""
    if request.method == 'POST':
        try:
            nombre = request.form.get('nombre')
            descripcion = request.form.get('descripcion', '')
            categoria = request.form.get('categoria')
            unidad = request.form.get('unidad')
            precio_compra = float(request.form.get('precio_compra'))
            precio_venta = float(request.form.get('precio_venta'))
            stock = int(request.form.get('stock'))
            stock_minimo = int(request.form.get('stock_minimo'))
            
            if precio_venta <= precio_compra:
                flash('El precio de venta debe ser mayor al precio de compra', 'danger')
                return redirect(url_for('producto_nuevo'))
            
            imagen_path = None
            if 'imagen' in request.files:
                file = request.files['imagen']
                if file and file.filename and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"{timestamp}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    imagen_path = f"uploads/productos/{filename}"
            
            producto_id = db.crear_producto(
                nombre=nombre,
                descripcion=descripcion,
                imagen=imagen_path,
                precio_compra=precio_compra,
                precio_venta=precio_venta,
                unidad=unidad,
                categoria=categoria,
                stock=stock,
                stock_minimo=stock_minimo
            )
            
            if producto_id:
                flash(f'Producto "{nombre}" creado correctamente', 'success')
                socketio.emit('producto_agregado', {'id': producto_id, 'nombre': nombre})
                return redirect(url_for('productos'))
            else:
                flash('Error al crear el producto', 'danger')
                
        except Exception as e:
            print(f"Error al crear producto: {e}")
            flash('Error al crear el producto', 'danger')
    
    return render_template('producto_form.html', producto=None)

@app.route('/producto/editar/<int:id>', methods=['GET', 'POST'])
@login_required
def producto_editar(id):
    """Editar producto existente"""
    if request.method == 'POST':
        try:
            nombre = request.form.get('nombre')
            descripcion = request.form.get('descripcion', '')
            categoria = request.form.get('categoria')
            unidad = request.form.get('unidad')
            precio_compra = float(request.form.get('precio_compra'))
            precio_venta = float(request.form.get('precio_venta'))
            stock = int(request.form.get('stock'))
            stock_minimo = int(request.form.get('stock_minimo'))
            
            if precio_venta <= precio_compra:
                flash('El precio de venta debe ser mayor al precio de compra', 'danger')
                return redirect(url_for('producto_editar', id=id))
            
            producto_actual = db.obtener_producto(id)
            imagen_path = producto_actual['imagen'] if producto_actual else None
            
            if 'imagen' in request.files:
                file = request.files['imagen']
                if file and file.filename and allowed_file(file.filename):
                    if imagen_path and os.path.exists(os.path.join('static', imagen_path)):
                        try:
                            os.remove(os.path.join('static', imagen_path))
                        except:
                            pass
                    
                    filename = secure_filename(file.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    filename = f"{timestamp}_{filename}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    imagen_path = f"uploads/productos/{filename}"
            
            success = db.actualizar_producto(
                id=id,
                nombre=nombre,
                descripcion=descripcion,
                imagen=imagen_path,
                precio_compra=precio_compra,
                precio_venta=precio_venta,
                unidad=unidad,
                categoria=categoria,
                stock=stock,
                stock_minimo=stock_minimo
            )
            
            if success:
                flash(f'Producto "{nombre}" actualizado correctamente', 'success')
                socketio.emit('producto_actualizado', {'id': id, 'nombre': nombre})
                return redirect(url_for('productos'))
            else:
                flash('Error al actualizar el producto', 'danger')
                
        except Exception as e:
            print(f"Error al actualizar producto: {e}")
            flash('Error al actualizar el producto', 'danger')
    
    producto = db.obtener_producto(id)
    if not producto:
        flash('Producto no encontrado', 'danger')
        return redirect(url_for('productos'))
    
    return render_template('producto_form.html', producto=producto)

# ===== API ENDPOINTS PARA PRODUCTOS =====

@app.route('/api/productos', methods=['GET'])
@login_required
def api_productos():
    """API: Obtener todos los productos"""
    productos = db.obtener_productos()
    return jsonify({'success': True, 'productos': productos})

@app.route('/api/producto/<int:id>', methods=['GET'])
@login_required
def api_producto(id):
    """API: Obtener un producto por ID"""
    producto = db.obtener_producto(id)
    if producto:
        return jsonify({'success': True, 'producto': producto})
    return jsonify({'success': False, 'message': 'Producto no encontrado'}), 404

@app.route('/api/producto/<int:id>', methods=['DELETE'])
@login_required
def api_producto_eliminar(id):
    """API: Eliminar un producto"""
    try:
        producto = db.obtener_producto(id)
        if producto and producto['imagen']:
            imagen_path = os.path.join('static', producto['imagen'])
            if os.path.exists(imagen_path):
                try:
                    os.remove(imagen_path)
                except:
                    pass
        
        success = db.eliminar_producto(id)
        if success:
            socketio.emit('producto_eliminado', {'id': id})
            return jsonify({'success': True, 'message': 'Producto eliminado correctamente'})
        return jsonify({'success': False, 'message': 'Error al eliminar producto'}), 400
    except Exception as e:
        print(f"Error al eliminar producto: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/productos/exportar')
@login_required
def api_productos_exportar():
    """API: Exportar productos a Excel"""
    try:
        productos = db.obtener_productos()
        filepath = db.exportar_productos_excel(productos)
        return send_file(filepath, as_attachment=True, download_name=f'productos_{datetime.now().strftime("%Y%m%d")}.xlsx')
    except Exception as e:
        print(f"Error al exportar: {e}")
        return jsonify({'success': False, 'message': 'Error al exportar'}), 500

# ===== RUTAS DE VENTAS =====

@app.route('/pos')
@login_required
def pos():
    """Punto de venta"""
    return render_template('pos.html')

@app.route('/ventas')
@login_required
def ventas():
    """Historial de ventas"""
    return render_template('ventas.html')

# ===== API ENDPOINTS PARA VENTAS =====

@app.route('/api/ventas', methods=['GET'])
@login_required
def api_ventas():
    """API: Obtener todas las ventas"""
    ventas = db.obtener_ventas()
    return jsonify({'success': True, 'ventas': ventas})

# ============================================
# CORRECCIÓN PARA app.py
# ============================================
# INSTRUCCIONES:
# Busca la función @app.route('/api/ventas', methods=['POST'])
# Y REEMPLAZA toda esa función con este código:
# ============================================

@app.route('/api/ventas', methods=['POST'])
@login_required
def api_crear_venta():
    """API: Crear nueva venta"""
    try:
        # 🔒 VALIDAR CAJA ABIERTA
        caja_actual = db.obtener_caja_actual()
        if not caja_actual:
            return jsonify({
                'success': False, 
                'message': '⚠️ Debes abrir la caja antes de realizar ventas'
            }), 400
        data = request.get_json()
        
        # Validar datos
        if not data or not data.get('items'):
            return jsonify({'success': False, 'message': 'Datos inválidos'}), 400
        
        # Crear venta
        venta_id = db.crear_venta(
            total=data['total'],
            metodo_pago=data['metodo_pago'],
            monto_efectivo=data.get('monto_efectivo', 0),
            monto_qr=data.get('monto_qr', 0),
            cliente_nombre=data.get('cliente_nombre'),
            cliente_telefono=data.get('cliente_telefono')
        )
        
        if not venta_id:
            return jsonify({'success': False, 'message': 'Error al crear venta'}), 500
        
        # Agregar detalle de venta y actualizar stock
        for item in data['items']:
            db.crear_detalle_venta(
                venta_id=venta_id,
                producto_id=item['producto_id'],
                producto_nombre=item['producto_nombre'],
                cantidad=item['cantidad'],
                precio_unitario=item['precio_unitario'],
                subtotal=item['subtotal']
            )
            
            # Actualizar stock
            db.actualizar_stock(item['producto_id'], item['cantidad'], 'restar')
        
        # Si es venta a crédito, crear registro de crédito
        if data.get('metodo_pago') == 'credito':
            db.crear_credito(
                venta_id=venta_id,
                cliente_nombre=data.get('cliente_nombre'),
                cliente_telefono=data.get('cliente_telefono'),
                monto_total=data.get('total')
            )
        
        # Emitir evento de WebSocket
        socketio.emit('venta_creada', {'venta_id': venta_id})
        
        return jsonify({'success': True, 'venta_id': venta_id, 'message': 'Venta creada correctamente'})
        
    except Exception as e:
        print(f"Error al crear venta: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/venta/<int:id>', methods=['GET'])
@login_required
def api_venta(id):
    """API: Obtener detalle de una venta"""
    try:
        venta = db.obtener_venta(id)
        if not venta:
            return jsonify({'success': False, 'message': 'Venta no encontrada'}), 404
        
        detalles = db.obtener_detalle_venta(id)
        
        return jsonify({
            'success': True,
            'venta': venta,
            'detalles': detalles
        })
    except Exception as e:
        print(f"Error al obtener venta: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/ventas/exportar')
@login_required
def api_ventas_exportar():
    """API: Exportar ventas a Excel"""
    try:
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        
        ventas = db.obtener_ventas_por_fecha(fecha_desde, fecha_hasta)
        filepath = db.exportar_ventas_excel(ventas, fecha_desde, fecha_hasta)
        
        return send_file(filepath, as_attachment=True, 
                        download_name=f'ventas_{fecha_desde}_{fecha_hasta}.xlsx')
    except Exception as e:
        print(f"Error al exportar ventas: {e}")
        return jsonify({'success': False, 'message': 'Error al exportar'}), 500


# ===== RUTAS DE OTROS MÓDULOS (PENDIENTES) =====

# ===================================================
# RUTAS CORREGIDAS PARA AGREGAR A app.py - MÓDULO DE COMPRAS
# ===================================================
# Agregar estas rutas después de las rutas de ventas (alrededor de la línea 400)

# ===== RUTAS DE COMPRAS =====

@app.route('/compras')
@login_required
def compras():
    """Página principal de compras y gastos"""
    return render_template('compras.html')

@app.route('/compra/nueva')
@login_required
def compra_nueva():
    """Formulario para nueva compra"""
    return render_template('compra_form.html', compra=None, datetime=datetime)

@app.route('/compra/editar/<int:id>')
@login_required
def compra_editar(id):
    """Formulario para editar compra"""
    compra = db.obtener_compra(id)
    if not compra:
        flash('Compra no encontrada', 'danger')
        return redirect(url_for('compras'))
    return render_template('compra_form.html', compra=compra, datetime=datetime)

# ===== API ENDPOINTS PARA COMPRAS =====

@app.route('/api/compras', methods=['GET', 'POST'])
@login_required
def api_compras():
    """API: Obtener compras (GET) o crear nueva compra (POST)"""
    if request.method == 'GET':
        try:
            # Obtener parámetros de filtro
            tipo = request.args.get('tipo')
            desde = request.args.get('desde')
            hasta = request.args.get('hasta')
            buscar = request.args.get('buscar')
            
            # Obtener compras
            compras = db.obtener_compras(tipo=tipo, desde=desde, hasta=hasta, buscar=buscar)
            
            # Calcular estadísticas
            estadisticas = db.obtener_estadisticas_compras(desde=desde, hasta=hasta)
            
            return jsonify({
                'success': True,
                'compras': compras,
                'estadisticas': estadisticas
            })
            
        except Exception as e:
            print(f"Error al obtener compras: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            # 🔒 VALIDAR CAJA ABIERTA
            caja_actual = db.obtener_caja_actual()
            if not caja_actual:
                return jsonify({
                    'success': False,
                    'message': '⚠️ Debes abrir la caja antes de registrar compras'
                }), 400
            data = request.get_json()
            
            # Validar datos
            if not data:
                return jsonify({'success': False, 'message': 'Datos inválidos'}), 400
            
            # Crear compra principal
            compra_id = db.crear_compra(
                tipo=data['tipo'],
                descripcion=data.get('descripcion'),
                monto=data['monto'],
                proveedor=data.get('proveedor'),
                metodo_pago=data['metodo_pago'],
                fecha=data.get('fecha'),
                observaciones=data.get('observaciones')
            )
            
            if not compra_id:
                return jsonify({'success': False, 'message': 'Error al crear compra'}), 500
            
            # Si es compra de productos, agregar detalles y actualizar stock
            if data['tipo'] == 'productos' and data.get('items'):
                for item in data['items']:
                    db.crear_detalle_compra(
                        compra_id=compra_id,
                        producto_id=item['producto_id'],
                        producto_nombre=item['producto_nombre'],
                        cantidad=item['cantidad'],
                        precio_unitario=item['precio_unitario'],
                        subtotal=item['subtotal']
                    )
                    
                    # Actualizar stock (sumar porque es compra)
                    db.actualizar_stock(item['producto_id'], item['cantidad'], 'sumar')
            
            # Emitir evento de WebSocket
            socketio.emit('compra_creada', {'compra_id': compra_id})
            
            return jsonify({
                'success': True,
                'compra_id': compra_id,
                'message': 'Compra registrada correctamente'
            })
            
        except Exception as e:
            print(f"Error al crear compra: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/compra/<int:id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def api_compra_detalle(id):
    """API: Operaciones con una compra específica"""
    if request.method == 'GET':
        # Obtener detalle de una compra
        try:
            compra = db.obtener_compra(id)
            if not compra:
                return jsonify({'success': False, 'message': 'Compra no encontrada'}), 404
            
            detalles = []
            if compra['tipo'] == 'productos':
                detalles = db.obtener_detalle_compra(id)
            
            return jsonify({
                'success': True,
                'compra': compra,
                'detalles': detalles
            })
            
        except Exception as e:
            print(f"Error al obtener compra: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500
    
    elif request.method == 'PUT':
        # Actualizar compra existente
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'message': 'Datos inválidos'}), 400
            
            # Actualizar compra
            resultado = db.actualizar_compra(
                id=id,
                tipo=data['tipo'],
                descripcion=data.get('descripcion'),
                monto=data['monto'],
                proveedor=data.get('proveedor'),
                metodo_pago=data['metodo_pago'],
                observaciones=data.get('observaciones')
            )
            
            if resultado:
                # Emitir evento de WebSocket
                socketio.emit('compra_actualizada', {'compra_id': id})
                return jsonify({'success': True, 'message': 'Compra actualizada correctamente'})
            else:
                return jsonify({'success': False, 'message': 'Error al actualizar compra'}), 500
                
        except Exception as e:
            print(f"Error al actualizar compra: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500
    
    elif request.method == 'DELETE':
        # Eliminar compra
        try:
            # Obtener compra antes de eliminar
            compra = db.obtener_compra(id)
            if not compra:
                return jsonify({'success': False, 'message': 'Compra no encontrada'}), 404
            
            # IMPORTANTE: Si es compra de productos, NO restauramos el stock
            # porque no sabemos si los productos ya se vendieron
            
            # Eliminar compra y sus detalles
            resultado = db.eliminar_compra(id)
            
            if resultado:
                # Emitir evento de WebSocket
                socketio.emit('compra_eliminada', {'compra_id': id})
                return jsonify({'success': True, 'message': 'Compra eliminada correctamente'})
            else:
                return jsonify({'success': False, 'message': 'Error al eliminar compra'}), 500
                
        except Exception as e:
            print(f"Error al eliminar compra: {e}")
            return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/compras/exportar')
@login_required
def api_compras_exportar():
    """API: Exportar compras a Excel"""
    try:
        tipo = request.args.get('tipo')
        desde = request.args.get('desde')
        hasta = request.args.get('hasta')
        
        compras = db.obtener_compras(tipo=tipo, desde=desde, hasta=hasta)
        filepath = db.exportar_compras_excel(compras, desde, hasta)
        
        return send_file(filepath, as_attachment=True,
                        download_name=f'compras_{desde}_{hasta}.xlsx')
                        
    except Exception as e:
        print(f"Error al exportar compras: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

# ===== FIN DE RUTAS DE COMPRAS =====

# ============================================
# CÓDIGO PARA AGREGAR A app.py
# ============================================
# INSTRUCCIONES:
# 1. Abre tu archivo app.py
# 2. Busca donde terminen las rutas de compras (después de @app.route('/api/compras/exportar'))
# 3. Pega todo este código DESPUÉS de esas rutas
# ============================================

# ===== RUTAS DE CRÉDITOS (MÓDULO 5) =====

@app.route('/creditos')
@login_required
def creditos():
    """Listado de créditos"""
    return render_template('creditos.html')

@app.route('/credito/<int:id>')
@login_required
def credito_detalle(id):
    """Detalle de un crédito específico"""
    credito = db.obtener_credito(id)
    if not credito:
        flash('Crédito no encontrado', 'danger')
        return redirect(url_for('creditos'))
    
    pagos = db.obtener_pagos_credito(id)
    venta = db.obtener_venta(credito['venta_id'])
    detalle_venta = db.obtener_detalle_venta(credito['venta_id'])
    
    return render_template('credito_detalle.html', 
                         credito=dict(credito),
                         pagos=[dict(p) for p in pagos],
                         venta=dict(venta) if venta else None,
                         detalle_venta=[dict(d) for d in detalle_venta])

# ===== APIs CRÉDITOS =====

@app.route('/api/creditos', methods=['GET'])
@login_required
def api_creditos_listar():
    """API para obtener lista de créditos"""
    try:
        estado = request.args.get('estado', 'todos')
        busqueda = request.args.get('busqueda', '')
        
        creditos = db.obtener_creditos(estado, busqueda)
        return jsonify([dict(c) for c in creditos])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/creditos/<int:id>', methods=['GET'])
@login_required
def api_credito_info(id):
    """API para obtener información de un crédito"""
    try:
        credito = db.obtener_credito(id)
        if credito:
            pagos = db.obtener_pagos_credito(id)
            return jsonify({
                'credito': dict(credito),
                'pagos': [dict(p) for p in pagos]
            })
        return jsonify({'error': 'Crédito no encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/creditos/<int:id>/pagar', methods=['POST'])
@login_required
def api_credito_pagar(id):
    """API para registrar un pago de crédito"""
    try:
        data = request.json
        
        # Validar monto
        if not data.get('monto') or float(data['monto']) <= 0:
            return jsonify({'error': 'Monto inválido'}), 400
        
        # Registrar pago
        pago_id = db.registrar_pago_credito(id, data)
        
        # Obtener crédito actualizado
        credito = db.obtener_credito(id)
        
        # Emitir evento de WebSocket
        socketio.emit('pago_credito_registrado', {
            'credito_id': id,
            'pago_id': pago_id,
            'credito': dict(credito)
        })
        
        return jsonify({'success': True, 'pago_id': pago_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/creditos/estadisticas')
@login_required
def api_creditos_estadisticas():
    """API para obtener estadísticas de créditos"""
    try:
        stats = db.obtener_estadisticas_creditos()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/creditos/exportar')
@login_required
def api_creditos_exportar():
    """Exportar créditos a Excel"""
    try:
        archivo = db.exportar_creditos_excel()
        return send_file(archivo, as_attachment=True)
    except Exception as e:
        flash(f'Error al exportar: {str(e)}', 'danger')
        return redirect(url_for('creditos'))

@app.route('/api/creditos/resumen-cliente/<nombre>')
@login_required
def api_creditos_resumen_cliente(nombre):
    """API para obtener resumen de créditos de un cliente"""
    try:
        resumen = db.obtener_resumen_creditos_cliente(nombre)
        return jsonify(resumen)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== RUTAS DE CAJA (MÓDULO 6) =====

@app.route('/caja')
@login_required
def caja():
    """Gestión de caja"""
    caja_actual = db.obtener_caja_actual()
    return render_template('caja.html', caja=dict(caja_actual) if caja_actual else None)

@app.route('/caja/historial')
@login_required
def caja_historial():
    """Historial de cierres de caja"""
    return render_template('caja_historial.html')

# ===== APIs CAJA =====

@app.route('/api/caja/actual', methods=['GET'])
@login_required
def api_caja_actual():
    """API para obtener información de la caja actual"""
    try:
        caja = db.obtener_caja_actual()
        if caja:
            movimientos = db.obtener_movimientos_caja(caja['id'])
            resumen = db.obtener_resumen_caja(caja['id'])
            return jsonify({
                'caja': dict(caja),
                'movimientos': [dict(m) for m in movimientos],
                'resumen': resumen
            })
        return jsonify({'caja': None, 'movimientos': [], 'resumen': {}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/caja/abrir', methods=['POST'])
@login_required
def api_caja_abrir():
    """API para abrir caja"""
    try:
        data = request.json
        
        # Verificar si hay caja abierta
        caja_actual = db.obtener_caja_actual()
        if caja_actual:
            return jsonify({'error': 'Ya hay una caja abierta'}), 400
        
        # Abrir nueva caja
        caja_id = db.abrir_caja(data.get('monto_inicial', 0))
        
        # Emitir evento de WebSocket
        socketio.emit('caja_abierta', {
            'caja_id': caja_id,
            'usuario': session.get('username')
        })
        
        return jsonify({'success': True, 'caja_id': caja_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/caja/cerrar', methods=['POST'])
@login_required
def api_caja_cerrar():
    """API para cerrar caja"""
    try:
        data = request.json
        
        # Obtener caja actual
        caja_actual = db.obtener_caja_actual()
        if not caja_actual:
            return jsonify({'error': 'No hay caja abierta'}), 400
        
        # Cerrar caja
        resultado = db.cerrar_caja(caja_actual['id'], data.get('efectivo_contado', 0))
        
        # Emitir evento de WebSocket
        socketio.emit('caja_cerrada', {
            'caja_id': caja_actual['id'],
            'resultado': resultado
        })
        
        return jsonify({'success': True, 'resultado': resultado})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/caja/movimientos/<int:caja_id>')
@login_required
def api_caja_movimientos(caja_id):
    """API para obtener movimientos de una caja"""
    try:
        movimientos = db.obtener_movimientos_caja(caja_id)
        return jsonify([dict(m) for m in movimientos])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/caja/historial', methods=['GET'])
@login_required
def api_caja_historial():
    """API para obtener historial de cajas"""
    try:
        fecha_desde = request.args.get('fecha_desde')
        fecha_hasta = request.args.get('fecha_hasta')
        
        cajas = db.obtener_historial_cajas(fecha_desde, fecha_hasta)
        return jsonify([dict(c) for c in cajas])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/caja/<int:id>/detalle')
@login_required
def api_caja_detalle(id):
    """API para obtener detalle de una caja específica"""
    try:
        caja = db.obtener_caja(id)
        if caja:
            movimientos = db.obtener_movimientos_caja(id)
            resumen = db.obtener_resumen_caja(id)
            return jsonify({
                'caja': dict(caja),
                'movimientos': [dict(m) for m in movimientos],
                'resumen': resumen
            })
        return jsonify({'error': 'Caja no encontrada'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/caja/exportar')
@login_required
def api_caja_exportar():
    """Exportar reporte de caja a Excel"""
    try:
        caja_id = request.args.get('caja_id')
        fecha_desde = request.args.get('fecha_desde')
        fecha_hasta = request.args.get('fecha_hasta')
        
        if caja_id:
            archivo = db.exportar_caja_excel(caja_id)
        else:
            archivo = db.exportar_historial_cajas_excel(fecha_desde, fecha_hasta)
        
        return send_file(archivo, as_attachment=True)
    except Exception as e:
        flash(f'Error al exportar: {str(e)}', 'danger')
        return redirect(url_for('caja'))

@app.route('/api/caja/retiro', methods=['POST'])
@login_required
def api_caja_retiro():
    """API para registrar un retiro de caja"""
    try:
        data = request.json
        
        # Obtener caja actual
        caja_actual = db.obtener_caja_actual()
        if not caja_actual:
            return jsonify({'error': 'No hay caja abierta'}), 400
        
        # Registrar retiro
        movimiento_id = db.registrar_retiro_caja(caja_actual['id'], data)
        
        # Emitir evento de WebSocket
        socketio.emit('retiro_caja', {
            'caja_id': caja_actual['id'],
            'movimiento_id': movimiento_id,
            'monto': data.get('monto')
        })
        
        return jsonify({'success': True, 'movimiento_id': movimiento_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# FIN DEL CÓDIGO PARA app.py
# ============================================


# ========================================
# EVENTOS DE SOCKET.IO (AGREGAR EN LA SECCIÓN DE SOCKETS)
# ========================================

@socketio.on('compra_registrada')
def handle_compra_registrada():
    """Evento cuando se registra una nueva compra"""
    emit('actualizar_compras', broadcast=True)
    emit('actualizar_productos', broadcast=True)  # Por si actualizó stock

@socketio.on('compra_eliminada')
def handle_compra_eliminada():
    """Evento cuando se elimina una compra"""
    emit('actualizar_compras', broadcast=True)

# ========================================
# NOTAS DE IMPLEMENTACIÓN:
# ========================================
# 1. Asegúrate de tener estas importaciones:
#    - from datetime import datetime, timedelta
#    - from flask import send_file
#
# 2. Las funciones de base de datos que se llaman aquí
#    están definidas en el archivo database_compras.py
#
# 3. Recuerda agregar las rutas al menú de navegación en base.html:
#    <a href="/compras" class="nav-link">
#        <i class="bi bi-cart-plus"></i> Compras
#    </a>
#
# 4. El orden de las rutas es importante, colócalas después
#    de las rutas de ventas pero antes del if __name__ == '__main__'
# ========================================


# ============================================
# RUTAS DE ESTADÍSTICAS PARA app.py
# ============================================
# INSTRUCCIONES:
# 1. Abre tu archivo app.py
# 2. Busca la línea: @app.route('/estadisticas')
# 3. ELIMINA esa ruta (la que redirige al dashboard con mensaje "en desarrollo")
# 4. Copia y pega TODO este código en su lugar
# 5. Asegúrate de que esté ANTES de la sección "# ===== WEBSOCKET EVENTS ====="
# ============================================

# ===== RUTAS DE ESTADÍSTICAS (MÓDULO 7) =====

@app.route('/estadisticas')
@login_required
def estadisticas():
    """Página principal de estadísticas"""
    return render_template('estadisticas.html')

# ===== APIs ESTADÍSTICAS =====

@app.route('/api/dashboard/stats')
@login_required
def api_dashboard_stats():
    """API para obtener estadísticas del dashboard"""
    try:
        stats = db.obtener_estadisticas_dashboard()
        if stats:
            return jsonify({'success': True, 'data': stats})
        return jsonify({'success': False, 'message': 'Error al obtener estadísticas'}), 500
    except Exception as e:
        print(f"Error al obtener stats dashboard: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/resumen')
@login_required
def api_estadisticas_resumen():
    """API para obtener resumen financiero"""
    try:
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        
        resumen = db.obtener_resumen_financiero(fecha_desde, fecha_hasta)
        if resumen:
            return jsonify({'success': True, 'data': resumen})
        return jsonify({'success': False, 'message': 'Error al obtener resumen'}), 500
    except Exception as e:
        print(f"Error al obtener resumen: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/ventas')
@login_required
def api_estadisticas_ventas():
    """API para obtener ventas por período"""
    try:
        periodo = request.args.get('periodo', 'dia')  # dia, semana, mes
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        
        ventas = db.obtener_ventas_por_periodo(periodo, fecha_desde, fecha_hasta)
        return jsonify({'success': True, 'data': ventas})
    except Exception as e:
        print(f"Error al obtener ventas por período: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/compras')
@login_required
def api_estadisticas_compras():
    """API para obtener compras por período"""
    try:
        periodo = request.args.get('periodo', 'dia')
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        
        compras = db.obtener_compras_por_periodo(periodo, fecha_desde, fecha_hasta)
        return jsonify({'success': True, 'data': compras})
    except Exception as e:
        print(f"Error al obtener compras por período: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/top-productos')
@login_required
def api_estadisticas_top_productos():
    """API para obtener top productos más vendidos"""
    try:
        limite = request.args.get('limite', 10, type=int)
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        
        productos = db.obtener_top_productos(limite, fecha_desde, fecha_hasta)
        return jsonify({'success': True, 'data': productos})
    except Exception as e:
        print(f"Error al obtener top productos: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/categorias')
@login_required
def api_estadisticas_categorias():
    """API para obtener ventas por categoría"""
    try:
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        
        categorias = db.obtener_ventas_por_categoria(fecha_desde, fecha_hasta)
        return jsonify({'success': True, 'data': categorias})
    except Exception as e:
        print(f"Error al obtener ventas por categoría: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/comparativa')
@login_required
def api_estadisticas_comparativa():
    """API para obtener comparativa entre períodos"""
    try:
        comparativa = db.obtener_comparativa_periodos()
        if comparativa:
            return jsonify({'success': True, 'data': comparativa})
        return jsonify({'success': False, 'message': 'Error al obtener comparativa'}), 500
    except Exception as e:
        print(f"Error al obtener comparativa: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/ventas-hora')
@login_required
def api_estadisticas_ventas_hora():
    """API para obtener distribución de ventas por hora"""
    try:
        fecha = request.args.get('fecha')
        
        ventas_hora = db.obtener_ventas_por_hora(fecha)
        return jsonify({'success': True, 'data': ventas_hora})
    except Exception as e:
        print(f"Error al obtener ventas por hora: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/estadisticas/exportar')
@login_required
def api_estadisticas_exportar():
    """API para exportar estadísticas a Excel"""
    try:
        fecha_desde = request.args.get('desde')
        fecha_hasta = request.args.get('hasta')
        
        if not fecha_desde or not fecha_hasta:
            # Si no hay fechas, usar el mes actual
            from datetime import datetime
            hoy = datetime.now()
            fecha_desde = hoy.replace(day=1).strftime('%Y-%m-%d')
            fecha_hasta = hoy.strftime('%Y-%m-%d')
        
        archivo = db.exportar_estadisticas_excel(fecha_desde, fecha_hasta)
        
        if archivo:
            return send_file(archivo, as_attachment=True, 
                           download_name=f'estadisticas_{fecha_desde}_{fecha_hasta}.xlsx')
        
        flash('Error al generar el reporte', 'danger')
        return redirect(url_for('estadisticas'))
        
    except Exception as e:
        print(f"Error al exportar estadísticas: {e}")
        flash(f'Error al exportar: {str(e)}', 'danger')
        return redirect(url_for('estadisticas'))

# ===== FIN DE RUTAS DE ESTADÍSTICAS =====

# ============================================
# FIN DEL CÓDIGO PARA app.py
# ============================================

# ===== WEBSOCKET EVENTS =====

@socketio.on('connect')
def handle_connect():
    """Evento cuando un cliente se conecta"""
    print('✅ Cliente conectado')
    emit('notification', {
        'type': 'info',
        'message': 'Conectado al servidor en tiempo real'
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Evento cuando un cliente se desconecta"""
    print('❌ Cliente desconectado')

# ===== MANEJADOR DE ERRORES =====

@app.errorhandler(404)
def page_not_found(e):
    flash('Página no encontrada', 'danger')
    return redirect(url_for('dashboard') if session.get('logged_in') else url_for('login'))

@app.errorhandler(500)
def internal_error(e):
    flash('Error interno del servidor', 'danger')
    return redirect(url_for('dashboard') if session.get('logged_in') else url_for('login'))

# ===== INICIAR SERVIDOR =====

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print('🚀 Iniciando servidor Beer Licorería...')
    print(f'📍 Puerto: {port}')
    print(f'👤 Usuario: {ADMIN_USER}')
    print(f'🔑 Contraseña: {ADMIN_PASSWORD}')
    print('-' * 50)
    
    socketio.run(app, debug=False, host='0.0.0.0', port=port)