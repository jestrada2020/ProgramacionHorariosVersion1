// --- HORARIO BÁSICO ---

// Inicializar estructura para horarios básicos si no existe
if (!estado.horariosBasicos) {
    estado.horariosBasicos = {};
}

// Función para generar un horario básico inicial por semestre
function generarHorarioBasico() {
    const semestreSeleccionado = document.getElementById('semestreHorarioBasico').value;
    if (!semestreSeleccionado) {
        mostrarNotificacion('Error', 'Debe seleccionar un semestre', 'error');
        return;
    }
    
    mostrarCargando(true);
    
    setTimeout(() => { // Delay para UI
        try {
            // 1. Obtener materias del semestre seleccionado
            const materiasSemestre = estado.materias.filter(m => m.semestre == semestreSeleccionado);
            
            if (materiasSemestre.length === 0) {
                mostrarCargando(false);
                mostrarNotificacion('Información', `No hay materias definidas para el semestre ${semestreSeleccionado}`, 'info');
                return;
            }
            
            console.log(`Generando horario básico para semestre ${semestreSeleccionado} con ${materiasSemestre.length} materias`);
            
            // 2. Inicializar estructura horario básico para este semestre
            const diasHabiles = obtenerDiasHabiles();
            const horasPorDia = calcularHorasPorDia();
            
            if (!estado.horariosBasicos[semestreSeleccionado]) {
                estado.horariosBasicos[semestreSeleccionado] = {};
            }
            
            // Inicializar días
            diasHabiles.forEach(dia => {
                estado.horariosBasicos[semestreSeleccionado][dia] = {};
            });
            
            // 3. Verificar restricciones existentes para usarlas como base
            const restriccionesHorarioFijo = estado.restricciones.filter(r => 
                r.tipo === 'horarioFijo' && r.semestre == semestreSeleccionado
            );
            
            // 4. Colocar primero las materias con restricciones fijas
            const materiasConRestriccion = [];
            const materiasLibres = [...materiasSemestre];
            
            // Ubicar primero las materias con restricciones de horario fijo
            restriccionesHorarioFijo.forEach(restriccion => {
                const materia = estado.materias.find(m => m.id === restriccion.materiaId);
                if (materia && materia.semestre == semestreSeleccionado) {
                    // Verificar si la materia ya está en la lista de materias con restricción
                    if (!materiasConRestriccion.includes(materia.id)) {
                        materiasConRestriccion.push(materia.id);
                    }
                    
                    // Remover la materia de la lista de materias libres
                    const index = materiasLibres.findIndex(m => m.id === materia.id);
                    if (index !== -1) {
                        materiasLibres.splice(index, 1);
                    }
                    
                    // Agregar la sesión al horario básico
                    const profesor = estado.profesores.find(p => p.id === restriccion.profesorId);
                    const aula = estado.aulas.find(a => a.id === restriccion.aulaId);
                    
                    // Verificar si estamos usando el formato antiguo (campo hora) o nuevo (horaInicio y horaFin)
                    let hora = restriccion.hora;
                    
                    if (!hora && restriccion.horaInicio) {
                        // Si no hay hora pero sí horaInicio, usamos horaInicio como hora
                        hora = restriccion.horaInicio;
                    }
                    
                    // Validar que la hora esté dentro del rango configurado
                    const horasPorDia = calcularHorasPorDia();
                    if (!horasPorDia.includes(hora)) {
                        console.warn(`La hora ${hora} de la restricción no está dentro del rango configurado. Ignorando restricción.`);
                        return; // Continuar con la siguiente iteración
                    }
                    
                    // Agregar la sesión al horario básico
                    estado.horariosBasicos[semestreSeleccionado][restriccion.dia][hora] = {
                        codigo: materia.codigo || materia.id,
                        nombre: materia.nombre,
                        profesorId: restriccion.profesorId,
                        profesor: profesor ? profesor.nombre : 'Sin profesor',
                        aulaId: restriccion.aulaId,
                        aula: aula ? aula.nombre : 'Sin aula',
                        fijado: true,
                        horarioPreferido: restriccion.horaInicio && restriccion.horaFin ? 
                            `${restriccion.dia} ${restriccion.horaInicio}-${restriccion.horaFin}` : 
                            `${restriccion.dia} ${hora}`,
                        semestre: parseInt(semestreSeleccionado)
                    };
                    
                    // Si la restricción tiene rango (horaInicio y horaFin), crear bloques adicionales según duracionBloque
                    if (restriccion.horaInicio && restriccion.horaFin) {
                        try {
                            // Calcular cuántos bloques corresponden a esta restricción
                            const [horasInicio, minutosInicio] = restriccion.horaInicio.split(':').map(Number);
                            const [horasFin, minutosFin] = restriccion.horaFin.split(':').map(Number);
                            
                            const horasInicioMinutos = horasInicio * 60 + minutosInicio;
                            const horasFinMinutos = horasFin * 60 + minutosFin;
                            
                            const minutosDiferencia = horasFinMinutos - horasInicioMinutos;
                            const duracionBloque = estado.configuracion.duracionBloque || 60;
                            const bloquesDiferencia = Math.ceil(minutosDiferencia / duracionBloque);
                            
                            // Si hay más de un bloque, necesitamos ocupar bloques adicionales
                            if (bloquesDiferencia > 1) {
                                let horaActual = hora;
                                
                                // Asignar bloques adicionales
                                for (let i = 1; i < bloquesDiferencia; i++) {
                                    const siguienteHora = obtenerHoraSiguiente(horaActual, horasPorDia);
                                    if (siguienteHora) {
                                        estado.horariosBasicos[semestreSeleccionado][restriccion.dia][siguienteHora] = {
                                            codigo: materia.codigo || materia.id,
                                            nombre: materia.nombre,
                                            profesorId: restriccion.profesorId,
                                            profesor: profesor ? profesor.nombre : 'Sin profesor',
                                            aulaId: restriccion.aulaId,
                                            aula: aula ? aula.nombre : 'Sin aula',
                                            fijado: true,
                                            horarioPreferido: `${restriccion.dia} ${restriccion.horaInicio}-${restriccion.horaFin}`,
                                            semestre: parseInt(semestreSeleccionado),
                                            // Indicar que es una continuación
                                            continuacion: true
                                        };
                                        horaActual = siguienteHora;
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("Error procesando rango horario:", e);
                        }
                    }
                }
            });
            
            // Ordenar materias libres por cantidad de horas de mayor a menor
            materiasLibres.sort((a, b) => b.horasSemana - a.horasSemana);
            
            // 5. Asignar materias libres a los espacios disponibles
            // Obtener distribución balanceada por día
            const distribucionHoras = obtenerDistribucionBalanceada(materiasLibres, diasHabiles.length);
            
            // Realizar asignación según la distribución
            asignarMateriasAHorario(materiasLibres, distribucionHoras, semestreSeleccionado);
            
            // 6. Actualizar la visualización del horario básico
            mostrarHorarioBasico();
            guardarDatosLocalmente();
            
            mostrarNotificacion('Éxito', `Horario básico generado para el semestre ${semestreSeleccionado}`, 'success');
        } catch (error) {
            console.error("Error al generar horario básico:", error);
            mostrarNotificacion('Error', 'Ocurrió un error al generar el horario básico. Consulte la consola para más detalles.', 'error');
        } finally {
            mostrarCargando(false);
        }
    }, 50);
}

// Función para obtener una distribución balanceada de horas por día
function obtenerDistribucionBalanceada(materias, numDias) {
    // Calcular total de horas/bloques de todas las materias
    const totalHoras = materias.reduce((sum, m) => sum + m.horasSemana, 0);
    
    // Distribuir equitativamente entre los días
    const distribucion = {};
    const diasHabiles = obtenerDiasHabiles();
    
    // Inicializar con 0
    diasHabiles.forEach(dia => {
        distribucion[dia] = 0;
    });
    
    // Distribución base equitativa
    const horasPromedioNormal = Math.floor(totalHoras / numDias);
    const horasExtra = totalHoras % numDias;
    
    diasHabiles.forEach(dia => {
        distribucion[dia] = horasPromedioNormal;
    });
    
    // Distribuir las horas extras
    for (let i = 0; i < horasExtra; i++) {
        distribucion[diasHabiles[i]] += 1;
    }
    
    console.log("Distribución de horas por día:", distribucion);
    return distribucion;
}

// Función para asignar materias al horario según la distribución
function asignarMateriasAHorario(materias, distribucion, semestre) {
    const horasPorDia = calcularHorasPorDia();
    const diasHabiles = Object.keys(distribucion);
    
    // Crear una copia de la distribución para ir actualizándola
    const distribucionRestante = { ...distribucion };
    
    // Para cada materia, asignar bloques según distribución
    for (const materia of materias) {
        let bloquesPendientes = materia.horasSemana;
        
        // Encontrar profesores que pueden dictar esta materia
        const profesoresDisponibles = estado.profesores.filter(p => 
            p.materiasQueDicta && p.materiasQueDicta.includes(materia.id)
        );
        
        if (profesoresDisponibles.length === 0) {
            console.warn(`No hay profesores disponibles para la materia ${materia.nombre}`);
            continue;
        }
        
        // Ordenar profesores por carga de trabajo (usar el que tenga menos carga)
        profesoresDisponibles.sort((a, b) => {
            const cargaA = contarSesionesProfesor(a.id, semestre);
            const cargaB = contarSesionesProfesor(b.id, semestre);
            return cargaA - cargaB;
        });
        
        // Tomar el profesor con menos carga
        const profesor = profesoresDisponibles[0];
        
        // Encontrar aulas compatibles con el tipo de materia
        const aulasCompatibles = estado.aulas.filter(a => 
            a.tipo === materia.tipoAula || (materia.tipoAula === 'normal' && a.tipo === 'normal')
        );
        
        if (aulasCompatibles.length === 0) {
            console.warn(`No hay aulas compatibles para la materia ${materia.nombre} (tipo: ${materia.tipoAula})`);
            continue;
        }
        
        // Ordenar aulas por uso (preferir las menos utilizadas)
        aulasCompatibles.sort((a, b) => {
            const usoA = contarUsoAula(a.id, semestre);
            const usoB = contarUsoAula(b.id, semestre);
            return usoA - usoB;
        });
        
        // Tomar el aula menos utilizada
        const aula = aulasCompatibles[0];
        
        // Buscar días con menos carga para el profesor elegido
        const diasPorCargaProfesor = [...diasHabiles]
            .filter(dia => distribucionRestante[dia] > 0)
            .sort((a, b) => {
                const cargaDiaA = contarSesionesProfesorEnDia(profesor.id, a, semestre);
                const cargaDiaB = contarSesionesProfesorEnDia(profesor.id, b, semestre);
                return cargaDiaA - cargaDiaB;
            });
        
        // Intentar asignar bloques consecutivos cuando sea posible
        let bloquesAsignadosSeguidos = 0;
        let ultimoDia = null;
        let ultimaHora = null;
        
        while (bloquesPendientes > 0) {
            // Priorizar continuar en el mismo día si venimos de asignar bloques consecutivos
            let diaDisponible = null;
            
            if (bloquesAsignadosSeguidos > 0 && ultimoDia && distribucionRestante[ultimoDia] > 0) {
                // Verificar si podemos continuar en el mismo día
                const siguienteHoraDisponible = obtenerHoraSiguiente(ultimaHora, horasPorDia);
                if (siguienteHoraDisponible && !estado.horariosBasicos[semestre][ultimoDia][siguienteHoraDisponible]) {
                    diaDisponible = ultimoDia;
                } else {
                    // No se puede continuar en el mismo día, reiniciar contador de bloques seguidos
                    bloquesAsignadosSeguidos = 0;
                }
            }
            
            // Si no podemos continuar en el mismo día, buscar otro día
            if (!diaDisponible) {
                diaDisponible = diasPorCargaProfesor.find(dia => distribucionRestante[dia] > 0);
                bloquesAsignadosSeguidos = 0; // Reiniciar contador al cambiar de día
            }
            
            if (!diaDisponible) {
                console.warn(`No se pudo completar la asignación para la materia ${materia.nombre}. Faltan ${bloquesPendientes} bloques`);
                break;
            }
            
            // Buscar la hora adecuada en este día
            let horaDisponible;
            
            if (bloquesAsignadosSeguidos > 0) {
                // Si estamos asignando bloques consecutivos, tomar la siguiente hora
                horaDisponible = obtenerHoraSiguiente(ultimaHora, horasPorDia);
            } else {
                // Si empezamos de nuevo, buscar la primera hora disponible
                horaDisponible = horasPorDia.find(hora => 
                    !estado.horariosBasicos[semestre][diaDisponible][hora]
                );
            }
            
            if (!horaDisponible) {
                // Si no hay horas disponibles en este día, marcarlo como lleno
                distribucionRestante[diaDisponible] = 0;
                // Actualizar el array de días ordenados por carga
                const idx = diasPorCargaProfesor.indexOf(diaDisponible);
                if (idx > -1) {
                    diasPorCargaProfesor.splice(idx, 1);
                }
                continue;
            }
            
            // Asignar la materia a esta hora
            estado.horariosBasicos[semestre][diaDisponible][horaDisponible] = {
                codigo: materia.codigo,
                nombre: materia.nombre,
                profesorId: profesor.id,
                profesor: profesor.nombre,
                aulaId: aula.id,
                aula: aula.nombre,
                fijado: false,
                semestre: parseInt(semestre)
            };
            
            // Actualizar contadores
            bloquesPendientes--;
            distribucionRestante[diaDisponible]--;
            bloquesAsignadosSeguidos++;
            ultimoDia = diaDisponible;
            ultimaHora = horaDisponible;
        }
    }
}

// Función auxiliar para obtener la siguiente hora en el horario
function obtenerHoraSiguiente(horaActual, horasPorDia) {
    const idx = horasPorDia.indexOf(horaActual);
    if (idx >= 0 && idx < horasPorDia.length - 1) {
        return horasPorDia[idx + 1];
    }
    return null;
}

// Función auxiliar para contar sesiones de un profesor en un semestre dado
function contarSesionesProfesor(profesorId, semestre) {
    let contador = 0;
    
    // Contar en horarios básicos
    if (estado.horariosBasicos[semestre]) {
        const diasHabiles = Object.keys(estado.horariosBasicos[semestre]);
        for (const dia of diasHabiles) {
            const horas = estado.horariosBasicos[semestre][dia];
            for (const hora in horas) {
                if (horas[hora].profesorId === profesorId) {
                    contador++;
                }
            }
        }
    }
    
    return contador;
}

// Función auxiliar para contar sesiones de un profesor en un día específico
function contarSesionesProfesorEnDia(profesorId, dia, semestre) {
    let contador = 0;
    
    if (estado.horariosBasicos[semestre] && estado.horariosBasicos[semestre][dia]) {
        const horas = estado.horariosBasicos[semestre][dia];
        for (const hora in horas) {
            if (horas[hora].profesorId === profesorId) {
                contador++;
            }
        }
    }
    
    return contador;
}

// Función auxiliar para contar el uso de un aula en un semestre dado
function contarUsoAula(aulaId, semestre) {
    let contador = 0;
    
    // Contar en horarios básicos
    if (estado.horariosBasicos[semestre]) {
        const diasHabiles = Object.keys(estado.horariosBasicos[semestre]);
        for (const dia of diasHabiles) {
            const horas = estado.horariosBasicos[semestre][dia];
            for (const hora in horas) {
                if (horas[hora].aulaId === aulaId) {
                    contador++;
                }
            }
        }
    }
    
    return contador;
}

// Función para mostrar el horario básico en la tabla
function mostrarHorarioBasico() {
    const semestreSeleccionado = document.getElementById('semestreHorarioBasico').value;
    const tablaHorario = document.getElementById('tablaHorarioBasico');
    const mensajeNoHorario = document.getElementById('mensajeNoHorarioBasico');
    const container = document.getElementById('horarioBasicoContainer');
    
    if (!semestreSeleccionado || !estado.horariosBasicos[semestreSeleccionado]) {
        tablaHorario.classList.add('hidden');
        mensajeNoHorario.classList.remove('hidden');
        
        // Actualizar mensaje según la situación
        const h3 = mensajeNoHorario.querySelector('h3');
        const p = mensajeNoHorario.querySelector('p');
        
        if (!semestreSeleccionado) {
            h3.textContent = "Seleccione un semestre";
            p.textContent = "Debe seleccionar un semestre para generar el horario básico";
        } else {
            h3.textContent = "No hay horario básico generado";
            p.textContent = `Haga clic en "Generar Horario Básico" para crear un horario para el semestre ${semestreSeleccionado}`;
        }
        
        return;
    }
    
    const horario = estado.horariosBasicos[semestreSeleccionado];
    const diasHabiles = obtenerDiasHabiles();
    const horasPorDia = calcularHorasPorDia();
    
    if (diasHabiles.length === 0 || horasPorDia.length === 0) {
        tablaHorario.classList.add('hidden');
        mensajeNoHorario.classList.remove('hidden');
        mensajeNoHorario.querySelector('p').textContent = "Configure los días y horas en la sección de Configuración";
        return;
    }
    
    // Verificar si hay al menos una sesión programada
    let haySessiones = false;
    diasHabiles.forEach(dia => {
        if (Object.keys(horario[dia] || {}).length > 0) {
            haySessiones = true;
        }
    });
    
    if (!haySessiones) {
        tablaHorario.classList.add('hidden');
        mensajeNoHorario.classList.remove('hidden');
        return;
    }
    
    // Generar la tabla de horario
    let html = `
        <thead>
            <tr>
                <th class="border px-4 py-2">Hora</th>
    `;
    
    diasHabiles.forEach(dia => {
        html += `<th class="border px-4 py-2">${dia}</th>`;
    });
    
    html += `</tr></thead><tbody>`;
    
    // Filas por cada hora
    horasPorDia.forEach(hora => {
        html += `<tr><td class="border px-4 py-2 font-medium">${hora}</td>`;
        
        // Columnas por cada día
        diasHabiles.forEach(dia => {
            const sesion = horario[dia]?.[hora];
            let content = '';
            let cellClasses = 'border px-4 py-2';
            
            if (sesion) {
                cellClasses += " relative session";
                cellClasses += sesion.fijado ? " bg-yellow-50" : " bg-blue-50";
                
                // Si es una continuación, mostrar un estilo diferente
                if (sesion.continuacion) {
                    content = `
                        <div class="session-inner continuacion" data-dia="${dia}" data-hora="${hora}" data-materia="${sesion.codigo}">
                            <div class="text-xs text-gray-500">Continuación de</div>
                            <div class="font-medium text-sm">${sesion.nombre}</div>
                        </div>
                    `;
                } else {
                    content = `
                        <div class="session-inner" data-dia="${dia}" data-hora="${hora}" data-materia="${sesion.codigo}">
                            <div class="font-medium text-sm">${sesion.nombre}</div>
                            <div class="text-xs text-gray-600">Prof: ${sesion.profesor}</div>
                            <div class="text-xs text-gray-600">Aula: ${sesion.aula}</div>
                            ${sesion.horarioPreferido ? `<div class="text-xs text-gray-500">${sesion.horarioPreferido}</div>` : ''}
                        </div>
                    `;
                }
            }
            
            html += `<td class="${cellClasses}">${content}</td>`;
        });
        
        html += `</tr>`;
    });
    
    html += `</tbody>`;
    
    tablaHorario.innerHTML = html;
    tablaHorario.classList.remove('hidden');
    mensajeNoHorario.classList.add('hidden');
    container.classList.add('border', 'border-gray-200');
}

// Función para actualizar el selector de semestres del horario básico
function actualizarSelectorHorarioBasico() {
    const semestreSelect = document.getElementById('semestreHorarioBasico');
    if (!semestreSelect) return;
    
    const valorActual = semestreSelect.value; // Guardar valor actual para restaurarlo
    semestreSelect.innerHTML = '';
    
    // Obtener número máximo de semestres según configuración
    const cantidadSemestres = parseInt(estado.configuracion.cantidadSemestres) || 9;
    
    // Añadir opciones para cada semestre
    for (let i = 1; i <= cantidadSemestres; i++) {
        semestreSelect.add(new Option(`Semestre ${i}`, i));
    }
    
    // Restaurar valor si existía
    if (valorActual && valorActual <= cantidadSemestres) {
        semestreSelect.value = valorActual;
    }
    
    // Evento para cambiar la vista cuando cambia el semestre
    semestreSelect.onchange = () => {
        mostrarHorarioBasico();
        actualizarInfoHorarioBasico();
    };
    
    // Actualizar información inicial
    actualizarInfoHorarioBasico();
}

// Función para actualizar la información del semestre seleccionado
function actualizarInfoHorarioBasico() {
    const semestreSeleccionado = document.getElementById('semestreHorarioBasico').value;
    const diasHabilesElement = document.getElementById('diasHabilesHorarioBasico');
    const materiasElement = document.getElementById('materiasHorarioBasico');
    
    if (!semestreSeleccionado) {
        diasHabilesElement.innerHTML = '<span class="text-gray-400">Seleccione un semestre</span>';
        materiasElement.innerHTML = '<span class="text-gray-400">Seleccione un semestre</span>';
        return;
    }
    
    // Actualizar información de días habilitados
    const diasHabiles = obtenerDiasHabiles();
    if (diasHabiles.length > 0) {
        diasHabilesElement.innerHTML = diasHabiles.map(dia => 
            `<span class="inline-block bg-blue-100 text-blue-800 text-xs font-medium mr-1 px-2 py-1 rounded">${dia}</span>`
        ).join('');
    } else {
        diasHabilesElement.innerHTML = '<span class="text-red-500">No hay días configurados</span>';
    }
    
    // Actualizar información de materias en este semestre
    const materiasSemestre = estado.materias.filter(m => m.semestre == semestreSeleccionado);
    if (materiasSemestre.length > 0) {
        materiasElement.innerHTML = `<span class="text-green-600 font-medium">${materiasSemestre.length}</span> materias configuradas`;
    } else {
        materiasElement.innerHTML = '<span class="text-red-500">No hay materias para este semestre</span>';
    }
}

// Función para exportar el horario básico al horario general
function exportarHorarioBasico() {
    const semestreSeleccionado = document.getElementById('semestreHorarioBasico').value;
    if (!semestreSeleccionado || !estado.horariosBasicos[semestreSeleccionado]) {
        mostrarNotificacion('Error', 'No hay un horario básico generado para exportar', 'error');
        return;
    }
    
    // Confirmar antes de sobrescribir
    if (confirm(`¿Desea exportar el horario básico del semestre ${semestreSeleccionado} al horario general? Esto sobrescribirá las sesiones existentes para este semestre.`)) {
        mostrarCargando(true);
        
        setTimeout(() => {
            try {
                if (!estado.horarios[semestreSeleccionado]) {
                    estado.horarios[semestreSeleccionado] = {};
                }
                
                const diasHabiles = obtenerDiasHabiles();
                
                // Inicializar estructura si es necesario
                diasHabiles.forEach(dia => {
                    if (!estado.horarios[semestreSeleccionado][dia]) {
                        estado.horarios[semestreSeleccionado][dia] = {};
                    }
                });
                
                // Copiar sesiones del horario básico al horario general
                for (const dia of diasHabiles) {
                    if (estado.horariosBasicos[semestreSeleccionado][dia]) {
                        for (const hora in estado.horariosBasicos[semestreSeleccionado][dia]) {
                            const sesionBasica = estado.horariosBasicos[semestreSeleccionado][dia][hora];
                            
                            // Determinar el ID de materia correcto
                            const materia = estado.materias.find(m => 
                                m.id === sesionBasica.materiaId || m.codigo === sesionBasica.codigo
                            );
                            const materiaId = materia ? materia.id : (sesionBasica.materiaId || sesionBasica.codigo);
                            
                            // Formato de sesión para el horario general
                            estado.horarios[semestreSeleccionado][dia][hora] = {
                                materia: sesionBasica.nombre,
                                codigo: sesionBasica.codigo,
                                materiaId: materiaId,
                                profesor: sesionBasica.profesor,
                                profesorId: sesionBasica.profesorId,
                                aula: sesionBasica.aula,
                                aulaId: sesionBasica.aulaId,
                                semestre: parseInt(semestreSeleccionado),
                                fijado: sesionBasica.fijado,
                                horarioPreferido: sesionBasica.horarioPreferido || '',
                                tipoAula: materia?.tipoAula || 'normal'
                            };
                            
                            // Si hay una restricción de horario fijo correspondiente, asegurar que se mantenga conectada
                            if (sesionBasica.fijado) {
                                // Verificar si ya existe una restricción fija para esta sesión
                                const restriccionExistente = estado.restricciones.some(r => 
                                    r.tipo === 'horarioFijo' && 
                                    r.materiaId === materiaId && 
                                    r.profesorId === sesionBasica.profesorId && 
                                    r.semestre == semestreSeleccionado &&
                                    r.dia === dia &&
                                    r.hora === hora
                                );
                                
                                // Si no existe, crear una nueva restricción fija
                                if (!restriccionExistente) {
                                    estado.restricciones.push({
                                        tipo: 'horarioFijo',
                                        materiaId: materiaId,
                                        profesorId: sesionBasica.profesorId,
                                        aulaId: sesionBasica.aulaId,
                                        semestre: parseInt(semestreSeleccionado),
                                        dia: dia,
                                        hora: hora
                                    });
                                }
                            }
                        }
                    }
                }
                
                // Regenerar estructuras de visualización
                generarHorariosVisualizacion();
                
                // Actualizar lista de restricciones fijas si existe la función
                if (typeof renderizarListaHorariosFijos === 'function') {
                    renderizarListaHorariosFijos();
                }
                
                // Guardar datos y actualizar interfaz
                guardarDatosLocalmente();
                actualizarHorarioVisible();
                
                mostrarNotificacion('Éxito', `Horario básico exportado al horario general para el semestre ${semestreSeleccionado}`, 'success');
                
                // Cambiar a la pestaña de horarios
                document.querySelector('.tab-link[href="#horarios"]').click();
                
            } catch (error) {
                console.error("Error al exportar horario básico:", error);
                mostrarNotificacion('Error', 'Ocurrió un error al exportar el horario básico. Consulte la consola para más detalles.', 'error');
            } finally {
                mostrarCargando(false);
            }
        }, 50);
    }
}

// Configuración de eventos para horario básico
function setupEventosHorarioBasico() {
    // Añadir botón para exportar al horario general si no existe
    const container = document.getElementById('horarioBasicoContainer');
    if (container && !document.getElementById('exportarHorarioBasicoBtn')) {
        const btnDiv = document.createElement('div');
        btnDiv.className = 'flex justify-center mt-4';
        
        const exportBtn = document.createElement('button');
        exportBtn.id = 'exportarHorarioBasicoBtn';
        exportBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors no-print flex items-center';
        exportBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10.5 5.914V12a1 1 0 01-2 0V5.914L6.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" />
                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
            </svg>
            Exportar al Horario General
        `;
        exportBtn.onclick = exportarHorarioBasico;
        
        btnDiv.appendChild(exportBtn);
        container.appendChild(btnDiv);
    }
    
    // Actualizar selector de semestres para horario básico
    actualizarSelectorHorarioBasico();
    
    // Añadir Event Listener al botón principal
    const generarBtn = document.getElementById('generarHorarioBasicoBtn');
    if (generarBtn) {
        // Eliminar cualquier event listener anterior para evitar duplicados
        generarBtn.removeEventListener('click', generarHorarioBasico);
        // Añadir nuevo event listener
        generarBtn.addEventListener('click', generarHorarioBasico);
    }
}

// Inicialización tras cargar el DOM
document.addEventListener('DOMContentLoaded', function() {
    setupEventosHorarioBasico();
});

// Asegurar que también se ejecute si se llama después de que el DOM ya está cargado
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(setupEventosHorarioBasico, 1);
}
