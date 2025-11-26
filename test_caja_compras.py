# ============================================
# SCRIPT DE PRUEBA - test_caja_compras.py
# ============================================
# Ejecuta: python test_caja_compras.py
# ============================================

import sqlite3
from datetime import datetime

db_path = 'database/licoreria.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 60)
print("PRUEBA DE INTEGRACIÓN: CAJA + COMPRAS + VENTAS")
print("=" * 60)

# 1. Verificar caja abierta
print("\n1️⃣ VERIFICANDO CAJA ABIERTA:")
cursor.execute("SELECT * FROM caja WHERE estado = 'abierta'")
caja = cursor.fetchone()

if not caja:
    print("   ❌ NO HAY CAJA ABIERTA")
    print("   Por favor abre la caja desde la aplicación")
    conn.close()
    exit()

caja_id = caja[0]
monto_inicial = caja[3]
print(f"   ✅ Caja ID: {caja_id}")
print(f"   💰 Monto inicial: Bs. {monto_inicial}")

# 2. Calcular movimientos
print("\n2️⃣ CALCULANDO MOVIMIENTOS:")
cursor.execute("""
    SELECT 
        tipo,
        metodo_pago,
        SUM(monto) as total,
        COUNT(*) as cantidad
    FROM movimientos_caja 
    WHERE caja_id = ?
    GROUP BY tipo, metodo_pago
""", (caja_id,))

movimientos = cursor.fetchall()
print(f"   📊 Resumen de movimientos:")

ingresos_efectivo = 0
ingresos_qr = 0
egresos_efectivo = 0
egresos_otros = 0

for mov in movimientos:
    tipo, metodo, total, cant = mov
    print(f"      • {tipo.upper()} ({metodo or 'N/A'}): Bs. {total:.2f} ({cant} movimientos)")
    
    if tipo == 'ingreso' and metodo == 'efectivo':
        ingresos_efectivo = total
    elif tipo == 'ingreso' and metodo == 'qr':
        ingresos_qr = total
    elif tipo == 'egreso' and metodo == 'efectivo':
        egresos_efectivo = total
    elif tipo == 'egreso':
        egresos_otros += total

# 3. Calcular efectivo esperado
efectivo_esperado = monto_inicial + ingresos_efectivo - egresos_efectivo
print(f"\n3️⃣ CÁLCULO DE EFECTIVO:")
print(f"   Monto inicial:      Bs. {monto_inicial:.2f}")
print(f"   + Ingresos (Efec):  Bs. {ingresos_efectivo:.2f}")
print(f"   - Egresos (Efec):   Bs. {egresos_efectivo:.2f}")
print(f"   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(f"   = EFECTIVO ESPERADO: Bs. {efectivo_esperado:.2f}")

print(f"\n   📱 Ingresos QR:      Bs. {ingresos_qr:.2f}")
print(f"   💳 Egresos Otros:    Bs. {egresos_otros:.2f}")

# 4. Verificar ventas registradas
print("\n4️⃣ VENTAS REGISTRADAS EN CAJA:")
cursor.execute("""
    SELECT COUNT(*), COALESCE(SUM(monto), 0)
    FROM movimientos_caja 
    WHERE caja_id = ? AND tipo = 'ingreso' AND referencia_tipo = 'venta'
""", (caja_id,))
ventas_info = cursor.fetchone()
print(f"   🛒 Ventas: {ventas_info[0]}")
print(f"   💵 Total: Bs. {ventas_info[1]:.2f}")

# 5. Verificar compras registradas
print("\n5️⃣ COMPRAS REGISTRADAS EN CAJA:")
cursor.execute("""
    SELECT COUNT(*), COALESCE(SUM(monto), 0)
    FROM movimientos_caja 
    WHERE caja_id = ? AND tipo = 'egreso' AND referencia_tipo = 'compra'
""", (caja_id,))
compras_info = cursor.fetchone()
print(f"   🛍️  Compras: {compras_info[0]}")
print(f"   💸 Total: Bs. {compras_info[1]:.2f}")

# 6. Últimos 5 movimientos
print("\n6️⃣ ÚLTIMOS 5 MOVIMIENTOS:")
cursor.execute("""
    SELECT tipo, concepto, monto, metodo_pago, 
           datetime(fecha, 'localtime') as fecha_local
    FROM movimientos_caja 
    WHERE caja_id = ?
    ORDER BY fecha DESC
    LIMIT 5
""", (caja_id,))

ultimos = cursor.fetchall()
for mov in ultimos:
    tipo_icon = "📥" if mov[0] == 'ingreso' else "📤"
    print(f"   {tipo_icon} {mov[1]}: Bs. {mov[2]:.2f} ({mov[3] or 'N/A'}) - {mov[4]}")

conn.close()

print("\n" + "=" * 60)
print("✅ PRUEBA COMPLETADA")
print("=" * 60)