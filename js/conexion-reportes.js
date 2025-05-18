/**
 * Este archivo sirve como puente entre las funciones antiguas y nuevas de reportes
 * para mantener la compatibilidad de los botones "Reporte" individuales
 */

// Función original llamada por los botones "Reporte" en la tabla de profesores
function generarCartaDocente(profesorId) {
    console.log(`[Conexión-Reportes] Llamada a generarCartaDocente para profesor ID: ${profesorId}`);
    
    if (!profesorId) {
        console.error("[Conexión-Reportes] Error: No se proporcionó un ID de profesor válido");
        mostrarNotificacion('Error', 'No se pudo generar el reporte: ID de profesor no válido', 'error');
        return;
    }
    
    // Verificar si existe el modal de opciones de reporte
    const modal = document.getElementById('modalCartaDocente');
    if (!modal) {
        console.error("[Conexión-Reportes] Error: Modal 'modalCartaDocente' no encontrado");
        
        // Si no existe el modal, generar directamente el reporte mejorado PDF
        if (typeof generarReporteCargaDocenteMejorado === 'function') {
            try {
                mostrarCargando(true);
                setTimeout(() => {
                    try {
                        generarReporteCargaDocenteMejorado(profesorId);
                    } catch (error) {
                        console.error("[Conexión-Reportes] Error generando reporte:", error);
                        mostrarNotificacion('Error', `Error al generar el reporte: ${error.message || error}`, 'error');
                    } finally {
                        mostrarCargando(false);
                    }
                }, 100);
            } catch (error) {
                console.error("[Conexión-Reportes] Error:", error);
                mostrarNotificacion('Error', `Error al generar el reporte: ${error.message || error}`, 'error');
            }
        } else {
            mostrarNotificacion('Error', 'La función para generar reportes no está disponible', 'error');
        }
        return;
    }
    
    // Si existe el modal, configurarlo y mostrarlo
    modal.dataset.profesorId = profesorId;
    modal.dataset.tipoReporte = 'individual';
    
    // Buscar información del profesor para mostrar en el título del modal
    const profesor = window.estado?.profesores?.find(p => p.id === profesorId);
    const tituloModal = document.getElementById('tituloCartaDocente');
    if (profesor && tituloModal) {
        tituloModal.textContent = `Generar Carta Docente: ${profesor.nombre || 'Desconocido'}`;
    } else if (tituloModal) {
        tituloModal.textContent = 'Generar Carta Docente';
    }
    
    // Mostrar el modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Función para mostrar el indicador de carga durante la generación de reportes
function mostrarCargando(mostrar) {
    // Intentar obtener primero el loadingIndicator, luego loadingScreen como fallback
    const loadingIndicator = document.getElementById('loadingIndicator') || document.getElementById('loadingScreen');
    if (!loadingIndicator) {
        console.error('[Reportes] No se encontró ningún indicador de carga (loadingIndicator o loadingScreen)');
        return;
    }
    
    if (mostrar) {
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.classList.add('flex');
    } else {
        loadingIndicator.classList.remove('flex');
        loadingIndicator.classList.add('hidden');
    }
}

// Función para cerrar un modal
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Función de diagnóstico para usar desde la consola del navegador
function diagnosticarReportes() {
    console.log('====== DIAGNÓSTICO DE REPORTES ======');
    
    // Verificar disponibilidad de funciones críticas
    console.log('Funciones críticas:');
    console.log('- generarReportePDFMejorado:', typeof window.generarReportePDFMejorado === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- generarReporteCargaDocenteMejorado:', typeof window.generarReporteCargaDocenteMejorado === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- calcularCargaProfesoresDetallada:', typeof window.calcularCargaProfesoresDetallada === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- obtenerDiasHabiles:', typeof window.obtenerDiasHabiles === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- calcularHorasPorDia:', typeof window.calcularHorasPorDia === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- mostrarCargando:', typeof window.mostrarCargando === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- mostrarNotificacion:', typeof window.mostrarNotificacion === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- cerrarModal:', typeof window.cerrarModal === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    
    // Verificar objetos de estado
    console.log('Estado y datos:');
    console.log('- estado:', typeof window.estado === 'object' ? 'Presente ✅' : 'No encontrado ❌');
    console.log('- estado.profesores:', window.estado?.profesores ? `Presente (${window.estado.profesores.length} profesores) ✅` : 'No encontrado ❌');
    console.log('- estado.configuracion:', window.estado?.configuracion ? 'Presente ✅' : 'No encontrado ❌');
    
    // Verificar bibliotecas
    console.log('Bibliotecas:');
    console.log('- jsPDF (global):', typeof window.jsPDF === 'function' ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- jsPDF (namespace):', window.jspdf ? 'Presente ✅' : 'No encontrada ❌');
    console.log('- jsPDF.jsPDF:', window.jspdf?.jsPDF ? 'Presente ✅' : 'No encontrada ❌');
    
    // Intentar instanciar jsPDF para prueba
    try {
        let testPDF;
        if (window.jspdf && window.jspdf.jsPDF) {
            testPDF = new window.jspdf.jsPDF();
            console.log('- Instanciación jsPDF (namespace):', 'Exitosa ✅');
        } else if (window.jsPDF) {
            testPDF = new window.jsPDF();
            console.log('- Instanciación jsPDF (global):', 'Exitosa ✅');
        } else {
            console.log('- Instanciación jsPDF:', 'Fallida - No se encontró constructor ❌');
        }
        
        // Verificar método autoTable
        if (testPDF) {
            console.log('- autoTable disponible:', typeof testPDF.autoTable === 'function' ? 'Sí ✅' : 'No ❌');
        }
    } catch (error) {
        console.log('- Error al instanciar jsPDF:', error.message, '❌');
    }
    
    // Verificar existencia de elementos DOM relevantes
    console.log('Elementos DOM:');
    console.log('- generarCartaDocente:', typeof generarCartaDocente === 'function' ? 'Disponible ✅' : 'No disponible ❌');
    console.log('- generarReporteCargaDocenteMejorado:', typeof generarReporteCargaDocenteMejorado === 'function' ? 'Disponible ✅' : 'No disponible ❌');
    console.log('- generarReporteGlobalPDF:', typeof generarReporteGlobalPDF === 'function' ? 'Disponible ✅' : 'No disponible ❌');
    console.log('- generarReporteGlobalExcel:', typeof generarReporteGlobalExcel === 'function' ? 'Disponible ✅' : 'No disponible ❌');
    
    // Verificar elementos del DOM
    console.log('\nElementos DOM críticos:');
    console.log('- modalCartaDocente:', document.getElementById('modalCartaDocente') ? 'Presente ✅' : 'No encontrado ❌');
    console.log('- confirmarCartaBtn:', document.getElementById('confirmarCartaBtn') ? 'Presente ✅' : 'No encontrado ❌');
    console.log('- cancelarCartaBtn:', document.getElementById('cancelarCartaBtn') ? 'Presente ✅' : 'No encontrado ❌');
    console.log('- btnReporteGlobalPDF:', document.getElementById('btnReporteGlobalPDF') ? 'Presente ✅' : 'No encontrado ❌');
    console.log('- btnReporteGlobalExcel:', document.getElementById('btnReporteGlobalExcel') ? 'Presente ✅' : 'No encontrado ❌');
    
    // Verificar jsPDF y plugins
    console.log('\nLibrerías críticas:');
    console.log('- jspdf:', window.jspdf ? 'Disponible ✅' : 'No disponible ❌');
    console.log('- jsPDF.autoTable:', window.jspdf && window.jspdf.jsPDF ? (typeof new window.jspdf.jsPDF().autoTable === 'function' ? 'Disponible ✅' : 'No disponible ❌') : 'No verificable');
    
    console.log('\nEstado de datos:');
    console.log('- estado:', window.estado ? 'Disponible ✅' : 'No disponible ❌');
    console.log('- profesores:', window.estado?.profesores?.length || 0, 'encontrados');
    
    console.log('====== FIN DIAGNÓSTICO ======');
    
    return {
        generarReportePrueba: function(profesorId) {
            if (!profesorId && window.estado?.profesores?.length > 0) {
                profesorId = window.estado.profesores[0].id;
                console.log(`Usando el primer profesor disponible: ID=${profesorId}`);
            }
            
            if (profesorId && typeof generarReporteCargaDocenteMejorado === 'function') {
                console.log('Intentando generar un reporte de prueba...');
                generarReporteCargaDocenteMejorado(profesorId);
                return true;
            } else {
                console.error('No se puede generar un reporte de prueba: Función no disponible o ID no proporcionado');
                return false;
            }
        }
    };
}

// Exportar funciones globales (necesario para que sean accesibles desde los botones inline)
window.generarCartaDocente = generarCartaDocente;
window.mostrarCargando = mostrarCargando;
window.cerrarModal = cerrarModal;
window.diagnosticarReportes = diagnosticarReportes;
