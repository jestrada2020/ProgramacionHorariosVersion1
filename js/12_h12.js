// Cargar materias para el selector de restricciones (filtrando por profesor)
        function cargarMateriasParaRestriccion() {
            const profId = document.getElementById('profesorRestriccion').value;
            const matSelect = document.getElementById('materiaRestriccion');
            matSelect.innerHTML = '<option value="">Seleccione materia</option>';
            document.getElementById('aulaRestriccion').innerHTML = '<option value="">Seleccione aula</option>'; // Limpiar aulas

            const profesor = estado.profesores.find(p => p.id === profId);
            if (!profesor) {
                // Si no se selecciona profesor, no mostrar materias
                return;
            }

            // Filtrar materias que el profesor seleccionado puede dictar
            const materiasFiltradas = estado.materias.filter(m => profesor.materiasQueDicta?.includes(m.id));

            materiasFiltradas.sort((a,b)=> a.nombre.localeCompare(b.nombre)).forEach(m => {
                matSelect.add(new Option(`${m.nombre} (S${m.semestre})`, m.id));
            });
        }

        // Cargar aulas compatibles con la materia seleccionada en restricciones
        function cargarAulasParaRestriccion() {
            const matId = document.getElementById('materiaRestriccion').value;
            const aulaSelect = document.getElementById('aulaRestriccion');
            aulaSelect.innerHTML = '<option value="">Seleccione aula</option>';
            if (!matId) return;

            const materia = estado.materias.find(m => m.id === matId);
            if (!materia) return;
            const tipoReq = materia.tipoAula;

            estado.aulas
                .filter(a => a.tipo === tipoReq || (tipoReq === 'normal' && a.tipo === 'normal'))
                .sort((a,b) => a.nombre.localeCompare(b.nombre))
                .forEach(a => aulaSelect.add(new Option(`${a.nombre} (${a.tipo})`, a.id)));
        }

        // Filtrar tabla genérica
        function filtrarTabla(tablaId, inputId, columnaIdx) {
            try {
                const filtro = document.getElementById(inputId).value.toUpperCase();
                const tabla = document.getElementById(tablaId);
                const filas = tabla.querySelectorAll('tbody tr');
                filas.forEach(fila => {
                    const celda = fila.cells[columnaIdx];
                    if (celda) {
                        const texto = celda.textContent || celda.innerText;
                        fila.style.display = texto.toUpperCase().includes(filtro) ? '' : 'none';
                    }
                });
            } catch (e) { console.error("Error filtrando tabla:", e); }
        }

        // Filtrar aulas por tipo (llama a renderizarAulas)
        function filtrarAulasPorTipo() {
            renderizarAulas();
        }

        // Guardar configuración general y de asesorías
        function guardarConfiguracion() {
            // General
            estado.configuracion.periodoAcademico = document.getElementById('periodoAcademico').value;
            
            // Verificar si cambió la cantidad de semestres
            const nuevaCantidadSemestres = parseInt(document.getElementById('cantidadSemestres').value) || 9; // Default a 9
            const cantidadAnterior = estado.configuracion.cantidadSemestres;
            estado.configuracion.cantidadSemestres = nuevaCantidadSemestres;
            
            // Guardar el valor del rango de horarios seleccionado
            const nuevoRangoHorario = document.getElementById('rangosHorarios').value;
            estado.configuracion.rangoHorario = nuevoRangoHorario;
            
            // Actualizar hora de inicio y fin, con validación
            const nuevoHoraInicio = document.getElementById('horaInicio').value;
            const nuevoHoraFin = document.getElementById('horaFin').value;
            
            // Validar el rango horario usando la función dedicada
            const validacionRango = validarRangoHorario(nuevoHoraInicio, nuevoHoraFin);
            
            // Verificar que el rango sea válido usando la validación previa
            if (!validacionRango.valido) {
                mostrarNotificacion('Error', 'La hora de fin debe ser posterior a la hora de inicio.', 'error');
                // Mantener valores anteriores
                document.getElementById('horaFin').value = estado.configuracion.horaFin;
            } else {
                // Actualizar los valores
                estado.configuracion.horaInicio = nuevoHoraInicio;
                estado.configuracion.horaFin = nuevoHoraFin;
                
                // Actualizar información del rango horario
                const infoRangoHorario = document.getElementById('infoRangoHorario');
                if (infoRangoHorario) {
                    infoRangoHorario.innerHTML = mostrarInfoRangoHorario();
                }
                
                // Si los horarios cambiaron pero el tipo de rango no, asegurarnos de establecer en "custom"
                if (nuevoRangoHorario !== "custom") {
                    const rangoDetectado = detectarRangoPredefinido(nuevoHoraInicio, nuevoHoraFin);
                    if (rangoDetectado !== nuevoRangoHorario) {
                        document.getElementById('rangosHorarios').value = rangoDetectado;
                        estado.configuracion.rangoHorario = rangoDetectado;
                    }
                }
            }
            
            estado.configuracion.duracionBloque = parseInt(document.getElementById('duracionBloque').value) || 60;
            
            // Días
            estado.configuracion.diasDisponibles = [];
            document.querySelectorAll('.dia-semana-check:checked').forEach(chk => {
                estado.configuracion.diasDisponibles.push(chk.dataset.dia);
            });
            
            // Verificar que haya al menos un día seleccionado
            if (estado.configuracion.diasDisponibles.length === 0) {
                mostrarNotificacion('Advertencia', 'Debe seleccionar al menos un día de la semana.', 'warning');
                estado.configuracion.diasDisponibles = ["Lunes"]; // Default mínimo
                // Re-marcar el checkbox de Lunes
                document.querySelector('.dia-semana-check[data-dia="Lunes"]').checked = true;
            }
            
            // Mantener la configuración global de asesorías como referencia predeterminada
            // pero ya no se actualiza desde la UI global, sino desde cada profesor
            
            // Verificar que cantidadSemestres sea al menos igual al semestre máximo en materias
            if (estado.materias && estado.materias.length > 0) {
                const maxSemestre = estado.materias.reduce((max, materia) => 
                    Math.max(max, materia.semestre || 1), 1);
                    
                if (estado.configuracion.cantidadSemestres < maxSemestre) {
                    estado.configuracion.cantidadSemestres = maxSemestre;
                    console.log(`Ajustando cantidad de semestres a ${maxSemestre} según materias existentes`);
                    document.getElementById('cantidadSemestres').value = maxSemestre;
                }
            }

            // Verificar si hubo cambios que requieran regenerar los horarios
            const requiereRegeneracion = nuevaCantidadSemestres !== cantidadAnterior;
            
            guardarDatosLocalmente();
            actualizarInterfaz(); // Actualizar selectores y horas/días
            actualizarHorarioVisible(); // Forzar actualización de la vista del horario
            actualizarCargaTrabajoDetallada(); // Actualizar solo la tabla de carga detallada
            
            if (requiereRegeneracion && Object.keys(estado.horarios).length > 0) {
                mostrarNotificacion('Advertencia', 'Los cambios en la configuración pueden requerir regenerar los horarios.', 'warning', 8000);
            } else {
                mostrarNotificacion('Éxito', 'Configuración guardada correctamente.', 'success');
            }
        }


        // Mostrar/Ocultar opciones de PDF en el menú de exportación
        function togglePdfOptionsVisibility() {
            const formato = document.getElementById('formatoExportacion').value;
            const pdfOptionsDiv = document.getElementById('pdfOptions');
            if (formato === 'pdf') {
                pdfOptionsDiv.classList.remove('hidden');
            } else {
                pdfOptionsDiv.classList.add('hidden');
            }
        }


        // Cerrar un modal genérico
        function cerrarModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex', 'items-center', 'justify-center'); // Asegurar que se quiten todas las clases de visualización
                estado.editandoId = null; // Limpiar ID en edición al cerrar cualquier modal
            }
        }

        // Mostrar informe de generación/optimización
        function mostrarInformeGeneracion(resultado) {
            const modal = document.getElementById('modalInforme');
            const titulo = document.getElementById('tituloInforme');
            const contenido = document.getElementById('contenidoInforme');
            titulo.textContent = "Informe de Generación de Horarios";

            let html = `<p class="mb-2">Estado: <span class="font-semibold ${resultado.estado === 'completo' ? 'text-green-600' : 'text-orange-600'}">${resultado.estado === 'completo' ? 'Completado' : 'Parcial'}</span></p>`;
            const stats = calcularEstadisticasDetalladas();
            html += `<p class="mb-2">Total de bloques semanales necesarios: ${stats.horasNecesarias}</p>`;
            html += `<p class="mb-2">Total de bloques asignados: ${stats.horasAsignadas} (${stats.porcentajeHoras.toFixed(1)}%)</p>`;
            html += `<p class="mb-2">Conflictos detectados (Profesor/Aula): ${stats.conflictos}</p>`;

            if (resultado.noAsignadas && resultado.noAsignadas.length > 0) {
                html += `<h4 class="font-semibold mt-4 mb-2 text-red-600">Materias con Bloques Faltantes:</h4>`;
                html += `<ul class="list-disc list-inside text-sm">`;
                resultado.noAsignadas.forEach(item => {
                    html += `<li>${item.materia}: Faltan ${item.faltantes} bloques</li>`;
                });
                html += `</ul>`;
            } else if (resultado.estado === 'completo') {
                 html += `<p class="mt-4 text-green-600 font-semibold">¡Todos los bloques requeridos fueron asignados!</p>`;
            }

            contenido.innerHTML = html;
            modal.classList.remove('hidden');
            modal.classList.add('flex', 'items-center', 'justify-center'); // Asegurar clases de centrado
        }

        function mostrarInformeOptimizacion(resultado) {
             const modal = document.getElementById('modalInforme');
            const titulo = document.getElementById('tituloInforme');
            const contenido = document.getElementById('contenidoInforme');
            titulo.textContent = "Informe de Optimización";

             let html = `<p class="mb-2">Conflictos resueltos: <span class="font-semibold">${resultado.conflictosResueltos || 0}</span></p>`;
             html += `<p class="mb-2">Huecos optimizados (heurística simple): <span class="font-semibold">${resultado.huecosOptimizados || 0}</span></p>`;
             html += `<p class="mb-2">Movimientos totales realizados: <span class="font-semibold">${resultado.movimientos || 0}</span></p>`;
             const stats = calcularEstadisticasDetalladas();
             html += `<p class="mt-4 mb-2">Conflictos restantes: ${stats.conflictos}</p>`;
             html += `<p class="mb-2">Bloques asignados: ${stats.horasAsignadas} (${stats.porcentajeHoras.toFixed(1)}%)</p>`;

             contenido.innerHTML = html;
             modal.classList.remove('hidden');
             modal.classList.add('flex', 'items-center', 'justify-center'); // Asegurar clases de centrado
        }

        // Calcular estadísticas detalladas
        function calcularEstadisticasDetalladas() {
             let horasNecesarias = 0;
             estado.materias.forEach(m => horasNecesarias += (m.horasSemana || 0)); // horasSemana son bloques
             let horasAsignadas = 0;
             const aulasUtilizadasSet = new Set();
             Object.values(estado.horarios).forEach(sem => {
                 Object.values(sem).forEach(dia => {
                     horasAsignadas += Object.keys(dia).length;
                     Object.values(dia).forEach(sesion => {
                         if (sesion.aulaId) aulasUtilizadasSet.add(sesion.aulaId);
                     });
                 });
             });
             const porcentajeHoras = horasNecesarias > 0 ? (horasAsignadas / horasNecesarias) * 100 : 0;
             const conflictos = detectarConflictos('profesor').length + detectarConflictos('aula').length;
             return { horasNecesarias, horasAsignadas, porcentajeHoras, conflictos, aulasUtilizadas: aulasUtilizadasSet };
        }

        // Calcular carga horaria DETALLADA por profesor
        function calcularCargaProfesoresDetallada() {
            const cargaDetallada = {};
            const semanasPorSemestre = 16; // Asunción, idealmente configurable
            const duracionBloqueHoras = (estado.configuracion.duracionBloque || 60) / 60;

            estado.profesores.forEach(prof => {
                let bloquesClase = 0;
                
                // 1. Contar bloques de clase asignados en horarios generados
                for (const sem in estado.horarios) {
                    for (const dia in estado.horarios[sem]) {
                        for (const hora in estado.horarios[sem][dia]) {
                            if (estado.horarios[sem][dia][hora]?.profesorId === prof.id) {
                                bloquesClase++;
                            }
                        }
                    }
                }
                
                // 2. Considerar bloques asignados desde la hoja de Materias
                // Buscar materias que este profesor tiene asignadas
                if (prof.materiasQueDicta && Array.isArray(prof.materiasQueDicta)) {
                    prof.materiasQueDicta.forEach(materiaId => {
                        // Comprobar si esta materia es parte de la carga del profesor
                        const materiasDetalle = prof.materiasDetalle && prof.materiasDetalle[materiaId];
                        const esVirtual = materiasDetalle && materiasDetalle.esVirtual;
                        const partOfLoad = materiasDetalle && materiasDetalle.partOfLoad;
                        
                        // Contabilizar si está marcada como parte de la carga del profesor
                        // o si es un clon virtual (ahora también se contabilizan en la carga)
                        // Solo excluimos si está explícitamente marcada como que no es parte de la carga
                        if (materiasDetalle && materiasDetalle.partOfLoad === false) {
                            return;
                        }
                        
                        const materia = estado.materias.find(m => m.id === materiaId);
                        if (materia) {
                            // Si no hay horarios generados, o si este profesor tiene la materia asignada directamente
                            if (!Object.keys(estado.horarios).length || (materia.profesorPreferidoCodigo && materia.profesorPreferidoCodigo === prof.codigo)) {
                                if (materia.horarioPreferidoTexto) {
                                    // Calcular bloques basados en el horario preferido de la materia
                                    const horarios = materia.horarioPreferidoTexto.split(',').map(h => h.trim());
                                    // Cada horario cuenta como un bloque
                                    bloquesClase += horarios.length;
                                } else if (materia.horasSemana) {
                                    // Si no hay horario preferido pero sí horas semanales definidas
                                    bloquesClase += materia.horasSemana;
                                }
                            }
                        }
                    });
                }
                const horasClase = bloquesClase * duracionBloqueHoras; // Convertir bloques a horas

                // Usar la configuración de asesorías específica del profesor si está disponible
                const asesoriasNormalesConfig = prof.asesoriasNormalesConfig || estado.configuracion.asesoriasNormalesConfig || {};
                const horasAsesNormal = asesoriasNormalesConfig.habilitado
                    ? (asesoriasNormalesConfig.duracionMinutos / 60) * asesoriasNormalesConfig.vecesPorSemana
                    : 0;

                const asesoriasEvaluacionConfig = prof.asesoriasEvaluacionConfig || estado.configuracion.asesoriasEvaluacionConfig || {};
                const horasAsesEval = asesoriasEvaluacionConfig.habilitado
                    ? (asesoriasEvaluacionConfig.duracionMinutos / 60) * asesoriasEvaluacionConfig.vecesPorSemana
                    : 0;

                const horasInvestigacion = prof.horasInvestigacionSemanal || 0;
                const horasProyInst = prof.horasProyectosInstSemanal || 0;
                const horasProyExt = prof.horasProyectosExtSemanal || 0;
                const horasMaterial = prof.horasMaterialDidacticoSemanal || 0;
                const horasCapacitacion = (prof.horasCapacitacionSemestral || 0) / semanasPorSemestre;
                const horasAdministrativas = prof.horasAdministrativas || 0;
                const cursosVirtuales = prof.cursosVirtuales || 0;
                const horasAsesoriasVirtuales = prof.horasAsesoriasVirtuales || 0;
                const horasTrabajoEnCasa = prof.horasTrabajoEnCasa || 0;

                const totalHoras = horasClase + horasAsesNormal + horasAsesEval + horasInvestigacion +
                                 horasProyInst + horasProyExt + horasMaterial + horasCapacitacion +
                                 horasAdministrativas + cursosVirtuales + horasAsesoriasVirtuales + horasTrabajoEnCasa;
                
                // Determinar la carga horaria máxima según tipo de contrato
                let cargaMaxima = 0;
                switch(prof.tipoContrato) {
                    case 'tiempoCompleto': 
                        cargaMaxima = 40; // 40 horas semanales para tiempo completo
                        break;
                    case 'medioTiempo': 
                        cargaMaxima = 20; // 20 horas semanales para medio tiempo
                        break;
                    case 'ocasional':
                        cargaMaxima = 20; // 20 horas semanales para profesor ocasional
                        break;
                    case 'porHoras':
                        cargaMaxima = 12; // 12 horas semanales para profesores por horas
                        break;
                    default:
                        cargaMaxima = 40; // Por defecto, asumir tiempo completo
                }
                
                // Calcular horas extras (con precisión de 2 decimales para evitar errores de redondeo)
                const horasExtras = Math.max(0, parseFloat((totalHoras - cargaMaxima).toFixed(2)));
                
                // Calcular el porcentaje de ocupación respecto a la carga máxima
                const porcentajeOcupacion = (cargaMaxima > 0) ? (Math.min(totalHoras, cargaMaxima) / cargaMaxima * 100) : 0;

                cargaDetallada[prof.id] = {
                    clases: horasClase.toFixed(1),
                    asesoriaNormal: horasAsesNormal.toFixed(1),
                    asesoriaEvaluacion: horasAsesEval.toFixed(1),
                    investigacion: horasInvestigacion.toFixed(1),
                    proyectosInst: horasProyInst.toFixed(1),
                    proyectosExt: horasProyExt.toFixed(1),
                    materialDidactico: horasMaterial.toFixed(1),
                    capacitacion: horasCapacitacion.toFixed(1),
                    administrativas: horasAdministrativas.toFixed(1),
                    cursosVirtuales: cursosVirtuales.toFixed(1),
                    asesoriasVirtuales: horasAsesoriasVirtuales.toFixed(1),
                    trabajoEnCasa: horasTrabajoEnCasa.toFixed(1),
                    tipoContrato: prof.tipoContrato || 'tiempoCompleto',
                    cargaMaxima: cargaMaxima,
                    horasExtras: horasExtras.toFixed(1),
                    porcentajeOcupacion: porcentajeOcupacion.toFixed(1),
                    total: totalHoras.toFixed(1),
                    objetivo: prof.horasObjetivoSemanal || null
                };
            });
            return cargaDetallada;
        }


        // --- Funciones Auxiliares para Exportación y Visualización ---

        // Obtiene los datos y el título para una vista específica
        function obtenerDatosParaVista(tipoVista, elementoId) {
            let horario = {};
            let titulo = "Horario General"; // Default

            try {
                 switch (tipoVista) {
                    case 'semestre':
                        // Intentar obtener datos de visualización primero
                        horario = estado.horariosVisualizacion.porSemestre[elementoId] || {};
                        
                        // Si no hay datos en visualización, intentar directamente desde estado.horarios
                        if (Object.keys(horario).length === 0 && estado.horarios[elementoId]) {
                            console.log(`Usando datos directos del horario para semestre ${elementoId}`);
                            horario = estado.horarios[elementoId];
                        }
                        
                        // Si aún está vacío, crear estructura básica para evitar errores
                        if (Object.keys(horario).length === 0) {
                            console.log(`Creando estructura vacía para semestre ${elementoId}`);
                            horario = {};
                            const diasHabiles = obtenerDiasHabiles();
                            diasHabiles.forEach(dia => {
                                horario[dia] = {};
                            });
                        }
                        
                        titulo = `Semestre ${elementoId}`;
                        break;
                    case 'profesor':
                        const profesor = estado.profesores.find(p => p.id === elementoId);
                        horario = estado.horariosVisualizacion.porProfesor[elementoId] || {};
                        titulo = `Profesor ${profesor ? profesor.nombre : elementoId}`;
                        break;
                    case 'aula':
                        const aula = estado.aulas.find(a => a.id === elementoId);
                        horario = estado.horariosVisualizacion.porAula[elementoId] || {};
                        titulo = `Aula ${aula ? aula.nombre : elementoId}`;
                        break;
                    case 'materia': // Usa el código de materia como elementoId
                        const materia = estado.materias.find(m => m.codigo === elementoId); // Buscar por código
                        horario = estado.horariosVisualizacion.porMateria[elementoId] || {};
                        titulo = `Materia ${materia ? materia.nombre : elementoId}`;
                        break;
                    case 'asesoria': // Vista de asesoría no se exporta por este método
                         horario = {};
                         titulo = "Vista no exportable";
                         break;
                    default:
                         horario = {};
                         titulo = "Vista Desconocida";
                }
            } catch (e) { console.error("Error obteniendo datos para vista:", e); }

            return { horario, titulo };
        }