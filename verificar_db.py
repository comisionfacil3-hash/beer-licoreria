# ============================================
# SCRIPT PARA VERIFICAR TABLAS
# ============================================
# Crea un archivo: verificar_db.py
# Ejecuta: python verificar_db.py
# ============================================

import sqlite3

db_path = 'database/licoreria.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 50)
print("VERIFICACIÓN DE BASE DE DATOS")
print("=" * 50)

# Verificar tabla caja
print("\n1️⃣ TABLA CAJA:")
cursor.execute("SELECT * FROM caja WHERE estado = 'abierta'")
caja = cursor.fetchone()
if caja:
    print(f"   ✅ Caja abierta encontrada: ID {caja[0]}")
    print(f"   💰 Monto inicial: Bs. {caja[3]}")
else:
    print("   ❌ No hay caja abierta")

# Verificar movimientos_caja
print("\n2️⃣ TABLA MOVIMIENTOS_CAJA:")
if caja:
    cursor.execute("SELECT COUNT(*) FROM movimientos_caja WHERE caja_id = ?", (caja[0],))
    count = cursor.fetchone()[0]
    print(f"   📊 Movimientos registrados: {count}")
    
    # Mostrar últimos 3 movimientos
    cursor.execute("""
        SELECT tipo, concepto, monto, metodo_pago, fecha 
        FROM movimientos_caja 
        WHERE caja_id = ? 
        ORDER BY fecha DESC 
        LIMIT 3
    """, (caja[0],))
    
    movimientos = cursor.fetchall()
    if movimientos:
        print("\n   📋 Últimos movimientos:")
        for mov in movimientos:
            print(f"      • {mov[0].upper()}: {mov[1]} - Bs. {mov[2]} ({mov[3]}) - {mov[4]}")
    else:
        print("   ⚠️  No hay movimientos registrados")

# Verificar ventas de hoy
print("\n3️⃣ VENTAS DE HOY:")
cursor.execute("SELECT COUNT(*), SUM(total) FROM ventas WHERE DATE(fecha) = DATE('now', 'localtime')")
ventas = cursor.fetchone()
print(f"   🛒 Ventas: {ventas[0]}")
print(f"   💵 Total: Bs. {ventas[1] if ventas[1] else 0}")

conn.close()
print("\n" + "=" * 50)