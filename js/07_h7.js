// --- GENERACIÓN Y OPTIMIZACIÓN DE HORARIOS ---

        // Función principal para generar horarios
        function generarHorarios() {
            if (estado.profesores.length === 0 || estado.materias.length === 0 || estado.aulas.length === 0) {
                mostrarNotificacion('Error', 'Se necesitan profesores, materias y aulas para generar horarios.', 'error');
                return;
            }
            mostrarCargando(true);
            setTimeout(() => { // Delay para UI
                try {
                    console.log("Iniciando generación de horarios...");
                    // 1. Inicializar estructura de horarios
                    estado.horarios = {};
                    const cantidadSemestres = parseInt(estado.configuracion.cantidadSemestres) || 4;
                    const diasHabiles = obtenerDiasHabiles();
                    const horasPorDia = calcularHorasPorDia();
                    for (let sem = 1; sem <= cantidadSemestres; sem++) {
                        estado.horarios[sem] = {};
                        diasHabiles.forEach(dia => {
                            estado.horarios[sem][dia] = {};
                            // No inicializar horas aquí, se crean al asignar
                        });
                    }
                    console.log("Estructura inicial creada.");

                    // 2. Aplicar restricciones fijas PRIMERO
                    aplicarRestriccionesFijas();
                    console.log("Restricciones fijas aplicadas.");

                    // 3. Asignar materias restantes
                    const materiasNoAsignadas = [];
                    for (let sem = 1; sem <= cantidadSemestres; sem++) {
                        const materiasSemestre = estado.materias.filter(m => m.semestre === sem);
                        console.log(`Asignando ${materiasSemestre.length} materias para Semestre ${sem}`);
                        const resultadoAsignacion = asignarMateriasASemestre(materiasSemestre, sem, diasHabiles, horasPorDia);
                        materiasNoAsignadas.push(...resultadoAsignacion.noAsignadas);
                    }

                    // 4. Post-procesamiento y UI
                    generarHorariosVisualizacion(); // Generar vistas para todas las visualizaciones
                    actualizarHorarioVisible();
                    actualizarEstadisticasHorario();
                    document.getElementById('mensajeNoHorario').classList.add('hidden');
                    document.getElementById('tablaHorario').classList.remove('hidden');
                    guardarDatosLocalmente();
                    actualizarEstadoBotones(); // Habilitar optimizar/editar
                    renderizarProfesores(); // Actualizar resumen de carga detallado

                    // 5. Informe
                    let mensajeInforme = "";
                    let tipoInforme = "success";

                    if (materiasNoAsignadas.length > 0) {
                        mensajeInforme = `Generación parcial. ${materiasNoAsignadas.length} materia(s) con bloques faltantes. Detalles en consola.`;
                        tipoInforme = "warning"; // Usar 'warning' para que dure un poco más y sea más visible
                        // Loguear detalles que antes iban al modal
                        console.warn("Materias con bloques faltantes:");
                        materiasNoAsignadas.forEach(item => {
                            console.warn(`- ${item.materia}: Faltan ${item.faltantes} bloques`);
                        });
                    } else {
                        mensajeInforme = "¡Horarios generados exitosamente! Todas las materias asignadas.";
                        tipoInforme = "success";
                    }
                    
                    const stats = calcularEstadisticasDetalladas(); // Se puede usar para el mensaje
                    mensajeInforme += ` Asignados: ${stats.horasAsignadas}/${stats.horasNecesarias} bloques. Conflictos: ${stats.conflictos}.`;

                    mostrarNotificacion(tipoInforme === 'success' ? 'Éxito' : 'Advertencia', mensajeInforme, tipoInforme, tipoInforme === 'warning' ? 8000 : 5000); // Duración más larga para advertencias

                    console.log("Generación completada.");

                } catch (error) {
                    console.error("Error generando horarios:", error);
                    mostrarNotificacion('Error', `Error al generar horarios: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 50);
        }

        // Aplica las restricciones de tipo 'horarioFijo'
        function aplicarRestriccionesFijas() {
            const restriccionesFijas = estado.restricciones.filter(r => r.tipo === 'horarioFijo');
            let conflictosFijos = 0;

            restriccionesFijas.forEach(restriccion => {
                const { profesorId, materiaId, aulaId, semestre, dia, hora } = restriccion;
                const profesor = estado.profesores.find(p => p.id === profesorId);
                const materia = estado.materias.find(m => m.id === materiaId);
                const aula = estado.aulas.find(a => a.id === aulaId);

                if (!profesor || !materia || !aula) {
                    console.warn("Restricción fija inválida (datos no encontrados):", restriccion);
                    return;
                }
                 // Verificar que el profesor pueda dictar la materia
                 if (!profesor.materiasQueDicta?.includes(materiaId)) {
                     console.warn(`Conflicto en restricción fija: Profesor ${profesor.nombre} no puede dictar ${materia.nombre}. Ignorando:`, restriccion);
                     conflictosFijos++;
                     return;
                 }
                 // Verificar tipo de aula
                 if (aula.tipo !== materia.tipoAula && !(materia.tipoAula === 'normal' && aula.tipo === 'normal')) {
                     console.warn(`Conflicto en restricción fija: Aula ${aula.nombre} (${aula.tipo}) no es compatible con ${materia.nombre} (${materia.tipoAula}). Ignorando:`, restriccion);
                     conflictosFijos++;
                     return;
                 }

                 // Verificar si el slot ya está ocupado (por otra restricción fija)
                 if (estado.horarios[semestre]?.[dia]?.[hora]) {
                     console.warn(`Conflicto al aplicar restricción fija: Slot ${semestre}-${dia}-${hora} ya ocupado por ${estado.horarios[semestre][dia][hora].codigo}. Ignorando:`, restriccion);
                     conflictosFijos++;
                     return;
                 }

                 // Verificar disponibilidad de profesor y aula en OTROS semestres (conflicto global)
                 if (!estaProfesorDisponible(profesor, dia, hora, semestre) || !estaAulaDisponible(aula, dia, hora, semestre)) {
                     console.warn(`Conflicto global al aplicar restricción fija (profesor/aula ocupado en otro semestre): Slot ${semestre}-${dia}-${hora}. Ignorando:`, restriccion);
                     conflictosFijos++;
                     return;
                 }

                // Asignar la sesión fija
                if (!estado.horarios[semestre]) estado.horarios[semestre] = {};
                if (!estado.horarios[semestre][dia]) estado.horarios[semestre][dia] = {};

                estado.horarios[semestre][dia][hora] = {
                    materia: materia.nombre,
                    codigo: materia.codigo, // Usar código como identificador único de materia en horario
                    profesor: profesor.nombre,
                    profesorId: profesor.id,
                    aula: aula.nombre,
                    aulaId: aula.id,
                    fijado: true // Marcar como fijado
                };
            });
             if (conflictosFijos > 0) {
                 mostrarNotificacion('Advertencia', `${conflictosFijos} restricciones fijas no pudieron aplicarse por conflictos.`, 'error');
             }
        }

        // Asigna materias para un semestre específico
        function asignarMateriasASemestre(materiasDelSemestre, semestre, diasHabiles, horasPorDia) {
            const horasAsignadasPorMateria = {}; // { materiaId: count }
            const materiasNoAsignadas = [];

            // Contar horas ya asignadas por restricciones fijas
            materiasDelSemestre.forEach(m => {
                horasAsignadasPorMateria[m.id] = 0;
                diasHabiles.forEach(dia => {
                    horasPorDia.forEach(hora => {
                        if (estado.horarios[semestre]?.[dia]?.[hora]?.codigo === m.codigo && estado.horarios[semestre]?.[dia]?.[hora]?.fijado) {
                            horasAsignadasPorMateria[m.id]++;
                        }
                    });
                });
            });

            // Ordenar materias (ej. por horas restantes, o aleatorio)
            let materiasParaAsignar = materiasDelSemestre
                .filter(m => horasAsignadasPorMateria[m.id] < m.horasSemana)
                .sort((a, b) => (b.horasSemana - horasAsignadasPorMateria[b.id]) - (a.horasSemana - horasAsignadasPorMateria[a.id])); // Priorizar las que faltan más horas

            // Iterar para asignar horas faltantes
            materiasParaAsignar.forEach(materia => {
                let horasFaltantes = materia.horasSemana - horasAsignadasPorMateria[materia.id];

                // Iterar por días y horas buscando slots libres
                for (const dia of diasHabiles) {
                    if (horasFaltantes <= 0) break;
                    for (const hora of horasPorDia) {
                        if (horasFaltantes <= 0) break;

                        // Verificar si el slot está libre EN ESTE SEMESTRE
                        if (!estado.horarios[semestre]?.[dia]?.[hora]) {
                            // Buscar profesor y aula disponibles GLOBALMENTE
                            const profesor = buscarProfesorDisponible(dia, hora, materia);
                            const aula = buscarAulaDisponible(dia, hora, materia.tipoAula);

                            if (profesor && aula) {
                                // Asignar la sesión
                                estado.horarios[semestre][dia][hora] = {
                                    materia: materia.nombre,
                                    codigo: materia.codigo,
                                    profesor: profesor.nombre,
                                    profesorId: profesor.id,
                                    aula: aula.nombre,
                                    aulaId: aula.id,
                                    fijado: false // No fijado por defecto
                                };
                                horasFaltantes--;
                                horasAsignadasPorMateria[materia.id]++;
                            }
                        }
                    }
                }
                 // Si aún faltan horas, registrar la materia como no asignada completamente
                 if (horasFaltantes > 0) {
                     materiasNoAsignadas.push({ materia: materia.nombre, faltantes: horasFaltantes });
                     console.warn(`No se pudieron asignar ${horasFaltantes} horas para ${materia.nombre} (Sem ${semestre})`);
                 }
            });

            return { noAsignadas: materiasNoAsignadas };
        }

        // Busca un profesor disponible (considerando preferencia y disponibilidad global)
        function buscarProfesorDisponible(dia, hora, materia) {
            // 1. Filtrar profesores que PUEDEN dictar la materia
            const profesoresAsignados = estado.profesores.filter(p => p.materiasQueDicta?.includes(materia.id));

            // 2. De esos, encontrar los que están DISPONIBLES en ese día/hora globalmente
            const profesoresDisponibles = profesoresAsignados.filter(p =>
                estaProfesorDisponible(p, dia, hora)
            );

            if (profesoresDisponibles.length > 0) {
                // Devolver uno aleatorio o basado en alguna heurística (ej. menos carga horaria)
                // TODO: Implementar heurística de carga si se desea
                return profesoresDisponibles[Math.floor(Math.random() * profesoresDisponibles.length)];
            }

            // 3. Si no hay profesores disponibles que puedan dictar la materia, retornar null
            return null;
        }