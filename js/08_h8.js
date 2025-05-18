// Verifica si un profesor está disponible (horario y disponibilidad semanal)
        function estaProfesorDisponible(profesor, dia, hora, semestreExcluir = null) {
            if (!profesor) {
                console.error("estaProfesorDisponible recibió un profesor nulo o indefinido");
                return false;
            }
            
            // A. Verificar disponibilidad semanal básica (Mañana/Tarde)
            const turno = obtenerTurno(hora);
            
            // Si profesor no tiene diasDisponibles, asumir que está disponible siempre
            if (!profesor.diasDisponibles) {
                console.warn(`Profesor ${profesor.nombre} (${profesor.codigo}) no tiene diasDisponibles definido. Asumiendo disponibilidad total.`);
                // Inicializar con disponibilidad predeterminada
                profesor.diasDisponibles = {};
                ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].forEach(d => {
                    profesor.diasDisponibles[d] = { mañana: true, tarde: true };
                });
            }
            
            if (!profesor.diasDisponibles?.[dia]?.[turno]) {
                // console.log(`Profesor ${profesor.codigo} NO disponible por horario semanal: ${dia} ${turno}`);
                return false; // No disponible según su horario base
            }

            // B. Verificar si ya tiene clase asignada en CUALQUIER semestre (excepto el excluido, si se especifica)
            for (const sem in estado.horarios) {
                 if (semestreExcluir && sem == semestreExcluir) continue; // Saltar el semestre a excluir

                if (estado.horarios[sem]?.[dia]?.[hora]?.profesorId === profesor.id) {
                     // console.log(`Profesor ${profesor.codigo} OCUPADO en Sem ${sem} a las ${dia} ${hora}`);
                    return false; // Ocupado en otro semestre
                }
            }

            // Si pasó ambas verificaciones, está disponible
            return true;
        }

        // Busca un aula disponible (considerando tipo y disponibilidad global)
        function buscarAulaDisponible(dia, hora, tipoRequerido, semestre = null, esVirtual = false) {
            // DEPURACIÓN
            console.log(`Buscando aula para tipo ${tipoRequerido} en ${dia} ${hora}${esVirtual ? ' (curso virtual)' : ''}`);
            
            // Para cursos virtuales, devolver un objeto de aula especial con "pendiente"
            if (esVirtual) {
                console.log('Asignando aula "pendiente" para curso virtual');
                return {
                    id: 'virtual-pendiente',
                    nombre: 'Pendiente',
                    tipo: 'virtual'
                };
            }
            
            // Si el tipo requerido no está definido, asumir 'normal' para evitar errores
            if (!tipoRequerido) {
                console.warn("Tipo de aula no especificado, asumiendo 'normal'");
                tipoRequerido = 'normal';
            }
            
            // Determinar qué tipos de aulas son compatibles con el tipo requerido
            // Reglas:
            // - Un aula especializada sólo es compatible con su tipo específico
            // - Un aula normal es compatible solo con clases normales
            // - Un aula laboratorio sólo es compatible con clases de laboratorio
            
            const aulasCompatibles = estado.aulas.filter(aula => {
                // Compatibilidad directa (mismo tipo)
                if (aula.tipo === tipoRequerido) {
                    return true;
                }
                
                // Flexibilidad para permitir aulas sin tipo o con tipo vacío
                if (!aula.tipo && tipoRequerido === 'normal') {
                    console.log(`Aula ${aula.nombre} sin tipo, asumiendo compatible con tipo normal`);
                    return true;
                }
                
                // Reglas especiales (personalizar según necesidad)
                // Si se agregan más tipos de aula, considerar expandir estas reglas
                
                return false; // Por defecto, no compatible
            });

            // Mostrar aulas compatibles encontradas
            console.log(`Se encontraron ${aulasCompatibles.length} aulas compatibles con tipo ${tipoRequerido}`);
            
            if (aulasCompatibles.length === 0) {
                console.warn("No se encontraron aulas del tipo requerido:", tipoRequerido);
                console.log("Aulas disponibles en el sistema:", estado.aulas.map(a => `${a.nombre} (${a.tipo})`).join(', '));
                
                // Si no hay aulas del tipo requerido pero hay aulas disponibles, usar la primera como fallback
                if (estado.aulas.length > 0) {
                    const aulaFallback = estado.aulas[0];
                    console.warn(`Usando aula de fallback: ${aulaFallback.nombre} (${aulaFallback.tipo}) para tipo requerido ${tipoRequerido}`);
                    if (estaAulaDisponible(aulaFallback, dia, hora, semestre)) {
                        return aulaFallback;
                    }
                }
                return null;
            }
            
            // Filtrar solo las aulas que están disponibles
            const aulasLibres = aulasCompatibles.filter(aula => estaAulaDisponible(aula, dia, hora, semestre));
            
            console.log(`De esas, ${aulasLibres.length} están disponibles en ${dia} ${hora}`);

            if (aulasLibres.length > 0) {
                // Ordenar por criterio (ejemplo: capacidad más cercana a la requerida)
                // Por ahora sólo devuelve una aleatoria
                const aulaSeleccionada = aulasLibres[Math.floor(Math.random() * aulasLibres.length)];
                console.log(`Se seleccionó el aula: ${aulaSeleccionada.nombre}`);
                return aulaSeleccionada;
            }
            
            return null; // No hay aulas disponibles y compatibles
        }

        // Verifica si un aula está disponible globalmente
        function estaAulaDisponible(aula, dia, hora, semestreExcluir = null) {
            if (!aula) {
                console.error("estaAulaDisponible recibió un aula nula o indefinida");
                return false;
            }
            
            for (const sem in estado.horarios) {
                if (semestreExcluir && sem == semestreExcluir) continue;

                if (estado.horarios[sem]?.[dia]?.[hora]?.aulaId === aula.id) {
                    // console.log(`Aula ${aula.nombre} NO disponible en ${dia} ${hora} por uso en semestre ${sem}`);
                    return false; // Ocupada
                }
            }
            
            // console.log(`Aula ${aula.nombre} disponible en ${dia} ${hora}`);
            return true; // Libre
        }

        // Función para optimizar horarios (placeholder/simplificada)
        function optimizarHorarios() {
            if (!estado.horarios || Object.keys(estado.horarios).length === 0) {
                mostrarNotificacion('Error', 'Primero debe generar horarios.', 'error');
                return;
            }
            mostrarCargando(true);
            setTimeout(() => {
                try {
                    console.log("Iniciando optimización...");
                    let cambiosRealizados = 0;
                    const maxIteraciones = parseInt(document.getElementById('maxIteraciones').value) || 1000;
                    const informeOpt = { conflictosResueltos: 0, huecosOptimizados: 0, movimientos: 0 };

                    // Algoritmo simple: intentar mover sesiones aleatoriamente para resolver conflictos
                    for (let i = 0; i < maxIteraciones; i++) {
                        const conflictos = [...detectarConflictos('profesor'), ...detectarConflictos('aula')];
                        if (conflictos.length === 0) break; // No hay más conflictos

                        // Elegir un conflicto al azar
                        const conflicto = conflictos[Math.floor(Math.random() * conflictos.length)];
                        // Priorizar mover la sesión NO fijada, si existe
                        const sesionAMover = !conflicto.sesion1.fijado ? conflicto.sesion1 : (!conflicto.sesion2.fijado ? conflicto.sesion2 : null);

                        if (sesionAMover) {
                            // Intentar mover la sesión a un slot vacío cercano
                            const movido = intentarMoverSesion(sesionAMover.semestre, conflicto.dia, conflicto.hora);
                            if (movido) {
                                informeOpt.conflictosResueltos++;
                                informeOpt.movimientos++;
                                cambiosRealizados++;
                            }
                        } else {
                            // Ambas sesiones del conflicto están fijadas, no se puede resolver moviendo
                            console.warn("Conflicto entre sesiones fijadas no resoluble:", conflicto);
                        }
                    }

                     // Optimización de huecos (ejemplo simple)
                     const huecosOptimizados = optimizarHuecosEstudiante();
                     informeOpt.huecosOptimizados = huecosOptimizados;
                     cambiosRealizados += huecosOptimizados;


                    console.log("Optimización completada.");
                    generarHorariosVisualizacion(); // Recalcular vistas
                    actualizarHorarioVisible();
                    actualizarEstadisticasHorario();
                    actualizarCargaTrabajoDetallada(); // Actualizar solo la tabla de carga detallada
                    guardarDatosLocalmente();

                    if (cambiosRealizados > 0) {
                         mostrarInformeOptimizacion(informeOpt);
                         mostrarNotificacion('Éxito', `Optimización completada. ${informeOpt.conflictosResueltos} conflictos resueltos, ${informeOpt.huecosOptimizados} huecos optimizados.`, 'success');
                    } else {
                         mostrarNotificacion('Información', 'No se realizaron cambios durante la optimización.', 'info');
                    }

                } catch (error) {
                    console.error("Error optimizando horarios:", error);
                    mostrarNotificacion('Error', `Error al optimizar: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 50);
        }

        // Intenta mover una sesión a un slot cercano y válido
        function intentarMoverSesion(semestre, diaOrigen, horaOrigen) {
            const sesion = estado.horarios[semestre]?.[diaOrigen]?.[horaOrigen];
            if (!sesion || sesion.fijado) return false; // No mover sesiones fijadas

            const diasHabiles = obtenerDiasHabiles();
            const horasPorDia = calcularHorasPorDia();
            const profesor = estado.profesores.find(p => p.id === sesion.profesorId);
            const aula = estado.aulas.find(a => a.id === sesion.aulaId);
            if (!profesor || !aula) return false; // Datos inconsistentes

            // Buscar slots alternativos (ej. mismo día, horas cercanas; otros días)
            // Crear una lista aleatoria de slots para probar
            const slotsPosibles = [];
            for (const dia of diasHabiles) {
                for (const hora of horasPorDia) {
                    if (dia !== diaOrigen || hora !== horaOrigen) {
                        slotsPosibles.push({ dia, hora });
                    }
                }
            }
            // Barajar slots para aleatoriedad
            for (let i = slotsPosibles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [slotsPosibles[i], slotsPosibles[j]] = [slotsPosibles[j], slotsPosibles[i]];
            }


            for (const { dia: diaDestino, hora: horaDestino } of slotsPosibles) {
                // Verificar si el slot destino está libre en este semestre
                if (!estado.horarios[semestre]?.[diaDestino]?.[horaDestino]) {
                     // Verificar disponibilidad global de profesor y aula en el nuevo slot
                     if (estaProfesorDisponible(profesor, diaDestino, horaDestino, semestre) && estaAulaDisponible(aula, diaDestino, horaDestino, semestre)) {
                         // Mover la sesión
                         if (!estado.horarios[semestre][diaDestino]) estado.horarios[semestre][diaDestino] = {};
                         estado.horarios[semestre][diaDestino][horaDestino] = { ...sesion }; // Copiar sesión
                         delete estado.horarios[semestre][diaOrigen][horaOrigen]; // Eliminar original
                         console.log(`Movido: ${sesion.codigo} de ${diaOrigen}-${horaOrigen} a ${diaDestino}-${horaDestino}`);
                         return true; // Movimiento exitoso
                     }
                }
            }
            return false; // No se pudo mover
        }

        // Detecta conflictos de profesor o aula
        function detectarConflictos(tipo) { // tipo = 'profesor' o 'aula'
            const conflictos = [];
            const asignaciones = {}; // clave: 'dia-hora-entidadId', valor: { semestre, materiaId, fijado, profesorId, aulaId }
            const diasHabiles = obtenerDiasHabiles();
            const horasPorDia = calcularHorasPorDia();

            for (const semestre in estado.horarios) {
                for (const dia of diasHabiles) {
                    for (const hora of horasPorDia) {
                        const sesion = estado.horarios[semestre]?.[dia]?.[hora];
                        if (sesion) {
                            const entidadId = (tipo === 'profesor') ? sesion.profesorId : sesion.aulaId;
                            if (entidadId) {
                                const clave = `${dia}-${hora}-${entidadId}`;
                                if (asignaciones[clave]) { // Conflicto detectado
                                    const sesionConflicto = asignaciones[clave];
                                    // Solo reportar si no es la misma sesión (caso raro) y si al menos una no está fijada
                                    if (sesionConflicto.semestre !== semestre || sesionConflicto.materiaId !== sesion.codigo) {
                                         conflictos.push({
                                            tipo: tipo, dia, hora, entidadId,
                                            sesion1: { semestre, materiaId: sesion.codigo, profesorId: sesion.profesorId, aulaId: sesion.aulaId, fijado: sesion.fijado },
                                            sesion2: { semestre: sesionConflicto.semestre, materiaId: sesionConflicto.materiaId, profesorId: sesionConflicto.profesorId, aulaId: sesionConflicto.aulaId, fijado: sesionConflicto.fijado }
                                        });
                                    }
                                } else {
                                    asignaciones[clave] = { semestre, materiaId: sesion.codigo, fijado: sesion.fijado, profesorId: sesion.profesorId, aulaId: sesion.aulaId };
                                }
                            }
                        }
                    }
                }
            }
            return conflictos;
        }

        // Optimiza huecos para estudiantes (versión simplificada)
        function optimizarHuecosEstudiante() {
             // Esta es una heurística muy simple. Una optimización real requeriría
             // modelar grupos de estudiantes o evaluar el impacto en todos los semestres.
             let huecosOptimizados = 0;
             const diasHabiles = obtenerDiasHabiles();
             const horasPorDia = calcularHorasPorDia();

             for (const semestre in estado.horarios) {
                 for (const dia of diasHabiles) {
                     const horasOcupadas = horasPorDia.filter(h => estado.horarios[semestre]?.[dia]?.[h]);
                     if (horasOcupadas.length < 2) continue; // No hay huecos posibles

                     horasOcupadas.sort((a, b) => horasPorDia.indexOf(a) - horasPorDia.indexOf(b)); // Ordenar

                     // Buscar huecos e intentar mover la sesión posterior al hueco
                     for (let i = 0; i < horasOcupadas.length - 1; i++) {
                         const idxActual = horasPorDia.indexOf(horasOcupadas[i]);
                         const idxSiguiente = horasPorDia.indexOf(horasOcupadas[i+1]);

                         if (idxSiguiente > idxActual + 1) { // Hay un hueco
                             const horaDestino = horasPorDia[idxActual + 1]; // Slot inmediatamente después
                             const horaOrigen = horasOcupadas[i+1];
                             const sesionAMover = estado.horarios[semestre]?.[dia]?.[horaOrigen];

                             if (sesionAMover && !sesionAMover.fijado) {
                                 // Intentar mover la sesión siguiente al slot del hueco
                                 const profesor = estado.profesores.find(p => p.id === sesionAMover.profesorId);
                                 const aula = estado.aulas.find(a => a.id === sesionAMover.aulaId);

                                 if (profesor && aula && !estado.horarios[semestre]?.[dia]?.[horaDestino] && // Slot destino libre en este semestre
                                     estaProfesorDisponible(profesor, dia, horaDestino, semestre) &&
                                     estaAulaDisponible(aula, dia, horaDestino, semestre))
                                 {
                                     // Mover
                                     if (!estado.horarios[semestre][dia]) estado.horarios[semestre][dia] = {};
                                     estado.horarios[semestre][dia][horaDestino] = { ...sesionAMover };
                                     delete estado.horarios[semestre][dia][horaOrigen];
                                     console.log(`Hueco optimizado: ${sesionAMover.codigo} movido de ${horaOrigen} a ${horaDestino} en ${dia} S${semestre}`);
                                     huecosOptimizados++;
                                     // Re-evaluar el día después de un movimiento exitoso
                                     horasOcupadas = horasPorDia.filter(h => estado.horarios[semestre]?.[dia]?.[h]).sort((a, b) => horasPorDia.indexOf(a) - horasPorDia.indexOf(b));
                                     i = -1; // Reiniciar bucle para el día
                                 }
                             }
                         }
                     }
                 }
             }
             return huecosOptimizados;
        }