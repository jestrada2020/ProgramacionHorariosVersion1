// --- FUNCIONES PARA REPORTES MEJORADOS CON AUTOTABLE ---

/**
 * Genera un reporte PDF con tablas mejoradas usando jsPDF y AutoTable
 * @param {Object} config - Configuración del reporte
 */
function generarReportePDFMejorado(config) {
    console.log("[Reportes-Mejorados] Iniciando generación de PDF mejorado");
    try {
        const { 
            titulo, 
            subtitulo, 
            tamanio = 'letter', 
            orientacion = 'portrait',
            datos = [],
            cabeceras = [],
            columnas = [],
            callback = null
        } = config;

        if (!titulo) {
            throw new Error("El título del reporte es obligatorio");
        }

        if (!datos || !Array.isArray(datos) || datos.length === 0) {
            throw new Error("No hay datos para generar el reporte");
        }

        // Crear instancia de jsPDF con mejor manejo de errores
        console.log("[Reportes-Mejorados] Intentando crear instancia de jsPDF");
        let jsPDFClass;
        if (window.jspdf && window.jspdf.jsPDF) {
            console.log("[Reportes-Mejorados] Usando jsPDF desde namespace (window.jspdf.jsPDF)");
            jsPDFClass = window.jspdf.jsPDF; // Estructura moderna de jsPDF
        } else if (window.jsPDF) {
            console.log("[Reportes-Mejorados] Usando jsPDF desde global (window.jsPDF)");
            jsPDFClass = window.jsPDF; // Estructura antigua de jsPDF
        } else {
            console.error("[Reportes-Mejorados] No se encontró ninguna versión de jsPDF");
            throw new Error("La biblioteca jsPDF no está cargada correctamente. Comprueba la consola del navegador para más detalles.");
        }
        
        // Intentar crear la instancia con manejo de error explícito
        let doc;
        try {
            doc = new jsPDFClass({ orientation: orientacion, unit: 'mm', format: tamanio });
            console.log("[Reportes-Mejorados] Instancia de jsPDF creada correctamente");
        } catch (error) {
            console.error("[Reportes-Mejorados] Error al crear instancia de jsPDF:", error);
            throw new Error(`Error al crear el documento PDF: ${error.message || 'Error desconocido'}`);
        }
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margen = 15;
        let y = margen;

        // Título del reporte
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(titulo.toUpperCase(), pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Subtítulo (opcional)
        if (subtitulo) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text(subtitulo, pageWidth / 2, y, { align: 'center' });
            y += 10;
        }

        // Fecha de generación
        const fechaActual = new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        doc.setFontSize(9);
        doc.text(`Generado el: ${fechaActual}`, pageWidth - margen, y, { align: 'right' });
        y += 15;

        // Tabla AutoTable
        console.log("[Reportes-Mejorados] Verificando disponibilidad de autoTable:", typeof doc.autoTable === 'function' ? 'Disponible' : 'No disponible');
        
        // Si autoTable no está disponible, intentar cargarla dinámicamente
        if (typeof doc.autoTable !== 'function') {
            console.warn("[Reportes-Mejorados] autoTable no está disponible, intentando crear tabla básica");
            
            // Crear una tabla básica sin autoTable como alternativa
            const margin = 15;
            const cellPadding = 3;
            const cellWidth = (pageWidth - (margin * 2)) / (cabeceras?.length || 1);
            const lineHeight = 7;
            const startY = y;
            
            // Dibujar cabeceras
            if (cabeceras && cabeceras.length > 0) {
                doc.setFillColor(41, 128, 185);
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                
                cabeceras.forEach((header, index) => {
                    const x = margin + (index * cellWidth);
                    doc.rect(x, startY, cellWidth, lineHeight, 'F');
                    doc.text(header, x + cellWidth / 2, startY + lineHeight / 2, { align: 'center' });
                });
                
                // Dibujar filas
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                let rowY = startY + lineHeight;
                
                datos.forEach((row, rowIndex) => {
                    // Color alterno para filas
                    if (rowIndex % 2 === 0) {
                        doc.setFillColor(240, 240, 240);
                    } else {
                        doc.setFillColor(255, 255, 255);
                    }
                    
                    row.forEach((cell, colIndex) => {
                        const x = margin + (colIndex * cellWidth);
                        doc.rect(x, rowY, cellWidth, lineHeight, 'F');
                        doc.text(String(cell), x + cellWidth / 2, rowY + lineHeight / 2, { align: 'center' });
                    });
                    
                    rowY += lineHeight;
                });
            }
        } else {
            // Usar autoTable si está disponible
            console.log("[Reportes-Mejorados] Usando autoTable para generar la tabla");
            const opcionesTabla = {
                startY: y,
                head: cabeceras && cabeceras.length > 0 ? [cabeceras] : null,
                body: datos,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    lineColor: [80, 80, 80],
                    lineWidth: 0.1
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [240, 240, 240]
                },
                margin: { top: margen, right: margen, bottom: margen, left: margen }
            };

            // Añadir columnas personalizadas si se proporcionan
            if (columnas && columnas.length > 0) {
                opcionesTabla.columns = columnas;
            }

            try {
                doc.autoTable(opcionesTabla);
                console.log("[Reportes-Mejorados] Tabla generada correctamente con autoTable");
            } catch (error) {
                // Fallback si autoTable falla
                console.error("[Reportes-Mejorados] Error al usar autoTable:", error);
                doc.setFontSize(12);
                doc.setTextColor(255, 0, 0);
                doc.text("Error: No se pudo generar la tabla correctamente.", margen, y);
            }
        }

        // Paginación
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margen, pageHeight - 10, { align: 'right' });
        }

        // Si hay callback, ejecutarlo (permite personalización adicional)
        if (typeof callback === 'function') {
            callback(doc);
        }

        // Guardar el PDF
        const nombreArchivo = `${titulo.replace(/\s+/g, '_')}_${fechaActual.replace(/\//g, '-')}.pdf`;
        doc.save(nombreArchivo);
        
        mostrarNotificacion('Éxito', `Reporte "${titulo}" generado con éxito.`, 'success');
        console.log(`[Reportes-Mejorados] PDF generado: ${nombreArchivo}`);
        
        // Asegurarnos de ocultar el indicador de carga
        if (typeof mostrarCargando === 'function') {
            mostrarCargando(false);
        }
        
        return true;
    } catch (error) {
        console.error("[Reportes-Mejorados] Error generando PDF:", error);
        mostrarNotificacion('Error', `Error al generar el PDF: ${error.message || error}`, 'error');
        
        // Asegurarnos de ocultar el indicador de carga incluso en caso de error
        if (typeof mostrarCargando === 'function') {
            mostrarCargando(false);
        }
        
        return false;
    }
}

