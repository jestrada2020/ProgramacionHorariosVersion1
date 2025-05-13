// --- IMPORTACIÓN / EXPORTACIÓN / EJEMPLO ---

function generarIdUnico() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

        // Cargar datos desde archivo Excel
        function cargarDatosDesdeExcel() {
            const fileInput = document.getElementById('excelFileInput');
            if (fileInput.files.length === 0) {
                mostrarNotificacion('Error', 'Por favor seleccione un archivo Excel.', 'error');
                return;
            }
            const file = fileInput.files[0];
            mostrarCargando(true);

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    procesarDatosExcel(workbook); // Procesar datos
                    guardarDatosLocalmente();
                    renderizarTodo();
                    actualizarInterfaz();
                    actualizarEstadoBotones(); // Habilitar botones si hay datos
                    mostrarNotificacion('Éxito', 'Datos cargados correctamente desde Excel.', 'success');
                } catch (error) {
                    console.error('Error al procesar Excel:', error);
                    mostrarNotificacion('Error', `No se pudo procesar el archivo: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                    fileInput.value = ''; // Limpiar input para permitir recargar el mismo archivo
                }
            };
            reader.onerror = function() {
                mostrarCargando(false);
                mostrarNotificacion('Error', 'Error al leer el archivo.', 'error');
            };
            reader.readAsArrayBuffer(file);
        }

        // Función auxiliar para obtener el mapeo de cabeceras
        function obtenerMapeoCabeceras(ws) {
            const cabeceras = [];
            const mapeo = {};
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const addr = XLSX.utils.encode_cell({r: range.s.r, c: C});
                const cell = ws[addr];
                if (cell && cell.v) {
                    cabeceras.push(cell.v.toString().trim());
                    mapeo[cell.v.toString().trim()] = C; // Mapea nombre de cabecera a índice de columna
                }
            }
            // Alternativa para mapear nombre de cabecera a nombre de cabecera (más legible al usar)
            const mapeoNombre = {};
            XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" })[0].forEach(nombreColumna => {
                mapeoNombre[nombreColumna.trim()] = nombreColumna.trim();
            });
            return mapeoNombre;
        }

        // Función principal para procesar el libro de Excel
        function procesarDatosExcel(workbook) {
            console.log("Procesando datos del Excel...");

            // Reinicializar las estructuras de datos relevantes en el estado global
            estado.profesores = [];
            estado.materias = [];
            estado.aulas = [];
            estado.restricciones = [];
            estado.alumnos = []; // Nueva entidad

            // Procesar Hoja de Profesores
            const wsProfesores = workbook.Sheets["Profesores"];
            if (wsProfesores) {
                const mapeoProfesores = obtenerMapeoCabeceras(wsProfesores);
                const profesoresData = XLSX.utils.sheet_to_json(wsProfesores, { raw: false, defval: "" });
                profesoresData.forEach(row => {
                    const disponibilidadTextoOriginal = row[mapeoProfesores["Disponibilidad"]] || "";
                    const disponibilidadTextoNormalizado = disponibilidadTextoOriginal.toLowerCase().trim();
                    const diasDisponibles = {};
                    const todosLosDiasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

                    if (disponibilidadTextoNormalizado === "completo") {
                        // Si es "Completo", el profesor está disponible en los días laborables definidos en la configuración.
                        // Si no hay configuración de días laborables, se asume todos los días de la semana.
                        const diasLaborablesConfig = (estado.configuracion && estado.configuracion.diasDisponibles && estado.configuracion.diasDisponibles.length > 0)
                                                  ? estado.configuracion.diasDisponibles.map(d => d.toLowerCase())
                                                  : todosLosDiasSemana.map(d => d.toLowerCase());

                        todosLosDiasSemana.forEach(dia => {
                            // Los nombres de los días en diasDisponibles deben estar capitalizados
                            const diaCapitalizado = capitalizarPrimeraLetra(dia.toLowerCase());
                            if (diasLaborablesConfig.includes(dia.toLowerCase())) {
                                diasDisponibles[diaCapitalizado] = [{ inicio: "00:00", fin: "23:59" }];
                            } else {
                                diasDisponibles[diaCapitalizado] = [];
                            }
                        });
                    } else {
                        // Si no es "completo", se asume que la disponibilidad se define por restricciones o preasignaciones.
                        // Inicializar todos los días como no disponibles por defecto desde esta hoja.
                        todosLosDiasSemana.forEach(dia => {
                            diasDisponibles[capitalizarPrimeraLetra(dia.toLowerCase())] = [];
                        });
                        if (disponibilidadTextoOriginal && disponibilidadTextoNormalizado !== "completo") {
                            console.warn(`Valor de Disponibilidad \"${disponibilidadTextoOriginal}\" para profesor ${row[mapeoProfesores["Nombre"]]} no es \"Completo\". Se asume sin disponibilidad general definida en esta hoja. La disponibilidad se determinará por preasignaciones (hoja Materias) o Restricciones Globales.`);
                        }
                    }

                    estado.profesores.push({
                        id: generarIdUnico(),
                        codigo: row[mapeoProfesores["Código"]] || `PROF-${Math.random().toString(16).slice(2, 8)}`,
                        nombre: row[mapeoProfesores["Nombre"]] || "Nombre no especificado",
                        especialidad: row[mapeoProfesores["Especialidad"]] || "",
                        materiasQueDicta: [], // Cambiado de materiasQuePuedeImpartir para consistencia
                        disponibilidadTexto: disponibilidadTextoOriginal, // Guardar el texto original
                        diasDisponibles: diasDisponibles,
                        contacto: row[mapeoProfesores["Contacto"]] || "",
                        preferenciasHorario: [],
                        // Campos de carga laboral anteriores (ajustar o eliminar según sea necesario)
                        horasInvestigacionSemanal: 0,
                        horasExtensionSemanal: 0,
                        horasGestionAcademicaSemanal: 0,
                        horasCapacitacionSemanal: 0,
                        maxHorasClaseSemanal: 40, // Valor por defecto, podría venir del Excel
                    });
                });
                console.log("Profesores cargados:", estado.profesores.length);
            } else {
                console.warn("Hoja 'Profesores' no encontrada.");
            }

            // Procesar Hoja de Aulas
            const wsAulas = workbook.Sheets["Aulas"];
            if (wsAulas) {
                const mapeoAulas = obtenerMapeoCabeceras(wsAulas);
                const aulasData = XLSX.utils.sheet_to_json(wsAulas, { raw: false, defval: "" });
                aulasData.forEach(row => {
                    estado.aulas.push({
                        id: generarIdUnico(),
                        codigo: row[mapeoAulas["Código"]] || `AULA-${Math.random().toString(16).slice(2, 8)}`,
                        nombre: row[mapeoAulas["Nombre"]] || "Aula no especificada",
                        tipo: row[mapeoAulas["Tipo"]] || "Estándar",
                        capacidad: parseInt(row[mapeoAulas["Capacidad"]]) || 30,
                        ubicacion: row[mapeoAulas["Ubicación"]] || "",
                        recursos: [], // Podría expandirse para leer recursos desde Excel
                        disponibilidad: {} // Por defecto todas disponibles, se puede restringir luego
                    });
                });
                console.log("Aulas cargadas:", estado.aulas.length);
            } else {
                console.warn("Hoja 'Aulas' no encontrada.");
            }

            // Procesar Hoja de Materias
            const wsMaterias = workbook.Sheets["Materias"];
            if (wsMaterias) {
                const mapeoMaterias = obtenerMapeoCabeceras(wsMaterias);
                const materiasData = XLSX.utils.sheet_to_json(wsMaterias, { raw: false, defval: "" });
                materiasData.forEach(row => {
                    let horasSemanales = 0; // Representa el número de bloques
                    const horasExcel = row[mapeoMaterias["Horas"]];
                    const bloquesExcel = row[mapeoMaterias["Bloques"]];

                    // Priorizar "Bloques" si existe, luego "Horas"
                    if (bloquesExcel !== undefined && !isNaN(parseFloat(bloquesExcel))) {
                        horasSemanales = parseFloat(bloquesExcel);
                    } else if (horasExcel !== undefined && !isNaN(parseFloat(horasExcel))) {
                        horasSemanales = parseFloat(horasExcel);
                    } else {
                        console.warn(`Ni \"Horas\" ni \"Bloques\" válidos para materia ${row[mapeoMaterias["Nombre"]] || 'Desconocida'}. Usando 0 bloques.`);
                    }

                    estado.materias.push({
                        id: generarIdUnico(),
                        codigo: row[mapeoMaterias["Código"]] || `MAT-${Math.random().toString(16).slice(2, 8)}`,
                        nombre: row[mapeoMaterias["Nombre"]] || "Materia no especificada",
                        semestre: parseInt(row[mapeoMaterias["Semestre"]]) || 1,
                        horasSemana: horasSemanales, // horasSemana ahora almacena el número de bloques
                        tipoAulaRequerida: row[mapeoMaterias["Tipo de Aula"]] || "Estándar",
                        profesoresAsignados: [], 
                        grupos: 1, 
                        esModular: false, 
                        horarioPreferidoTexto: row[mapeoMaterias["Horario"]] || "",
                        aulaPreferidaCodigo: row[mapeoMaterias["Aula"]] || "",
                        profesorPreferidoCodigo: row[mapeoMaterias["Profesor"]] || "",
                    });
                });
                console.log("Materias cargadas:", estado.materias.length);
            } else {
                console.warn("Hoja 'Materias' no encontrada.");
            }

            // Post-procesamiento: Asignar materias a profesores basado en la hoja "Materias"
            if (estado.profesores.length > 0 && estado.materias.length > 0) {
                estado.materias.forEach(materia => {
                    if (materia.profesorPreferidoCodigo) {
                        const profesorEncontrado = estado.profesores.find(p => p.codigo === materia.profesorPreferidoCodigo);
                        if (profesorEncontrado) {
                            if (!profesorEncontrado.materiasQueDicta.includes(materia.id)) {
                                profesorEncontrado.materiasQueDicta.push(materia.id);
                            }
                        } else {
                            console.warn(`Profesor con código ${materia.profesorPreferidoCodigo} (asignado a materia ${materia.nombre}) no encontrado en la hoja de Profesores.`);
                        }
                    }
                });
                console.log("Información de materiasQueDicta actualizada para profesores.");
            }

            // Procesar Hoja de Alumnos (Nueva)
            const wsAlumnos = workbook.Sheets["Alumnos"];
            if (wsAlumnos) {
                const mapeoAlumnos = obtenerMapeoCabeceras(wsAlumnos);
                const alumnosData = XLSX.utils.sheet_to_json(wsAlumnos, { raw: false, defval: "" });
                alumnosData.forEach(row => {
                    estado.alumnos.push({
                        id: row[mapeoAlumnos["ID"]] || generarIdUnico(),
                        nombre: row[mapeoAlumnos["Nombre"]] || "Alumno no especificado",
                        programa: row[mapeoAlumnos["Programa"]] || "",
                        semestre: parseInt(row[mapeoAlumnos["Semestre"]]) || 1,
                        // Podrían añadirse más campos como materias inscritas si es necesario
                    });
                });
                console.log("Alumnos cargados:", estado.alumnos.length);
            } else {
                console.warn("Hoja 'Alumnos' no encontrada. Esta hoja es opcional.");
            }

            // Procesar Hoja de Restricciones Globales
            const nombreHojaRestricciones = "Restricciones Globales"; // Nombre de hoja asumido
            const wsRestricciones = workbook.Sheets[nombreHojaRestricciones];
            if (wsRestricciones) {
                const mapeoRestricciones = obtenerMapeoCabeceras(wsRestricciones);
                // Intentar encontrar la columna por palabras clave o tomar la primera.
                // Se busca "descripción", "restricción", "detalle" o "seleccion" en el nombre de la columna.
                const nombreColumnaDescripcion = Object.keys(mapeoRestricciones).find(
                    key => key.toLowerCase().includes("descripción") ||
                           key.toLowerCase().includes("restricción") ||
                           key.toLowerCase().includes("detalle") ||
                           key.toLowerCase().includes("seleccion")
                ) || (Object.keys(mapeoRestricciones).length > 0 ? Object.keys(mapeoRestricciones)[0] : null);

                if (nombreColumnaDescripcion) {
                    const restriccionesData = XLSX.utils.sheet_to_json(wsRestricciones, { raw: false, defval: "" });
                    let contadorRestriccionesImportadas = 0;
                    restriccionesData.forEach(row => {
                        const descripcionTexto = row[nombreColumnaDescripcion];
                        if (descripcionTexto && String(descripcionTexto).trim() !== "") {
                            estado.restricciones.push({
                                id: generarIdUnico(),
                                tipo: 'generalImportada', // Tipo para indicar que es una descripción general
                                descripcion: String(descripcionTexto).trim(),
                                // Los siguientes campos podrán ser editados/detallados en la aplicación
                                aplicaA: null,
                                entidadId: null,
                                dia: null,
                                horaInicio: null,
                                horaFin: null,
                                esEstricta: true, // Por defecto se consideran estrictas
                                profesorOriginal: null, // Para futuro parsing/edición
                                aulaOriginal: null,     // Para futuro parsing/edición
                                materiaOriginal: null   // Para futuro parsing/edición
                            });
                            contadorRestriccionesImportadas++;
                        }
                    });
                    console.log(`Hoja '${nombreHojaRestricciones}' procesada: ${contadorRestriccionesImportadas} restricciones importadas.`);
                } else {
                    console.warn(`No se pudo encontrar una columna de descripción adecuada en la hoja '${nombreHojaRestricciones}' o la hoja está vacía/sin cabeceras.`);
                }
            } else {
                console.warn(`Hoja '${nombreHojaRestricciones}' no encontrada. Las restricciones se pueden añadir manualmente.`);
            }

            // Post-procesamiento: Convertir preasignaciones de materias en restricciones de horarioFijo
            if (estado.materias.length > 0) {
                estado.materias.forEach(materia => {
                    if (materia.horarioPreferidoTexto && materia.aulaPreferidaCodigo && materia.profesorPreferidoCodigo) {
                        // Intentar encontrar el profesor y el aula por sus códigos
                        const profesor = estado.profesores.find(p => p.codigo === materia.profesorPreferidoCodigo);
                        const aula = estado.aulas.find(a => a.codigo === materia.aulaPreferidaCodigo);

                        if (profesor && aula) {
                            // Interpretar el texto del horario. Ejemplo simple: "Lunes 08:00-10:00"
                            // Esto necesitará una lógica de parsing más robusta.
                            const partesHorario = materia.horarioPreferidoTexto.match(/(\S+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})/);
                            if (partesHorario && partesHorario.length === 4) {
                                const dia = capitalizarPrimeraLetra(partesHorario[1].toLowerCase());
                                const horaInicio = partesHorario[2];
                                const horaFin = partesHorario[3];

                                const restriccionFija = {
                                    id: generarIdUnico(),
                                    tipo: "horarioFijo", // Tipo específico para preasignaciones
                                    entidad: "materia", // La restricción se aplica a una materia
                                    entidadId: materia.id, // ID de la materia
                                    materiaId: materia.id, // Redundante pero útil para filtros
                                    dia: dia,
                                    horaInicio: horaInicio,
                                    horaFin: horaFin,
                                    aulaId: aula.id,
                                    profesorId: profesor.id,
                                    esEstricta: true, // Las preasignaciones se consideran estrictas
                                    descripcion: `Preasignación para ${materia.nombre}: ${dia} ${horaInicio}-${horaFin} en ${aula.nombre} con ${profesor.nombre}`
                                };
                                estado.restricciones.push(restriccionFija);
                                console.log(`Restricción de horario fijo creada para ${materia.nombre} por preasignación.`);
                            } else {
                                console.warn(`Formato de horario preasignado no reconocido para ${materia.nombre}: "${materia.horarioPreferidoTexto}". Se esperaba "Día HH:MM-HH:MM".`);
                            }
                        } else {
                            console.warn(`No se pudo crear la restricción de horario fijo para ${materia.nombre} porque el profesor (código: ${materia.profesorPreferidoCodigo}) o el aula (código: ${materia.aulaPreferidaCodigo}) no se encontraron.`);
                        }
                    }
                });
            }


            console.log("Datos procesados. Estado actual:", estado);
            // Actualizar la UI con los nuevos datos
            // Esto dependerá de cómo esté estructurada tu UI y qué funciones uses para renderizar
            // Por ejemplo, si tienes funciones como mostrarProfesores(), mostrarMaterias(), etc.
            if (typeof mostrarProfesores === "function") mostrarProfesores();
            if (typeof mostrarMaterias === "function") mostrarMaterias();
            if (typeof mostrarAulas === "function") mostrarAulas();
            if (typeof mostrarRestricciones === "function") mostrarRestricciones();
            // No hay una función para mostrar alumnos en la UI principal por ahora.

            // Simular un pequeño retraso para la pantalla de carga, luego ocultarla
            setTimeout(() => {
                alert("Datos del Excel cargados y procesados. Revise las pestañas correspondientes.");
                // Actualizar todas las visualizaciones y cálculos necesarios
                if (typeof actualizarTodasLasVistas === "function") {
                    actualizarTodasLasVistas();
                } else {
                    console.warn("Función actualizarTodasLasVistas no definida. Algunas vistas pueden no estar actualizadas.");
                }
            }, 500);
        }

        // Función para capitalizar la primera letra de un string
        function capitalizarPrimeraLetra(string) {
            if (!string) return '';
            return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
        }

        // Cargar datos de ejemplo
        function cargarDatosEjemplo() {
            estado.profesores = [
                { id: "PROF1", codigo: "P001", nombre: "Dr. Juan Pérez", especialidad: "Informática", materiasQueDicta: ["MAT1", "MAT5", "MAT7"], diasDisponibles: {"Lunes":{mañana:true,tarde:true},"Martes":{mañana:true,tarde:true},"Miércoles":{mañana:true,tarde:true},"Jueves":{mañana:true,tarde:true},"Viernes":{mañana:true,tarde:true},"Sábado":{mañana:false,tarde:false}}, horasInvestigacionSemanal: 4, horasProyectosInstSemanal: 2, horasMaterialDidacticoSemanal: 1, horasCapacitacionSemestral: 16 },
                { id: "PROF2", codigo: "P002", nombre: "Dra. María López", especialidad: "Matemáticas", materiasQueDicta: ["MAT2", "MAT6", "MAT8"], diasDisponibles: {"Lunes":{mañana:true,tarde:false},"Martes":{mañana:true,tarde:false},"Miércoles":{mañana:true,tarde:false},"Jueves":{mañana:true,tarde:false},"Viernes":{mañana:true,tarde:false},"Sábado":{mañana:false,tarde:false}}, horasInvestigacionSemanal: 6, horasProyectosExtSemanal: 3, horasCapacitacionSemestral: 8 },
                { id: "PROF3", codigo: "P003", nombre: "Ing. Carlos R.", especialidad: "Electrónica", materiasQueDicta: ["MAT3"], diasDisponibles: {"Lunes":{mañana:false,tarde:true},"Martes":{mañana:false,tarde:true},"Miércoles":{mañana:false,tarde:true},"Jueves":{mañana:false,tarde:true},"Viernes":{mañana:false,tarde:true},"Sábado":{mañana:false,tarde:false}}, horasProyectosInstSemanal: 4, horasMaterialDidacticoSemanal: 2 },
                { id: "PROF4", codigo: "P004", nombre: "Lic. Ana Martínez", especialidad: "Inglés", materiasQueDicta: ["MAT4"], diasDisponibles: {"Lunes":{mañana:true,tarde:true},"Martes":{mañana:true,tarde:true},"Miércoles":{mañana:true,tarde:true},"Jueves":{mañana:true,tarde:true},"Viernes":{mañana:true,tarde:true},"Sábado":{mañana:false,tarde:false}}, horasMaterialDidacticoSemanal: 3, horasCapacitacionSemestral: 12 }
            ];
            estado.materias = [
                { id: "MAT1", codigo: "INF-101", nombre: "Programación I", semestre: 1, horasSemana: 4, tipoAula: "informatica" }, // 4 bloques
                { id: "MAT2", codigo: "MAT-101", nombre: "Matemáticas Disc.", semestre: 1, horasSemana: 4, tipoAula: "normal" }, // 4 bloques
                { id: "MAT3", codigo: "ARQ-201", nombre: "Arquitectura Comp.", semestre: 2, horasSemana: 3, tipoAula: "laboratorio" }, // 3 bloques
                { id: "MAT4", codigo: "ING-101", nombre: "Inglés Técnico I", semestre: 1, horasSemana: 2, tipoAula: "normal" }, // 2 bloques
                { id: "MAT5", codigo: "INF-201", nombre: "Programación II", semestre: 2, horasSemana: 4, tipoAula: "informatica" }, // 4 bloques
                { id: "MAT6", codigo: "MAT-201", nombre: "Cálculo Diferencial", semestre: 2, horasSemana: 4, tipoAula: "normal" }, // 4 bloques
                { id: "MAT7", codigo: "INF-301", nombre: "Base de Datos", semestre: 3, horasSemana: 4, tipoAula: "informatica" }, // 4 bloques
                { id: "MAT8", codigo: "EST-301", nombre: "Estadística", semestre: 3, horasSemana: 3, tipoAula: "normal" } // 3 bloques
            ];
            estado.aulas = [
                { id: "AULA1", codigo: "A101", nombre: "Salón 101", tipo: "normal", capacidad: 40, ubicacion: "Edificio A" },
                { id: "AULA2", codigo: "A102", nombre: "Salón 102", tipo: "normal", capacidad: 35, ubicacion: "Edificio A" },
                { id: "AULA3", codigo: "B201-L", nombre: "Lab Info 1", tipo: "informatica", capacidad: 30, ubicacion: "Edificio B" },
                { id: "AULA4", codigo: "B101-L", nombre: "Lab Electro", tipo: "laboratorio", capacidad: 25, ubicacion: "Edificio B" },
                { id: "AULA5", codigo: "B202-L", nombre: "Lab Info 2", tipo: "informatica", capacidad: 30, ubicacion: "Edificio B" }
            ];
             estado.restricciones = [ // Ejemplo de restricción fija
                 { tipo: 'horarioFijo', profesorId: 'PROF4', materiaId: 'MAT4', aulaId: 'AULA1', semestre: 1, dia: 'Lunes', hora: '10:00' }
             ];
            estado.configuracion = {
                periodoAcademico: "semestral", cantidadSemestres: 3, horaInicio: "06:00", horaFin: "18:00", duracionBloque: 60,
                diasDisponibles: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
                asesoriasNormalesConfig: { habilitado: true, duracionMinutos: 60, vecesPorSemana: 2 },
                asesoriasEvaluacionConfig: { habilitado: true, duracionMinutos: 120, vecesPorSemana: 1 },
                // Campos obsoletos (se mantienen por compatibilidad pero no se usan)
                habilitarAsesorias: true,
                duracionAsesoria: 30
            };
            estado.horarios = {}; // Limpiar horarios previos
            estado.horariosAsesorias = {}; // Limpiar asesorías previas

            mostrarNotificacion('Éxito', 'Datos de ejemplo cargados.', 'success');
            renderizarTodo();
            actualizarInterfaz();
            actualizarEstadoBotones();
            guardarDatosLocalmente();
        }

        // Exportar horarios (controlador)
        function exportarHorarios() {
            const formato = document.getElementById('formatoExportacion').value;
            const tipoVista = document.getElementById('filtroVistaHorario').value;
            const elementoId = document.getElementById('elementoSeleccionado').value;
            const pdfPageSize = document.getElementById('pdfPageSize').value;
            const pdfOrientation = document.getElementById('pdfOrientation').value;

            // Si es vista de asesoría, no exportar por ahora (o implementar exportación específica)
            if (tipoVista === 'asesoria') {
                mostrarNotificacion('Info', 'La exportación de la vista de asesorías no está implementada.', 'info');
                return;
            }

            const datosParaExportar = obtenerDatosParaVista(tipoVista, elementoId);

            if (!datosParaExportar || Object.keys(datosParaExportar.horario).length === 0) {
                mostrarNotificacion('Error', 'No hay horarios generados o visibles para exportar.', 'error');
                return;
            }

            try {
                if (formato === 'excel') exportarHorariosExcel();
                else if (formato === 'pdf') exportarHorariosPDF();
            } catch (error) {
                mostrarNotificacion('Error', `Error al exportar: ${error.message}`, 'error');
            } finally {
                // Opcional: cerrar el menú si no se usa hover
            }
        }