// --- FUNCIONES PARA REPORTES Y EXPORTACIONES ---

// Función para obtener rangos horarios (Utility, kept for completeness)
function obtenerRangosHorarios() {
    if (window.rangosHorarios && Array.isArray(window.rangosHorarios) && window.rangosHorarios.length > 0) {
        return window.rangosHorarios;
    }
    if (typeof obtenerRangosHorariosConfig === 'function') {
        return obtenerRangosHorariosConfig();
    }
    return [
        { id: 1, etiqueta: '7:00 - 8:00', horaInicio: 7, minutoInicio: 0, horaFin: 8, minutoFin: 0 },
        { id: 2, etiqueta: '8:00 - 9:00', horaInicio: 8, minutoInicio: 0, horaFin: 9, minutoFin: 0 },
        // ... (rest of default ranges)
        { id: 14, etiqueta: '20:00 - 21:00', horaInicio: 20, minutoInicio: 0, horaFin: 21, minutoFin: 0 }
    ];
}

// Función para generar carta docente individual (Modal Trigger)
function generarCartaDocente(profesorId) {
    console.log(`[Reportes] Abriendo modal para carta docente individual: ${profesorId}`);
    const modal = document.getElementById('modalCartaDocente');
    if (!modal) {
        console.error("[Reportes] Modal 'modalCartaDocente' no encontrado.");
        mostrarNotificacion('Error', 'No se pudo abrir el modal de opciones.', 'error');
        return;
    }
    modal.dataset.profesorId = profesorId;
    modal.dataset.tipoReporte = 'individual';
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    const profesor = estado.profesores.find(p => p.id === profesorId);
    const tituloModal = document.getElementById('tituloCartaDocente');
    if (profesor && tituloModal) {
        tituloModal.textContent = `Generar Carta Docente: ${profesor.nombre || 'Desconocido'}`;
    } else if (tituloModal) {
        tituloModal.textContent = 'Generar Carta Docente';
    }
}

// Función para confirmar generación de carta docente
function confirmarGenerarCartaDocente() {
    console.log("[Reportes] Confirmando generación de carta docente individual.");
    const modal = document.getElementById('modalCartaDocente');
    if (!modal) {
        console.error("[Reportes] Modal 'modalCartaDocente' no encontrado al confirmar.");
        return;
    }
    const profesorId = modal.dataset.profesorId;
    const tamanio = document.getElementById('cartaPageSizeModal')?.value || 'letter';
    const orientacion = document.getElementById('cartaOrientationModal')?.value || 'portrait';
    const formato = document.getElementById('cartaExportTypeModal')?.value || 'pdf';
    
    cerrarModal('modalCartaDocente');
    mostrarCargando(true);
    
    setTimeout(() => {
        try {
            console.log(`[Reportes] Generando carta para Prof ID: ${profesorId}, Formato: ${formato}`);
            if (formato === 'pdf') {
                generarCartaDocentePDF(profesorId, tamanio, orientacion);
            } else if (formato === 'excel') {
                generarCartaDocenteExcel(profesorId);
            } else {
                throw new Error(`Formato de reporte no soportado: ${formato}`);
            }
        } catch (error) {
            console.error("[Reportes] Error generando carta docente:", error);
            mostrarNotificacion('Error', `Error al generar la carta docente: ${error.message || error}`, 'error');
        } finally {
            mostrarCargando(false);
        }
    }, 100);
}

