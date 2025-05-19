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
            // Inputs de asesorías
            const habilitarAsesoriasNormalesProfesorInput = document.getElementById('habilitarAsesoriasNormalesProfesor');
            const duracionAsesoriaNormalProfesorInput = document.getElementById('duracionAsesoriaNormalProfesor');
            const frecuenciaAsesoriaNormalProfesorInput = document.getElementById('frecuenciaAsesoriaNormalProfesor');
            const habilitarAsesoriasEvaluacionProfesorInput = document.getElementById('habilitarAsesoriasEvaluacionProfesor');
            const duracionAsesoriaEvaluacionProfesorInput = document.getElementById('duracionAsesoriaEvaluacionProfesor');
            const frecuenciaAsesoriaEvaluacionProfesorInput = document.getElementById('frecuenciaAsesoriaEvaluacionProfesor');
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
                
                // Cargar configuración de asesorías del profesor
                const asesoriasNormales = profesor.asesoriasNormalesConfig || {};
                habilitarAsesoriasNormalesProfesorInput.checked = asesoriasNormales.habilitado || false;
                duracionAsesoriaNormalProfesorInput.value = asesoriasNormales.duracionMinutos || 60;
                frecuenciaAsesoriaNormalProfesorInput.value = asesoriasNormales.vecesPorSemana || 1;
                
                const asesoriasEvaluacion = profesor.asesoriasEvaluacionConfig || {};
                habilitarAsesoriasEvaluacionProfesorInput.checked = asesoriasEvaluacion.habilitado || false;
                duracionAsesoriaEvaluacionProfesorInput.value = asesoriasEvaluacion.duracionMinutos || 120;
                frecuenciaAsesoriaEvaluacionProfesorInput.value = asesoriasEvaluacion.vecesPorSemana || 1;
                
                // Cargar los nuevos campos
                const horasObjetivoInput = document.getElementById('profesorHorasObjetivo');
                const tipoContratoInput = document.getElementById('profesorTipoContrato');
                const horasAdministrativasInput = document.getElementById('profesorAdministrativas');
                const cursosVirtualesInput = document.getElementById('profesorCursosVirtuales');
                const asesoriasVirtualesInput = document.getElementById('profesorAsesoriasVirtuales');
                const trabajoEnCasaInput = document.getElementById('profesorTrabajoEnCasa');
                
                if (horasObjetivoInput) horasObjetivoInput.value = profesor.horasObjetivoSemanal || '';
                if (tipoContratoInput) tipoContratoInput.value = profesor.tipoContrato || 'tiempoCompleto';
                if (horasAdministrativasInput) horasAdministrativasInput.value = profesor.horasAdministrativas || 0;
                if (cursosVirtualesInput) cursosVirtualesInput.value = profesor.cursosVirtuales || 0;
                if (asesoriasVirtualesInput) asesoriasVirtualesInput.value = profesor.horasAsesoriasVirtuales || 0;
                if (trabajoEnCasaInput) trabajoEnCasaInput.value = profesor.horasTrabajoEnCasa || 0;

                // Cargar materias que dicta
                materiasContainer.innerHTML = ''; // Limpiar
                
                // Crear tabla con columnas para carga y clon virtual
                let materiasHtml = `
                <div class="bg-yellow-50 p-3 mb-3 rounded-md border border-yellow-200">
                    <p class="text-sm text-yellow-800 mb-1 font-medium">Información sobre clones virtuales:</p>
                    <p class="text-xs text-yellow-700">Un "clon virtual" es una materia que el profesor puede dictar y que sí se contabiliza dentro de su carga laboral. También puede ser carga laboral de otro profesor.</p>
                    <p class="text-xs text-yellow-700 mt-1">Las aulas para cursos virtuales se definirán como "pendiente" en el horario hasta su asignación definitiva.</p>
                </div>
                <div class="grid grid-cols-4 gap-2 mb-2 bg-gray-100 p-1 text-xs font-medium">
                    <div>Materia</div>
                    <div class="text-center">Puede dictar</div>
                    <div class="text-center" title="Marque si la materia es parte de la carga laboral normal del profesor">Carga normal</div>
                    <div class="text-center" title="Marque si la materia es un clon virtual (se incluye en la carga laboral)">Clon virtual</div>
                </div>
                <div class="max-h-60 overflow-y-auto">
                `;
                
                estado.materias.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(materia => {
                    // Verificar si la materia está en la lista de materias que dicta el profesor
                    const materiaInfo = profesor.materiasDetalle && profesor.materiasDetalle[materia.id] ? profesor.materiasDetalle[materia.id] : {};
                    const isChecked = profesor.materiasQueDicta?.includes(materia.id) ?? false;
                    const isVirtual = materiaInfo.esVirtual || false;
                    const isPartOfLoad = materiaInfo.partOfLoad || false;
                    
                    // Determinar si es una materia obligatoria para este profesor
                    // (esto se determinaría normalmente por profesorPreferidoCodigo en la materia, pero simplificamos usando esObligatoria)
                    const isRequired = materiaInfo.esObligatoria || false;
                    
                    materiasHtml += `
                        <div class="grid grid-cols-4 gap-2 items-center border-b border-gray-100 py-1 ${isRequired ? 'bg-blue-50' : ''}">
                            <div class="flex items-center">
                                <input type="checkbox" id="profMat-${materia.id}" value="${materia.id}" data-materia-id="${materia.id}" 
                                    class="mr-1 prof-materia-check" ${isChecked ? 'checked' : ''} ${isRequired ? 'checked disabled' : ''}>
                                <label for="profMat-${materia.id}" class="text-sm" title="${materia.nombre} (Sem ${materia.semestre})">
                                    ${materia.nombre} ${isRequired ? '<span class="text-xs text-blue-600">(obligatoria)</span>' : ''}
                                </label>
                            </div>
                            <div class="text-center">
                                ${isChecked || isRequired ? '✓' : '-'}
                            </div>
                            <div class="text-center">
                                <input type="checkbox" id="profMatCarga-${materia.id}" name="profMatLoad-${materia.id}" 
                                    class="materia-carga-check" ${(isPartOfLoad || (!isVirtual && isChecked) || isRequired) ? 'checked' : ''} 
                                    ${!isChecked && !isRequired ? 'disabled' : ''} 
                                    ${isRequired ? 'checked disabled' : ''}
                                    title="Incluir en la carga laboral normal">
                            </div>
                            <div class="text-center">
                                <input type="checkbox" id="profMatVirtual-${materia.id}" name="profMatVirtual-${materia.id}" 
                                    class="materia-virtual-check" ${isVirtual ? 'checked' : ''} 
                                    ${!isChecked && !isRequired ? 'disabled' : ''}
                                    title="Marcar como clon virtual (se incluye en la carga laboral)">
                            </div>
                        </div>
                    `;
                });
                
                materiasHtml += '</div>';
                materiasContainer.innerHTML = materiasHtml;
                
                // Agregar listeners para activar/desactivar los checkboxes según el estado del checkbox principal
                const materiaChecks = materiasContainer.querySelectorAll('.prof-materia-check');
                materiaChecks.forEach(check => {
                    check.addEventListener('change', function() {
                        if (this.disabled) return; // No cambiar nada si es una materia obligatoria
                        
                        const materiaId = this.dataset.materiaId;
                        const checkCarga = document.getElementById(`profMatCarga-${materiaId}`);
                        const checkVirtual = document.getElementById(`profMatVirtual-${materiaId}`);
                        
                        if (this.checked) {
                            // Habilitar los checkboxes y seleccionar "Carga" por defecto
                            checkCarga.disabled = false;
                            checkVirtual.disabled = false;
                            checkCarga.checked = true;
                        } else {
                            // Deshabilitar los checkboxes
                            checkCarga.disabled = true;
                            checkVirtual.disabled = true;
                            checkCarga.checked = false;
                            checkVirtual.checked = false;
                        }
                    });
                });

                // Establecer disponibilidad por defecto (ej. L-V Mañana y Tarde)
                checkboxesDisp.forEach(chk => {
                    const dia = chk.dataset.dia;
                    chk.checked = (dia !== 'Sábado'); // Marcar L-V por defecto
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
                
                // Resetear configuración de asesorías
                habilitarAsesoriasNormalesProfesorInput.checked = false;
                duracionAsesoriaNormalProfesorInput.value = 60;
                frecuenciaAsesoriaNormalProfesorInput.value = 1;
                habilitarAsesoriasEvaluacionProfesorInput.checked = false;
                duracionAsesoriaEvaluacionProfesorInput.value = 120;
                frecuenciaAsesoriaEvaluacionProfesorInput.value = 1;
                
                // Resetear los nuevos campos
                const horasObjetivoInput = document.getElementById('profesorHorasObjetivo');
                const tipoContratoInput = document.getElementById('profesorTipoContrato');
                const horasAdministrativasInput = document.getElementById('profesorAdministrativas');
                const cursosVirtualesInput = document.getElementById('profesorCursosVirtuales');
                const asesoriasVirtualesInput = document.getElementById('profesorAsesoriasVirtuales');
                const trabajoEnCasaInput = document.getElementById('profesorTrabajoEnCasa');
                
                if (horasObjetivoInput) horasObjetivoInput.value = '';
                if (tipoContratoInput) tipoContratoInput.value = 'tiempoCompleto'; // Valor por defecto
                if (horasAdministrativasInput) horasAdministrativasInput.value = 0;
                if (cursosVirtualesInput) cursosVirtualesInput.value = 0;
                if (asesoriasVirtualesInput) asesoriasVirtualesInput.value = 0;
                if (trabajoEnCasaInput) trabajoEnCasaInput.value = 0;

                // Cargar materias (ninguna seleccionada por defecto)
                materiasContainer.innerHTML = ''; // Limpiar
                
                // Crear tabla con columnas para carga y clon virtual
                let materiasHtml = `
                <div class="bg-yellow-50 p-3 mb-3 rounded-md border border-yellow-200">
                    <p class="text-sm text-yellow-800 mb-1 font-medium">Información sobre clones virtuales:</p>
                    <p class="text-xs text-yellow-700">Un "clon virtual" es una materia que el profesor puede dictar y que sí se contabiliza dentro de su carga laboral. También puede ser carga laboral de otro profesor.</p>
                    <p class="text-xs text-yellow-700 mt-1">Las aulas para cursos virtuales se definirán como "pendiente" en el horario hasta su asignación definitiva.</p>
                </div>
                <div class="grid grid-cols-4 gap-2 mb-2 bg-gray-100 p-1 text-xs font-medium">
                    <div>Materia</div>
                    <div class="text-center">Puede dictar</div>
                    <div class="text-center" title="Marque si la materia es parte de la carga laboral normal del profesor">Carga normal</div>
                    <div class="text-center" title="Marque si la materia es un clon virtual (se incluye en la carga laboral)">Clon virtual</div>
                </div>
                <div class="max-h-60 overflow-y-auto">
                `;
                
                estado.materias.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(materia => {
                    // Determinar si esta materia es obligatoria para este profesor
                    const isRequired = materia.profesorPreferidoCodigo && materia.profesorPreferidoCodigo === codigo;
                    
                    materiasHtml += `
                        <div class="grid grid-cols-4 gap-2 items-center border-b border-gray-100 py-1 ${isRequired ? 'bg-blue-50' : ''}">
                            <div class="flex items-center">
                                <input type="checkbox" id="profMat-${materia.id}" value="${materia.id}" data-materia-id="${materia.id}" 
                                    class="mr-1 prof-materia-check" ${isRequired ? 'checked disabled' : ''}>
                                <label for="profMat-${materia.id}" class="text-sm" title="${materia.nombre} (Sem ${materia.semestre})">
                                    ${materia.nombre} ${isRequired ? '<span class="text-xs text-blue-600">(obligatoria)</span>' : ''}
                                </label>
                            </div>
                            <div class="text-center">
                                ${isRequired ? '✓' : '-'}
                            </div>
                            <div class="text-center">
                                <input type="checkbox" id="profMatCarga-${materia.id}" name="profMatLoad-${materia.id}" 
                                    class="materia-carga-check" ${isRequired ? 'checked disabled' : 'disabled'}
                                    title="Incluir en la carga laboral normal">
                            </div>
                            <div class="text-center">
                                <input type="checkbox" id="profMatVirtual-${materia.id}" name="profMatVirtual-${materia.id}" 
                                    class="materia-virtual-check" ${isRequired ? 'disabled' : 'disabled'}
                                    title="Marcar como clon virtual (se incluye en la carga laboral)">
                            </div>
                        </div>
                    `;
                });
                
                materiasHtml += '</div>';
                materiasContainer.innerHTML = materiasHtml;
                
                // Agregar listeners para activar/desactivar los checkboxes según el estado del checkbox principal
                const materiaChecks = materiasContainer.querySelectorAll('.prof-materia-check');
                materiaChecks.forEach(check => {
                    check.addEventListener('change', function() {
                        const materiaId = this.dataset.materiaId;
                        const checkCarga = document.getElementById(`profMatCarga-${materiaId}`);
                        const checkVirtual = document.getElementById(`profMatVirtual-${materiaId}`);
                        
                        if (this.checked) {
                            // Habilitar los checkboxes y seleccionar "Carga" por defecto
                            checkCarga.disabled = false;
                            checkVirtual.disabled = false;
                            checkCarga.checked = true;
                        } else {
                            // Deshabilitar los checkboxes
                            checkCarga.disabled = true;
                            checkVirtual.disabled = true;
                            checkCarga.checked = false;
                            checkVirtual.checked = false;
                        }
                    });
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
            
            // Leer configuración de asesorías
            const asesoriasNormalesConfig = {
                habilitado: document.getElementById('habilitarAsesoriasNormalesProfesor').checked,
                duracionMinutos: parseInt(document.getElementById('duracionAsesoriaNormalProfesor').value) || 60,
                vecesPorSemana: parseInt(document.getElementById('frecuenciaAsesoriaNormalProfesor').value) || 1
            };
            
            const asesoriasEvaluacionConfig = {
                habilitado: document.getElementById('habilitarAsesoriasEvaluacionProfesor').checked,
                duracionMinutos: parseInt(document.getElementById('duracionAsesoriaEvaluacionProfesor').value) || 120,
                vecesPorSemana: parseInt(document.getElementById('frecuenciaAsesoriaEvaluacionProfesor').value) || 1
            };
            
            // Leer nuevos campos
            const horasObjetivoSemanalInput = document.getElementById('profesorHorasObjetivo');
            const horasObjetivoSemanal = horasObjetivoSemanalInput ? (parseFloat(horasObjetivoSemanalInput.value) || null) : null;
            const tipoContrato = document.getElementById('profesorTipoContrato').value;
            const horasAdministrativas = parseFloat(document.getElementById('profesorAdministrativas').value) || 0;
            const cursosVirtuales = parseFloat(document.getElementById('profesorCursosVirtuales').value) || 0;
            const horasAsesoriasVirtuales = parseFloat(document.getElementById('profesorAsesoriasVirtuales').value) || 0;
            const horasTrabajoEnCasa = parseFloat(document.getElementById('profesorTrabajoEnCasa').value) || 0;

            // Leer configuración de asesorías del profesor
            const habilitarAsesoriasNormalesProfesor = document.getElementById('habilitarAsesoriasNormalesProfesor').checked;
            const duracionAsesoriaNormalProfesor = parseInt(document.getElementById('duracionAsesoriaNormalProfesor').value) || 60;
            const frecuenciaAsesoriaNormalProfesor = parseInt(document.getElementById('frecuenciaAsesoriaNormalProfesor').value) || 1;
            
            const habilitarAsesoriasEvaluacionProfesor = document.getElementById('habilitarAsesoriasEvaluacionProfesor').checked;
            const duracionAsesoriaEvaluacionProfesor = parseInt(document.getElementById('duracionAsesoriaEvaluacionProfesor').value) || 120;
            const frecuenciaAsesoriaEvaluacionProfesor = parseInt(document.getElementById('frecuenciaAsesoriaEvaluacionProfesor').value) || 1;

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

            // Recopilar materias seleccionadas y su configuración (carga normal, virtual o ambas)
            const materiasQueDicta = [];
            const materiasDetalle = {};
            
            materiasChecks.forEach(chk => {
                if (chk.checked) {
                    const materiaId = chk.value;
                    materiasQueDicta.push(materiaId);
                    
                    // Verificar si es virtual y/o parte de la carga normal
                    const esVirtual = document.getElementById(`profMatVirtual-${materiaId}`).checked;
                    const partOfLoad = document.getElementById(`profMatCarga-${materiaId}`).checked;
                    
                    // Verificar si es una materia obligatoria (el checkbox estaba deshabilitado)
                    const esObligatoria = chk.disabled;
                    
                    materiasDetalle[materiaId] = {
                        esVirtual: esVirtual,
                        partOfLoad: partOfLoad,
                        esObligatoria: esObligatoria
                    };
                }
            });

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
                    profesor.materiasDetalle = materiasDetalle;
                    // Actualizar carga laboral
                    profesor.horasInvestigacionSemanal = horasInvestigacionSemanal;
                    profesor.horasProyectosInstSemanal = horasProyectosInstSemanal;
                    profesor.horasProyectosExtSemanal = horasProyectosExtSemanal;
                    profesor.horasMaterialDidacticoSemanal = horasMaterialDidacticoSemanal;
                    profesor.horasCapacitacionSemestral = horasCapacitacionSemestral;
                    
                    // Actualizar configuración de asesorías
                    profesor.asesoriasNormalesConfig = asesoriasNormalesConfig;
                    profesor.asesoriasEvaluacionConfig = asesoriasEvaluacionConfig;
                    
                    // Actualizar nuevos campos
                    profesor.horasObjetivoSemanal = horasObjetivoSemanal; 
                    profesor.tipoContrato = tipoContrato;
                    profesor.horasAdministrativas = horasAdministrativas;
                    profesor.cursosVirtuales = cursosVirtuales;
                    profesor.horasAsesoriasVirtuales = horasAsesoriasVirtuales;
                    profesor.horasTrabajoEnCasa = horasTrabajoEnCasa;
                    
                    // Actualizar configuración de asesorías del profesor
                    profesor.asesoriasNormalesConfig = {
                        habilitado: habilitarAsesoriasNormalesProfesor,
                        duracionMinutos: duracionAsesoriaNormalProfesor,
                        vecesPorSemana: frecuenciaAsesoriaNormalProfesor
                    };
                    
                    profesor.asesoriasEvaluacionConfig = {
                        habilitado: habilitarAsesoriasEvaluacionProfesor,
                        duracionMinutos: duracionAsesoriaEvaluacionProfesor,
                        vecesPorSemana: frecuenciaAsesoriaEvaluacionProfesor
                    };
                    
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
                    materiasDetalle: materiasDetalle,
                    
                    // Añadir carga laboral
                    horasInvestigacionSemanal: horasInvestigacionSemanal,
                    horasProyectosInstSemanal: horasProyectosInstSemanal,
                    horasProyectosExtSemanal: horasProyectosExtSemanal,
                    horasMaterialDidacticoSemanal: horasMaterialDidacticoSemanal,
                    horasCapacitacionSemestral: horasCapacitacionSemestral,
                    
                    // Añadir configuración de asesorías
                    asesoriasNormalesConfig: asesoriasNormalesConfig,
                    asesoriasEvaluacionConfig: asesoriasEvaluacionConfig,
                    
                    // Añadir nuevos campos
                    horasObjetivoSemanal: horasObjetivoSemanal,
                    tipoContrato: tipoContrato,
                    horasAdministrativas: horasAdministrativas,
                    cursosVirtuales: cursosVirtuales,
                    horasAsesoriasVirtuales: horasAsesoriasVirtuales,
                    horasTrabajoEnCasa: horasTrabajoEnCasa,
                    
                    // Añadir configuración de asesorías del profesor
                    asesoriasNormalesConfig: {
                        habilitado: habilitarAsesoriasNormalesProfesor,
                        duracionMinutos: duracionAsesoriaNormalProfesor,
                        vecesPorSemana: frecuenciaAsesoriaNormalProfesor
                    },
                    
                    asesoriasEvaluacionConfig: {
                        habilitado: habilitarAsesoriasEvaluacionProfesor,
                        duracionMinutos: duracionAsesoriaEvaluacionProfesor,
                        vecesPorSemana: frecuenciaAsesoriaEvaluacionProfesor
                    }
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