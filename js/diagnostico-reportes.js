// Herramientas para diagnosticar y probar la generación de reportes

/**
 * Función para probar la generación de reportes de forma independiente
 * Esta función permite probar la generación de reportes PDF y Excel directamente
 * sin depender de la interfaz de usuario
 */
function probarReportes() {
    console.log("=== INICIANDO PRUEBAS DE REPORTES ===");
    
    // Verificar disponibilidad de funciones de reporte
    console.log("Verificando disponibilidad de funciones:");
    const funcionesCriticas = {
        'generarReporteCargaDocenteMejorado': typeof window.generarReporteCargaDocenteMejorado === 'function',
        'generarReportePDFMejorado': typeof window.generarReportePDFMejorado === 'function',
        'generarCartaDocenteExcel': typeof window.generarCartaDocenteExcel === 'function',
        'generarReporteGlobalExcel': typeof window.generarReporteGlobalExcel === 'function',
        'calcularCargaProfesoresDetallada': typeof window.calcularCargaProfesoresDetallada === 'function',
        'mostrarCargando': typeof window.mostrarCargando === 'function',
        'mostrarNotificacion': typeof window.mostrarNotificacion === 'function'
    };
    
    // Imprimir estado de cada función
    Object.entries(funcionesCriticas).forEach(([nombre, disponible]) => {
        console.log(`- ${nombre}: ${disponible ? 'Disponible ✅' : 'No disponible ❌'}`);
    });
    
    // Verificar si todas las funciones críticas están disponibles
    const todasDisponibles = Object.values(funcionesCriticas).every(Boolean);
    if (!todasDisponibles) {
        console.error("No se pueden ejecutar las pruebas. Faltan funciones críticas.");
        return;
    }
    
    // Verificar disponibilidad de datos necesarios
    console.log("\nVerificando datos necesarios:");
    if (!window.estado) {
        console.error("El objeto estado no está disponible.");
        return;
    }
    
    console.log(`- Profesores: ${window.estado.profesores?.length || 0} encontrados`);
    if (!window.estado.profesores || window.estado.profesores.length === 0) {
        console.warn("No hay profesores en el estado. Las pruebas pueden fallar.");
    }
    
    // Probar la generación de carga detallada
    console.log("\nProbando cálculo de carga detallada...");
    let cargaDetallada;
    try {
        cargaDetallada = window.calcularCargaProfesoresDetallada();
        console.log(`- Carga calculada: ${Object.keys(cargaDetallada || {}).length} profesores`);
    } catch (error) {
        console.error("Error al calcular carga detallada:", error);
        return;
    }
    
    // Menú de opciones para las pruebas
    console.log("\n=== OPCIONES DE PRUEBA ===");
    console.log("1. Probar generación de PDF individual (si hay profesores)");
    console.log("2. Probar generación de PDF global");
    console.log("3. Probar generación de Excel individual (si hay profesores)");
    console.log("4. Probar generación de Excel global");
    console.log("5. Ejecutar todas las pruebas");
    console.log("\nPara ejecutar una prueba, escribe en la consola:");
    console.log("ejecutarPruebaReporte(número)");
    
    // Retornar el objeto de carga detallada para referencia
    return cargaDetallada;
}

/**
 * Ejecuta una prueba específica de reporte
 * @param {number} opcion - Número de opción a probar (1-5)
 */
function ejecutarPruebaReporte(opcion) {
    if (!window.estado || !window.estado.profesores) {
        console.error("No hay datos de estado disponibles para generar reportes.");
        return;
    }
    
    const primerProfesorId = window.estado.profesores.length > 0 ? window.estado.profesores[0].id : null;
    
    switch (opcion) {
        case 1:
            if (!primerProfesorId) {
                console.error("No hay profesores disponibles para prueba individual.");
                return;
            }
            console.log(`Probando PDF individual para profesor ID: ${primerProfesorId}`);
            window.generarReporteCargaDocenteMejorado(primerProfesorId);
            break;
        
        case 2:
            console.log("Probando PDF global");
            window.generarReporteCargaDocenteMejorado();
            break;
            
        case 3:
            if (!primerProfesorId) {
                console.error("No hay profesores disponibles para prueba individual.");
                return;
            }
            console.log(`Probando Excel individual para profesor ID: ${primerProfesorId}`);
            window.generarCartaDocenteExcel(primerProfesorId);
            break;
            
        case 4:
            console.log("Probando Excel global");
            window.generarReporteGlobalExcel();
            break;
            
        case 5:
            console.log("Ejecutando todas las pruebas secuencialmente...");
            setTimeout(() => {
                if (primerProfesorId) {
                    console.log("1. PDF individual...");
                    window.generarReporteCargaDocenteMejorado(primerProfesorId);
                }
                
                setTimeout(() => {
                    console.log("2. PDF global...");
                    window.generarReporteCargaDocenteMejorado();
                    
                    setTimeout(() => {
                        if (primerProfesorId) {
                            console.log("3. Excel individual...");
                            window.generarCartaDocenteExcel(primerProfesorId);
                        }
                        
                        setTimeout(() => {
                            console.log("4. Excel global...");
                            window.generarReporteGlobalExcel();
                        }, 2000);
                    }, 2000);
                }, 2000);
            }, 500);
            break;
            
        default:
            console.error("Opción no válida. Elija un número del 1 al 5.");
    }
}

// Exportar funciones para uso desde consola
window.probarReportes = probarReportes;
window.ejecutarPruebaReporte = ejecutarPruebaReporte;
