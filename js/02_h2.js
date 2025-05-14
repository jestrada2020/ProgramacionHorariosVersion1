// Renderizar tabla de aulas
        function renderizarAulas() {
            const tbody = document.getElementById('tablaAulas').querySelector('tbody');
            tbody.innerHTML = '';
            const filtroTipo = document.getElementById('filtroTipoAula').value;

            if (!estado.aulas || estado.aulas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="py-4 px-6 text-center">No hay aulas registradas.</td></tr>`;
                return;
            }

            const aulasFiltradas = filtroTipo === 'todos'
                ? estado.aulas
                : estado.aulas.filter(aula => aula.tipo === filtroTipo);

             if (aulasFiltradas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="py-4 px-6 text-center">No hay aulas del tipo '${filtroTipo}'.</td></tr>`;
                return;
            }

            aulasFiltradas.forEach(aula => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="py-3 px-6 editable-cell" data-type="aula" data-id="${aula.id}" data-field="codigo">${aula.codigo || ''}</td>
                    <td class="py-3 px-6 editable-cell" data-type="aula" data-id="${aula.id}" data-field="nombre">${aula.nombre || ''}</td>
                    <td class="py-3 px-6 editable-cell" data-type="aula" data-id="${aula.id}" data-field="tipo">${aula.tipo || 'normal'}</td>
                    <td class="py-3 px-6 editable-cell" data-type="aula" data-id="${aula.id}" data-field="capacidad">${aula.capacidad || 0}</td>
                    <td class="py-3 px-6 editable-cell" data-type="aula" data-id="${aula.id}" data-field="ubicacion">${aula.ubicacion || 'N/A'}</td>
                    <td class="py-3 px-6 text-center no-print">
                        <button class="bg-yellow-500 hover:bg-yellow-700 text-white p-1 rounded mr-1" onclick="mostrarModalAula('${aula.id}')" title="Editar Aula">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button class="bg-red-500 hover:bg-red-700 text-white p-1 rounded" onclick="eliminarAula('${aula.id}')" title="Eliminar Aula">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        // Renderizar la lista de horarios fijos en la pestaña de restricciones
        function renderizarListaHorariosFijos() {
            const listaUl = document.getElementById('listaHorariosFijos').querySelector('ul');
            listaUl.innerHTML = ''; // Limpiar lista

            const horariosFijos = estado.restricciones.filter(r => r.tipo === 'horarioFijo');

            if (horariosFijos.length === 0) {
                listaUl.innerHTML = '<li>No hay horarios fijos definidos.</li>';
                return;
            }

            horariosFijos.forEach((restriccion, index) => {
                const profesor = estado.profesores.find(p => p.id === restriccion.profesorId)?.nombre || 'Prof. Desconocido';
                const materia = estado.materias.find(m => m.id === restriccion.materiaId)?.nombre || 'Mat. Desconocida';
                const aula = estado.aulas.find(a => a.id === restriccion.aulaId)?.nombre || 'Aula Desconocida';

                const li = document.createElement('li');
                li.className = 'mb-1 flex justify-between items-center';
                // Determinar la hora a mostrar (compatibilidad con ambos formatos)
                let horaTexto = restriccion.hora || "";
                if (restriccion.horaInicio && restriccion.horaFin) {
                    horaTexto = `${restriccion.horaInicio}-${restriccion.horaFin}`;
                }

                li.innerHTML = `
                    <span>${profesor} - ${materia} - ${aula} (${restriccion.dia} ${horaTexto})</span>
                    <button class="text-red-500 hover:text-red-700 text-xs ml-2 no-print" onclick="eliminarHorarioFijo(${index})" title="Eliminar restricción">&times;</button>
                `;
                listaUl.appendChild(li);
            });
        }

        // --- EDICIÓN EN CELDAS ---
        function editarCeldaDinamica(tipo, id, campo, celda) {
            // Prevenir edición de la columna de carga total en la tabla de profesores
            if (tipo === 'profesor' && campo === 'cargaTotal') {
                mostrarNotificacion('Info', 'La carga total se calcula automáticamente.', 'info');
                return;
            }

            const valorActual = celda.textContent.trim();
            let inputElement;

            // Crear campo de edición según el tipo de campo
            if (campo === 'tipo' && tipo === 'aula') {
                inputElement = document.createElement('select');
                ['normal', 'laboratorio', 'informatica', 'auditorio'].forEach(opcion => {
                    const option = document.createElement('option');
                    option.value = opcion; option.textContent = opcion;
                    if (opcion === valorActual) option.selected = true;
                    inputElement.appendChild(option);
                });
            } else if (campo === 'semestre' && tipo === 'materia') {
                inputElement = document.createElement('select');
                const cantidadSemestres = parseInt(estado.configuracion.cantidadSemestres) || 4;
                for (let i = 1; i <= cantidadSemestres; i++) {
                    const option = document.createElement('option');
                    option.value = i; option.textContent = i;
                    if (i === parseInt(valorActual)) option.selected = true;
                    inputElement.appendChild(option);
                }
            } else if (['horasSemana', 'capacidad'].includes(campo)) {
                inputElement = document.createElement('input');
                inputElement.type = 'number';
                inputElement.min = (campo === 'horasSemana') ? '1' : '1';
                inputElement.max = (campo === 'horasSemana') ? '10' : '500';
                inputElement.value = parseInt(valorActual) || inputElement.min;
            } else { // Campos de texto (codigo, nombre, especialidad, ubicacion)
                inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.value = valorActual;
            }

            inputElement.className = 'px-1 py-0 border rounded w-full text-sm'; // Estilo compacto
            celda.innerHTML = '';
            celda.appendChild(inputElement);
            inputElement.focus();
            inputElement.select(); // Seleccionar texto para fácil reemplazo

            // Función para guardar el cambio
            const guardarCambio = () => {
                let nuevoValor = inputElement.value.trim();
                // Validar que no esté vacío si es código o nombre
                if (['codigo', 'nombre'].includes(campo) && !nuevoValor) {
                     mostrarNotificacion('Error', `El campo ${campo} no puede estar vacío.`, 'error');
                     celda.innerHTML = valorActual; // Restaurar valor original
                     return;
                }

                if (nuevoValor !== valorActual) {
                    let objeto;
                    if (tipo === 'profesor') objeto = estado.profesores.find(p => p.id == id);
                    else if (tipo === 'materia') objeto = estado.materias.find(m => m.id == id);
                    else if (tipo === 'aula') objeto = estado.aulas.find(a => a.id == id);

                    if (objeto) {
                        // Convertir a número si es necesario
                        if (['horasSemana', 'capacidad', 'semestre'].includes(campo)) {
                            nuevoValor = parseInt(nuevoValor);
                            if (isNaN(nuevoValor)) {
                                mostrarNotificacion('Error', 'Valor numérico inválido.', 'error');
                                celda.innerHTML = valorActual;
                                return;
                            }
                        }

                        // Validar unicidad del código si se está cambiando
                        if (campo === 'codigo') {
                            const existe = estado[tipo + 's'].some(item => item.codigo === nuevoValor && item.id !== id);
                            if (existe) {
                                 mostrarNotificacion('Error', `El código '${nuevoValor}' ya está en uso.`, 'error');
                                 celda.innerHTML = valorActual;
                                 return;
                            }
                        }

                        objeto[campo] = nuevoValor; // Actualizar la propiedad

                        guardarDatosLocalmente();

                        // Actualizar solo la celda en la UI para eficiencia
                        celda.textContent = nuevoValor; // Mostrar el nuevo valor

                        // Re-renderizar profesores si se cambió algo que afecta el resumen
                        if (tipo === 'profesor') {
                            renderizarProfesores();
                        } else if (tipo === 'materia') {
                            renderizarMaterias();
                            renderizarProfesores(); // La carga puede cambiar si cambian horas de materia
                        } else if (tipo === 'aula') {
                            renderizarAulas();
                        }

                        mostrarNotificacion('Actualización', `Campo ${campo} actualizado.`, 'success');
                        actualizarInterfaz(); // Actualizar selectores y otros elementos dependientes
                    } else {
                         mostrarNotificacion('Error', 'No se encontró el elemento para actualizar.', 'error');
                         celda.innerHTML = valorActual;
                    }
                } else {
                    // Si no hubo cambio, restaurar
                    celda.innerHTML = valorActual;
                }
                 // Quitar listeners para evitar duplicados
                inputElement.removeEventListener('blur', guardarCambio);
                inputElement.removeEventListener('keydown', handleKeyDown);
            };

             const handleKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    guardarCambio();
                } else if (e.key === 'Escape') {
                    celda.innerHTML = valorActual; // Cancelar
                    inputElement.removeEventListener('blur', guardarCambio);
                    inputElement.removeEventListener('keydown', handleKeyDown);
                }
            };

            // Eventos para guardar
            inputElement.addEventListener('blur', guardarCambio);
            inputElement.addEventListener('keydown', handleKeyDown);
        }