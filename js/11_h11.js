// Renderizar tabla de horario de asesorías para un profesor
        function renderizarHorarioAsesorias(profesorId) {
            // NOTA: Esta función es un placeholder. La asignación real de slots
            // para asesorías según la configuración no está implementada.
            // Solo muestra el horario del profesor marcando las clases.
            const tablaHorario = document.getElementById('tablaHorario');
            const tablaAsesorias = document.getElementById('tablaHorarioAsesorias');
            const mensajeNoHorario = document.getElementById('mensajeNoHorario');
            const container = document.getElementById('horarioContainer');

            tablaHorario.classList.add('hidden'); // Ocultar tabla regular
            mensajeNoHorario.classList.add('hidden'); // Ocultar mensaje

            const profesor = estado.profesores.find(p => p.id === profesorId);
            if (!profesor) {
                tablaAsesorias.classList.add('hidden');
                mensajeNoHorario.classList.remove('hidden');
                mensajeNoHorario.querySelector('h3').textContent = "Profesor no encontrado";
                mensajeNoHorario.querySelector('p').textContent = "";
                return;
            }

            const diasHabiles = obtenerDiasHabiles();
            const horasPorDia = calcularHorasPorDia();
            // const datosAsesorias = estado.horariosAsesorias[profesorId] || {}; // Datos reales de asesorías (no generados aún)
            const titulo = `Disponibilidad para Asesorías - ${profesor.nombre}`;

            let html = `<caption class="text-lg font-medium mb-2 caption-top text-gray-700 no-print">${titulo}</caption>`;
            html += '<thead><tr><th class="py-2 px-1 w-16">Hora</th>';
            diasHabiles.forEach(dia => { html += `<th class="py-2 px-1">${dia}</th>`; });
            html += '</tr></thead><tbody>';

            horasPorDia.forEach(hora => {
                html += `<tr><td class="py-1 px-1 font-medium bg-gray-50 text-xs">${hora}</td>`;
                diasHabiles.forEach(dia => {
                    // const asesoria = datosAsesorias[dia]?.[hora]; // Comprobar si hay asesoría asignada
                    let cellClasses = "p-1 h-16"; // Altura mínima
                    let content = '';

                    // Verificar si el profesor tiene clase regular en este slot
                    let tieneClase = false;
                    for (const sem in estado.horarios) {
                        if (estado.horarios[sem]?.[dia]?.[hora]?.profesorId === profesorId) {
                            tieneClase = true;
                            break;
                        }
                    }
                    // Verificar disponibilidad semanal
                    const turno = obtenerTurno(hora);
                    const disponibleSemanal = profesor.diasDisponibles?.[dia]?.[turno] ?? false;

                    if (tieneClase) {
                         cellClasses += " bg-gray-200"; // Marcar como ocupado por clase
                         content = `<div class="text-xs text-gray-400 italic">Clase</div>`;
                    } else if (!disponibleSemanal) {
                         cellClasses += " bg-red-100"; // Marcar como no disponible
                         content = `<div class="text-xs text-red-400 italic">No Disp.</div>`;
                    }
                    // else if (asesoria) { // Si tuviéramos asesorías asignadas
                    //     content = `<div class="bg-cyan-100 border-l-4 border-cyan-500 p-1 rounded text-xs" title="Asesoría">Asesoría</div>`;
                    // }
                    else {
                        cellClasses += " bg-green-50 hover:bg-green-100 cursor-pointer"; // Estilo para celdas vacías disponibles
                        // Añadir data attributes para posible asignación manual futura
                        content = `<div data-profesor-id="${profesorId}" data-dia="${dia}" data-hora="${hora}" class="h-full w-full"></div>`;
                    }
                    html += `<td class="${cellClasses}">${content}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
            tablaAsesorias.innerHTML = html;
            tablaAsesorias.classList.remove('hidden');
            container.classList.add('border', 'border-gray-200');
        }

        // Actualizar estadísticas básicas del horario
        function actualizarEstadisticasHorario() {
            const horasAsignadasElem = document.getElementById('horasAsignadas');
            const aulasUtilizadasElem = document.getElementById('aulasUtilizadas');
            const conflictosDetectadosElem = document.getElementById('conflictosDetectados');
            if (!horasAsignadasElem || !aulasUtilizadasElem || !conflictosDetectadosElem) return;

            const stats = calcularEstadisticasDetalladas();

            horasAsignadasElem.textContent = `${stats.horasAsignadas}/${stats.horasNecesarias} (${stats.porcentajeHoras.toFixed(1)}%)`;

            const totalAulas = estado.aulas.length;
            const porcentajeAulas = totalAulas > 0 ? Math.round((stats.aulasUtilizadas.size / totalAulas) * 100) : 0;
            aulasUtilizadasElem.textContent = `${stats.aulasUtilizadas.size}/${totalAulas} (${porcentajeAulas}%)`;

            conflictosDetectadosElem.textContent = stats.conflictos.toString();
            conflictosDetectadosElem.className = `text-xl font-bold ${stats.conflictos > 0 ? 'text-red-600 animate-pulse' : 'text-green-600'}`; // Resaltar si hay conflictos

            // Opcional: Mostrar estadísticas avanzadas
            // mostrarEstadisticasAvanzadas();
        }

        // Actualizar interfaz general (selectores, etc.)
        function actualizarInterfaz() {
            // Configuración General
            document.getElementById('periodoAcademico').value = estado.configuracion.periodoAcademico;
            document.getElementById('cantidadSemestres').value = estado.configuracion.cantidadSemestres;
            document.getElementById('horaInicio').value = estado.configuracion.horaInicio;
            document.getElementById('horaFin').value = estado.configuracion.horaFin;
            document.getElementById('duracionBloque').value = estado.configuracion.duracionBloque;
            document.querySelectorAll('.dia-semana-check').forEach(chk => {
                chk.checked = estado.configuracion.diasDisponibles.includes(chk.dataset.dia);
            });

            // Configuración Asesorías
            const confAsesNormal = estado.configuracion.asesoriasNormalesConfig || {};
            document.getElementById('habilitarAsesoriasNormales').checked = confAsesNormal.habilitado || false;
            document.getElementById('duracionAsesoriaNormal').value = confAsesNormal.duracionMinutos || 60;
            document.getElementById('frecuenciaAsesoriaNormal').value = confAsesNormal.vecesPorSemana || 1;
            const confAsesEval = estado.configuracion.asesoriasEvaluacionConfig || {};
            document.getElementById('habilitarAsesoriasEvaluacion').checked = confAsesEval.habilitado || false;
            document.getElementById('duracionAsesoriaEvaluacion').value = confAsesEval.duracionMinutos || 120;
            document.getElementById('frecuenciaAsesoriaEvaluacion').value = confAsesEval.vecesPorSemana || 1;

            // Selectores dependientes
            actualizarSelectorTipoVista(); // Actualiza el selector de elementos y llama a actualizarHorarioVisible si es necesario
            actualizarSelectorSemestres(); // Actualiza selector en modal materia
            actualizarSelectoresHorariosFijos(); // Actualiza selectores en restricciones
        }

        // Actualizar estado de botones (Generar, Optimizar, Editar)
        function actualizarEstadoBotones() {
            const hayDatosBase = estado.profesores.length > 0 && estado.materias.length > 0 && estado.aulas.length > 0;
            const hayHorarios = estado.horarios && Object.keys(estado.horarios).length > 0;

            document.getElementById('generarHorariosBtn').disabled = !hayDatosBase;
            document.getElementById('generarHorariosBtnAlt').disabled = !hayDatosBase;
            document.getElementById('optimizarHorariosBtn').disabled = !hayHorarios;
            document.getElementById('modoEdicionBtn').disabled = !hayHorarios;

             // Actualizar texto de botones de generar
             const btnGen = document.getElementById('generarHorariosBtn');
             const btnGenAlt = document.getElementById('generarHorariosBtnAlt');
             if (!hayDatosBase) {
                 btnGen.textContent = "Faltan Datos";
                 btnGenAlt.textContent = "Faltan Datos";
             } else {
                 btnGen.textContent = "Generar Horarios";
                 btnGenAlt.textContent = "Generar Horarios";
             }
        }

        // Actualizar selector de vista de horario y el selector de elemento
        function actualizarSelectorTipoVista() {
            const filtroSelect = document.getElementById('filtroVistaHorario');
            const elementoSelect = document.getElementById('elementoSeleccionado');
            const label = elementoSelect.previousElementSibling; // El label antes del select
            const filtro = filtroSelect.value;
            const valorActual = elementoSelect.value; // Guardar valor actual para intentar restaurarlo

            elementoSelect.innerHTML = ''; // Limpiar opciones

            let opciones = [];
            switch (filtro) {
                case 'semestre':
                    label.textContent = 'Seleccione semestre:';
                    const cantSem = parseInt(estado.configuracion.cantidadSemestres) || 1;
                    for (let i = 1; i <= cantSem; i++) opciones.push({ value: i, text: `Semestre ${i}` });
                    if (opciones.length === 0) opciones.push({ value: '1', text: 'Semestre 1' }); // Default si no hay config
                    break;
                case 'profesor':
                    label.textContent = 'Seleccione profesor:';
                    opciones = estado.profesores.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(p => ({ value: p.id, text: p.nombre }));
                    if (opciones.length === 0) opciones.push({ value: '', text: 'No hay profesores' });
                    break;
                case 'aula':
                    label.textContent = 'Seleccione aula:';
                    opciones = estado.aulas.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(a => ({ value: a.id, text: a.nombre }));
                     if (opciones.length === 0) opciones.push({ value: '', text: 'No hay aulas' });
                    break;
                case 'materia':
                    label.textContent = 'Seleccione materia:';
                    // Usar código como value para materia en esta vista
                    opciones = estado.materias.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(m => ({ value: m.codigo, text: `${m.nombre} (S${m.semestre})` }));
                     if (opciones.length === 0) opciones.push({ value: '', text: 'No hay materias' });
                    break;
                case 'asesoria':
                    label.textContent = 'Seleccione profesor:';
                    opciones = estado.profesores.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(p => ({ value: p.id, text: p.nombre }));
                    if (opciones.length === 0) opciones.push({ value: '', text: 'No hay profesores' });
                    break;
            }

            opciones.forEach(opt => elementoSelect.add(new Option(opt.text, opt.value)));

            // Intentar restaurar el valor seleccionado si aún existe en las nuevas opciones
            if (opciones.some(opt => opt.value == valorActual)) {
                elementoSelect.value = valorActual;
            }

           // Siempre actualizar la vista al cambiar el tipo
           actualizarHorarioVisible();
        }

        // Actualizar AMBAS tablas de horario (regular y asesorías) según selección
        function actualizarHorarioVisible() {
            const filtro = document.getElementById('filtroVistaHorario').value;
            const elementoId = document.getElementById('elementoSeleccionado').value;
            renderizarHorario(filtro, elementoId);
            // La función renderizarHorario ahora llama a renderizarHorarioAsesorias si filtro es 'asesoria'
        }

        // Actualizar selector de semestres en modal Materia
        function actualizarSelectorSemestres() {
            const select = document.getElementById('materiaSemestre');
            if (!select) return;
            const currentVal = select.value; // Guardar valor actual si existe
            select.innerHTML = '';
            
            // Usar el máximo entre la configuración y el semestre más alto en los datos
            let cantSem = parseInt(estado.configuracion.cantidadSemestres) || 9;
            
            // Verificar si hay materias con semestres más altos
            if (estado.materias && estado.materias.length > 0) {
                const maxSemestre = estado.materias.reduce((max, materia) => 
                    Math.max(max, materia.semestre || 1), 1);
                cantSem = Math.max(cantSem, maxSemestre);
            }
            
            for (let i = 1; i <= cantSem; i++) {
                select.add(new Option(`Semestre ${i}`, i));
            }
            if (currentVal) select.value = currentVal; // Restaurar valor si es posible
        }

        // Actualizar selectores para fijar horarios
        function actualizarSelectoresHorariosFijos() {
            const profSelect = document.getElementById('profesorRestriccion');
            const matSelect = document.getElementById('materiaRestriccion');
            const aulaSelect = document.getElementById('aulaRestriccion');
            const diaSelect = document.getElementById('diaRestriccion');
            const horaSelect = document.getElementById('horaRestriccion');

            // Profesores
            if (profSelect) {
                const currentVal = profSelect.value;
                profSelect.innerHTML = '<option value="">Seleccione profesor</option>';
                estado.profesores.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(p => profSelect.add(new Option(p.nombre, p.id)));
                if (currentVal) profSelect.value = currentVal;
            }
            // Materias (se llenan al cambiar profesor)
            if (matSelect) matSelect.innerHTML = '<option value="">Seleccione materia</option>';
            // Aulas (se llenan al cambiar materia)
            if (aulaSelect) aulaSelect.innerHTML = '<option value="">Seleccione aula</option>';

            // Días
            if (diaSelect) {
                 const currentVal = diaSelect.value;
                 diaSelect.innerHTML = '<option value="">Seleccione día</option>';
                 obtenerDiasHabiles().forEach(dia => diaSelect.add(new Option(dia, dia)));
                 if (currentVal) diaSelect.value = currentVal;
            }
            // Horas
            if (horaSelect) {
                 const currentVal = horaSelect.value;
                 horaSelect.innerHTML = '<option value="">Seleccione hora</option>';
                 calcularHorasPorDia().forEach(hora => horaSelect.add(new Option(hora, hora)));
                 if (currentVal) horaSelect.value = currentVal;
            }
        }

        // Manejar el botón de exportar PDF
        document.getElementById('exportarPDFBtn').addEventListener('click', function() {
            // Mostrar el modal con las opciones de PDF
            const modalExportarPDF = document.getElementById('modalExportarPDF');
            modalExportarPDF.classList.remove('hidden');
            modalExportarPDF.classList.add('flex');
            
            // Establecer valores predeterminados
            document.getElementById('pdfPageSizeModal').value = document.getElementById('pdfPageSize').value || 'letter';
            document.getElementById('pdfOrientationModal').value = document.getElementById('pdfOrientation').value || 'landscape';
        });

        // Manejar el botón cancelar del modal PDF
        document.getElementById('cancelarPDFBtn').addEventListener('click', function() {
            document.getElementById('modalExportarPDF').classList.add('hidden');
            document.getElementById('modalExportarPDF').classList.remove('flex');
        });

        // Manejar el botón confirmar del modal PDF
        document.getElementById('confirmarPDFBtn').addEventListener('click', function() {
            // Cerrar el modal
            document.getElementById('modalExportarPDF').classList.add('hidden');
            document.getElementById('modalExportarPDF').classList.remove('flex');
            
            // Obtener los valores seleccionados
            const pageSize = document.getElementById('pdfPageSizeModal').value;
            const orientation = document.getElementById('pdfOrientationModal').value;
            const exportType = document.getElementById('pdfExportTypeModal').value;
            
            // Actualizar los campos ocultos del menú desplegable para mantener coherencia
            document.getElementById('pdfPageSize').value = pageSize;
            document.getElementById('pdfOrientation').value = orientation;
            
            // Exportar según el tipo seleccionado
            if (exportType === 'all') {
                exportarTodosLosHorarios(pageSize, orientation);
            } else {
                exportarHorarioDirectoPDF(pageSize, orientation);
            }
        });

        // Función para exportar horario directamente a PDF
        function exportarHorarioDirectoPDF(pageSize, orientation) {
            const tipoVista = document.getElementById('filtroVistaHorario').value;
            const elementoId = document.getElementById('elementoSeleccionado').value;
            
            mostrarCargando(true);
            
            setTimeout(() => {
                try {
                    const { horario: datosHorario, titulo } = obtenerDatosParaVista(tipoVista, elementoId);
                    
                    if (!datosHorario || Object.keys(datosHorario).length === 0) {
                        mostrarNotificacion('Error', 'No hay datos en la vista actual para exportar a PDF.', 'error');
                        mostrarCargando(false);
                        return;
                    }
                    
                    const { jsPDF } = window.jspdf;
                    // Definir tamaño Oficio (aproximado)
                    const oficioWidthMM = 216;
                    const oficioHeightMM = 330; // Ajustado para 'legal' típico
                    const format = pageSize === 'legal' ? [oficioWidthMM, oficioHeightMM] : pageSize;
                    
                    const doc = new jsPDF({ orientation: orientation, unit: 'mm', format: format });
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const margin = 10;
                    const usableWidth = pageWidth - 2 * margin;
                    let y = margin;
                    
                    // Título y fecha
                    doc.setFontSize(16);
                    doc.text(titulo, pageWidth / 2, y, { align: 'center' });
                    y += 8;
                    doc.setFontSize(10);
                    doc.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth - margin, y, { align: 'right' });
                    y += 10;
                    
                    const diasHabiles = obtenerDiasHabiles();
                    const horasPorDia = calcularHorasPorDia();
                    const numCols = diasHabiles.length + 1;
                    const colWidth = usableWidth / numCols;
                    const headerHeight = orientation === 'landscape' ? 6 : 7;
                    const rowHeight = orientation === 'landscape' ? 9 : 11;
                    
                    // Cabecera de la tabla
                    doc.setFontSize(orientation === 'landscape' ? 7 : 8);
                    doc.setFont(undefined, 'bold');
                    doc.setFillColor(230, 230, 230);
                    doc.rect(margin, y, usableWidth, headerHeight, 'F');
                    doc.rect(margin, y, colWidth, headerHeight, 'S');
                    doc.text('Hora', margin + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                    
                    diasHabiles.forEach((dia, i) => {
                        const x = margin + colWidth * (i + 1);
                        doc.rect(x, y, colWidth, headerHeight, 'S');
                        doc.text(dia, x + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                    });
                    
                    y += headerHeight;
                    doc.setFont(undefined, 'normal');
                    
                    // Filas de datos
                    horasPorDia.forEach(hora => {
                        // Comprobar si necesitamos saltar a una nueva página
                        if (y + rowHeight > pageHeight - margin) {
                            doc.addPage();
                            y = margin;
                            
                            // Repetir cabecera en la nueva página
                            doc.setFontSize(orientation === 'landscape' ? 7 : 8);
                            doc.setFont(undefined, 'bold');
                            doc.setFillColor(230, 230, 230);
                            doc.rect(margin, y, usableWidth, headerHeight, 'F');
                            doc.rect(margin, y, colWidth, headerHeight, 'S');
                            doc.text('Hora', margin + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                            
                            diasHabiles.forEach((dia, i) => {
                                const x = margin + colWidth * (i + 1);
                                doc.rect(x, y, colWidth, headerHeight, 'S');
                                doc.text(dia, x + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                            });
                            
                            y += headerHeight;
                            doc.setFont(undefined, 'normal');
                        }
                        
                        // Celda de hora
                        doc.setFillColor(245, 245, 245);
                        doc.rect(margin, y, colWidth, rowHeight, 'FD');
                        doc.setFontSize(orientation === 'landscape' ? 7 : 8);
                        doc.setFont(undefined, 'bold');
                        doc.text(hora, margin + colWidth / 2, y + rowHeight / 2 + (orientation === 'landscape' ? 1 : 1.5), { align: 'center' });
                        doc.setFont(undefined, 'normal');
                        
                        // Celdas de sesiones
                        diasHabiles.forEach((dia, i) => {
                            const x = margin + colWidth * (i + 1);
                            doc.rect(x, y, colWidth, rowHeight, 'S');
                            
                            const sesion = datosHorario[dia]?.[hora];
                            if (sesion) {
                                doc.setFontSize(orientation === 'landscape' ? 5 : 6);
                                let textLines = [
                                    sesion.materia,
                                    `(${sesion.profesor})`,
                                    `[${sesion.aula}]`
                                ];
                                
                                if (sesion.semestre && tipoVista !== 'semestre') {
                                    textLines.push(`{S${sesion.semestre}}`);
                                }
                                
                                if (sesion.fijado) doc.setTextColor(139, 92, 246);
                                doc.text(textLines, x + 1, y + (orientation === 'landscape' ? 2 : 2.5), { maxWidth: colWidth - 2 });
                                if (sesion.fijado) doc.setTextColor(0, 0, 0);
                            }
                        });
                        
                        y += rowHeight;
                    });
                    
                    // Numerar páginas
                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        doc.setFontSize(8);
                        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
                    }
                    
                    // Guardar el PDF
                    doc.save(`Horario_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
                    mostrarNotificacion('Éxito', 'Horario exportado a PDF.', 'success');
                    
                } catch (error) {
                    console.error("Error exportando a PDF:", error);
                    mostrarNotificacion('Error', `No se pudo exportar a PDF: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 100);
        }

        // Función para exportar todos los semestres a un solo PDF
        function exportarTodosLosHorarios(pageSize, orientation) {
            mostrarCargando(true);
            
            setTimeout(() => {
                try {
                    const cantidadSemestres = parseInt(estado.configuracion.cantidadSemestres);
                    if (!cantidadSemestres || cantidadSemestres <= 0) {
                        mostrarNotificacion('Error', 'No se encontraron semestres para exportar.', 'error');
                        mostrarCargando(false);
                        return;
                    }
                    
                    const { jsPDF } = window.jspdf;
                    // Definir tamaño Oficio (aproximado)
                    const oficioWidthMM = 216;
                    const oficioHeightMM = 330; // Ajustado para 'legal' típico
                    const format = pageSize === 'legal' ? [oficioWidthMM, oficioHeightMM] : pageSize;
                    
                    const doc = new jsPDF({ orientation: orientation, unit: 'mm', format: format });
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const margin = 10;
                    const usableWidth = pageWidth - 2 * margin;
                    
                    const diasHabiles = obtenerDiasHabiles();
                    const horasPorDia = calcularHorasPorDia();
                    const numCols = diasHabiles.length + 1;
                    const colWidth = usableWidth / numCols;
                    const headerHeight = orientation === 'landscape' ? 6 : 7;
                    const rowHeight = orientation === 'landscape' ? 9 : 11;
                    
                    // Para cada semestre, crear una página
                    for (let semestre = 1; semestre <= cantidadSemestres; semestre++) {
                        // Si no es la primera página, añadir una nueva página
                        if (semestre > 1) {
                            doc.addPage();
                        }
                        
                        const titulo = `Horario Semestre ${semestre}`;
                        let y = margin;
                        
                        // Título y fecha
                        doc.setFontSize(16);
                        doc.text(titulo, pageWidth / 2, y, { align: 'center' });
                        y += 8;
                        doc.setFontSize(10);
                        doc.text(`Generado: ${new Date().toLocaleDateString()}`, pageWidth - margin, y, { align: 'right' });
                        y += 10;
                        
                        // Cabecera de la tabla
                        doc.setFontSize(orientation === 'landscape' ? 7 : 8);
                        doc.setFont(undefined, 'bold');
                        doc.setFillColor(230, 230, 230);
                        doc.rect(margin, y, usableWidth, headerHeight, 'F');
                        doc.rect(margin, y, colWidth, headerHeight, 'S');
                        doc.text('Hora', margin + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                        
                        diasHabiles.forEach((dia, i) => {
                            const x = margin + colWidth * (i + 1);
                            doc.rect(x, y, colWidth, headerHeight, 'S');
                            doc.text(dia, x + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                        });
                        
                        y += headerHeight;
                        doc.setFont(undefined, 'normal');
                        
                        // Obtener datos de horario para este semestre
                        // El problema podría estar aquí si los datos no son accesibles correctamente
                        const datosHorario = estado.horariosVisualizacion.porSemestre[semestre] || 
                                           (estado.horarios[semestre] || {});
                        
                        console.log(`Exportando semestre ${semestre}, datos:`, Object.keys(datosHorario).length > 0 ? "Disponibles" : "Vacíos");
                        
                        // Filas de datos
                        horasPorDia.forEach(hora => {
                            // Comprobar si necesitamos saltar a una nueva página
                            if (y + rowHeight > pageHeight - margin) {
                                doc.addPage();
                                y = margin;
                                
                                // Continuar con título del semestre en nueva página
                                doc.setFontSize(14);
                                doc.text(`${titulo} (continuación)`, pageWidth / 2, y, { align: 'center' });
                                y += 8;
                                
                                // Repetir cabecera en la nueva página
                                doc.setFontSize(orientation === 'landscape' ? 7 : 8);
                                doc.setFont(undefined, 'bold');
                                doc.setFillColor(230, 230, 230);
                                doc.rect(margin, y, usableWidth, headerHeight, 'F');
                                doc.rect(margin, y, colWidth, headerHeight, 'S');
                                doc.text('Hora', margin + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                                
                                diasHabiles.forEach((dia, i) => {
                                    const x = margin + colWidth * (i + 1);
                                    doc.rect(x, y, colWidth, headerHeight, 'S');
                                    doc.text(dia, x + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                                });
                                
                                y += headerHeight;
                                doc.setFont(undefined, 'normal');
                            }
                            
                            // Celda de hora
                            doc.setFillColor(245, 245, 245);
                            doc.rect(margin, y, colWidth, rowHeight, 'FD');
                            doc.setFontSize(orientation === 'landscape' ? 7 : 8);
                            doc.setFont(undefined, 'bold');
                            doc.text(hora, margin + colWidth / 2, y + rowHeight / 2 + (orientation === 'landscape' ? 1 : 1.5), { align: 'center' });
                            doc.setFont(undefined, 'normal');
                            
                            // Celdas de sesiones
                            diasHabiles.forEach((dia, i) => {
                                const x = margin + colWidth * (i + 1);
                                doc.rect(x, y, colWidth, rowHeight, 'S');
                                
                                const sesion = datosHorario[dia]?.[hora];
                                if (sesion) {
                                    doc.setFontSize(orientation === 'landscape' ? 5 : 6);
                                    let textLines = [
                                        sesion.materia,
                                        `(${sesion.profesor})`,
                                        `[${sesion.aula}]`
                                    ];
                                    
                                    if (sesion.fijado) doc.setTextColor(139, 92, 246);
                                    doc.text(textLines, x + 1, y + (orientation === 'landscape' ? 2 : 2.5), { maxWidth: colWidth - 2 });
                                    if (sesion.fijado) doc.setTextColor(0, 0, 0);
                                }
                            });
                            
                            y += rowHeight;
                        });
                    }
                    
                    // Numerar páginas
                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        doc.setFontSize(8);
                        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
                    }
                    
                    // Guardar el PDF
                    doc.save(`Todos_Los_Horarios_${new Date().toISOString().slice(0,10)}.pdf`);
                    mostrarNotificacion('Éxito', 'Todos los horarios exportados a PDF.', 'success');
                    
                } catch (error) {
                    console.error("Error exportando todos los horarios a PDF:", error);
                    mostrarNotificacion('Error', `No se pudieron exportar todos los horarios a PDF: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 100);
        }