// Función para generar la carta docente en PDF
function generarCartaDocentePDF(profesorId, tamanio, orientacion) {
    console.log(`[Reportes] Iniciando PDF para profesor ID: ${profesorId}`);
    const profesor = estado.profesores.find(p => p.id === profesorId);
    if (!profesor) {
        mostrarNotificacion('Error', 'No se encontró el profesor seleccionado para PDF.', 'error');
        console.error(`[Reportes] Profesor con ID ${profesorId} no encontrado.`);
        return;
    }
    
    const cargaDetallada = calcularCargaProfesoresDetallada(); // Assumed global
    const carga = cargaDetallada ? cargaDetallada[profesorId] : null;
    
    if (!carga) {
        mostrarNotificacion('Error', 'No se pudo calcular la carga del profesor para PDF.', 'error');
        console.error(`[Reportes] Carga para profesor ID ${profesorId} no encontrada.`);
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation, unit: 'mm', format: tamanio });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margen = 15;
    let y = margen;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('CARTA LABORAL DOCENTE', pageWidth / 2, y + 5, {align: 'center'});
    y += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const periodoAcademico = estado.configuracion?.periodoAcademico || 'Actual';
    doc.text(`Periodo Académico: ${periodoAcademico}`, pageWidth / 2, y + 5, {align: 'center'});
    y += 15;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Información del Docente', margen, y);
    y += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Nombre: ${profesor.nombre || 'N/A'}`, margen, y); y += 7;
    doc.text(`Código: ${profesor.codigo || 'N/A'}`, margen, y); y += 7;
    doc.text(`Especialización: ${profesor.especialidad || 'No especificada'}`, margen, y); y += 7;
    
    const tipoContratoTexto = obtenerTextoTipoContrato(carga.tipoContrato); // Assumed global
    doc.text(`Tipo de Contrato: ${tipoContratoTexto} (Máximo ${carga.cargaMaxima || 0} horas)`, margen, y); y += 14;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Detalle de Carga Laboral Semanal', margen, y); y += 10;
    
    doc.setFontSize(12);
    doc.text('Actividad', margen, y);
    doc.text('Horas', pageWidth - margen - 5, y, { align: 'right' }); // Align right, ensure enough space
    y += 3;
    doc.setDrawColor(0);
    doc.line(margen, y, pageWidth - margen, y); y += 7;
    
    doc.setFont('helvetica', 'normal');
    const agregarActividad = (actividad, horasStr) => {
        if (y > pageHeight - margen - 10) { doc.addPage(); y = margen + 10; }
        doc.text(actividad || 'N/A', margen, y);
        doc.text((horasStr || '0') + ' horas', pageWidth - margen - 5, y, { align: 'right' });
        y += 7;
    };
    
    agregarActividad('Horas de Clase', carga.clases);
    agregarActividad('Asesorías Normales', carga.asesoriaNormal);
    agregarActividad('Asesorías de Evaluación', carga.asesoriaEvaluacion);
    agregarActividad('Investigación', carga.investigacion);
    agregarActividad('Proyectos Institucionales', carga.proyectosInst);
    agregarActividad('Proyectos Externos', carga.proyectosExt);
    agregarActividad('Material Didáctico', carga.materialDidactico);
    agregarActividad('Capacitación', carga.capacitacion);
    agregarActividad('Administrativas', carga.administrativas);
    agregarActividad('Cursos Virtuales', carga.cursosVirtuales);
    
    doc.line(margen, y - 3, pageWidth - margen, y - 3);
    doc.setFont('helvetica', 'bold');
    agregarActividad('Total Horas Semanales', carga.total);
    
    if (parseFloat(carga.horasExtras) > 0) {
        doc.setTextColor(255, 0, 0);
        agregarActividad('Horas Extras', carga.horasExtras);
        doc.setTextColor(0, 0, 0);
    }
    
    doc.setFont('helvetica', 'normal');
    y += 10;
    if (y > pageHeight - margen - 20) { doc.addPage(); y = margen + 10; }
    doc.text(`Carga máxima según contrato: ${carga.cargaMaxima || 0} horas`, margen, y); y += 7;
    doc.text(`Porcentaje de ocupación: ${carga.porcentajeOcupacion || 0}%`, margen, y); y += 20;

    if (y > pageHeight - margen - 25) { doc.addPage(); y = margen + 10; }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text("* La información presentada corresponde al registro actual en el sistema.", margen, y); y += 7;
    doc.text("* Las horas extras se calculan en base al tipo de contrato del docente.", margen, y); y += 15;

    if (y > pageHeight - margen - 20) { doc.addPage(); y = margen + 10; }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Documento generado el: ${new Date().toLocaleDateString('es-ES')}`, margen, y); y += 15;

    // --- INCLUIR MATERIAS DICTADAS EN PDF ---
    if (y > pageHeight - margen - 30) { doc.addPage(); y = margen + 10; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Materias Dictadas', pageWidth / 2, y, { align: 'center' }); y += 10;
    
    if (profesor.materiasQueDicta && Array.isArray(profesor.materiasQueDicta) && profesor.materiasQueDicta.length > 0) {
        // Encabezados de la tabla
        const encabezadosMaterias = ['Código', 'Nombre', 'Semestre', 'Tipo Aula', 'Bloques'];
        const anchosBaseMaterias = [0.15, 0.35, 0.15, 0.15, 0.20];
        const anchoTablaMaterias = pageWidth - margen * 2;
        const anchosColumnaMaterias = anchosBaseMaterias.map(a => a * anchoTablaMaterias);
        
        // Función para dibujar encabezados de materias
        const dibujarEncabezadosMaterias = (posY) => {
            doc.setDrawColor(0);
            doc.setFillColor(240, 240, 240);
            doc.rect(margen, posY, anchoTablaMaterias, 7, 'FD');
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            
            let posX = margen;
            encabezadosMaterias.forEach((encabezado, idx) => {
                doc.text(encabezado, posX + 2, posY + 5);
                posX += anchosColumnaMaterias[idx];
            });
            
            return posY + 7;
        };
        
        y = dibujarEncabezadosMaterias(y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        // Dibujar filas de materias
        profesor.materiasQueDicta.forEach(materiaId => {
            const materia = estado.materias.find(m => m.id === materiaId);
            if (materia) {
                const detalles = profesor.materiasDetalle?.[materiaId] || {};
                
                // Verificar si hay espacio en la página actual
                if (y > pageHeight - margen - 15) {
                    doc.addPage();
                    y = margen + 10;
                    y = dibujarEncabezadosMaterias(y);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                }
                
                // Datos de la materia
                const datosFila = [
                    materia.codigo || 'N/A',
                    materia.nombre || 'N/A',
                    materia.semestre || 'N/A',
                    materia.tipoAula || 'Normal',
                    materia.horasSemana || '0'
                ];
                
                let posX = margen;
                datosFila.forEach((dato, idx) => {
                    doc.text(dato.toString(), posX + 2, y + 4, {maxWidth: anchosColumnaMaterias[idx] - 4});
                    posX += anchosColumnaMaterias[idx];
                });
                
                // Dibujar línea horizontal bajo cada fila
                doc.line(margen, y + 6, pageWidth - margen, y + 6);
                y += 7;
            }
        });
        
        // Nota adicional sobre materias virtuales u obligatorias
        y += 3;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.text("* Las materias pueden tener configuraciones adicionales (obligatorias o virtuales) que se gestionan en la interfaz principal.", margen, y);
        y += 10;
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.text('Este profesor no tiene materias asignadas actualmente.', margen, y);
        y += 10;
    }

    // --- INCLUIR HORARIO EN PDF ---
    const horarioProfesor = estado.horariosVisualizacion?.porProfesor?.[profesorId];
    const diasHabiles = obtenerDiasHabiles(); 
    const horasPorDia = calcularHorasPorDia();

    if (horarioProfesor && Object.keys(horarioProfesor).length > 0 && diasHabiles && diasHabiles.length > 0 && horasPorDia && horasPorDia.length > 0) {
        if (y > pageHeight - margen - 30) { doc.addPage(); y = margen + 10; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Horario Semanal Asignado', pageWidth / 2, y, { align: 'center' }); y += 10;

        const anchoHoraCol = 20;
        const anchoDia = (pageWidth - margen * 2 - anchoHoraCol) / diasHabiles.length;
        
        const drawHorarioHeader = (currentY) => {
            doc.setFontSize(9); doc.setFont('helvetica', 'bold');
            doc.text('Hora', margen + 2, currentY + 5);
            let currentX = margen + anchoHoraCol;
            diasHabiles.forEach((dia) => {
                doc.text(dia || 'N/A', currentX + anchoDia / 2, currentY + 5, {align: 'center', maxWidth: anchoDia - 2});
                currentX += anchoDia;
            });
            currentY += 7;
            doc.setDrawColor(0); doc.line(margen, currentY, pageWidth - margen, currentY);
            return currentY;
        };
        y = drawHorarioHeader(y);
        
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        
        horasPorDia.forEach(hora => {
            y += 9;
            if (y > pageHeight - margen - 10) { 
                doc.addPage(); y = margen + 10;
                y = drawHorarioHeader(y);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            }
            
            doc.text(hora || 'N/A', margen + 2, y + 4);
            let currentX = margen + anchoHoraCol;
            diasHabiles.forEach((dia) => {
                const sesion = horarioProfesor[dia]?.[hora];
                if (sesion) {
                    const textoSesion = `${sesion.materia || 'N/A'}\n${sesion.aula || 'N/A'}`;
                    doc.text(textoSesion, currentX + 2, y + 3, { maxWidth: anchoDia - 4 });
                }
                currentX += anchoDia;
            });
            doc.line(margen, y + 6, pageWidth - margen, y + 6);
        });
    } else {
        if (y > pageHeight - margen - 15) { doc.addPage(); y = margen + 10;}
        doc.setFont('helvetica', 'italic'); doc.setFontSize(10);
        doc.text('No hay horario definido para este profesor.', margen, y);
    }
    // --- FIN INCLUIR HORARIO EN PDF ---
    
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margen, pageHeight - 7, {align: 'right'});
        if (i === totalPages) {
             doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, margen, pageHeight - 7);
             doc.text('Sistema de Programación de Horarios', pageWidth / 2 , pageHeight - 7, {align: 'center'});
        }
    }
    
    doc.save(`Carta_Docente_${(profesor.nombre || 'Profesor').replace(/\s+/g, '_')}.pdf`);
    mostrarNotificacion('Éxito', `Carta docente de ${profesor.nombre || 'Profesor'} generada.`, 'success');
}

