# ============================================
# SCRIPT PARA VERIFICAR crear_compra
# ============================================
# Guarda como: verificar_crear_compra.py
# Ejecuta: python verificar_crear_compra.py
# ============================================

import ast
import sys

print("=" * 60)
print("VERIFICANDO FUNCIÓN crear_compra EN database.py")
print("=" * 60)

try:
    with open('utils/database.py', 'r', encoding='utf-8') as f:
        contenido = f.read()
    
    # Buscar cuántas veces aparece "def crear_compra"
    ocurrencias = contenido.count('def crear_compra')
    print(f"\n✅ Archivo leído correctamente")
    print(f"📊 La función 'crear_compra' aparece {ocurrencias} vez/veces")
    
    if ocurrencias > 1:
        print(f"\n⚠️  PROBLEMA DETECTADO: Hay {ocurrencias} definiciones de crear_compra")
        print("   Esto causa que se use la última y probablemente está mal.")
        print("\n   SOLUCIÓN: Elimina las versiones duplicadas y deja solo UNA.")
    
    # Verificar si tiene el registro en caja
    if 'INSERT INTO movimientos_caja' in contenido:
        # Contar cuántas veces aparece en el contexto de crear_compra
        lines = contenido.split('\n')
        en_crear_compra = False
        tiene_registro_caja = False
        linea_inicio = 0
        
        for i, line in enumerate(lines):
            if 'def crear_compra' in line:
                en_crear_compra = True
                linea_inicio = i + 1
            elif en_crear_compra and line.strip().startswith('def ') and 'crear_compra' not in line:
                # Terminó la función
                if tiene_registro_caja:
                    print(f"\n✅ La función crear_compra (línea {linea_inicio}) SÍ registra en caja")
                else:
                    print(f"\n❌ La función crear_compra (línea {linea_inicio}) NO registra en caja")
                en_crear_compra = False
                tiene_registro_caja = False
            elif en_crear_compra and 'movimientos_caja' in line:
                tiene_registro_caja = True
        
        # Verificar la última función si aún estaba abierta
        if en_crear_compra:
            if tiene_registro_caja:
                print(f"\n✅ La función crear_compra (línea {linea_inicio}) SÍ registra en caja")
            else:
                print(f"\n❌ La función crear_compra (línea {linea_inicio}) NO registra en caja")
    else:
        print("\n❌ NO se encontró ningún registro en movimientos_caja en todo el archivo")
    
    print("\n" + "=" * 60)
    print("RECOMENDACIÓN:")
    print("=" * 60)
    print("""
1. Abre utils/database.py
2. Busca TODAS las apariciones de "def crear_compra"
3. ELIMINA todas las versiones duplicadas
4. Deja solo UNA versión con este código:

def crear_compra(self, tipo, monto, proveedor, metodo_pago, descripcion=None, fecha=None, observaciones=None):
    # ... código que incluye:
    # INSERT INTO movimientos_caja 
    # (caja_id, tipo, concepto, monto, metodo_pago, referencia_id, referencia_tipo)
    # VALUES (?, ?, ?, ?, ?, ?, ?)
""")
    
except FileNotFoundError:
    print("❌ No se encontró el archivo utils/database.py")
except Exception as e:
    print(f"❌ Error: {e}")