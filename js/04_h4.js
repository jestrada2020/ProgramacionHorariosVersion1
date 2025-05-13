// Mostrar modal Materia (Añadir o Editar)
        function mostrarModalMateria(materiaId = null) {
            const modal = document.getElementById('modalMateria');
            const titulo = document.getElementById('modalMateriaTitulo');
            const codigoInput = document.getElementById('materiaCodigo');
            const nombreInput = document.getElementById('materiaNombre');
            const semestreSelect = document.getElementById('materiaSemestre');
            const horasInput = document.getElementById('materiaHoras'); // Representa bloques
            const tipoAulaSelect = document.getElementById('materiaTipoAula');
            const editIdInput = document.getElementById('materiaEditId');

            // Asegurarse de que los selectores estén poblados
            actualizarSelectorSemestres();

            if (materiaId) { // Editar
                const materia = estado.materias.find(m => m.id === materiaId);
                if (!materia) return;
                titulo.textContent = 'Editar Materia';
                codigoInput.value = materia.codigo;
                nombreInput.value = materia.nombre;
                semestreSelect.value = materia.semestre;
                horasInput.value = materia.horasSemana; // Bloques
                tipoAulaSelect.value = materia.tipoAula;
                editIdInput.value = materiaId;
                estado.editandoId = materiaId;
            } else { // Añadir
                titulo.textContent = 'Añadir Nueva Materia';
                codigoInput.value = '';
                nombreInput.value = '';
                semestreSelect.value = '1'; // Valor por defecto
                horasInput.value = '2'; // Valor por defecto (bloques)
                tipoAulaSelect.value = 'normal'; // Valor por defecto
                editIdInput.value = '';
                estado.editandoId = null;
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // Guardar Materia
        function guardarMateria() {
            const id = estado.editandoId;
            const codigo = document.getElementById('materiaCodigo').value.trim();
            const nombre = document.getElementById('materiaNombre').value.trim();
            const semestre = parseInt(document.getElementById('materiaSemestre').value);
            const horasSemana = parseInt(document.getElementById('materiaHoras').value); // Bloques
            const tipoAula = document.getElementById('materiaTipoAula').value;

            if (!codigo || !nombre || isNaN(semestre) || isNaN(horasSemana)) {
                mostrarNotificacion('Error', 'Código, nombre, semestre y bloques son obligatorios y deben ser válidos.', 'error');
                return;
            }

             // Validar que el código no exista ya
            const codigoExiste = estado.materias.some(m => m.codigo === codigo && m.id !== id);
            if (codigoExiste) {
                 mostrarNotificacion('Error', `El código '${codigo}' ya está en uso por otra materia.`, 'error');
                 return;
            }

            if (id) { // Editar
                const materia = estado.materias.find(m => m.id === id);
                if (materia) {
                    materia.codigo = codigo;
                    materia.nombre = nombre;
                    materia.semestre = semestre;
                    materia.horasSemana = horasSemana; // Guardar bloques
                    materia.tipoAula = tipoAula;
                    mostrarNotificacion('Éxito', 'Materia actualizada correctamente.', 'success');
                }
            } else { // Añadir
                 const nuevoId = `MAT-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
                estado.materias.push({
                    id: nuevoId, codigo, nombre, semestre, horasSemana, tipoAula // Guardar bloques
                });
                mostrarNotificacion('Éxito', 'Materia añadida correctamente.', 'success');
            }

            cerrarModal('modalMateria');
            renderizarMaterias();
            renderizarProfesores(); // La carga puede cambiar si cambian horas de materia
            guardarDatosLocalmente();
            actualizarInterfaz();
        }

        // Eliminar Materia
        function eliminarMateria(id) {
            if (confirm(`¿Está seguro de que desea eliminar la materia con ID ${id}? Esto la quitará de los horarios y de las asignaciones a profesores.`)) {
                estado.materias = estado.materias.filter(m => m.id !== id);
                // Limpiar horarios que usen esta materia
                Object.keys(estado.horarios).forEach(sem => {
                    Object.keys(estado.horarios[sem]).forEach(dia => {
                        Object.keys(estado.horarios[sem][dia]).forEach(hora => {
                            if (estado.horarios[sem][dia][hora]?.codigo === id) { // Comparar con código/id
                                delete estado.horarios[sem][dia][hora];
                            }
                        });
                    });
                });
                // Limpiar asignaciones en profesores
                estado.profesores.forEach(p => {
                    if (p.materiasQueDicta) {
                        p.materiasQueDicta = p.materiasQueDicta.filter(matId => matId !== id);
                    }
                });

                renderizarMaterias();
                renderizarProfesores(); // Actualizar carga y lista de materias por profesor
                generarHorariosVisualizacion(); // Regenerar vistas
                actualizarHorarioVisible(); // Actualizar tabla visible
                guardarDatosLocalmente();
                actualizarInterfaz();
                mostrarNotificacion('Éxito', 'Materia eliminada.', 'success');
            }
        }

        // Mostrar modal Aula (Añadir o Editar)
        function mostrarModalAula(aulaId = null) {
            const modal = document.getElementById('modalAula');
            const titulo = document.getElementById('modalAulaTitulo');
            const codigoInput = document.getElementById('aulaCodigo');
            const nombreInput = document.getElementById('aulaNombre');
            const tipoSelect = document.getElementById('aulaTipo');
            const capacidadInput = document.getElementById('aulaCapacidad');
            const ubicacionInput = document.getElementById('aulaUbicacion');
            const editIdInput = document.getElementById('aulaEditId');

            if (aulaId) { // Editar
                const aula = estado.aulas.find(a => a.id === aulaId);
                if (!aula) return;
                titulo.textContent = 'Editar Aula';
                codigoInput.value = aula.codigo;
                nombreInput.value = aula.nombre;
                tipoSelect.value = aula.tipo;
                capacidadInput.value = aula.capacidad;
                ubicacionInput.value = aula.ubicacion || '';
                editIdInput.value = aulaId;
                estado.editandoId = aulaId;
            } else { // Añadir
                titulo.textContent = 'Añadir Nueva Aula';
                codigoInput.value = '';
                nombreInput.value = '';
                tipoSelect.value = 'normal';
                capacidadInput.value = '30';
                ubicacionInput.value = '';
                editIdInput.value = '';
                estado.editandoId = null;
            }
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

        // Guardar Aula
        function guardarAula() {
            const id = estado.editandoId;
            const codigo = document.getElementById('aulaCodigo').value.trim();
            const nombre = document.getElementById('aulaNombre').value.trim();
            const tipo = document.getElementById('aulaTipo').value;
            const capacidad = parseInt(document.getElementById('aulaCapacidad').value);
            const ubicacion = document.getElementById('aulaUbicacion').value.trim();

            if (!codigo || !nombre || isNaN(capacidad) || capacidad <= 0) {
                mostrarNotificacion('Error', 'Código, nombre y capacidad válida son obligatorios.', 'error');
                return;
            }

             // Validar que el código no exista ya
            const codigoExiste = estado.aulas.some(a => a.codigo === codigo && a.id !== id);
            if (codigoExiste) {
                 mostrarNotificacion('Error', `El código '${codigo}' ya está en uso por otra aula.`, 'error');
                 return;
            }

            if (id) { // Editar
                const aula = estado.aulas.find(a => a.id === id);
                if (aula) {
                    aula.codigo = codigo;
                    aula.nombre = nombre;
                    aula.tipo = tipo;
                    aula.capacidad = capacidad;
                    aula.ubicacion = ubicacion;
                    mostrarNotificacion('Éxito', 'Aula actualizada correctamente.', 'success');
                }
            } else { // Añadir
                 const nuevoId = `AULA-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
                estado.aulas.push({
                    id: nuevoId, codigo, nombre, tipo, capacidad, ubicacion
                });
                mostrarNotificacion('Éxito', 'Aula añadida correctamente.', 'success');
            }

            cerrarModal('modalAula');
            renderizarAulas();
            guardarDatosLocalmente();
            actualizarInterfaz();
        }

        // Eliminar Aula
        function eliminarAula(id) {
             if (confirm(`¿Está seguro de que desea eliminar el aula con ID ${id}? Esto podría afectar horarios asignados.`)) {
                estado.aulas = estado.aulas.filter(a => a.id !== id);
                 // Opcional: Limpiar referencias en horarios
                 Object.keys(estado.horarios).forEach(sem => {
                    Object.keys(estado.horarios[sem]).forEach(dia => {
                        Object.keys(estado.horarios[sem][dia]).forEach(hora => {
                            if (estado.horarios[sem][dia][hora]?.aulaId === id) {
                                // Opcional: ¿Eliminar la sesión o solo quitar el aula?
                                // Por ahora, eliminamos la sesión para evitar inconsistencias
                                delete estado.horarios[sem][dia][hora];
                            }
                        });
                    });
                });

                renderizarAulas();
                generarHorariosVisualizacion(); // Regenerar vistas
                actualizarHorarioVisible(); // Actualizar tabla visible
                guardarDatosLocalmente();
                actualizarInterfaz();
                mostrarNotificacion('Éxito', 'Aula eliminada.', 'success');
            }
        }