// Función para generar reporte en formato Excel
function generarCartaDocenteExcel(profesorId) {
    console.log(`[Reportes] Iniciando Excel para profesor ID: ${profesorId}`);
    const profesor = estado.profesores.find(p => p.id === profesorId);
    if (!profesor) {
        mostrarNotificacion('Error', 'No se encontró el profesor seleccionado para Excel.', 'error');
        return;
    }
    
    const cargaDetallada = calcularCargaProfesoresDetallada();
    const carga = cargaDetallada ? cargaDetallada[profesorId] : null;
    if (!carga) {
        mostrarNotificacion('Error', 'No se pudo calcular la carga del profesor para Excel.', 'error');
        return;
    }
    
    const tipoContratoTexto = obtenerTextoTipoContrato(carga.tipoContrato);
    const wb = XLSX.utils.book_new();
    
    const infoData = [
        ['CARTA LABORAL DOCENTE'],
        [`Periodo Académico: ${estado.configuracion?.periodoAcademico || 'Actual'}`],
        [],
        ['Información del Docente'],
        ['Nombre:', profesor.nombre || 'N/A'],
        ['Código:', profesor.codigo || 'N/A'],
        ['Tipo de Contrato:', `${tipoContratoTexto} (Máximo ${carga.cargaMaxima || 0} horas)`],
        ['Especialidad:', profesor.especialidad || 'No especificada'],
        [],
        ['Detalle de Carga Laboral Semanal'],
        ['Actividad', 'Horas'],
        ['Horas de Clase', carga.clases || 0],
        ['Asesorías Normales', carga.asesoriaNormal || 0],
        ['Asesorías de Evaluación', carga.asesoriaEvaluacion || 0],
        ['Investigación', carga.investigacion || 0],
        ['Proyectos Institucionales', carga.proyectosInst || 0],
        ['Proyectos Externos', carga.proyectosExt || 0],
        ['Material Didáctico', carga.materialDidactico || 0],
        ['Capacitación', carga.capacitacion || 0],
        ['Administrativas', carga.administrativas || 0],
        ['Cursos Virtuales', carga.cursosVirtuales || 0],
        ['Total Horas Semanales', carga.total || 0]
    ];
    if (parseFloat(carga.horasExtras) > 0) {
        infoData.push(['Horas Extras', carga.horasExtras || 0]);
    }
    infoData.push([], ['Carga máxima según contrato:', (carga.cargaMaxima || 0) + ' horas'], ['Porcentaje de ocupación:', (carga.porcentajeOcupacion || 0) + '%']);
    
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    wsInfo['!cols'] = [{wch: 30}, {wch: 20}];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');
    
    const horarioProfesor = estado.horariosVisualizacion?.porProfesor?.[profesorId];
    if (horarioProfesor && Object.keys(horarioProfesor).length > 0) {
        const diasHabiles = obtenerDiasHabiles() || [];
        const horasPorDia = calcularHorasPorDia() || [];
        if (diasHabiles.length > 0 && horasPorDia.length > 0) {
            const horarioData = [['Hora', ...diasHabiles]];
            horasPorDia.forEach(hora => {
                const fila = [hora || 'N/A'];
                diasHabiles.forEach(dia => {
                    const sesion = horarioProfesor[dia]?.[hora];
                    fila.push(sesion ? `${sesion.materia || 'N/A'} - ${sesion.aula || 'N/A'}` : '');
                });
                horarioData.push(fila);
            });
            const wsHorario = XLSX.utils.aoa_to_sheet(horarioData);
            wsHorario['!cols'] = [{wch:10}, ...diasHabiles.map(() => ({wch:25}))];
            XLSX.utils.book_append_sheet(wb, wsHorario, 'Horario');
        }
    }
    
    const materiasData = [['Código', 'Nombre', 'Semestre', 'Tipo Aula Req.', 'Bloques Semanales', 'Obligatoria', 'Virtual']];
    if (profesor.materiasQueDicta && Array.isArray(profesor.materiasQueDicta)) {
        profesor.materiasQueDicta.forEach(materiaId => {
            const materia = estado.materias.find(m => m.id === materiaId);
            if (materia) {
                const detalles = profesor.materiasDetalle?.[materiaId] || {};
                materiasData.push([
                    materia.codigo || '', materia.nombre || '', materia.semestre || '',
                    materia.tipoAula || 'normal', materia.horasSemana || 0,
                    detalles.esObligatoria ? 'Sí' : 'No', detalles.esVirtual ? 'Sí' : 'No'
                ]);
            }
        });
    }
    const wsMaterias = XLSX.utils.aoa_to_sheet(materiasData);
    wsMaterias['!cols'] = [{wch:15}, {wch:30}, {wch:10}, {wch:15}, {wch:15}, {wch:10}, {wch:10}];
    XLSX.utils.book_append_sheet(wb, wsMaterias, 'Materias Dictadas');
    
    XLSX.writeFile(wb, `Carta_Docente_${(profesor.nombre || 'Profesor').replace(/\s+/g, '_')}.xlsx`);
    mostrarNotificacion('Éxito', `Reporte Excel de ${profesor.nombre || 'Profesor'} generado.`, 'success');
}

