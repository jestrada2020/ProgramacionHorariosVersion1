// Estado global de la aplicación
        const estado = {
            profesores: [], // { id, codigo, nombre, especialidad, diasDisponibles: { Lunes: { mañana: bool, tarde: bool }, ... }, materiasQueDicta: [materiaId1, ...], horasInvestigacionSemanal, horasProyectosInstSemanal, horasProyectosExtSemanal, horasCapacitacionSemestral, horasMaterialDidacticoSemanal, horasObjetivoSemanal }
            materias: [],   // { id, codigo, nombre, semestre, horasSemana, tipoAula } // horasSemana = número de bloques
            aulas: [],      // { id, codigo, nombre, tipo, capacidad, ubicacion }
            restricciones: [], // { tipo: 'horarioFijo', profesorId, materiaId, aulaId, semestre, dia, hora } o { tipo: 'evitarHuecos', peso } etc.
            horarios: {},   // { semestre: { dia: { hora: { materia, codigo, profesor, profesorId, aula, aulaId, fijado } } } }
            horariosAsesorias: {}, // { profesorId: { dia: { hora: { tipo: 'asesoria', duracion } } } } // Placeholder, no implementado visualmente aún
            horariosVisualizacion: { // Estructuras precalculadas para diferentes vistas
                porSemestre: {}, // Incluye clases regulares
                porProfesor: {},
                porAula: {},
                porMateria: {}
            },
            modoEdicion: false,
            configuracion: {
                periodoAcademico: "semestral",
                cantidadSemestres: 9, // Cambiado de 4 a 9 como valor inicial/por defecto
                horaInicio: "07:00",
                horaFin: "19:00",
                duracionBloque: 60,
                rangoHorario: "7-19", // Nuevo campo para el rango horario predeterminado
                diasDisponibles: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"], // Inicializado por defecto
                // Configuración detallada de asesorías
                asesoriasNormalesConfig: {
                    habilitado: false,
                    duracionMinutos: 60,
                    vecesPorSemana: 1
                },
                asesoriasEvaluacionConfig: {
                    habilitado: false,
                    duracionMinutos: 120,
                    vecesPorSemana: 1
                },
                // Campos antiguos de asesorías (se mantienen por si acaso, pero no se usan en la nueva lógica)
                habilitarAsesorias: false, // Obsoleto
                duracionAsesoria: 30 // Obsoleto
            },
            editandoId: null // ID del elemento actualmente en edición en un modal
        };

        // --- INICIALIZACIÓN ---
        document.addEventListener('DOMContentLoaded', () => {
            cargarDatosGuardados();
            setupTabs();
            setupEventListeners();
            setupEventosAdicionales();
            setupRangoHorarios(); // Configurar el selector de rangos de horarios
            renderizarTodo();
            actualizarInterfaz(); // Asegura que la UI refleje el estado cargado
            actualizarEstadoBotones(); // Habilitar/deshabilitar botones según datos
        });
        
        // Configurar el selector de rangos de horarios
        function setupRangoHorarios() {
            const selectorRango = document.getElementById('rangosHorarios');
            const horaInicio = document.getElementById('horaInicio');
            const horaFin = document.getElementById('horaFin');
            const infoRangoHorario = document.getElementById('infoRangoHorario');
            
            if (selectorRango) {
                // Evento al cambiar el selector de rango
                selectorRango.addEventListener('change', function() {
                    const valor = this.value;
                    aplicarRangoHorario(valor);
                    
                    // Mostrar aviso para jornada extendida
                    if (valor === '6-22' || valor === '7-22') {
                        mostrarNotificacion(
                            'Información', 
                            'Ha seleccionado un horario de jornada extendida hasta las 22:00 horas. Considere las implicaciones para profesores y estudiantes.',
                            'info',
                            8000
                        );
                    }
                    
                    // Actualizar información del rango horario
                    if (infoRangoHorario) {
                        infoRangoHorario.innerHTML = mostrarInfoRangoHorario();
                    }
                });
            }
            
            // Eventos para los cambios en hora inicio y fin
            if (horaInicio) {
                horaInicio.addEventListener('change', function() {
                    estado.configuracion.horaInicio = this.value;
                    
                    // Detectar si coincide con algún rango predefinido
                    const rangoDetectado = detectarRangoPredefinido(this.value, horaFin.value);
                    if (rangoDetectado !== selectorRango.value) {
                        selectorRango.value = rangoDetectado;
                        estado.configuracion.rangoHorario = rangoDetectado;
                    }
                    
                    // Actualizar información del rango horario
                    if (infoRangoHorario) {
                        infoRangoHorario.innerHTML = mostrarInfoRangoHorario();
                    }
                });
            }
            
            if (horaFin) {
                horaFin.addEventListener('change', function() {
                    estado.configuracion.horaFin = this.value;
                    
                    // Detectar si coincide con algún rango predefinido
                    const rangoDetectado = detectarRangoPredefinido(horaInicio.value, this.value);
                    if (rangoDetectado !== selectorRango.value) {
                        selectorRango.value = rangoDetectado;
                        estado.configuracion.rangoHorario = rangoDetectado;
                    }
                    
                    // Actualizar información del rango horario
                    if (infoRangoHorario) {
                        infoRangoHorario.innerHTML = mostrarInfoRangoHorario();
                    }
                });
            }
            
            // Inicializar la información del rango
            if (infoRangoHorario) {
                infoRangoHorario.innerHTML = mostrarInfoRangoHorario();
            }
        }

        // --- GESTIÓN DE PESTAÑAS ---
        function setupTabs() {
            const tabs = document.querySelectorAll('.tab-link');
            const contents = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = e.target.getAttribute('href').substring(1);

                    tabs.forEach(t => t.classList.remove('bg-blue-600', 'active')); // Quita active de todos
                    e.target.classList.add('bg-blue-600', 'active'); // Añade active al clickeado

                    contents.forEach(content => {
                        if (content.id === targetId) {
                            content.classList.add('active');
                        } else {
                            content.classList.remove('active');
                        }
                    });
                    // Si se cambia a la pestaña de horarios, actualizar la vista
                    if (targetId === 'horarios') {
                         actualizarHorarioVisible(); // Actualiza ambas tablas (regular y asesorías)
                    }
                    // Si se cambia a la pestaña de profesores, recalcular y renderizar resumen detallado
                    if (targetId === 'profesores') {
                        renderizarProfesores(); // Asegura que el resumen detallado se muestre
                    }
                });
            });
             // Activar la pestaña guardada o la primera por defecto
            const activeTabHash = window.location.hash || '#configuracion';
            const activeTabLink = document.querySelector(`.tab-link[href="${activeTabHash}"]`);
            if (activeTabLink) {
                activeTabLink.click(); // Simula clic para activar la pestaña correcta
            } else {
                 tabs[0].click(); // Activa la primera si el hash no es válido
            }
        }

        // --- CONFIGURACIÓN DE EVENTOS PRINCIPALES ---
        function setupEventListeners() {
            // Configuración
            document.getElementById('saveConfigBtn').addEventListener('click', guardarConfiguracion);
            document.getElementById('cantidadSemestres').addEventListener('change', actualizarInterfaz); // Actualizar selectores si cambia
            // Eventos para nueva config de asesorías
            document.getElementById('habilitarAsesoriasNormales').addEventListener('change', guardarConfiguracion);
            document.getElementById('duracionAsesoriaNormal').addEventListener('change', guardarConfiguracion);
            document.getElementById('frecuenciaAsesoriaNormal').addEventListener('change', guardarConfiguracion);
            document.getElementById('habilitarAsesoriasEvaluacion').addEventListener('change', guardarConfiguracion);
            document.getElementById('duracionAsesoriaEvaluacion').addEventListener('change', guardarConfiguracion);
            document.getElementById('frecuenciaAsesoriaEvaluacion').addEventListener('change', guardarConfiguracion);
            // Fin eventos nueva config asesorías
            document.querySelectorAll('.dia-semana-check').forEach(chk => chk.addEventListener('change', guardarConfiguracion)); // Guardar al cambiar días

            // Importar/Exportar/Ejemplo
            document.getElementById('cargarDatosExcel').addEventListener('click', cargarDatosDesdeExcel);
            document.getElementById('importBtn').addEventListener('click', () => document.getElementById('excelFileInput').click());
            document.getElementById('excelFileInput').addEventListener('change', () => {
                if (document.getElementById('excelFileInput').files.length > 0) {
                    cargarDatosDesdeExcel();
                }
            });
            document.getElementById('cargarDatosEjemplo').addEventListener('click', cargarDatosEjemplo);
            document.getElementById('formatoExportacion').addEventListener('change', togglePdfOptionsVisibility);
            document.getElementById('doExportBtn').addEventListener('click', exportarHorarios); // Button inside the menu triggers export


            // Gestión CRUD (botones Añadir y modales)
            document.getElementById('addProfesorBtn').addEventListener('click', () => mostrarModalProfesor());
            document.getElementById('guardarProfesorBtn').addEventListener('click', guardarProfesor);
            document.getElementById('cancelarProfesorBtn').addEventListener('click', () => cerrarModal('modalProfesor'));

            document.getElementById('addMateriaBtn').addEventListener('click', () => mostrarModalMateria());
            document.getElementById('guardarMateriaBtn').addEventListener('click', guardarMateria);
            document.getElementById('cancelarMateriaBtn').addEventListener('click', () => cerrarModal('modalMateria'));

            document.getElementById('addAulaBtn').addEventListener('click', () => mostrarModalAula());
            document.getElementById('guardarAulaBtn').addEventListener('click', guardarAula);
            document.getElementById('cancelarAulaBtn').addEventListener('click', () => cerrarModal('modalAula'));

            // Búsqueda y Filtros
            document.getElementById('buscarProfesor').addEventListener('input', () => filtrarTabla('tablaProfesores', 'buscarProfesor', 1));
            document.getElementById('buscarMateria').addEventListener('input', () => filtrarTabla('tablaMaterias', 'buscarMateria', 1));
            document.getElementById('buscarAula').addEventListener('input', () => filtrarTabla('tablaAulas', 'buscarAula', 1));
            document.getElementById('filtroTipoAula').addEventListener('change', filtrarAulasPorTipo);

            // Restricciones
            document.getElementById('guardarRestricciones').addEventListener('click', guardarRestricciones);
            document.getElementById('fijarHorarioBtn').addEventListener('click', fijarHorarioProfesor);
            document.getElementById('profesorRestriccion').addEventListener('change', cargarMateriasParaRestriccion);
            document.getElementById('materiaRestriccion').addEventListener('change', cargarAulasParaRestriccion);

            // Horarios
            document.getElementById('generarHorariosBtn').addEventListener('click', generarHorarios);
            document.getElementById('generarHorariosBtnAlt').addEventListener('click', generarHorarios);
            document.getElementById('optimizarHorariosBtn').addEventListener('click', optimizarHorarios);
            document.getElementById('modoEdicionBtn').addEventListener('click', toggleModoEdicion);
            document.getElementById('filtroVistaHorario').addEventListener('change', cambiarVistaHorario);
            document.getElementById('elementoSeleccionado').addEventListener('change', actualizarHorarioVisible);

            // Modal Edición Sesión
            document.getElementById('guardarSesionBtn').addEventListener('click', guardarSesionEditada);
            document.getElementById('cancelarSesionBtn').addEventListener('click', () => cerrarModal('modalSesion'));
            document.getElementById('eliminarSesionBtn').addEventListener('click', eliminarSesion);

            // Modal Informe
            document.getElementById('cerrarInformeBtn').addEventListener('click', () => cerrarModal('modalInforme'));

             // Edición en celdas (delegación de eventos)
            document.addEventListener('click', function(e) {
                const cell = e.target.closest('.editable-cell');
                if (cell) {
                    const type = cell.dataset.type;
                    const id = cell.dataset.id;
                    const field = cell.dataset.field;
                    // Evitar edición en la columna de carga total en la tabla principal de profesores
                    if (type === 'profesor' && field === 'cargaTotal') return;

                    if (type && id && field && !cell.querySelector('input, select')) { // Evitar re-editar si ya hay input
                        editarCeldaDinamica(type, id, field, cell);
                    }
                }
            });

             // Edición de sesión de horario (doble clic)
            document.getElementById('horarioContainer').addEventListener('dblclick', function(e) {
                const sessionDiv = e.target.closest('.session');
                if (sessionDiv && estado.modoEdicion) {
                    const dia = sessionDiv.dataset.dia;
                    const hora = sessionDiv.dataset.hora;
                    const materiaCodigo = sessionDiv.dataset.materia; // Usamos el código/id de materia

                    // Buscar el semestre
                    let semestreEncontrado = null;
                    for (const sem in estado.horarios) {
                        if (estado.horarios[sem][dia] && estado.horarios[sem][dia][hora] && estado.horarios[sem][dia][hora].codigo === materiaCodigo) {
                            semestreEncontrado = sem;
                            break;
                        }
                    }

                    if (semestreEncontrado) {
                        mostrarModalSesion(dia, hora, semestreEncontrado);
                    } else {
                        console.warn("No se pudo encontrar el semestre para la sesión:", dia, hora, materiaCodigo);
                    }
                }
            });
        }

        // --- EVENTOS ADICIONALES Y CONFIGURACIONES SECUNDARIAS ---
        function setupEventosAdicionales() {
            actualizarSelectorTipoVista(); // Configurar selector inicial de vista de horario
            actualizarSelectoresHorariosFijos(); // Poblar selectores de restricciones
            actualizarSelectorSemestres(); // Poblar selector de semestre en modal materia
            renderizarListaHorariosFijos(); // Mostrar horarios fijos guardados
        }

        // --- RENDERIZACIÓN ---
        function renderizarTodo() {
            renderizarProfesores();
            renderizarMaterias();
            renderizarAulas();
            renderizarListaHorariosFijos(); // En pestaña restricciones
            // El horario se renderiza bajo demanda con actualizarHorarioVisible()
        }

        // Función auxiliar para obtener texto legible del tipo de contrato
        function obtenerTextoTipoContrato(tipoContrato) {
            switch(tipoContrato) {
                case 'tiempoCompleto': return 'Tiempo Completo';
                case 'medioTiempo': return 'Medio Tiempo';
                case 'ocasional': return 'Ocasional';
                case 'porHoras': return 'Por Horas';
                default: return tipoContrato || 'No especificado';
            }
        }
        
        // Renderizar tabla de profesores y resumen detallado
        function renderizarProfesores() {
            const tbody = document.getElementById('tablaProfesores').querySelector('tbody');
            tbody.innerHTML = ''; // Limpiar tabla principal

            if (!estado.profesores || estado.profesores.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="py-4 px-6 text-center">No hay profesores registrados.</td></tr>`;
                // Limpiar también el resumen detallado
                const resumenTbody = document.getElementById('resumenCargaProfesores').querySelector('tbody');
                if (resumenTbody) resumenTbody.innerHTML = `<tr><td colspan="10" class="py-3 px-4 text-center text-gray-500">No hay profesores para mostrar carga.</td></tr>`;
                return;
            }

            // Calcular carga detallada una vez
            const cargaDetalladaProfesores = calcularCargaProfesoresDetallada();

            // Poblar tabla principal de profesores
            estado.profesores.forEach(profesor => {
                const row = document.createElement('tr');
                const materiasAsignadas = profesor.materiasQueDicta?.map(matId => estado.materias.find(m => m.id === matId)?.nombre).filter(Boolean).join(', ') || 'Ninguna';
                const cargaTotalHoras = cargaDetalladaProfesores[profesor.id]?.total || 0;

                // Obtener información de horas extras y tipo de contrato
                const cargaInfo = cargaDetalladaProfesores[profesor.id] || {};
                const horasExtras = parseFloat(cargaInfo.horasExtras || 0);
                const tipoContrato = cargaInfo.tipoContrato || 'tiempoCompleto';
                const tipoContratoTexto = obtenerTextoTipoContrato(tipoContrato);
                const cargaMaxima = cargaInfo.cargaMaxima || 40;
                
                // Estilo para las horas extras
                const horasExtrasDisplay = horasExtras > 0 
                    ? `<span class="bg-red-100 text-red-700 font-semibold px-1 rounded">+${horasExtras.toFixed(1)}h extras</span>` 
                    : '';
                
                row.innerHTML = `
                    <td class="py-3 px-6 editable-cell" data-type="profesor" data-id="${profesor.id}" data-field="codigo">${profesor.codigo || ''}</td>
                    <td class="py-3 px-6 editable-cell" data-type="profesor" data-id="${profesor.id}" data-field="nombre">${profesor.nombre || ''}</td>
                    <td class="py-3 px-6 editable-cell" data-type="profesor" data-id="${profesor.id}" data-field="especialidad">${profesor.especialidad || 'No especificada'}</td>
                    <td class="py-3 px-6 text-xs" title="${materiasAsignadas}">
                        <div>Materias: ${materiasAsignadas.substring(0, 30)}${materiasAsignadas.length > 30 ? '...' : ''}</div>
                        <div class="mt-1">Contrato: ${tipoContratoTexto} (${cargaMaxima}h)</div>
                        <div class="mt-1 font-semibold">Carga Total: ${cargaTotalHoras}h ${horasExtrasDisplay}</div>
                    </td>
                    <td class="py-3 px-6 text-center no-print">
                        <div class="flex flex-col space-y-2">
                            <button onclick="generarCartaDocente('${profesor.id}')" class="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 rounded flex items-center justify-center" title="Generar reporte de carga laboral">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
                                </svg>
                                Reporte
                            </button>
                        
                            <div class="flex justify-center space-x-1">
                                <button onclick="mostrarModalProfesor('${profesor.id}')" class="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded no-print" title="Ver/Editar Disponibilidad, Materias y Carga">
                                    Detalles
                                </button>
                                <button class="bg-yellow-500 hover:bg-yellow-700 text-white p-1 rounded" onclick="mostrarModalProfesor('${profesor.id}')" title="Editar Profesor">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                                <button class="bg-red-500 hover:bg-red-700 text-white p-1 rounded" onclick="eliminarProfesor('${profesor.id}')" title="Eliminar Profesor">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Renderizar resumen de carga horaria detallado
            const resumenContainer = document.getElementById('resumenCargaProfesores');
            const resumenTbody = resumenContainer.querySelector('tbody');
            let resumenTbodyHtml = '';

            if (estado.profesores.length > 0) {
                estado.profesores.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(prof => {
                    const carga = cargaDetalladaProfesores[prof.id];
                    if (!carga) return; // Si no hay datos para este profesor
                    
                    // Botón para generar carta docente
                    const btnReporte = `<button class="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded" 
                        onclick="generarCartaDocente('${prof.id}')">Reporte</button>`;
                    
                    // Formatear el tipo de contrato
                    const tipoContratoTexto = obtenerTextoTipoContrato(carga.tipoContrato);
                    
                    resumenTbodyHtml += `<tr class="border-b border-gray-200 hover:bg-gray-100">
                                    <td class="py-2 px-3 text-left">
                                        ${prof.nombre}
                                        <div class="mt-1">${btnReporte}</div>
                                    </td>
                                    <td class="py-2 px-3 text-center">${tipoContratoTexto}
                                        <div class="text-xs text-gray-500">Máx: ${carga.cargaMaxima}h</div>
                                    </td>
                                    <td class="py-2 px-3 text-center">${carga.clases}</td>
                                    <td class="py-2 px-3 text-center">${carga.asesoriaNormal}</td>
                                    <td class="py-2 px-3 text-center">${carga.asesoriaEvaluacion}</td>
                                    <td class="py-2 px-3 text-center">${carga.investigacion}</td>
                                    <td class="py-2 px-3 text-center">${carga.proyectosInst}</td>
                                    <td class="py-2 px-3 text-center">${carga.proyectosExt}</td>
                                    <td class="py-2 px-3 text-center">${carga.materialDidactico}</td>
                                    <td class="py-2 px-3 text-center">${carga.capacitacion}</td>
                                    <td class="py-2 px-3 text-center">${carga.administrativas}</td>
                                    <td class="py-2 px-3 text-center">${carga.cursosVirtuales}</td>
                                    <td class="py-2 px-3 text-center">
                                        <span class="font-bold">${carga.total}</span>
                                        <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                                            <div class="${parseFloat(carga.porcentajeOcupacion) > 100 ? 'bg-red-500' : 
                                                parseFloat(carga.porcentajeOcupacion) > 90 ? 'bg-yellow-500' : 'bg-green-500'} 
                                                h-2 rounded-full" style="width: ${Math.min(100, parseFloat(carga.porcentajeOcupacion))}%"></div>
                                        </div>
                                        <div class="${parseFloat(carga.horasExtras) > 0 ? 'bg-red-100 text-red-700 font-semibold text-xs mt-1 rounded px-1' : ''}">
                                            ${parseFloat(carga.horasExtras) > 0 ? `+${carga.horasExtras}h extras` : ''}
                                        </div>
                                    </td>
                                    <td class="py-2 px-3 text-center">${carga.objetivo || '-'}</td>
                                  </tr>`;
                });
            } else {
                resumenTbodyHtml = `<tr><td colspan="10" class="py-3 px-4 text-center text-gray-500">No hay profesores para mostrar carga.</td></tr>`; // Ajustar colspan
            }
            if (resumenTbody) resumenTbody.innerHTML = resumenTbodyHtml;
        }

        // Función específica para actualizar sólo la tabla de carga de trabajo detallada
        // Útil para operaciones que no necesitan renderizar toda la tabla de profesores
        function actualizarCargaTrabajoDetallada() {
            // Calcular carga detallada
            const cargaDetalladaProfesores = calcularCargaProfesoresDetallada();
            
            // Renderizar resumen de carga horaria detallado
            const resumenContainer = document.getElementById('resumenCargaProfesores');
            const resumenTbody = resumenContainer.querySelector('tbody');
            if (!resumenTbody) return; // Si no está disponible, salir
            
            let resumenTbodyHtml = '';

            if (estado.profesores.length > 0) {
                estado.profesores.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(prof => {
                    const carga = cargaDetalladaProfesores[prof.id];
                    if (!carga) return; // Si no hay datos para este profesor
                    
                    // Formatear el tipo de contrato para mostrarlo de forma más legible
                    let tipoContratoTexto;
                    switch(carga.tipoContrato) {
                        case 'tiempoCompleto': tipoContratoTexto = 'T. Completo'; break;
                        case 'medioTiempo': tipoContratoTexto = 'M. Tiempo'; break;
                        case 'ocasional': tipoContratoTexto = 'Ocasional'; break;
                        case 'porHoras': tipoContratoTexto = 'Por Horas'; break;
                        default: tipoContratoTexto = carga.tipoContrato || '-';
                    }
                    
                    // Determinar estilo basado en horas extras
                    let rowClass = "border-b border-gray-200 hover:bg-gray-100";
                    let horasExtrasClass = "";
                    
                    if (parseFloat(carga.horasExtras) > 0) {
                        horasExtrasClass = "bg-red-100 text-red-700 font-semibold";
                    }
                    
                    // Calcular porcentaje de ocupación para la barra de progreso
                    const porcentaje = parseFloat(carga.porcentajeOcupacion);
                    let porcentajeColor = "bg-green-500"; // Color por defecto para ocupación normal
                    
                    if (porcentaje > 100) {
                        porcentajeColor = "bg-red-500"; // Sobrecarga
                    } else if (porcentaje > 90) {
                        porcentajeColor = "bg-yellow-500"; // Casi lleno
                    } else if (porcentaje < 60) {
                        porcentajeColor = "bg-blue-400"; // Baja carga
                    }
                    
                    // Añadir botón para generar carta docente
                    const btnReporte = `<button class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded" 
                        onclick="generarCartaDocente('${prof.id}')">Carta</button>`;
                    
                    resumenTbodyHtml += `<tr class="${rowClass}">
                                    <td class="py-2 px-3 text-left">
                                        ${prof.nombre}
                                        <div class="mt-1">${btnReporte}</div>
                                    </td>
                                    <td class="py-2 px-3 text-center">${tipoContratoTexto}
                                        <div class="text-xs text-gray-500">Máx: ${carga.cargaMaxima}h</div>
                                    </td>
                                    <td class="py-2 px-3 text-center">${carga.clases}</td>
                                    <td class="py-2 px-3 text-center">${carga.asesoriaNormal}</td>
                                    <td class="py-2 px-3 text-center">${carga.asesoriaEvaluacion}</td>
                                    <td class="py-2 px-3 text-center">${carga.investigacion}</td>
                                    <td class="py-2 px-3 text-center">${carga.proyectosInst}</td>
                                    <td class="py-2 px-3 text-center">${carga.proyectosExt}</td>
                                    <td class="py-2 px-3 text-center">${carga.materialDidactico}</td>
                                    <td class="py-2 px-3 text-center">${carga.capacitacion}</td>
                                    <td class="py-2 px-3 text-center">${carga.administrativas}</td>
                                    <td class="py-2 px-3 text-center">${carga.cursosVirtuales}</td>
                                    <td class="py-2 px-3 text-center">
                                        <span class="font-bold">${carga.total}</span>
                                        <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                                            <div class="${porcentajeColor} h-2 rounded-full" style="width: ${Math.min(100, porcentaje)}%"></div>
                                        </div>
                                        <div class="${horasExtrasClass} text-xs mt-1">
                                            ${parseFloat(carga.horasExtras) > 0 ? `+${carga.horasExtras}h extras` : ''}
                                        </div>
                                    </td>
                                    <td class="py-2 px-3 text-center">${carga.objetivo || '-'}</td>
                                  </tr>`;
                });
            } else {
                resumenTbodyHtml = `<tr><td colspan="14" class="py-3 px-4 text-center text-gray-500">No hay profesores para mostrar carga.</td></tr>`;
            }
            
            resumenTbody.innerHTML = resumenTbodyHtml;
        }

        // Renderizar tabla de materias
        function renderizarMaterias() {
            const tbody = document.getElementById('tablaMaterias').querySelector('tbody');
            tbody.innerHTML = '';

            if (!estado.materias || estado.materias.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="py-4 px-6 text-center">No hay materias registradas.</td></tr>`;
                return;
            }

            estado.materias.forEach(materia => {

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="py-3 px-6 editable-cell" data-type="materia" data-id="${materia.id}" data-field="codigo">${materia.codigo || ''}</td>
                    <td class="py-3 px-6 editable-cell" data-type="materia" data-id="${materia.id}" data-field="nombre">${materia.nombre || ''}</td>
                    <td class="py-3 px-6 editable-cell" data-type="materia" data-id="${materia.id}" data-field="semestre">${materia.semestre || 'N/A'}</td>
                    <td class="py-3 px-6 editable-cell" data-type="materia" data-id="${materia.id}" data-field="horasSemana">${materia.horasSemana || 0}</td>
                    <td class="py-3 px-6 editable-cell" data-type="materia" data-id="${materia.id}" data-field="tipoAula">${materia.tipoAula || 'normal'}</td>
                    <td class="py-3 px-6 text-center no-print">
                        <button class="bg-yellow-500 hover:bg-yellow-700 text-white p-1 rounded mr-1" onclick="mostrarModalMateria('${materia.id}')" title="Editar Materia">
                           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button class="bg-red-500 hover:bg-red-700 text-white p-1 rounded" onclick="eliminarMateria('${materia.id}')" title="Eliminar Materia">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }