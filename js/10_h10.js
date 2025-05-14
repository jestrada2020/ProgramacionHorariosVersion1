// --- UTILIDADES Y UI ---

        // Mostrar/Ocultar pantalla de carga
        function mostrarCargando(mostrar) {
            document.getElementById('loadingScreen').style.display = mostrar ? 'flex' : 'none';
        }

        // Mostrar notificación flotante
        function mostrarNotificacion(titulo, mensaje, tipo = 'info', duracion = 5000) { // info, success, error
            const notification = document.getElementById('notification');
            document.getElementById('notificationTitle').textContent = titulo;
            document.getElementById('notificationMessage').textContent = mensaje;

            notification.classList.remove('bg-blue-100', 'text-blue-700', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700', 'bg-gray-100', 'text-gray-700', 'bg-yellow-100', 'text-yellow-700');
            let bgColor, textColor;
            switch (tipo) {
                case 'success': bgColor = 'bg-green-100'; textColor = 'text-green-700'; break;
                case 'error': bgColor = 'bg-red-100'; textColor = 'text-red-700'; break;
                case 'warning': bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; break;
                case 'info':
                default: bgColor = 'bg-blue-100'; textColor = 'text-blue-700'; break;
            }
            notification.classList.add(bgColor, textColor);

            notification.classList.remove('hidden');
            requestAnimationFrame(() => { // Asegura que se aplique el cambio de display antes de la transición
                 notification.classList.add('show');
            });


            // Ocultar automáticamente después de la duración especificada (por defecto 5 segundos)
            setTimeout(() => {
                notification.classList.remove('show');
                // Esperar a que termine la transición antes de ocultar con display:none
                setTimeout(() => notification.classList.add('hidden'), 300);
            }, duracion);
        }

        // Calcular horas del día según configuración
        function calcularHorasPorDia() {
            const { horaInicio, horaFin, duracionBloque } = estado.configuracion;
            const horas = [];
            if (!horaInicio || !horaFin || !duracionBloque) return horas; // Evitar error si no hay config

            try {
                let [hIni, mIni] = horaInicio.split(':').map(Number);
                let [hFin, mFin] = horaFin.split(':').map(Number);
                let minutosActual = hIni * 60 + mIni;
                const minutosFin = hFin * 60 + mFin;

                while (minutosActual < minutosFin) {
                    const h = Math.floor(minutosActual / 60);
                    const m = minutosActual % 60;
                    horas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
                    minutosActual += parseInt(duracionBloque);
                }
            } catch (e) {
                console.error("Error calculando horas:", e);
                mostrarNotificacion('Error', 'Formato de hora inválido en configuración.', 'error');
            }
            return horas;
        }

        // Obtener días hábiles según configuración
        function obtenerDiasHabiles() {
            return estado.configuracion.diasDisponibles || ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
        }

        // Obtener turno (mañana/tarde) basado en la hora
        function obtenerTurno(hora) {
            if (!hora) return null;
            try {
                const horaNum = parseInt(hora.split(':')[0]);
                return horaNum < 13 ? 'mañana' : 'tarde'; // Asumiendo que las 13:00 es el inicio de la tarde
            } catch (e) {
                console.error("Error obteniendo turno para hora:", hora, e);
                // Para evitar errores, en caso de falla devolvemos 'mañana' por defecto
                return 'mañana';
            }
        }

        // Guardar estado en localStorage
        function guardarDatosLocalmente() {
            try {
                localStorage.setItem('datosHorariosAppVD3', JSON.stringify({ // Cambiado nombre de clave para evitar conflictos
                    profesores: estado.profesores,
                    materias: estado.materias,
                    aulas: estado.aulas,
                    restricciones: estado.restricciones,
                    horarios: estado.horarios,
                    horariosAsesorias: estado.horariosAsesorias || {},
                    configuracion: estado.configuracion
                }));
                 // console.log("Datos guardados localmente.");
            } catch (error) {
                console.error("Error guardando datos localmente:", error);
                mostrarNotificacion('Error', 'No se pudieron guardar los datos localmente (posiblemente localStorage lleno).', 'error');
            }
        }

        // Cargar estado desde localStorage
        function cargarDatosGuardados() {
            const datosGuardados = localStorage.getItem('datosHorariosAppVD3'); // Usar nueva clave
            if (datosGuardados) {
                try {
                    const datos = JSON.parse(datosGuardados);
                    estado.profesores = datos.profesores || [];
                    estado.materias = datos.materias || [];
                    estado.aulas = datos.aulas || [];
                    estado.restricciones = datos.restricciones || [];
                    estado.horarios = datos.horarios || {};
                    estado.horariosAsesorias = datos.horariosAsesorias || {};
                    // Fusionar configuración guardada con la por defecto, asegurando que existan las nuevas estructuras
                    const defaultConfig = {
                        periodoAcademico: "semestral", cantidadSemestres: 9, // Cambiado de 4 a 9
                        horaInicio: "06:00", horaFin: "18:00", duracionBloque: 60,
                        diasDisponibles: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
                        asesoriasNormalesConfig: { habilitado: false, duracionMinutos: 60, vecesPorSemana: 1 },
                        asesoriasEvaluacionConfig: { habilitado: false, duracionMinutos: 120, vecesPorSemana: 1 },
                        habilitarAsesorias: false, duracionAsesoria: 30 // Mantener obsoletos por si acaso
                    };
                    estado.configuracion = { ...defaultConfig, ...(datos.configuracion || {}) };
                     // Asegurar que las sub-estructuras de config existan
                    if (!estado.configuracion.asesoriasNormalesConfig) estado.configuracion.asesoriasNormalesConfig = defaultConfig.asesoriasNormalesConfig;
                    if (!estado.configuracion.asesoriasEvaluacionConfig) estado.configuracion.asesoriasEvaluacionConfig = defaultConfig.asesoriasEvaluacionConfig;


                    // Asegurar que diasDisponibles sea un array
                    if (!Array.isArray(estado.configuracion.diasDisponibles)) {
                         estado.configuracion.diasDisponibles = defaultConfig.diasDisponibles;
                    }
                     // Asegurar estructura de disponibilidad, materiasQueDicta y campos de carga en profesores cargados
                     estado.profesores.forEach(p => {
                         if (!p.diasDisponibles) {
                             p.diasDisponibles = {};
                             ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].forEach(d => {
                                 p.diasDisponibles[d] = { mañana: (d !== 'Sábado'), tarde: (d !== 'Sábado') };
                             });
                         }
                         if (!Array.isArray(p.materiasQueDicta)) p.materiasQueDicta = [];
                         // Inicializar campos de carga si no existen
                         p.horasInvestigacionSemanal = p.horasInvestigacionSemanal || 0;
                         p.horasProyectosInstSemanal = p.horasProyectosInstSemanal || 0;
                         p.horasProyectosExtSemanal = p.horasProyectosExtSemanal || 0;
                         p.horasMaterialDidacticoSemanal = p.horasMaterialDidacticoSemanal || 0;
                         p.horasCapacitacionSemestral = p.horasCapacitacionSemestral || 0;
                         // p.horasObjetivoSemanal = p.horasObjetivoSemanal || null; // Opcional
                     });


                    if (Object.keys(estado.horarios).length > 0) {
                        generarHorariosVisualizacion(); // Precalcular vistas si hay horarios
                    }
                    console.log("Datos cargados desde localStorage.");
                } catch (error) {
                    console.error("Error cargando datos desde localStorage:", error);
                    localStorage.removeItem('datosHorariosAppVD3'); // Limpiar datos corruptos
                }
            }
        }

        // Generar estructuras de visualización (por profesor, aula, materia)
        function generarHorariosVisualizacion() {
            estado.horariosVisualizacion = { porSemestre: {}, porProfesor: {}, porAula: {}, porMateria: {} };
            const diasHabiles = obtenerDiasHabiles();
            const horasPorDia = calcularHorasPorDia();

            // Determinar el máximo semestre entre la configuración y los datos reales
            let maxSemestre = parseInt(estado.configuracion.cantidadSemestres) || 9;
            
            // Verificar también el semestre más alto en las materias
            if (estado.materias && estado.materias.length > 0) {
                const maxMaterias = estado.materias.reduce((max, materia) => 
                    Math.max(max, materia.semestre || 1), 1);
                maxSemestre = Math.max(maxSemestre, maxMaterias);
                
                // Actualizar la configuración si es necesario
                if (maxSemestre > estado.configuracion.cantidadSemestres) {
                    estado.configuracion.cantidadSemestres = maxSemestre;
                    console.log(`Actualizando cantidadSemestres a ${maxSemestre} basado en datos`);
                }
            }
            
            console.log(`Generando visualización para ${maxSemestre} semestres`);
            
            // Asegurar que todos los semestres requeridos existan en horariosVisualizacion.porSemestre
            for (let i = 1; i <= maxSemestre; i++) {
                // Inicializar estructura si no existe
                if (!estado.horariosVisualizacion.porSemestre[i]) {
                    estado.horariosVisualizacion.porSemestre[i] = {};
                }
                
                const diasHabiles = obtenerDiasHabiles();
                // Siempre inicializar los días para cada semestre, aunque no haya datos
                diasHabiles.forEach(dia => {
                    if (!estado.horariosVisualizacion.porSemestre[i][dia]) {
                        estado.horariosVisualizacion.porSemestre[i][dia] = {};
                    }
                });
                
                // Si hay datos en estado.horarios para este semestre, asegurarse de copiarlos
                if (estado.horarios[i]) {
                    diasHabiles.forEach(dia => {
                        // Ya inicializados arriba
                        
                        // Copiar cada sesión de horario
                        if (estado.horarios[i][dia]) {
                            Object.keys(estado.horarios[i][dia]).forEach(hora => {
                                estado.horariosVisualizacion.porSemestre[i][dia][hora] = estado.horarios[i][dia][hora];
                            });
                        }
                    });
                }
                
                console.log(`Semestre ${i}: ${Object.keys(estado.horariosVisualizacion.porSemestre[i]).length} días inicializados`);
            }

            for (const semestre in estado.horarios) {
                // Copia directa para porSemestre (ya se hizo arriba, pero aseguramos)
                if (!estado.horariosVisualizacion.porSemestre[semestre]) {
                    estado.horariosVisualizacion.porSemestre[semestre] = estado.horarios[semestre];
                }

                for (const dia of diasHabiles) {
                    for (const hora of horasPorDia) {
                        const sesion = estado.horarios[semestre]?.[dia]?.[hora];
                        if (sesion) {
                            const sesionConSemestre = { ...sesion, semestre };

                            // Por Profesor (usando profesor.id)
                            if (sesion.profesorId) {
                                if (!estado.horariosVisualizacion.porProfesor[sesion.profesorId]) estado.horariosVisualizacion.porProfesor[sesion.profesorId] = {};
                                if (!estado.horariosVisualizacion.porProfesor[sesion.profesorId][dia]) estado.horariosVisualizacion.porProfesor[sesion.profesorId][dia] = {};
                                estado.horariosVisualizacion.porProfesor[sesion.profesorId][dia][hora] = sesionConSemestre;
                            }
                            // Por Aula (usando aula.id)
                            if (sesion.aulaId) {
                                if (!estado.horariosVisualizacion.porAula[sesion.aulaId]) estado.horariosVisualizacion.porAula[sesion.aulaId] = {};
                                if (!estado.horariosVisualizacion.porAula[sesion.aulaId][dia]) estado.horariosVisualizacion.porAula[sesion.aulaId][dia] = {};
                                estado.horariosVisualizacion.porAula[sesion.aulaId][dia][hora] = sesionConSemestre;
                            }
                            // Por Materia (usando materia.codigo como ID)
                            if (sesion.codigo) {
                                if (!estado.horariosVisualizacion.porMateria[sesion.codigo]) estado.horariosVisualizacion.porMateria[sesion.codigo] = {};
                                if (!estado.horariosVisualizacion.porMateria[sesion.codigo][dia]) estado.horariosVisualizacion.porMateria[sesion.codigo][dia] = {};
                                estado.horariosVisualizacion.porMateria[sesion.codigo][dia][hora] = sesionConSemestre;
                            } else if (sesion.materiaId) {
                                // Buscar el código de materia si no está disponible directamente en la sesión
                                const materia = estado.materias.find(m => m.id === sesion.materiaId);
                                if (materia && materia.codigo) {
                                    if (!estado.horariosVisualizacion.porMateria[materia.codigo]) estado.horariosVisualizacion.porMateria[materia.codigo] = {};
                                    if (!estado.horariosVisualizacion.porMateria[materia.codigo][dia]) estado.horariosVisualizacion.porMateria[materia.codigo][dia] = {};
                                    estado.horariosVisualizacion.porMateria[materia.codigo][dia][hora] = sesionConSemestre;
                                }
                            }
                        }
                    }
                }
            }
             // console.log("Visualizaciones generadas:", estado.horariosVisualizacion);
        }

        // Renderizar la tabla de horario según la vista seleccionada
        function renderizarHorario(tipoVista, elementoId) {
            const tablaHorario = document.getElementById('tablaHorario');
            const tablaAsesorias = document.getElementById('tablaHorarioAsesorias');
            const mensajeNoHorario = document.getElementById('mensajeNoHorario');
            const container = document.getElementById('horarioContainer');

            // Ocultar ambas tablas inicialmente
            tablaHorario.classList.add('hidden');
            tablaAsesorias.classList.add('hidden');
            mensajeNoHorario.classList.add('hidden'); // Ocultar mensaje por defecto

            // Si es vista de asesoría, llamar a su función específica y salir
            if (tipoVista === 'asesoria') {
                // Verificar si ALGUNA asesoría está habilitada
                const algunaAsesoriaHabilitada = estado.configuracion.asesoriasNormalesConfig?.habilitado || estado.configuracion.asesoriasEvaluacionConfig?.habilitado;
                if (algunaAsesoriaHabilitada) {
                    renderizarHorarioAsesorias(elementoId); // elementoId será el profesorId
                } else {
                    mensajeNoHorario.classList.remove('hidden');
                    mensajeNoHorario.querySelector('h3').textContent = "Asesorías Deshabilitadas";
                    mensajeNoHorario.querySelector('p').textContent = "Habilite las asesorías en la configuración.";
                }
                return;
            }

            // Si no hay elemento seleccionado o no hay horarios (y no es asesoría)
            if (!elementoId || !estado.horariosVisualizacion || Object.keys(estado.horarios).length === 0) {
                mensajeNoHorario.classList.remove('hidden');
                mensajeNoHorario.querySelector('h3').textContent = "No hay horarios generados";
                mensajeNoHorario.querySelector('p').textContent = 'Cargue datos y genere horarios.';
                container.classList.remove('border', 'border-gray-200'); // Quitar borde si no hay tabla
                return;
            }


            const diasHabiles = obtenerDiasHabiles();
            const horasPorDia = calcularHorasPorDia();
            const { horario: datosHorario, titulo } = obtenerDatosParaVista(tipoVista, elementoId);

            // console.log(`Renderizando vista: ${tipoVista}, Elemento: ${elementoId}, Título: ${titulo}`);
            // console.log("Datos para renderizar:", datosHorario);

            if (!datosHorario || Object.keys(datosHorario).length === 0 && titulo !== "Vista no exportable") { // Mostrar mensaje si no hay datos para la vista específica
                 mensajeNoHorario.classList.remove('hidden');
                 mensajeNoHorario.querySelector('h3').textContent = `Sin horario para ${titulo}`;
                 mensajeNoHorario.querySelector('p').textContent = 'No hay clases asignadas para esta selección.';
                 container.classList.remove('border', 'border-gray-200');
                 return;
            }


            let html = `<caption class="text-lg font-medium mb-2 caption-top text-gray-700 no-print">${titulo}</caption>`;
            html += '<thead><tr><th class="py-2 px-1 w-16">Hora</th>'; // Ancho fijo para hora
            diasHabiles.forEach(dia => { html += `<th class="py-2 px-1">${dia}</th>`; });
            html += '</tr></thead><tbody>';

            const conflictos = [...detectarConflictos('profesor'), ...detectarConflictos('aula')];

            horasPorDia.forEach(hora => {
                html += `<tr><td class="py-1 px-1 font-medium bg-gray-50 text-xs">${hora}</td>`;
                diasHabiles.forEach(dia => {
                    const sesion = datosHorario[dia]?.[hora];
                    let cellClasses = "p-1 h-16"; // Altura mínima
                    let divClasses = "session text-xs"; // Tamaño base para sesión
                    let content = '';

                    if (sesion) {
                        // Verificar si esta sesión está en conflicto
                        const esConflicto = conflictos.some(c =>
                           c.dia === dia && c.hora === hora &&
                           ((c.sesion1.semestre == sesion.semestre && c.sesion1.materiaId === sesion.codigo) ||
                            (c.sesion2.semestre == sesion.semestre && c.sesion2.materiaId === sesion.codigo))
                        );

                        if (esConflicto) divClasses += ' conflict';
                        if (sesion.fijado) divClasses += ' fijado';
                        
                        // Obtener información adicional del horario preferido si existe
                        let horarioInfo = "";
                        
                        // Mostrar horario preferido desde la sesión si está disponible
                        if (sesion.horarioPreferido) {
                            horarioInfo = `<div class="text-xs italic text-blue-600">${sesion.horarioPreferido}</div>`;
                        } 
                        // O intentar mostrarlo desde los datos de la materia si estamos en vista de materia
                        else if (tipoVista === 'materia') {
                            const materiaCompleta = estado.materias.find(m => m.codigo === sesion.codigo);
                            if (materiaCompleta && materiaCompleta.horarioPreferidoTexto) {
                                horarioInfo = `<div class="text-xs italic text-blue-600">${materiaCompleta.horarioPreferidoTexto}</div>`;
                            }
                        }

                        content = `
                            <div class="${divClasses}" data-dia="${dia}" data-hora="${hora}" data-materia="${sesion.codigo}" title="${sesion.materia} - ${sesion.profesor} - ${sesion.aula}">
                                <div class="font-medium truncate">${sesion.materia}</div>
                                <div class="truncate">${sesion.profesor}</div>
                                <div class="text-gray-600 truncate">${sesion.aula}</div>
                                ${tipoVista !== 'semestre' && sesion.semestre ? `<div class="text-gray-500">S${sesion.semestre}</div>` : ''}
                                ${horarioInfo}
                            </div>`;
                    } else {
                        cellClasses += " bg-gray-50"; // Fondo ligero para celdas vacías
                    }
                    html += `<td class="${cellClasses}">${content}</td>`;
                });
                html += '</tr>';
            });

            html += '</tbody>';
            tablaHorario.innerHTML = html;
            tablaHorario.classList.remove('hidden');
            container.classList.add('border', 'border-gray-200'); // Añadir borde al contenedor de la tabla
        }