// Función para modal de reporte global PDF
function generarReporteGlobalPDF() {
    console.log("[Reportes] Abriendo modal para reporte global PDF.");
    const modal = document.getElementById('modalCartaDocente');
    if (!modal) { console.error("[Reportes] Modal 'modalCartaDocente' no encontrado."); return; }
    modal.dataset.tipoReporte = 'global';
    const tituloModal = document.getElementById('tituloCartaDocente');
    if(tituloModal) tituloModal.textContent = 'Generar Reporte Global de Carga Docente';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Función para generar el reporte global en Excel
function generarReporteGlobalExcel() {
    console.log("[Reportes] Iniciando reporte global Excel.");
    mostrarCargando(true);
    setTimeout(() => {
        try {
            const cargaDetallada = calcularCargaProfesoresDetallada();
            if (!cargaDetallada || Object.keys(cargaDetallada).length === 0) {
                 throw new Error("No hay datos de carga detallada para procesar.");
            }
            const wb = XLSX.utils.book_new();
            
            const resumenHeaders = [
                'Nombre', 'Tipo Contrato', 'Clases (h)', 'Ases. Normal (h)', 'Ases. Eval. (h)',
                'Investigación (h)', 'Proy. Inst. (h)', 'Proy. Ext. (h)', 'Mat. Didáct. (h)',
                'Capacitación (h)', 'Admin. (h)', 'C. Virtuales (h)', 'Ases. Virtuales (h)', 'Trabajo Casa (h)', 'Total (h)', 'Horas Extras (h)', '% Ocupación'
            ];
            const resumenData = [
                ['REPORTE GLOBAL DE CARGA DOCENTE'],
                [`Periodo Académico: ${estado.configuracion?.periodoAcademico || 'Actual'}`],
                [],
                resumenHeaders
            ];
            const colWidthsResumen = resumenHeaders.map(h => ({wch: h.length > 15 ? h.length : 15})); // Basic width
            colWidthsResumen[0].wch = 25; // Nombre
            
            (estado.profesores || []).sort((a, b) => (a.nombre||'').localeCompare(b.nombre||'')).forEach(prof => {
                const carga = cargaDetallada[prof.id];
                if (!carga) return;
                const tipoContratoTexto = obtenerTextoTipoContrato(carga.tipoContrato);
                resumenData.push([
                    prof.nombre || 'N/A', tipoContratoTexto,
                    carga.clases || 0, carga.asesoriaNormal || 0, carga.asesoriaEvaluacion || 0,
                    carga.investigacion || 0, carga.proyectosInst || 0, carga.proyectosExt || 0,
                    carga.materialDidactico || 0, carga.capacitacion || 0, carga.administrativas || 0,
                    carga.cursosVirtuales || 0, carga.asesoriasVirtuales || 0, carga.trabajoEnCasa || 0, carga.total || 0, carga.horasExtras || 0,
                    (carga.porcentajeOcupacion || 0) + '%'
                ]);
            });
            const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
            wsResumen['!cols'] = colWidthsResumen;
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Carga Docente');
            
            const statsHeaders = ['Tipo de Contrato', 'Cantidad Docentes', 'Promedio Horas', 'Mín Horas', 'Máx Horas', 'Total Horas Extras'];
            const tipoContratoData = [['ESTADÍSTICAS POR TIPO DE CONTRATO'], [], statsHeaders];
            const colWidthsStats = statsHeaders.map(h => ({wch: h.length > 18 ? h.length : 18}));

            const tiposContrato = {};
            (estado.profesores || []).forEach(prof => {
                const carga = cargaDetallada[prof.id];
                if (!carga) return;
                const tipo = carga.tipoContrato || 'No especificado';
                if (!tiposContrato[tipo]) {
                    tiposContrato[tipo] = { cantidad: 0, totalHoras: 0, minHoras: Infinity, maxHoras: 0, totalExtras: 0 };
                }
                const grupo = tiposContrato[tipo];
                grupo.cantidad++;
                grupo.totalHoras += parseFloat(carga.total || 0);
                grupo.minHoras = Math.min(grupo.minHoras, parseFloat(carga.total || 0));
                grupo.maxHoras = Math.max(grupo.maxHoras, parseFloat(carga.total || 0));
                grupo.totalExtras += parseFloat(carga.horasExtras || 0);
            });
            Object.keys(tiposContrato).forEach(tipo => {
                const g = tiposContrato[tipo];
                tipoContratoData.push([
                    obtenerTextoTipoContrato(tipo), g.cantidad,
                    (g.totalHoras / g.cantidad || 0).toFixed(1),
                    (g.minHoras === Infinity ? 0 : g.minHoras).toFixed(1),
                    (g.maxHoras || 0).toFixed(1), (g.totalExtras || 0).toFixed(1)
                ]);
            });
            const wsTiposContrato = XLSX.utils.aoa_to_sheet(tipoContratoData);
            wsTiposContrato['!cols'] = colWidthsStats;
            XLSX.utils.book_append_sheet(wb, wsTiposContrato, 'Estadísticas Contrato');
            
            const fecha = new Date().toISOString().slice(0,10);
            XLSX.writeFile(wb, `Reporte_Global_Carga_Docente_${fecha}.xlsx`);
            mostrarNotificacion('Éxito', 'Reporte global en Excel generado.', 'success');
        } catch (error) {
            console.error("[Reportes] Error generando reporte global Excel:", error);
            mostrarNotificacion('Error', `Error al generar reporte Excel: ${error.message || error}`, 'error');
        } finally {
            mostrarCargando(false);
        }
    }, 100);
}

// Función para confirmar la generación del reporte global
function confirmarGenerarReporteGlobal() {
    console.log("[Reportes] Confirmando generación de reporte global.");
    const modal = document.getElementById('modalCartaDocente');
    if (!modal) { console.error("[Reportes] Modal 'modalCartaDocente' no encontrado."); return; }
    const formato = document.getElementById('cartaExportTypeModal')?.value || 'pdf';
    const tamanio = document.getElementById('cartaPageSizeModal')?.value || 'letter';
    const orientacion = document.getElementById('cartaOrientationModal')?.value || 'landscape';
    
    cerrarModal('modalCartaDocente');
    mostrarCargando(true);
    
    setTimeout(() => {
        try {
            console.log(`[Reportes] Generando reporte global, Formato: ${formato}`);
            if (formato === 'pdf') {
                generarReporteGlobalPDFCompleto(tamanio, orientacion);
            } else if (formato === 'excel') {
                generarReporteGlobalExcel();
            } else {
                throw new Error(`Formato de reporte global no soportado: ${formato}`);
            }
        } catch (error) {
            console.error("[Reportes] Error generando reporte global:", error);
            mostrarNotificacion('Error', `Error al generar reporte global: ${error.message || error}`, 'error');
        } finally {
            mostrarCargando(false);
        }
    }, 100);
}

// Función para generar el reporte global completo en PDF
function generarReporteGlobalPDFCompleto(tamanio, orientacion) {
    console.log("[Reportes] Iniciando reporte global PDF completo.");
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation, unit: 'mm', format: tamanio });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margen = 15;
        let y = margen;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
        doc.text('REPORTE GLOBAL DE CARGA DOCENTE', pageWidth / 2, y + 5, {align: 'center'}); y += 10;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(12);
        doc.text(`Periodo Académico: ${estado.configuracion?.periodoAcademico || 'Actual'}`, pageWidth / 2, y + 5, {align: 'center'}); y += 15;
        
        const cargaDetallada = calcularCargaProfesoresDetallada();
        if (!cargaDetallada) { throw new Error("Fallo al calcular carga detallada."); }

        const encabezados = ['Nombre', 'Contrato', 'Clases (h)', 'C. Virt. (h)', 'A. Virt. (h)', 'T. Casa (h)', 'Total (h)', '% Ocup.', 'Extras (h)'];
        const anchosBase = [0.25, 0.12, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09];
        const anchoTabla = pageWidth - margen * 2;
        const anchosColumna = anchosBase.map(a => a * anchoTabla);
        
        const dibujarEncabezados = (currentY, headers, colWidths) => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            headers.forEach((enc, idx) => {
                let xPos = margen + (colWidths.slice(0, idx).reduce((sum, w) => sum + w, 0));
                doc.text(enc || 'N/A', xPos + 2, currentY + 5, {maxWidth: colWidths[idx] - 4});
            });
            currentY += 7;
            doc.setDrawColor(0); doc.line(margen, currentY, pageWidth - margen, currentY);
            return currentY + 3; // Space after line
        };

        y = dibujarEncabezados(y, encabezados, anchosColumna);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        
        let contadorProfesores = 0;
        (estado.profesores || []).sort((a,b) => (a.nombre||'').localeCompare(b.nombre||'')).forEach(prof => {
            const carga = cargaDetallada[prof.id];
            if (!carga) return;
            
            if (y > pageHeight - margen - 10) { 
                doc.addPage(); y = margen;
                y = dibujarEncabezados(y, encabezados, anchosColumna);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            }
            
            const datosFila = [
                prof.nombre || 'N/A', obtenerTextoTipoContrato(carga.tipoContrato), carga.clases || 0, 
                carga.cursosVirtuales || 0, carga.asesoriasVirtuales || 0, carga.trabajoEnCasa || 0, carga.total || 0,
                (carga.porcentajeOcupacion || 0) + '%', carga.horasExtras || 0
            ];
            datosFila.forEach((dato, idx) => {
                let xPos = margen + (anchosColumna.slice(0, idx).reduce((sum, w) => sum + w, 0));
                if (idx === 8 && parseFloat(carga.horasExtras) > 0) doc.setTextColor(255, 0, 0);
                doc.text(String(dato), xPos + 2, y, {maxWidth: anchosColumna[idx] - 4});
                if (idx === 8 && parseFloat(carga.horasExtras) > 0) doc.setTextColor(0, 0, 0);
            });
            y += 7;
            contadorProfesores++;
        });

        doc.line(margen, y - 2, pageWidth - margen, y - 2); y += 5;
        
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(`Total de profesores: ${contadorProfesores}`, margen, y); y += 10;

        if (y > pageHeight - margen - 40) { doc.addPage(); y = margen; }
        doc.setFontSize(12); doc.text('Estadísticas por Tipo de Contrato', margen, y); y += 7;
        
        const encabezadosStats = ['Tipo Contrato', 'Cantidad', 'Prom. Horas', 'Mín Horas', 'Máx Horas', 'Total Extras'];
        const anchosStats = [0.25, 0.15, 0.15, 0.15, 0.15, 0.15];
        const anchosColumnaStats = anchosStats.map(a => a * anchoTabla);
        y = dibujarEncabezados(y, encabezadosStats, anchosColumnaStats);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);

        const tiposContrato = {};
        (estado.profesores || []).forEach(prof => {
            const carga = cargaDetallada[prof.id];
            if (!carga) return;
            const tipo = carga.tipoContrato || 'No especificado';
            if (!tiposContrato[tipo]) {
                tiposContrato[tipo] = { cantidad: 0, totalHoras: 0, minHoras: Infinity, maxHoras: 0, totalExtras: 0 };
            }
            const g = tiposContrato[tipo];
            g.cantidad++;
            g.totalHoras += parseFloat(carga.total || 0);
            g.minHoras = Math.min(g.minHoras, parseFloat(carga.total || 0));
            g.maxHoras = Math.max(g.maxHoras, parseFloat(carga.total || 0));
            g.totalExtras += parseFloat(carga.horasExtras || 0);
        });
        
        Object.keys(tiposContrato).forEach(tipo => {
            if (y > pageHeight - margen - 10) {
                doc.addPage(); y = margen;
                doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
                doc.text('Estadísticas por Tipo de Contrato (cont.)', margen, y); y += 7;
                y = dibujarEncabezados(y, encabezadosStats, anchosColumnaStats);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            }
            const g = tiposContrato[tipo];
            const datosStatsFila = [
                obtenerTextoTipoContrato(tipo), g.cantidad,
                (g.totalHoras / g.cantidad || 0).toFixed(1),
                (g.minHoras === Infinity ? 0 : g.minHoras).toFixed(1),
                (g.maxHoras || 0).toFixed(1), (g.totalExtras || 0).toFixed(1)
            ];
            datosStatsFila.forEach((dato, idx) => {
                let xPos = margen + (anchosColumnaStats.slice(0, idx).reduce((sum, w) => sum + w, 0));
                doc.text(String(dato), xPos + 2, y, {maxWidth: anchosColumnaStats[idx] - 4});
            });
            y += 7;
        });
        doc.line(margen, y - 2, pageWidth - margen, y - 2);

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8); doc.setFont('helvetica', 'italic');
            doc.text(`Página ${i} de ${totalPages}`, pageWidth - margen, pageHeight - 7, {align: 'right'});
            if (i === totalPages) {
                const fechaActual = new Date();
                const fechaFormateada = `${fechaActual.getDate()}/${fechaActual.getMonth() + 1}/${fechaActual.getFullYear()}`;
                doc.text(`Generado el: ${fechaFormateada}`, margen, pageHeight - 7);
                doc.text('Sistema de Programación de Horarios', pageWidth/2, pageHeight - 7, {align: 'center'});
            }
        }
        
        const fechaArchivo = new Date().toISOString().slice(0,10);
        doc.save(`Reporte_Global_Carga_Docente_${fechaArchivo}.pdf`);
        mostrarNotificacion('Éxito', 'Reporte global PDF generado.', 'success');
    } catch (error) {
        console.error("[Reportes] Error generando reporte global PDF:", error);
        mostrarNotificacion('Error', `Error al generar reporte PDF: ${error.message || error}`, 'error');
    } finally {
        mostrarCargando(false);
    }
}

// Final del archivo: reportes.js