/**
 * Genera un reporte de carga docente mejorado
 * @param {string} profesorId - ID del profesor (opcional para reporte individual)
 */
function generarReporteCargaDocenteMejorado(profesorId = null) {
    console.log(`[Reportes-Mejorados] Generando reporte ${profesorId ? 'individual' : 'global'} de carga docente`);
    mostrarCargando(true);
    
    setTimeout(() => {
        try {
            const cargaDetallada = calcularCargaProfesoresDetallada();
            if (!cargaDetallada || Object.keys(cargaDetallada).length === 0) {
                throw new Error("No hay datos de carga detallada para procesar.");
            }
            
            let titulo, datos, cabeceras, profesores;
            
            // Preparar cabeceras
            cabeceras = [
                'Nombre', 'Tipo Contrato', 'Clases', 'Ases. Normal', 'Ases. Eval.', 
                'Investigación', 'Proy. Inst.', 'Proy. Ext.', 'Mat. Didáct.',
                'Capacitación', 'Admin.', 'C. Virtuales', 'Total', 'Extras'
            ];
            
            if (profesorId) {
                // Reporte individual
                const profesor = estado.profesores.find(p => p.id === profesorId);
                if (!profesor) {
                    throw new Error(`No se encontró el profesor con ID: ${profesorId}`);
                }
                
                const carga = cargaDetallada[profesorId];
                if (!carga) {
                    throw new Error(`No hay datos de carga para el profesor ${profesor.nombre || 'seleccionado'}`);
                }
                
                titulo = `Carta Docente: ${profesor.nombre || 'Profesor'}`;
                profesores = [profesor];
            } else {
                // Reporte global
                titulo = "Reporte Global de Carga Docente";
                profesores = estado.profesores.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            }
            
            // Preparar datos para el reporte
            datos = profesores.map(profesor => {
                if (!profesor || !profesor.id) return null;
                const carga = cargaDetallada[profesor.id];
                if (!carga) return null;
                
                const tipoContratoTexto = obtenerTextoTipoContrato(carga.tipoContrato);
                
                return [
                    profesor.nombre || 'N/A',
                    tipoContratoTexto,
                    carga.clases || '0',
                    carga.asesoriaNormal || '0',
                    carga.asesoriaEvaluacion || '0',
                    carga.investigacion || '0',
                    carga.proyectosInst || '0',
                    carga.proyectosExt || '0',
                    carga.materialDidactico || '0',
                    carga.capacitacion || '0',
                    carga.administrativas || '0',
                    carga.cursosVirtuales || '0',
                    carga.total || '0',
                    carga.horasExtras || '0'
                ];
            }).filter(Boolean); // Eliminar filas nulas
            
            // Generar el PDF
            const periodoAcademico = estado.configuracion?.periodoAcademico || 'Actual';
            const subtitulo = `Periodo Académico: ${periodoAcademico}`;
            const tamanio = document.getElementById('cartaPageSizeModal')?.value || 'letter';
            const orientacion = document.getElementById('cartaOrientationModal')?.value || (profesorId ? 'portrait' : 'landscape');
            
            const exitoso = generarReportePDFMejorado({
                titulo,
                subtitulo,
                tamanio,
                orientacion,
                datos,
                cabeceras,
                callback: profesorId ? (doc) => {
                    // Añadir información adicional para carta docente individual
                    const profesor = profesores[0];
                    const carga = cargaDetallada[profesor.id];
                    
                    // Añadir página con más detalles si es necesario
                    doc.addPage();
                    let y = 20;
                    const margen = 15;
                    
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Información Detallada del Docente', margen, y);
                    y += 10;
                    
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`Nombre: ${profesor.nombre || 'N/A'}`, margen, y); y += 7;
                    doc.text(`Código: ${profesor.codigo || 'N/A'}`, margen, y); y += 7;
                    doc.text(`Especialización: ${profesor.especialidad || 'No especificada'}`, margen, y); y += 7;
                    doc.text(`Tipo de Contrato: ${obtenerTextoTipoContrato(carga.tipoContrato)} (Máximo ${carga.cargaMaxima || 0} horas)`, margen, y); y += 7;
                    doc.text(`Porcentaje de ocupación actual: ${carga.porcentajeOcupacion || '0'}%`, margen, y); y += 15;
                    
                    // Añadir horario si está disponible
                    const horarioProfesor = estado.horariosVisualizacion?.porProfesor?.[profesor.id];
                    if (horarioProfesor && Object.keys(horarioProfesor).length > 0) {
                        const diasHabiles = obtenerDiasHabiles(); 
                        const horasPorDia = calcularHorasPorDia();
                        
                        if (diasHabiles && diasHabiles.length > 0 && horasPorDia && horasPorDia.length > 0) {
                            doc.setFontSize(14);
                            doc.setFont('helvetica', 'bold');
                            doc.text('Horario Semanal', margen, y);
                            y += 10;
                            
                            // Crear tabla con horario
                            const datosHorario = [];
                            horasPorDia.forEach(hora => {
                                const fila = [hora];
                                diasHabiles.forEach(dia => {
                                    const sesion = horarioProfesor[dia]?.[hora];
                                    fila.push(sesion ? `${sesion.materia || 'N/A'}\n${sesion.aula || 'N/A'}` : '');
                                });
                                datosHorario.push(fila);
                            });
                            
                            doc.autoTable({
                                startY: y,
                                head: [['Hora', ...diasHabiles]],
                                body: datosHorario,
                                theme: 'grid',
                                styles: {
                                    fontSize: 7,
                                    cellPadding: 2
                                },
                                headStyles: {
                                    fillColor: [41, 128, 185]
                                }
                            });
                        }
                    }
                } : null
            });
            
            if (exitoso) {
                cerrarModal('modalCartaDocente');
            }
        } catch (error) {
            console.error("[Reportes-Mejorados] Error generando reporte de carga:", error);
            mostrarNotificacion('Error', `Error al generar reporte: ${error.message || error}`, 'error');
        } finally {
            mostrarCargando(false);
        }
    }, 100);
}

// Exportar globales
window.generarReportePDFMejorado = generarReportePDFMejorado;
window.generarReporteCargaDocenteMejorado = generarReporteCargaDocenteMejorado;

// Asegurarse de que las funciones estén disponibles globalmente
console.log("[Reportes-Mejorados] Exportando funciones globalmente");
console.log("- generarReportePDFMejorado disponible:", typeof window.generarReportePDFMejorado === 'function' ? 'Sí ✅' : 'No ❌');
console.log("- generarReporteCargaDocenteMejorado disponible:", typeof window.generarReporteCargaDocenteMejorado === 'function' ? 'Sí ✅' : 'No ❌');

// Función de ayuda para diagnosticar problemas con jsPDF
window.diagnosticarPDF = function() {
    console.log("=== DIAGNÓSTICO DE PDF ===");
    console.log("- jspdf disponible:", window.jspdf ? 'Sí ✅' : 'No ❌');
    console.log("- jsPDF disponible:", window.jsPDF ? 'Sí ✅' : 'No ❌');
    
    try {
        let jsPDFClass;
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDFClass = window.jspdf.jsPDF;
            console.log("- Usando jsPDF desde namespace (window.jspdf.jsPDF)");
        } else if (window.jsPDF) {
            jsPDFClass = window.jsPDF;
            console.log("- Usando jsPDF desde global (window.jsPDF)");
        } else {
            console.log("- No se encontró ninguna versión de jsPDF ❌");
            return;
        }
        
        const testDoc = new jsPDFClass();
        console.log("- Instancia creada:", testDoc ? 'Sí ✅' : 'No ❌');
        console.log("- autoTable disponible:", typeof testDoc.autoTable === 'function' ? 'Sí ✅' : 'No ❌');
    } catch (error) {
        console.error("- Error al instanciar jsPDF:", error);
    }
};
