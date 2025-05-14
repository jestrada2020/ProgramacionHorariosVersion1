// --- RESTRICCIONES ---

        // Guardar restricciones ponderables
        function guardarRestricciones() {
            // Limpiar restricciones ponderables anteriores
            estado.restricciones = estado.restricciones.filter(r => r.tipo === 'horarioFijo');

            // Añadir restricciones ponderables actuales
            estado.restricciones.push({
                tipo: 'evitarHuecos', // Ponderable
                peso: parseInt(document.getElementById('evitarHuecosPeso').value) || 8
            });
            estado.restricciones.push({
                tipo: 'maxHorasConsecutivas', // Ponderable
                valor: parseInt(document.getElementById('maxHorasConsecutivasValor').value) || 4,
                peso: parseInt(document.getElementById('maxHorasConsecutivasPeso').value) || 7
            });
             // Las estrictas (disponibilidad, tipo aula) se manejan implícitamente

            guardarDatosLocalmente();
            mostrarNotificacion('Éxito', 'Restricciones ponderables guardadas.', 'success');
        }

        // Fijar un horario específico (añade restricción 'horarioFijo')
        function fijarHorarioProfesor() {
            const profesorId = document.getElementById('profesorRestriccion').value;
            const materiaId = document.getElementById('materiaRestriccion').value;
            const aulaId = document.getElementById('aulaRestriccion').value;
            const dia = document.getElementById('diaRestriccion').value;
            const hora = document.getElementById('horaRestriccion').value;

            if (!profesorId || !materiaId || !aulaId || !dia || !hora) {
                mostrarNotificacion('Error', 'Todos los campos son obligatorios para fijar horario.', 'error');
                return;
            }

            const materia = estado.materias.find(m => m.id === materiaId);
            const profesor = estado.profesores.find(p => p.id === profesorId);
            const aula = estado.aulas.find(a => a.id === aulaId);
            if (!materia || !profesor || !aula) {
                 mostrarNotificacion('Error', 'Profesor, Materia o Aula no encontrados.', 'error');
                 return;
            }
            // Validar que el profesor pueda dictar la materia
            if (!profesor.materiasQueDicta?.includes(materiaId)) {
                 mostrarNotificacion('Error', `El profesor ${profesor.nombre} no está asignado para dictar ${materia.nombre}.`, 'error');
                 return;
            }
             // Validar tipo de aula
             if (aula.tipo !== materia.tipoAula && !(materia.tipoAula === 'normal' && aula.tipo === 'normal')) {
                 mostrarNotificacion('Error', `El aula '${aula.nombre}' (${aula.tipo}) no es compatible con la materia '${materia.nombre}' que requiere tipo '${materia.tipoAula}'.`, 'error');
                 return;
             }

            const semestre = materia.semestre;

            // Verificar si ya existe una restricción fija en conflicto EXACTO (mismo P, M, A, D, H)
            const existeExacta = estado.restricciones.some(r =>
                r.tipo === 'horarioFijo' && r.dia === dia && r.hora === hora &&
                r.profesorId === profesorId && r.materiaId === materiaId && r.aulaId === aulaId && r.semestre === semestre
            );
            if (existeExacta) {
                 mostrarNotificacion('Info', 'Esta restricción fija ya existe.', 'info');
                 return;
            }

            // Verificar si ya existe una restricción fija que cause conflicto (P, A o S en mismo slot)
            const existeConflictoRestriccion = estado.restricciones.some(r =>
                r.tipo === 'horarioFijo' && r.dia === dia && r.hora === hora &&
                (r.profesorId === profesorId || r.aulaId === aulaId || r.semestre === semestre)
            );
            if (existeConflictoRestriccion) {
                 mostrarNotificacion('Advertencia', 'Ya existe una restricción fija en conflicto (Profesor, Aula o Semestre) para este horario.', 'error');
                 return;
            }

            // Verificar si ya existe una sesión asignada (no fija) en ese slot
            const slotOcupado = estado.horarios[semestre]?.[dia]?.[hora];
            if (slotOcupado && !slotOcupado.fijado) {
                 if (!confirm(`El horario ${dia} ${hora} para el semestre ${semestre} ya está ocupado por ${slotOcupado.materia}. ¿Desea sobrescribirlo y fijarlo?`)) {
                     return;
                 }
                 // Si confirma, la asignación se hará abajo, sobrescribiendo
            } else if (slotOcupado && slotOcupado.fijado) {
                 mostrarNotificacion('Error', 'El horario seleccionado ya está fijado con otra materia/profesor.', 'error');
                 return;
            }


            estado.restricciones.push({
                tipo: 'horarioFijo', profesorId, materiaId, aulaId, semestre, dia, hora
            });

            // Opcional: Aplicar inmediatamente al horario si no hay conflicto
            if (!slotOcupado) { // Solo si estaba vacío
                aplicarRestriccionesFijas(); // Re-aplicar para que aparezca en el horario
                generarHorariosVisualizacion();
                actualizarHorarioVisible();
            } else if (slotOcupado && !slotOcupado.fijado) { // Si se confirmó sobrescribir
                 aplicarRestriccionesFijas(); // Re-aplicar para sobrescribir y fijar
                 generarHorariosVisualizacion();
                 actualizarHorarioVisible();
            }


            renderizarListaHorariosFijos(); // Actualizar lista en UI
            guardarDatosLocalmente(); // Guardar la nueva restricción
            mostrarNotificacion('Éxito', 'Horario fijado como restricción.', 'success');

            // Limpiar selectores
            document.getElementById('profesorRestriccion').value = '';
            document.getElementById('materiaRestriccion').innerHTML = '<option value="">Seleccione materia</option>';
            document.getElementById('aulaRestriccion').innerHTML = '<option value="">Seleccione aula</option>';
            document.getElementById('diaRestriccion').value = '';
            document.getElementById('horaRestriccion').value = '';

            actualizarCargaTrabajoDetallada(); // Actualizar solo la tabla de carga detallada
        }

        // Eliminar una restricción de horario fijo por índice
        function eliminarHorarioFijo(index) {
            const horariosFijos = estado.restricciones.filter(r => r.tipo === 'horarioFijo');
            if (index >= 0 && index < horariosFijos.length) {
                const restriccionAEliminar = horariosFijos[index];
                // Encontrar el índice real en el array 'estado.restricciones'
                const indiceReal = estado.restricciones.findIndex(r => r === restriccionAEliminar);
                if (indiceReal !== -1) {
                    estado.restricciones.splice(indiceReal, 1);

                    // Opcional: Des-fijar la sesión correspondiente en el horario si existe
                    const { semestre, dia, hora, materiaId } = restriccionAEliminar;
                    if (estado.horarios[semestre]?.[dia]?.[hora]?.codigo === materiaId && estado.horarios[semestre][dia][hora].fijado) {
                        estado.horarios[semestre][dia][hora].fijado = false;
                        generarHorariosVisualizacion();
                        actualizarHorarioVisible();
                    }

                    renderizarListaHorariosFijos();
                    guardarDatosLocalmente();
                    mostrarNotificacion('Éxito', 'Restricción de horario fijo eliminada.', 'success');
                    actualizarCargaTrabajoDetallada(); // Actualizar sólo la tabla de carga detallada
                }
            }
        }

        // --- EDICIÓN MANUAL DE HORARIOS ---

        // Activar/Desactivar modo edición
        function toggleModoEdicion() {
            estado.modoEdicion = !estado.modoEdicion;
            const btn = document.getElementById('modoEdicionBtn');
            const tablaHorario = document.getElementById('tablaHorario');

            if (estado.modoEdicion) {
                btn.textContent = "Salir de Edición";
                btn.classList.replace('bg-yellow-500', 'bg-red-600');
                btn.classList.replace('hover:bg-yellow-600', 'hover:bg-red-700');
                tablaHorario.classList.add('modo-edicion-activo'); // Clase para estilos visuales si es necesario
                mostrarNotificacion('Información', 'Modo edición ACTIVADO. Doble clic en una sesión para editar.', 'info');
            } else {
                btn.textContent = "Editar Manualmente";
                btn.classList.replace('bg-red-600', 'bg-yellow-500');
                btn.classList.replace('hover:bg-red-700', 'hover:bg-yellow-600');
                 tablaHorario.classList.remove('modo-edicion-activo');
                mostrarNotificacion('Información', 'Modo edición DESACTIVADO.', 'info');
            }
        }

        // Mostrar modal para editar una sesión específica
        function mostrarModalSesion(dia, hora, semestre) {
            const sesion = estado.horarios[semestre]?.[dia]?.[hora];
            if (!sesion) return;

            const modal = document.getElementById('modalSesion');
            document.getElementById('sesionDia').value = dia;
            document.getElementById('sesionHora').value = hora;
            document.getElementById('sesionSemestre').value = semestre;
            document.getElementById('sesionOriginalMateriaId').value = sesion.codigo; // Guardar ID original

            // Poblar selectores
            const materiaSelect = document.getElementById('sesionMateria');
            const profesorSelect = document.getElementById('sesionProfesor');
            const aulaSelect = document.getElementById('sesionAula');
            materiaSelect.innerHTML = ''; profesorSelect.innerHTML = ''; aulaSelect.innerHTML = '';

            // Materias (del mismo semestre preferiblemente, pero mostrar todas por simplicidad)
            estado.materias.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(m => {
                const opt = new Option(`${m.nombre} (S${m.semestre})`, m.id);
                if (m.codigo === sesion.codigo) opt.selected = true;
                materiaSelect.appendChild(opt);
            });

            // Actualizar aulas y profesores si cambia la materia en el modal
             materiaSelect.onchange = () => {
                 aulaSelect.innerHTML = '';
                 profesorSelect.innerHTML = ''; // Limpiar profesores también
                 const matId = materiaSelect.value;
                 const mat = estado.materias.find(m => m.id === matId);
                 const tipoReq = mat?.tipoAula || 'normal';

                 // Poblar Aulas compatibles
                 estado.aulas
                    .filter(a => a.tipo === tipoReq || (tipoReq === 'normal' && a.tipo === 'normal'))
                    .sort((a,b) => a.nombre.localeCompare(b.nombre))
                    .forEach(a => {
                        const opt = new Option(`${a.nombre} (${a.tipo})`, a.id);
                        // Seleccionar el aula original si es compatible con la nueva materia
                        if (a.id === sesion.aulaId && (a.tipo === tipoReq || (tipoReq === 'normal' && a.tipo === 'normal'))) {
                            opt.selected = true;
                        }
                        aulaSelect.appendChild(opt);
                    });

                 // Poblar Profesores que pueden dictar la materia seleccionada
                 estado.profesores
                    .filter(p => p.materiasQueDicta?.includes(matId))
                    .sort((a,b) => a.nombre.localeCompare(b.nombre))
                    .forEach(p => {
                        const opt = new Option(p.nombre, p.id);
                         // Seleccionar el profesor original si puede dictar la nueva materia
                        if (p.id === sesion.profesorId && p.materiasQueDicta?.includes(matId)) {
                            opt.selected = true;
                        }
                        profesorSelect.appendChild(opt);
                    });
             };

             // Disparar el onchange inicial para poblar aulas y profesores
             materiaSelect.dispatchEvent(new Event('change'));


            document.getElementById('sesionFijada').checked = sesion.fijado || false;

            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // Guardar cambios de la sesión editada
        function guardarSesionEditada() {
            const dia = document.getElementById('sesionDia').value;
            const hora = document.getElementById('sesionHora').value;
            const semestre = document.getElementById('sesionSemestre').value;
            const materiaId = document.getElementById('sesionMateria').value;
            const profesorId = document.getElementById('sesionProfesor').value;
            const aulaId = document.getElementById('sesionAula').value;
            const fijado = document.getElementById('sesionFijada').checked;

            if (!materiaId || !profesorId || !aulaId) {
                mostrarNotificacion('Error', 'Debe seleccionar materia, profesor y aula.', 'error');
                return;
            }

            const materia = estado.materias.find(m => m.id === materiaId);
            const profesor = estado.profesores.find(p => p.id === profesorId);
            const aula = estado.aulas.find(a => a.id === aulaId);

            if (!materia || !profesor || !aula) {
                mostrarNotificacion('Error', 'Datos inválidos seleccionados.', 'error');
                return;
            }
             // Validar que el profesor pueda dictar la materia
             if (!profesor.materiasQueDicta?.includes(materiaId)) {
                 mostrarNotificacion('Error', `El profesor ${profesor.nombre} no está asignado para dictar ${materia.nombre}.`, 'error');
                 return;
             }

             // Verificar conflictos ANTES de guardar
             // Conflicto en el mismo semestre ya está cubierto (se sobrescribe)
             // Verificar conflicto global para profesor y aula
             if (!estaProfesorDisponible(profesor, dia, hora, semestre) || !estaAulaDisponible(aula, dia, hora, semestre)) {
                  mostrarNotificacion('Error', 'Conflicto detectado: El profesor o el aula ya están ocupados en otro semestre en este horario.', 'error');
                  return;
             }
             // Verificar si el tipo de aula es compatible
             if (aula.tipo !== materia.tipoAula && !(materia.tipoAula === 'normal' && aula.tipo === 'normal')) {
                  mostrarNotificacion('Error', `El aula '${aula.nombre}' (${aula.tipo}) no es compatible con la materia '${materia.nombre}' que requiere tipo '${materia.tipoAula}'.`, 'error');
                  return;
             }


            // Actualizar la sesión
            estado.horarios[semestre][dia][hora] = {
                materia: materia.nombre,
                codigo: materia.codigo,
                profesor: profesor.nombre,
                profesorId: profesor.id,
                aula: aula.nombre,
                aulaId: aula.id,
                fijado: fijado
            };

            cerrarModal('modalSesion');
            generarHorariosVisualizacion(); // Recalcular vistas por si cambió profesor/aula/materia
            actualizarHorarioVisible(); // Renderizar tabla
            actualizarEstadisticasHorario(); // Actualizar contadores
            actualizarCargaTrabajoDetallada(); // Actualizar solo la tabla de carga detallada
            guardarDatosLocalmente();
            mostrarNotificacion('Éxito', 'Sesión actualizada correctamente.', 'success');
        }

        // Eliminar una sesión del horario
        function eliminarSesion() {
            const dia = document.getElementById('sesionDia').value;
            const hora = document.getElementById('sesionHora').value;
            const semestre = document.getElementById('sesionSemestre').value;

            if (estado.horarios[semestre]?.[dia]?.[hora]) {
                if (confirm(`¿Está seguro de eliminar la sesión de ${estado.horarios[semestre][dia][hora].materia} en ${dia} a las ${hora}?`)) {
                    delete estado.horarios[semestre][dia][hora];
                    cerrarModal('modalSesion'); // Cerrar modal
                    generarHorariosVisualizacion();
                    actualizarHorarioVisible();
                    actualizarEstadisticasHorario();
                    actualizarCargaTrabajoDetallada(); // Actualizar solo la tabla de carga detallada
                    guardarDatosLocalmente();
                    mostrarNotificacion('Éxito', 'Sesión eliminada.', 'success');
                }
            } else {
                mostrarNotificacion('Error', 'No se encontró la sesión para eliminar.', 'error');
                cerrarModal('modalSesion');
            }
        }

        // Actualizar el estado de los botones según disponibilidad de horarios
        function actualizarEstadoBotones() {
            const hayHorarios = estado.horarios && Object.keys(estado.horarios).length > 0;
            document.getElementById('optimizarHorariosBtn').disabled = !hayHorarios;
            document.getElementById('generarHorariosBtn').disabled = false; // Siempre habilitado si hay datos
            document.getElementById('generarHorariosBtnAlt').disabled = false;
            document.getElementById('modoEdicionBtn').disabled = !hayHorarios;
            document.getElementById('exportarPDFBtn').disabled = !hayHorarios; // Habilitar el botón de PDF si hay horarios

            // También habilitar/desactivar botones en otras vistas según sea necesario
            // ...
        }