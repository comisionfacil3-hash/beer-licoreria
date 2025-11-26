/* ========================================
   BEER LICORERÍA - JAVASCRIPT PRINCIPAL
   Sistema de Gestión v1.0
   ======================================== */

// ===== CONFIGURACIÓN GLOBAL =====
const APP_CONFIG = {
    name: 'Beer Licorería',
    version: '1.0',
    currency: 'Bs.',
    locale: 'es-BO'
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version} - Sistema iniciado`);
    
    // Inicializar funcionalidades
    initializeTooltips();
    initializePopovers();
    autoCloseAlerts();
    
    console.log('✅ Sistema listo para usar');
});

// ===== BOOTSTRAP TOOLTIPS =====
function initializeTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

// ===== BOOTSTRAP POPOVERS =====
function initializePopovers() {
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
}

// ===== AUTO-CERRAR ALERTAS =====
function autoCloseAlerts() {
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000); // 5 segundos
    });
}

// ===== SISTEMA DE NOTIFICACIONES =====
const Notification = {
    /**
     * Mostrar notificación de éxito
     * @param {string} message - Mensaje a mostrar
     * @param {number} duration - Duración en ms (default: 4000)
     */
    success: function(message, duration = 4000) {
        this.show(message, 'success', duration);
    },
    
    /**
     * Mostrar notificación de error
     * @param {string} message - Mensaje a mostrar
     * @param {number} duration - Duración en ms (default: 5000)
     */
    error: function(message, duration = 5000) {
        this.show(message, 'danger', duration);
    },
    
    /**
     * Mostrar notificación de advertencia
     * @param {string} message - Mensaje a mostrar
     * @param {number} duration - Duración en ms (default: 4000)
     */
    warning: function(message, duration = 4000) {
        this.show(message, 'warning', duration);
    },
    
    /**
     * Mostrar notificación de información
     * @param {string} message - Mensaje a mostrar
     * @param {number} duration - Duración en ms (default: 4000)
     */
    info: function(message, duration = 4000) {
        this.show(message, 'info', duration);
    },
    
    /**
     * Función base para mostrar notificaciones
     */
    show: function(message, type, duration) {
        const icons = {
            success: 'check-circle-fill',
            danger: 'exclamation-triangle-fill',
            warning: 'exclamation-circle-fill',
            info: 'info-circle-fill'
        };
        
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${icons[type]}"></i> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Crear contenedor si no existe
        let container = document.getElementById('notificationContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationContainer';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }
        
        // Agregar notificación
        const alertDiv = document.createElement('div');
        alertDiv.innerHTML = alertHTML;
        container.appendChild(alertDiv.firstElementChild);
        
        // Auto-cerrar después de la duración especificada
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, duration);
    }
};

// ===== FORMATEO DE NÚMEROS Y MONEDA =====
const Format = {
    /**
     * Formatear número a moneda boliviana
     * @param {number} amount - Cantidad a formatear
     * @returns {string} Cantidad formateada (ej: "Bs. 1,234.56")
     */
    currency: function(amount) {
        if (isNaN(amount)) return `${APP_CONFIG.currency} 0.00`;
        return `${APP_CONFIG.currency} ${parseFloat(amount).toLocaleString('es-BO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    },
    
    /**
     * Formatear número con separadores de miles
     * @param {number} number - Número a formatear
     * @returns {string} Número formateado
     */
    number: function(number) {
        if (isNaN(number)) return '0';
        return parseFloat(number).toLocaleString('es-BO');
    },
    
    /**
     * Formatear fecha
     * @param {Date|string} date - Fecha a formatear
     * @returns {string} Fecha formateada (ej: "14/11/2025")
     */
    date: function(date) {
        const d = new Date(date);
        return d.toLocaleDateString('es-BO');
    },
    
    /**
     * Formatear fecha y hora
     * @param {Date|string} datetime - Fecha y hora a formatear
     * @returns {string} Fecha y hora formateada
     */
    datetime: function(datetime) {
        const d = new Date(datetime);
        return d.toLocaleString('es-BO');
    }
};

// ===== VALIDACIONES =====
const Validate = {
    /**
     * Validar email
     * @param {string} email - Email a validar
     * @returns {boolean}
     */
    email: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * Validar teléfono (formato boliviano)
     * @param {string} phone - Teléfono a validar
     * @returns {boolean}
     */
    phone: function(phone) {
        const re = /^[67]\d{7}$/; // Formato: 7XXXXXXX o 6XXXXXXX
        return re.test(phone.replace(/\s+/g, ''));
    },
    
    /**
     * Validar número positivo
     * @param {number} value - Valor a validar
     * @returns {boolean}
     */
    positiveNumber: function(value) {
        return !isNaN(value) && parseFloat(value) > 0;
    },
    
    /**
     * Validar campo requerido
     * @param {string} value - Valor a validar
     * @returns {boolean}
     */
    required: function(value) {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    }
};

// ===== UTILIDADES =====
const Utils = {
    /**
     * Copiar texto al portapapeles
     * @param {string} text - Texto a copiar
     */
    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            Notification.success('Copiado al portapapeles');
        }).catch(() => {
            Notification.error('Error al copiar al portapapeles');
        });
    },
    
    /**
     * Descargar contenido como archivo
     * @param {string} content - Contenido del archivo
     * @param {string} filename - Nombre del archivo
     * @param {string} type - Tipo MIME
     */
    downloadFile: function(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type: type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },
    
    /**
     * Confirmar acción con modal
     * @param {string} message - Mensaje de confirmación
     * @param {Function} onConfirm - Callback si confirma
     */
    confirm: function(message, onConfirm) {
        if (confirm(message)) {
            onConfirm();
        }
    },
    
    /**
     * Mostrar spinner de carga
     * @param {boolean} show - Mostrar u ocultar
     */
    loading: function(show = true) {
        let spinner = document.getElementById('globalSpinner');
        
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'globalSpinner';
            spinner.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                            background: rgba(0,0,0,0.5); z-index: 99999; 
                            display: flex; align-items: center; justify-content: center;">
                    <div class="spinner-border text-light" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </div>
            `;
            document.body.appendChild(spinner);
        }
        
        spinner.style.display = show ? 'block' : 'none';
    }
};

// ===== CONEXIÓN WEBSOCKET (SOCKET.IO) =====
let socket;

if (typeof io !== 'undefined') {
    socket = io();
    
    socket.on('connect', function() {
        console.log('✅ Conectado al servidor WebSocket');
    });
    
    socket.on('disconnect', function() {
        console.log('❌ Desconectado del servidor WebSocket');
        Notification.warning('Conexión perdida. Intentando reconectar...');
    });
    
    socket.on('reconnect', function() {
        console.log('🔄 Reconectado al servidor WebSocket');
        Notification.success('Conexión restaurada');
    });
    
    // Escuchar eventos personalizados
    socket.on('notification', function(data) {
        if (data.type && data.message) {
            Notification[data.type](data.message);
        }
    });
}

// ===== FUNCIONES DE BÚSQUEDA EN TIEMPO REAL =====
function setupRealtimeSearch(inputId, tableBodyId, searchFunction) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    let timeout;
    input.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            searchFunction(this.value);
        }, 300); // Esperar 300ms después de que el usuario deje de escribir
    });
}

// ===== PREVENIR ENVÍO DUPLICADO DE FORMULARIOS =====
document.addEventListener('submit', function(e) {
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (submitBtn && !submitBtn.disabled) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
        
        // Rehabilitar después de 3 segundos por si hay error
        setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.getAttribute('data-original-text') || 'Enviar';
        }, 3000);
    }
});

// ===== EXPORTAR FUNCIONES GLOBALES =====
window.Notification = Notification;
window.Format = Format;
window.Validate = Validate;
window.Utils = Utils;

// ===== LOGS DE CONSOLA PERSONALIZADOS =====
console.log('%c🍺 Beer Licorería', 'color: #007bff; font-size: 20px; font-weight: bold;');
console.log('%cSistema de Gestión v1.0', 'color: #6c757d; font-size: 14px;');
console.log('%c© 2025 - Desarrollado por GaryA', 'color: #6c757d; font-size: 12px;');

// ===== FIN DEL SCRIPT =====
