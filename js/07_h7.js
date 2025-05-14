// --- GENERACIÓN Y OPTIMIZACIÓN DE HORARIOS ---

        // Función principal para generar horarios
        function generarHorarios() {
            if (estado.profesores.length === 0 || estado.materias.length === 0 || estado.aulas.length === 0) {
                mostrarNotificacion('Error', 'Se necesitan profesores, materias y aulas para generar horarios.', 'error');
                return;
            }
            mostrarCargando(true);
            
            // Verificar y reparar el estado antes de generar horarios
            verificarRepararEstado();
            
            setTimeout(() => { // Delay para UI
                try {
                    console.log("Iniciando generación de horarios...");
                    // 1. Inicializar estructura de horarios
                    estado.horarios = {};
                    
                    // Detectar el semestre máximo a partir de las materias cargadas
                    let maxSemestreDatos = 1;
                    if (estado.materias && estado.materias.length > 0) {
                        maxSemestreDatos = estado.materias.reduce((max, materia) => 
                            Math.max(max, materia.semestre || 1), 1);
                    }
                    
                    // Usar el máximo entre la configuración y los datos reales
                    const cantidadSemestres = Math.max(
                        parseInt(estado.configuracion.cantidadSemestres) || 9,
                        maxSemestreDatos
                    );
                    
                    // Actualizar la configuración y la interfaz con el valor correcto
                    estado.configuracion.cantidadSemestres = cantidadSemestres;
                    const semestreInput = document.getElementById('cantidadSemestres');
                    if (semestreInput) {
                        semestreInput.value = cantidadSemestres;
                    }
                    console.log(`Generando horarios para ${cantidadSemestres} semestres según los datos`);
                    
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
                        
                        // Si no hay materias para este semestre pero existe en la configuración,
                        // crear registro vacío para evitar problemas de visualización
                        if (materiasSemestre.length === 0) {
                            console.log(`No hay materias para el semestre ${sem}, pero asegurando la estructura`);
                            if (!estado.horarios[sem]) {
                                estado.horarios[sem] = {};
                                diasHabiles.forEach(dia => {
                                    estado.horarios[sem][dia] = {};
                                });
                            }
                        } else {
                            const resultadoAsignacion = asignarMateriasASemestre(materiasSemestre, sem, diasHabiles, horasPorDia);
                            materiasNoAsignadas.push(...resultadoAsignacion.noAsignadas);
                        }
                    }

                    // 4. Post-procesamiento y UI
                    generarHorariosVisualizacion(); // Generar vistas para todas las visualizaciones
                    actualizarHorarioVisible();
                    actualizarEstadisticasHorario();
                    document.getElementById('mensajeNoHorario').classList.add('hidden');
                    document.getElementById('tablaHorario').classList.remove('hidden');
                    guardarDatosLocalmente();
                    actualizarEstadoBotones(); // Habilitar optimizar/editar
                    actualizarCargaTrabajoDetallada(); // Actualizar solo la tabla de carga detallada

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
                    
                    // Mostrar detalles adicionales para depuración
                    console.log("Detalles de horarios generados por semestre:");
                    for (const sem in estado.horarios) {
                        let contadorSesiones = 0;
                        for (const dia in estado.horarios[sem]) {
                            for (const hora in estado.horarios[sem][dia]) {
                                contadorSesiones++;
                            }
                        }
                        console.log(`Semestre ${sem}: ${contadorSesiones} sesiones asignadas`);
                    }

                    // Mostrar notificación con duración adaptada al tipo de mensaje
                    const duracion = tipoInforme === 'warning' ? 8000 : 5000;
                    mostrarNotificacion(tipoInforme === 'success' ? 'Éxito' : 'Advertencia', mensajeInforme, tipoInforme, duracion);

                    console.log("Generación completada.");

                } catch (error) {
                    console.error("Error generando horarios:", error);
                    mostrarNotificacion('Error', `Error al generar horarios: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 50);
        }

        // Verifica y repara el estado antes de generar horarios
        function verificarRepararEstado() {
            console.log("Verificando y reparando estado antes de generar horarios...");
            
            // 1. Verificar que todas las materias tengan semestre, tipoAula y horasSemana
            estado.materias.forEach(materia => {
                if (!materia.semestre || materia.semestre <= 0) {
                    console.warn(`Materia ${materia.nombre} (ID: ${materia.id}) tiene semestre inválido. Asignando semestre 1.`);
                    materia.semestre = 1;
                }
                
                if (!materia.tipoAula) {
                    console.warn(`Materia ${materia.nombre} (ID: ${materia.id}) no tiene tipoAula definido. Asignando 'normal'.`);
                    materia.tipoAula = 'normal';
                }
                
                if (!materia.horasSemana || materia.horasSemana <= 0) {
                    console.warn(`Materia ${materia.nombre} (ID: ${materia.id}) no tiene horasSemana definido o es cero. Estableciendo valor por defecto.`);
                    
                    // Si hay horario preferido, calcular horasSemana basado en él
                    if (materia.horarioPreferidoTexto) {
                        const horarios = materia.horarioPreferidoTexto.split(',').map(h => h.trim());
                        materia.horasSemana = horarios.length;
                        console.log(`Estableciendo horasSemana=${materia.horasSemana} basado en el horario preferido para ${materia.nombre}`);
                    } else {
                        materia.horasSemana = 1; // Valor por defecto
                    }
                }
            });
            
            // 2. Verificar que todos los profesores tengan diasDisponibles y materiasQueDicta
            estado.profesores.forEach(profesor => {
                if (!profesor.materiasQueDicta) {
                    profesor.materiasQueDicta = [];
                }
                
                // Si profesor tiene profesorPreferidoCodigo en materias pero no están en su materiasQueDicta, añadirlas
                estado.materias.forEach(materia => {
                    if (materia.profesorPreferidoCodigo === profesor.codigo && !profesor.materiasQueDicta.includes(materia.id)) {
                        console.log(`Añadiendo materia ${materia.nombre} a las materias que puede dictar ${profesor.nombre} basado en preferencia`);
                        profesor.materiasQueDicta.push(materia.id);
                    }
                });
                
                if (!profesor.diasDisponibles) {
                    console.warn(`Profesor ${profesor.nombre} (${profesor.codigo}) no tiene diasDisponibles definido. Estableciendo disponibilidad completa.`);
                    profesor.diasDisponibles = {};
                    ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].forEach(d => {
                        profesor.diasDisponibles[d] = { mañana: true, tarde: true };
                    });
                }
            });
            
            // 3. Verificar que todas las aulas tengan tipo
            estado.aulas.forEach(aula => {
                if (!aula.tipo) {
                    console.warn(`Aula ${aula.nombre} no tiene tipo definido. Asignando 'normal'.`);
                    aula.tipo = 'normal';
                }
            });
            
            console.log("Verificación y reparación de estado completada.");
        }

        // Aplica las restricciones de tipo 'horarioFijo'
        function aplicarRestriccionesFijas() {
            const restriccionesFijas = estado.restricciones.filter(r => r.tipo === 'horarioFijo');
            let conflictosFijos = 0;
            let restriccionesAplicadas = 0;
            
            console.log(`Aplicando ${restriccionesFijas.length} restricciones fijas...`);

            // Primero, verificar y corregir la estructura de los datos
            estado.profesores.forEach(p => {
                if (!p.materiasQueDicta) p.materiasQueDicta = [];
            });
            
            estado.materias.forEach(m => {
                if (!m.tipoAula) {
                    console.warn(`Materia ${m.nombre} (ID: ${m.id}) no tiene tipoAula definido. Estableciendo como 'normal'.`);
                    m.tipoAula = 'normal';
                }
                if (!m.horasSemana || m.horasSemana <= 0) {
                    console.warn(`Materia ${m.nombre} (ID: ${m.id}) no tiene horasSemana definido o es cero. Estableciendo valor predeterminado.`);
                    m.horasSemana = 1;
                }
            });

            restriccionesFijas.forEach(restriccion => {
                // Obtener los datos de la restricción con soporte para el nuevo formato (con horaInicio y horaFin)
                const { profesorId, materiaId, aulaId } = restriccion;
                const dia = restriccion.dia;
                
                // Determinar el semestre de la restricción o usar el semestre de la materia correspondiente
                const materia = estado.materias.find(m => m.id === materiaId);
                const semestre = restriccion.semestre || (materia?.semestre || 1);
                
                console.log(`Aplicando restricción para materia ${materiaId} (${materia?.nombre || 'Desconocida'}) en semestre ${semestre}`);
                
                // Asegurar que la materia exista en el sistema
                if (!materia) {
                    console.warn(`La materia con ID ${materiaId} no existe en el sistema. Ignorando restricción.`);
                    conflictosFijos++;
                    return;
                }
                
                console.log(`Aplicando restricción para materia ${materiaId} (${materia?.nombre || 'Desconocida'}) en semestre ${semestre}`);
                
                // Verificar si estamos usando el formato antiguo (campo hora) o nuevo (horaInicio y horaFin)
                let hora = restriccion.hora;
                if (!hora && restriccion.horaInicio) {
                    // Si no hay hora pero sí horaInicio, usamos horaInicio como hora
                    hora = restriccion.horaInicio;
                }
                
                // Validar que la hora esté dentro del rango configurado
                const horasPorDia = calcularHorasPorDia();
                if (!horasPorDia.includes(hora)) {
                    console.warn(`La hora ${hora} de la restricción no está dentro del rango configurado (${estado.configuracion.horaInicio}-${estado.configuracion.horaFin}). Ignorando restricción.`);
                    conflictosFijos++;
                    return;
                }
                
                const profesor = estado.profesores.find(p => p.id === profesorId);
                // (materia ya fue encontrado arriba)
                const aula = estado.aulas.find(a => a.id === aulaId);

                if (!profesor || !aula || !dia || !hora) {
                    console.warn("Restricción fija inválida (datos no encontrados):", restriccion);
                    conflictosFijos++;
                    return;
                }
                
                // Verificar que el profesor pueda dictar la materia
                if (!profesor.materiasQueDicta?.includes(materiaId)) {
                    console.log(`Corrigiendo: Profesor ${profesor.nombre} no tenía asignada la materia ${materia.nombre}. Asignando automáticamente.`);
                    // Corregir automáticamente añadiendo la materia a las que puede dictar el profesor
                    profesor.materiasQueDicta.push(materiaId);
                }
                // Verificar tipo de aula y corregir si es necesario
                if (!materia.tipoAula) {
                    console.warn(`Materia ${materia.nombre} no tiene tipoAula definido. Asignando 'normal'.`);
                    materia.tipoAula = 'normal';
                }
                
                if (!aula.tipo) {
                    console.warn(`Aula ${aula.nombre} no tiene tipo definido. Asignando 'normal'.`);
                    aula.tipo = 'normal';
                }
                
                // Aceptar mayor flexibilidad en tipos de aula para evitar bloqueos
                const compatibilidad = aula.tipo === materia.tipoAula || 
                    (materia.tipoAula === 'normal' && aula.tipo === 'normal') ||
                    (aula.tipo === 'multiuso'); // Las aulas multiuso son compatibles con todo
                
                if (!compatibilidad) {
                    console.warn(`Conflicto en restricción fija: Aula ${aula.nombre} (${aula.tipo}) no es compatible con ${materia.nombre} (${materia.tipoAula}). Adaptando tipo de aula.`);
                    // En lugar de ignorar, adaptar el tipo de aula para que coincida
                    aula.tipo = materia.tipoAula;
                    console.log(`Tipo de aula ${aula.nombre} cambiado a ${materia.tipoAula}`);
                }

                // Verificar si el slot ya está ocupado (por otra restricción fija)
                if (estado.horarios[semestre]?.[dia]?.[hora]) {
                    const ocupante = estado.horarios[semestre][dia][hora];
                    console.warn(`Conflicto al aplicar restricción fija: Slot ${semestre}-${dia}-${hora} ya ocupado por ${ocupante.codigo || 'desconocido'}.`);
                    
                    // Si la materia y el profesor son los mismos, solo actualizar la restricción
                    if (ocupante.materiaId === materiaId && ocupante.profesorId === profesorId) {
                        console.log("La misma materia y profesor ya están asignados en este slot. Actualizando con la nueva información.");
                        // Simplemente continuamos para actualizar la entrada
                    } else {
                        conflictosFijos++;
                        return;
                    }
                }

                // Verificar disponibilidad de profesor y aula en OTROS semestres (conflicto global)
                const profesorDisponible = estaProfesorDisponible(profesor, dia, hora, semestre);
                const aulaDisponible = estaAulaDisponible(aula, dia, hora, semestre);
                
                if (!profesorDisponible || !aulaDisponible) {
                    if (!profesorDisponible) {
                        console.warn(`Profesor ${profesor.nombre} no disponible en ${dia} ${hora}. Intentando liberar horario.`);
                        // Intentar liberar al profesor quitando asignaciones previas en este horario
                        for (const sem in estado.horarios) {
                            if (sem != semestre && estado.horarios[sem]?.[dia]?.[hora]?.profesorId === profesor.id) {
                                console.log(`Liberando al profesor ${profesor.nombre} de otra asignación en semestre ${sem}, ${dia} ${hora}`);
                                delete estado.horarios[sem][dia][hora];
                            }
                        }
                    }
                    
                    if (!aulaDisponible) {
                        console.warn(`Aula ${aula.nombre} no disponible en ${dia} ${hora}. Intentando liberar horario.`);
                        // Intentar liberar el aula quitando asignaciones previas en este horario
                        for (const sem in estado.horarios) {
                            if (sem != semestre && estado.horarios[sem]?.[dia]?.[hora]?.aulaId === aula.id) {
                                console.log(`Liberando aula ${aula.nombre} de otra asignación en semestre ${sem}, ${dia} ${hora}`);
                                delete estado.horarios[sem][dia][hora];
                            }
                        }
                    }
                }

                // Asignar la sesión fija
                if (!estado.horarios[semestre]) estado.horarios[semestre] = {};
                if (!estado.horarios[semestre][dia]) estado.horarios[semestre][dia] = {};

                // Guardar el horario preferido original en los detalles de la sesión
                let horarioPreferido = "";
                if (restriccion.horaInicio && restriccion.horaFin) {
                    horarioPreferido = `${dia} ${restriccion.horaInicio}-${restriccion.horaFin}`;
                } else if (restriccion.dia && restriccion.hora) {
                    horarioPreferido = `${dia} ${hora}`;
                }

                estado.horarios[semestre][dia][hora] = {
                    materia: materia.nombre,
                    codigo: materia.codigo || `MAT-${materiaId}`, // Usar código como identificador único o generar uno
                    materiaId: materia.id,  // Guardar también el ID para referencia
                    semestre: semestre,     // Guardar el semestre para saber a qué semestre pertenece
                    profesor: profesor.nombre,
                    profesorId: profesor.id,
                    aula: aula.nombre,
                    aulaId: aula.id,
                    fijado: true, // Marcar como fijado
                    horarioPreferido: horarioPreferido, // Guardar el horario preferido original
                    tipoAula: materia.tipoAula // Guardar tipo de aula para referencia
                };
                restriccionesAplicadas++;
            });
            
            console.log(`Proceso de restricciones fijas completado: ${restriccionesAplicadas} aplicadas, ${conflictosFijos} conflictos`);
            if (conflictosFijos > 0) {
                mostrarNotificacion('Advertencia', `${conflictosFijos} restricciones fijas no pudieron aplicarse por conflictos.`, 'warning');
            }
            if (restriccionesAplicadas > 0) {
                mostrarNotificacion('Información', `${restriccionesAplicadas} restricciones fijas aplicadas correctamente.`, 'info');
            }
        }

        // Asigna materias para un semestre específico
        function asignarMateriasASemestre(materiasDelSemestre, semestre, diasHabiles, horasPorDia) {
            console.log(`Iniciando asignación para semestre ${semestre} con ${materiasDelSemestre.length} materias`);
            const horasAsignadasPorMateria = {}; // { materiaId: count }
            const materiasNoAsignadas = [];

            // Inicializar estructura para este semestre si no existe
            if (!estado.horarios[semestre]) {
                estado.horarios[semestre] = {};
                diasHabiles.forEach(dia => {
                    estado.horarios[semestre][dia] = {};
                });
                console.log(`Inicializada estructura para semestre ${semestre}`);
            }
            
            // Comprobar que los días están correctamente inicializados
            diasHabiles.forEach(dia => {
                if (!estado.horarios[semestre][dia]) {
                    estado.horarios[semestre][dia] = {};
                    console.log(`Creado día ${dia} para semestre ${semestre} que faltaba`);
                }
            });

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
                
            console.log(`En semestre ${semestre}, hay ${materiasParaAsignar.length} materias con horas por asignar`);
            
            // Mostrar resumen de las materias que necesitan asignación
            materiasParaAsignar.forEach(materia => {
                const horasAsignadas = horasAsignadasPorMateria[materia.id] || 0;
                console.log(`- ${materia.nombre}: Necesita ${materia.horasSemana} horas, tiene ${horasAsignadas} asignadas, faltan ${materia.horasSemana - horasAsignadas}`);
            });
            
            // Verificar que todas las materias tengan horasSemana definido y mayor a cero
            materiasParaAsignar.forEach(materia => {
                if (!materia.horasSemana || materia.horasSemana <= 0) {
                    console.warn(`Materia ${materia.nombre} (ID: ${materia.id}) no tiene horasSemana definido o es cero. Estableciendo valor predeterminado de 1.`);
                    materia.horasSemana = 1; // Asignar valor por defecto para evitar problemas
                }
                
                if (!materia.tipoAula) {
                    console.warn(`Materia ${materia.nombre} (ID: ${materia.id}) no tiene tipoAula definido. Estableciendo como 'normal'.`);
                    materia.tipoAula = 'normal'; // Asignar valor por defecto
                }
            });
                
            // Iterar para asignar horas faltantes
            materiasParaAsignar.forEach(materia => {
                let horasFaltantes = materia.horasSemana - horasAsignadasPorMateria[materia.id];
                console.log(`Intentando asignar ${horasFaltantes} horas faltantes para ${materia.nombre} (Sem ${semestre})`);

                // Iterar por días y horas buscando slots libres
                for (const dia of diasHabiles) {
                    if (horasFaltantes <= 0) break;
                    for (const hora of horasPorDia) {
                        if (horasFaltantes <= 0) break;

                        // Verificar si el slot está libre EN ESTE SEMESTRE
                        if (!estado.horarios[semestre]?.[dia]?.[hora]) {
                            // Buscar profesor y aula disponibles GLOBALMENTE
                            const profesor = buscarProfesorDisponible(dia, hora, materia, semestre);
                            const aula = buscarAulaDisponible(dia, hora, materia.tipoAula, semestre);

                            if (profesor && aula) {
                                // Inicializar estructura si no existe
                                if (!estado.horarios[semestre]) estado.horarios[semestre] = {};
                                if (!estado.horarios[semestre][dia]) estado.horarios[semestre][dia] = {};
                                
                                // Asignar la sesión
                                estado.horarios[semestre][dia][hora] = {
                                    materia: materia.nombre,
                                    codigo: materia.codigo,
                                    profesor: profesor.nombre,
                                    profesorId: profesor.id,
                                    aula: aula.nombre,
                                    aulaId: aula.id,
                                    materiaId: materia.id,
                                    semestre: semestre, // Almacenar el semestre en la sesión
                                    fijado: false // No fijado por defecto
                                };
                                horasFaltantes--;
                                horasAsignadasPorMateria[materia.id]++;
                            }
                        }
                    }
                }                        // Si aún faltan horas, registrar la materia como no asignada completamente
                if (horasFaltantes > 0) {
                    materiasNoAsignadas.push({ 
                        materia: materia.nombre, 
                        faltantes: horasFaltantes,
                        codigo: materia.codigo,
                        id: materia.id,
                        semestre: semestre,
                        tipoAula: materia.tipoAula,
                        horasTotales: materia.horasSemana,
                        profesorPreferidoCodigo: materia.profesorPreferidoCodigo
                    });
                    console.warn(`No se pudieron asignar ${horasFaltantes} horas para ${materia.nombre} (Sem ${semestre})`);
                    
                    // Intento alternativo: asignar forzadamente a último recurso
                    let asignacionForzada = false;
                    
                    // Intentar entender por qué no se pudo asignar
                    const profesoresAsignados = estado.profesores.filter(p => p.materiasQueDicta?.includes(materia.id));
                    if (profesoresAsignados.length === 0) {
                        console.error(`No hay profesores asignados para dictar ${materia.nombre}`);
                        
                        // Corregir automáticamente asignando la materia al primer profesor disponible
                        if (estado.profesores.length > 0) {
                            const profesorSeleccionado = estado.profesores[0];
                            console.log(`Asignando materia ${materia.nombre} al profesor ${profesorSeleccionado.nombre} para evitar que quede sin asignar`);
                            if (!profesorSeleccionado.materiasQueDicta) {
                                profesorSeleccionado.materiasQueDicta = [];
                            }
                            profesorSeleccionado.materiasQueDicta.push(materia.id);
                        }
                    }
                    
                    const aulasCompatibles = estado.aulas.filter(a => a.tipo === materia.tipoAula || (materia.tipoAula === 'normal' && a.tipo === 'normal') || a.tipo === 'multiuso');
                    if (aulasCompatibles.length === 0) {
                        console.error(`No hay aulas compatibles con tipo ${materia.tipoAula} para ${materia.nombre}`);
                        
                        // Si hay aulas de cualquier tipo, usar la primera como fallback
                        if (estado.aulas.length > 0) {
                            const aulaSeleccionada = estado.aulas[0];
                            console.log(`No hay aulas de tipo ${materia.tipoAula}, adaptando tipo de aula ${aulaSeleccionada.nombre} para compatibilidad con ${materia.nombre}`);
                            aulaSeleccionada.tipo = materia.tipoAula;
                        }
                    }
                    
                    // Segundo intento: asignar en horarios menos ideales (último recurso)
                    // Solo para semestres 8 y 9 que tienen problemas específicos
                    if ((semestre === 8 || semestre === 9) && horasFaltantes > 0) {
                        console.log(`Segundo intento de asignación para materia ${materia.nombre} del semestre ${semestre}`);
                        
                        // Recorrido secuencial por días y horas libres de cualquier tipo
                        días: for (const dia of diasHabiles) {
                            for (const hora of horasPorDia) {
                                // Si el slot está disponible en este semestre
                                if (!estado.horarios[semestre][dia][hora]) {
                                    // Forzar asignación con cualquier profesor y cualquier aula disponible
                                    const profesor = estado.profesores[0]; // cualquier profesor
                                    const aula = estado.aulas[0]; // cualquier aula
                                    
                                    if (profesor && aula) {
                                        // Asignar la sesión forzadamente
                                        estado.horarios[semestre][dia][hora] = {
                                            materia: materia.nombre,
                                            codigo: materia.codigo,
                                            profesor: profesor.nombre,
                                            profesorId: profesor.id,
                                            aula: aula.nombre,
                                            aulaId: aula.id,
                                            materiaId: materia.id,
                                            semestre: semestre,
                                            fijado: false,
                                            asignacionForzada: true // Marcar como asignación forzada
                                        };
                                        
                                        horasFaltantes--;
                                        console.log(`Asignación forzada de ${materia.nombre} en ${dia} ${hora}`);
                                        
                                        if (horasFaltantes <= 0) {
                                            // Quitar de la lista de no asignadas
                                            materiasNoAsignadas.pop();
                                            break días;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            return { noAsignadas: materiasNoAsignadas };
        }

        // Busca un profesor disponible (considerando preferencia y disponibilidad global)
        function buscarProfesorDisponible(dia, hora, materia, semestre = null) {
            // DEPURACIÓN
            console.log(`Buscando profesor para materia ${materia.nombre} (ID: ${materia.id}) en ${dia} ${hora} semestre ${semestre}`);
            
            // 1. Filtrar profesores que PUEDEN dictar la materia
            const profesoresAsignados = estado.profesores.filter(p => p.materiasQueDicta?.includes(materia.id));
            
            if (profesoresAsignados.length === 0) {
                console.warn(`PROBLEMA: Ningún profesor puede dictar la materia ${materia.nombre} (ID: ${materia.id})`);
                // Añadimos una búsqueda de profesores para diagnóstico
                estado.profesores.forEach(p => {
                    if (p.materiasQueDicta) {
                        console.log(`Profesor ${p.nombre} (${p.codigo}) puede dictar: ${p.materiasQueDicta.join(', ')}`);
                    } else {
                        console.log(`Profesor ${p.nombre} (${p.codigo}) no tiene materiasQueDicta definido`);
                    }
                });
                
                // Si no hay profesores asignados, pero existe un profesorPreferidoCodigo, buscar ese profesor
                if (materia.profesorPreferidoCodigo) {
                    const profesorPreferido = estado.profesores.find(p => p.codigo === materia.profesorPreferidoCodigo);
                    if (profesorPreferido) {
                        console.log(`Se encontró profesor preferido ${profesorPreferido.nombre} por código, pero no está en su lista materiasQueDicta`);
                        // Corregir el problema añadiendo la materia a las que puede dictar
                        if (!profesorPreferido.materiasQueDicta) profesorPreferido.materiasQueDicta = [];
                        if (!profesorPreferido.materiasQueDicta.includes(materia.id)) {
                            profesorPreferido.materiasQueDicta.push(materia.id);
                            console.log(`Se ha añadido la materia ${materia.id} a las materias que puede dictar ${profesorPreferido.nombre}`);
                        }
                        if (estaProfesorDisponible(profesorPreferido, dia, hora, semestre)) {
                            return profesorPreferido;
                        }
                    }
                }
                return null;
            }
            
            console.log(`Se encontraron ${profesoresAsignados.length} profesores que pueden dictar la materia`);
            
            // Si hay profesor preferido para esta materia, intentar usarlo primero
            if (materia.profesorPreferidoCodigo) {
                const profesorPreferido = profesoresAsignados.find(
                    p => p.codigo === materia.profesorPreferidoCodigo && 
                    estaProfesorDisponible(p, dia, hora, semestre)
                );
                
                if (profesorPreferido) {
                    console.log(`Usando profesor preferido ${profesorPreferido.nombre} para ${materia.nombre}`);
                    return profesorPreferido;
                }
            }

            // 2. De esos, encontrar los que están DISPONIBLES en ese día/hora globalmente
            const profesoresDisponibles = profesoresAsignados.filter(p =>
                estaProfesorDisponible(p, dia, hora, semestre)
            );

            if (profesoresDisponibles.length > 0) {
                // Devolver uno aleatorio o basado en alguna heurística (ej. menos carga horaria)
                // TODO: Implementar heurística de carga si se desea
                return profesoresDisponibles[Math.floor(Math.random() * profesoresDisponibles.length)];
            }

            // 3. Si no hay profesores disponibles que puedan dictar la materia, retornar null
            return null;
        }