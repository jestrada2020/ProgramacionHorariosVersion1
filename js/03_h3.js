// --- GESTIÓN DE DATOS (CRUD) ---

        // Mostrar modal Profesor (Añadir o Editar)
        function mostrarModalProfesor(profesorId = null) {
            const modal = document.getElementById('modalProfesor');
            const titulo = document.getElementById('modalProfesorTitulo');
            const codigoInput = document.getElementById('profesorCodigo');
            const nombreInput = document.getElementById('profesorNombre');
            const especialidadInput = document.getElementById('profesorEspecialidad');
            const editIdInput = document.getElementById('profesorEditId');
            const materiasContainer = document.getElementById('profesorMateriasContainer');
            const checkboxesDisp = modal.querySelectorAll('.disp-check');
            // Inputs de carga laboral
            const investigacionInput = document.getElementById('profesorInvestigacion');
            const proyInstInput = document.getElementById('profesorProyectosInst');
            const proyExtInput = document.getElementById('profesorProyectosExt');
            const materialInput = document.getElementById('profesorMaterial');
            const capacitacionInput = document.getElementById('profesorCapacitacion');
            // const horasObjetivoInput = document.getElementById('profesorHorasObjetivo'); // Opcional

            if (profesorId) { // Modo Edición
                const profesor = estado.profesores.find(p => p.id === profesorId);
                if (!profesor) return;
                titulo.textContent = 'Editar Profesor';
                codigoInput.value = profesor.codigo;
                nombreInput.value = profesor.nombre;
                especialidadInput.value = profesor.especialidad || '';
                editIdInput.value = profesorId;
                estado.editandoId = profesorId; // Guardar ID para 'guardarProfesor'

                // Cargar carga laboral
                investigacionInput.value = profesor.horasInvestigacionSemanal || 0;
                proyInstInput.value = profesor.horasProyectosInstSemanal || 0;
                proyExtInput.value = profesor.horasProyectosExtSemanal || 0;
                materialInput.value = profesor.horasMaterialDidacticoSemanal || 0;
                capacitacionInput.value = profesor.horasCapacitacionSemestral || 0;
                // if (horasObjetivoInput) horasObjetivoInput.value = profesor.horasObjetivoSemanal || '';

                // Cargar materias que dicta
                materiasContainer.innerHTML = ''; // Limpiar
                estado.materias.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(materia => {
                    const isChecked = profesor.materiasQueDicta?.includes(materia.id) ?? false;
                    materiasContainer.innerHTML += `
                        <div class="flex items-center">
                            <input type="checkbox" id="profMat-${materia.id}" value="${materia.id}" class="mr-1 prof-materia-check" ${isChecked ? 'checked' : ''}>
                            <label for="profMat-${materia.id}" class="text-sm" title="${materia.nombre} (Sem ${materia.semestre})">${materia.nombre}</label>
                        </div>
                    `;
                });

                // Cargar disponibilidad guardada
                checkboxesDisp.forEach(chk => {
                    const dia = chk.dataset.dia;
                    const turno = chk.dataset.turno;
                    chk.checked = profesor.diasDisponibles?.[dia]?.[turno] ?? false; // Usar valor guardado o false
                });

            } else { // Modo Añadir
                titulo.textContent = 'Añadir Nuevo Profesor';
                codigoInput.value = '';
                nombreInput.value = '';
                especialidadInput.value = '';
                editIdInput.value = '';
                estado.editandoId = null;

                // Resetear carga laboral
                investigacionInput.value = 0;
                proyInstInput.value = 0;
                proyExtInput.value = 0;
                materialInput.value = 0;
                capacitacionInput.value = 0;
                // if (horasObjetivoInput) horasObjetivoInput.value = '';

                // Cargar materias (ninguna seleccionada por defecto)
                materiasContainer.innerHTML = ''; // Limpiar
                 estado.materias.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(materia => {
                    materiasContainer.innerHTML += `
                        <div class="flex items-center">
                            <input type="checkbox" id="profMat-${materia.id}" value="${materia.id}" class="mr-1 prof-materia-check">
                            <label for="profMat-${materia.id}" class="text-sm" title="${materia.nombre} (Sem ${materia.semestre})">${materia.nombre}</label>
                        </div>
                    `;
                });


                 // Establecer disponibilidad por defecto (ej. L-V Mañana y Tarde)
                checkboxesDisp.forEach(chk => {
                    const dia = chk.dataset.dia;
                    chk.checked = (dia !== 'Sábado'); // Marcar L-V por defecto
                });
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // Guardar Profesor (Añadir o Editar)
        function guardarProfesor() {
            const id = estado.editandoId;
            const codigo = document.getElementById('profesorCodigo').value.trim();
            const nombre = document.getElementById('profesorNombre').value.trim();
            const especialidad = document.getElementById('profesorEspecialidad').value.trim();
            const materiasChecks = document.querySelectorAll('#modalProfesor .prof-materia-check:checked');
            const checkboxesDisp = document.querySelectorAll('#modalProfesor .disp-check');
            // Leer carga laboral
            const horasInvestigacionSemanal = parseFloat(document.getElementById('profesorInvestigacion').value) || 0;
            const horasProyectosInstSemanal = parseFloat(document.getElementById('profesorProyectosInst').value) || 0;
            const horasProyectosExtSemanal = parseFloat(document.getElementById('profesorProyectosExt').value) || 0;
            const horasMaterialDidacticoSemanal = parseFloat(document.getElementById('profesorMaterial').value) || 0;
            const horasCapacitacionSemestral = parseFloat(document.getElementById('profesorCapacitacion').value) || 0;
            // const horasObjetivoSemanalInput = document.getElementById('profesorHorasObjetivo'); // Opcional
            // const horasObjetivoSemanal = horasObjetivoSemanalInput ? (parseFloat(horasObjetivoSemanalInput.value) || null) : null;

            if (!codigo || !nombre) {
                mostrarNotificacion('Error', 'El código y el nombre son obligatorios.', 'error');
                return;
            }

            // Validar que el código no exista ya (si es nuevo o si se cambió)
            const codigoExiste = estado.profesores.some(p => p.codigo === codigo && p.id !== id);
            if (codigoExiste) {
                 mostrarNotificacion('Error', `El código '${codigo}' ya está en uso por otro profesor.`, 'error');
                 return;
            }

            // Recopilar materias seleccionadas
            const materiasQueDicta = [];
            materiasChecks.forEach(chk => materiasQueDicta.push(chk.value));

            // Recopilar disponibilidad
            const diasDisponibles = {};
             checkboxesDisp.forEach(chk => {
                const dia = chk.dataset.dia;
                const turno = chk.dataset.turno;
                if (!diasDisponibles[dia]) {
                    diasDisponibles[dia] = {};
                }
                diasDisponibles[dia][turno] = chk.checked;
            });


            if (id) { // Editar
                const profesor = estado.profesores.find(p => p.id === id);
                if (profesor) {
                    profesor.codigo = codigo;
                    profesor.nombre = nombre;
                    profesor.especialidad = especialidad;
                    profesor.diasDisponibles = diasDisponibles;
                    profesor.materiasQueDicta = materiasQueDicta;
                    // Actualizar carga laboral
                    profesor.horasInvestigacionSemanal = horasInvestigacionSemanal;
                    profesor.horasProyectosInstSemanal = horasProyectosInstSemanal;
                    profesor.horasProyectosExtSemanal = horasProyectosExtSemanal;
                    profesor.horasMaterialDidacticoSemanal = horasMaterialDidacticoSemanal;
                    profesor.horasCapacitacionSemestral = horasCapacitacionSemestral;
                    // profesor.horasObjetivoSemanal = horasObjetivoSemanal; // Opcional
                    mostrarNotificacion('Éxito', 'Profesor actualizado correctamente.', 'success');
                }
            } else { // Añadir
                const nuevoId = `PROF-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`; // ID único robusto
                estado.profesores.push({
                    id: nuevoId,
                    codigo: codigo,
                    nombre: nombre,
                    especialidad: especialidad,
                    diasDisponibles: diasDisponibles,
                    materiasQueDicta: materiasQueDicta,
                    // Añadir carga laboral
                    horasInvestigacionSemanal: horasInvestigacionSemanal,
                    horasProyectosInstSemanal: horasProyectosInstSemanal,
                    horasProyectosExtSemanal: horasProyectosExtSemanal,
                    horasMaterialDidacticoSemanal: horasMaterialDidacticoSemanal,
                    horasCapacitacionSemestral: horasCapacitacionSemestral,
                    // horasObjetivoSemanal: horasObjetivoSemanal // Opcional
                });
                mostrarNotificacion('Éxito', 'Profesor añadido correctamente.', 'success');
            }

            cerrarModal('modalProfesor');
            renderizarProfesores(); // Re-renderizar para actualizar tabla y resumen
            guardarDatosLocalmente();
            actualizarInterfaz(); // Actualizar selectores dependientes
        }

        // Eliminar Profesor
        function eliminarProfesor(id) {
            if (confirm(`¿Está seguro de que desea eliminar al profesor con ID ${id}? Esto podría afectar materias y horarios asignados.`)) {
                estado.profesores = estado.profesores.filter(p => p.id !== id);
                // Limpiar horarios (más complejo, requiere iterar)
                Object.keys(estado.horarios).forEach(sem => {
                    Object.keys(estado.horarios[sem]).forEach(dia => {
                        Object.keys(estado.horarios[sem][dia]).forEach(hora => {
                            if (estado.horarios[sem][dia][hora]?.profesorId === id) {
                                // Opcional: ¿Eliminar la sesión o solo quitar el profesor?
                                // Por ahora, eliminamos la sesión para evitar inconsistencias
                                delete estado.horarios[sem][dia][hora];
                            }
                        });
                    });
                });

                renderizarProfesores();
                generarHorariosVisualizacion(); // Regenerar vistas
                actualizarHorarioVisible(); // Actualizar tabla visible
                guardarDatosLocalmente();
                actualizarInterfaz();
                mostrarNotificacion('Éxito', 'Profesor eliminado.', 'success');
            }
        }