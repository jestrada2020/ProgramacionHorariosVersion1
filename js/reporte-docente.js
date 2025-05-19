// --- MÓDULO DE REPORTE POR DOCENTE ---
// Este módulo gestiona la generación de cartas de compromiso docente con distribución de carga laboral

document.addEventListener('DOMContentLoaded', function() {
    // Verificar que tenemos acceso a la variable estado global
    if (typeof estado === 'undefined') {
        console.error("[Reporte-Docente] Error: La variable estado no está definida. Este módulo depende de ella.");
    } else {
        console.log("[Reporte-Docente] Variable estado disponible:", Object.keys(estado).join(', '));
    }
    
    // Asegurar que tengamos una función de notificación disponible
    if (typeof mostrarNotificacion !== 'function') {
        console.warn("[Reporte-Docente] Función mostrarNotificacion no encontrada, creando versión de respaldo.");
        // Implementación de respaldo para mostrarNotificacion
        window.mostrarNotificacion = function(titulo, mensaje, tipo = 'info', duracion = 5000) {
            console.log(`[${tipo.toUpperCase()}] ${titulo}: ${mensaje}`);
            
            // Crear un elemento de notificación básico
            const notif = document.createElement('div');
            notif.className = `notificacion notificacion-${tipo}`;
            notif.innerHTML = `
                <div class="notificacion-cabecera">${titulo}</div>
                <div class="notificacion-contenido">${mensaje}</div>
            `;
            
            // Estilos básicos
            notif.style.position = 'fixed';
            notif.style.bottom = '20px';
            notif.style.right = '20px';
            notif.style.minWidth = '250px';
            notif.style.padding = '10px';
            notif.style.borderRadius = '5px';
            notif.style.zIndex = '9999';
            
            // Colores según el tipo
            switch (tipo) {
                case 'success':
                    notif.style.backgroundColor = '#d1e7dd';
                    notif.style.color = '#0f5132';
                    break;
                case 'error':
                    notif.style.backgroundColor = '#f8d7da';
                    notif.style.color = '#721c24';
                    break;
                default:
                    notif.style.backgroundColor = '#cfe2ff';
                    notif.style.color = '#084298';
            }
            
            document.body.appendChild(notif);
            
            // Eliminar después de la duración
            setTimeout(() => {
                document.body.removeChild(notif);
            }, duracion);
        };
    }
    
    // Creamos una función de carga
    function mostrarCargando(estado) {
        if (typeof window.mostrarCargando === 'function') {
            window.mostrarCargando(estado);
            return;
        }
        
        // Implementación de respaldo simple
        const id = 'cargando-overlay';
        let overlay = document.getElementById(id);
        
        if (estado) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = id;
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.width = '100%';
                overlay.style.height = '100%';
                overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
                overlay.style.zIndex = '9999';
                overlay.style.display = 'flex';
                overlay.style.justifyContent = 'center';
                overlay.style.alignItems = 'center';
                overlay.innerHTML = '<div style="color: white; font-size: 24px;">Cargando...</div>';
                document.body.appendChild(overlay);
            }
        } else if (overlay) {
            document.body.removeChild(overlay);
        }
    }
    
    // Referencias a los elementos del DOM
    const selectorProfesorCarta = document.getElementById('selectorProfesorCarta');
    const generarCartaBtn = document.getElementById('generarCarta');
    const exportarCartaPDFBtn = document.getElementById('exportarCartaPDF');
    const exportarCartaExcelBtn = document.getElementById('exportarCartaExcel');
    const cartaPreview = document.getElementById('cartaPreview');

    // Referencias a los campos del formulario
    const nombreInstitucionInput = document.getElementById('nombre_institucion');
    const nombreDocenteInput = document.getElementById('nombre_docente');
    const idDocenteInput = document.getElementById('id_docente');
    const tipoContratoInput = document.getElementById('tipo_contrato');
    const horasContratoSemanalInput = document.getElementById('horas_contrato_semanal');
    const periodoAcademicoInput = document.getElementById('periodo_academico');

    const horasInputs = {
        investigacion_externa: document.getElementById('horas_investigacion_externa'),
        investigacion_interna: document.getElementById('horas_investigacion_interna'),
        creacion_material: document.getElementById('horas_creacion_material'),
        capacitacion: document.getElementById('horas_capacitacion'),
        cargo_administrativo: document.getElementById('horas_cargo_administrativo'),
        cursos_virtuales: document.getElementById('horas_cursos_virtuales'),
        asesorias_virtuales: document.getElementById('horas_asesorias_virtuales'),
        asesorias_presenciales: document.getElementById('horas_asesorias_presenciales'),
        evaluacion_diferencial: document.getElementById('horas_evaluacion_diferencial'),
        trabajo_casa: document.getElementById('horas_trabajo_casa'),
        docencia_directa: document.getElementById('horas_docencia_directa')
    };

    const etiquetasHoras = {
        investigacion_externa: "Horas de Investigación Externa",
        investigacion_interna: "Horas de Investigación Interna",
        creacion_material: "Horas de Creación de Material Didáctico",
        capacitacion: "Horas de Capacitación Docente",
        cargo_administrativo: "Horas de Cargo Administrativo",
        cursos_virtuales: "Horas de Cursos Virtuales (Tutoría)",
        asesorias_virtuales: "Horas de Asesorías Virtuales",
        asesorias_presenciales: "Horas de Asesorías Presenciales",
        evaluacion_diferencial: "Horas de Evaluación Diferencial",
        trabajo_casa: "Horas de Trabajo en Casa (Preparación)",
        docencia_directa: "Horas de Docencia Directa (Clases)"
    };

    // Referencias a los elementos de la carta
    const cartaInstitucion = document.getElementById('cartaInstitucion');
    const cartaLugarFecha = document.getElementById('cartaLugarFecha');
    const cartaPeriodo = document.getElementById('cartaPeriodo');
    const cartaTipoContrato = document.getElementById('cartaTipoContrato');
    const cartaHorasContrato = document.getElementById('cartaHorasContrato');
    const cartaNombreDocente = document.getElementById('cartaNombreDocente');
    const cartaIdDocente = document.getElementById('cartaIdDocente');
    const listaHorasUl = document.getElementById('listaHoras');
    const totalHorasAsignadasSpan = document.getElementById('totalHorasAsignadas');
    const parrafoHorasExtras = document.getElementById('parrafoHorasExtras');
    const cartaHorasExtras = document.getElementById('cartaHorasExtras');
    const firmaNombreDocente = document.getElementById('firmaNombreDocente');
    const firmaIdDocente = document.getElementById('firmaIdDocente');
    const cartaInstitucionInline = document.querySelectorAll('.cartaInstitucionInline');
    const cartaTipoContratoInline = document.querySelectorAll('.cartaTipoContratoInline');
    
    // Función para cargar la lista de profesores en el selector
    function cargarProfesores() {
        selectorProfesorCarta.innerHTML = '<option value="">-- Seleccione un docente --</option>';
        
        if (!estado || !estado.profesores || !Array.isArray(estado.profesores)) {
            console.error("No hay datos de profesores disponibles.");
            return;
        }
        
        estado.profesores
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .forEach(profesor => {
                const option = document.createElement('option');
                option.value = profesor.id;
                option.textContent = `${profesor.nombre} (${profesor.codigo})`;
                selectorProfesorCarta.appendChild(option);
            });
    }
    
    // Función para cargar datos del profesor seleccionado
    function cargarDatosProfesor(profesorId) {
        const profesor = estado.profesores.find(p => p.id === profesorId);
        if (!profesor) {
            console.error(`Profesor con ID ${profesorId} no encontrado.`);
            return;
        }
        
        // Verificamos si la función de cálculo existe
        let cargaDetallada = {};
        let carga = null;
        
        try {
            if (typeof calcularCargaProfesoresDetallada === 'function') {
                cargaDetallada = calcularCargaProfesoresDetallada();
                carga = cargaDetallada[profesorId];
                console.log(`Carga del profesor obtenida:`, carga);
            } else {
                console.warn("Función calcularCargaProfesoresDetallada no disponible, usando información directa del profesor");
                // Creamos una carga simplificada basada en los datos del profesor
            }
        } catch (error) {
            console.error("Error al calcular la carga del profesor:", error);
        }
        
        // Si no pudimos obtener la carga, vamos a crear una básica con la información disponible
        if (!carga) {
            carga = {
                clases: 0,
                asesoriaNormal: 0,
                asesoriaEvaluacion: 0,
                investigacion: profesor.horasInvestigacionSemanal || 0,
                proyectosInst: profesor.horasProyectosInstSemanal || 0,
                proyectosExt: profesor.horasProyectosExtSemanal || 0,
                materialDidactico: profesor.horasMaterialDidacticoSemanal || 0,
                capacitacion: (profesor.horasCapacitacionSemestral || 0) / 16, // Asumimos 16 semanas
                administrativas: profesor.horasAdministrativas || 0,
                cursosVirtuales: profesor.cursosVirtuales || 0,
                asesoriasVirtuales: profesor.horasAsesoriasVirtuales || 0,
                trabajoEnCasa: profesor.horasTrabajoEnCasa || 0
            };
            
            // Calcular las horas de clase basadas en las materias asignadas
            if (profesor.materiasQueDicta && Array.isArray(profesor.materiasQueDicta)) {
                let horasClase = 0;
                profesor.materiasQueDicta.forEach(materiaId => {
                    const materia = estado.materias.find(m => m.id === materiaId);
                    if (materia && materia.horasSemana) {
                        horasClase += Number(materia.horasSemana);
                    }
                });
                carga.clases = horasClase;
            }
        }
        
        // Datos básicos del profesor
        nombreDocenteInput.value = profesor.nombre || '';
        idDocenteInput.value = profesor.codigo || '';
        
        // Tipo de contrato y horas
        let tipoContratoTexto = "Tiempo Completo";
        let horasContrato = 40;
        
        switch(profesor.tipoContrato) {
            case 'tiempoCompleto': 
                tipoContratoTexto = "Tiempo Completo"; 
                horasContrato = 40;
                break;
            case 'medioTiempo': 
                tipoContratoTexto = "Medio Tiempo"; 
                horasContrato = 20;
                break;
            case 'ocasional':
                tipoContratoTexto = "Ocasional"; 
                horasContrato = 20;
                break;
            case 'porHoras':
                tipoContratoTexto = "Catedrático"; 
                horasContrato = 12;
                break;
        }
        
        tipoContratoInput.value = tipoContratoTexto;
        horasContratoSemanalInput.value = horasContrato;
        
        // Periodo académico
        periodoAcademicoInput.value = estado.configuracion?.periodoAcademico || 'Actual';
        
        // Distribución de horas
        if (carga) {
            // Convertir los valores string a números antes de asignarlos
            horasInputs.docencia_directa.value = parseFloat(carga.clases) || 0;
            horasInputs.investigacion_externa.value = parseFloat(carga.proyectosExt) || 0;
            horasInputs.investigacion_interna.value = parseFloat(carga.investigacion) || 0;
            horasInputs.creacion_material.value = parseFloat(carga.materialDidactico) || 0;
            horasInputs.capacitacion.value = parseFloat(carga.capacitacion) || 0;
            horasInputs.cargo_administrativo.value = parseFloat(carga.administrativas) || 0;
            horasInputs.cursos_virtuales.value = parseFloat(carga.cursosVirtuales) || 0;
            horasInputs.asesorias_virtuales.value = parseFloat(carga.asesoriasVirtuales) || 0;
            horasInputs.asesorias_presenciales.value = parseFloat(carga.asesoriaNormal) || 0;
            horasInputs.evaluacion_diferencial.value = parseFloat(carga.asesoriaEvaluacion) || 0;
            horasInputs.trabajo_casa.value = parseFloat(carga.trabajoEnCasa) || 0;
            
            // Asegurar que no aparezca "NaN" en los campos si falta algún valor
            Object.values(horasInputs).forEach(input => {
                if (isNaN(input.value)) {
                    input.value = 0;
                }
            });
            
            // Generar automáticamente la vista previa
            generarCarta();
        } else {
            Object.values(horasInputs).forEach(input => input.value = 0);
        }
    }
    
    // Función para generar la carta
    function generarCarta() {
        console.log("Generando carta...");
        
        // Validaciones básicas
        if (!selectorProfesorCarta.value || !nombreDocenteInput.value.trim() || !idDocenteInput.value.trim()) {
            mostrarNotificacion('Error', 'Por favor, seleccione un docente.', 'error');
            return;
        }
        
        // Llenar datos de la carta
        const nombreInst = nombreInstitucionInput.value.trim();
        cartaInstitucion.textContent = nombreInst.toUpperCase();
        cartaInstitucionInline.forEach(span => span.textContent = nombreInst);
        
        const tipoContratoVal = tipoContratoInput.value;
        cartaTipoContrato.textContent = tipoContratoVal;
        cartaTipoContratoInline.forEach(span => span.textContent = tipoContratoVal);
        
        const horasContratoNum = parseInt(horasContratoSemanalInput.value);
        cartaHorasContrato.textContent = horasContratoNum;
        
        const hoy = new Date();
        const opcionesFecha = { year: 'numeric', month: 'long', day: 'numeric' };
        cartaLugarFecha.textContent = `Lugar y Fecha: Medellín, ${hoy.toLocaleDateString('es-ES', opcionesFecha)}`;
        
        cartaPeriodo.textContent = periodoAcademicoInput.value;
        cartaNombreDocente.textContent = nombreDocenteInput.value;
        cartaIdDocente.textContent = idDocenteInput.value;
        firmaNombreDocente.textContent = nombreDocenteInput.value;
        firmaIdDocente.textContent = idDocenteInput.value;
        
        // Llenar lista de horas y calcular total asignado
        listaHorasUl.innerHTML = '';
        let totalHorasAsignadasCalculadas = 0;
        
        for (const key in horasInputs) {
            const horasInput = horasInputs[key].value.trim();
            const horas = parseFloat(horasInput) || 0;
            if (horas > 0) {
                const li = document.createElement('li');
                li.textContent = `${etiquetasHoras[key]}: ${horas} horas`;
                li.setAttribute('contenteditable', 'true'); // Hacer cada elemento de la lista editable
                listaHorasUl.appendChild(li);
                totalHorasAsignadasCalculadas += horas;
            }
        }
        totalHorasAsignadasSpan.textContent = totalHorasAsignadasCalculadas;
        
        // Calcular y mostrar horas extras
        const horasExtrasCalculadas = totalHorasAsignadasCalculadas - horasContratoNum;
        
        if (horasExtrasCalculadas > 0) {
            cartaHorasExtras.textContent = horasExtrasCalculadas;
            parrafoHorasExtras.style.display = 'block'; // Mostrar párrafo
        } else {
            parrafoHorasExtras.style.display = 'none'; // Ocultar si no hay extras
        }
        
        // Mostrar la carta
        cartaPreview.classList.remove('hidden');
        cartaPreview.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Exportar carta a PDF
    function exportarCartaPDF() {
        if (!selectorProfesorCarta.value) {
            mostrarNotificacion('Error', 'Por favor, seleccione un docente primero.', 'error');
            return;
        }
        
        if (cartaPreview.classList.contains('hidden')) {
            generarCarta(); // Generar la carta si no está visible
        }
        
        try {
            mostrarCargando(true);
            setTimeout(() => {
                try {
                    const { jsPDF } = window.jspdf;
                    const doc = new jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'letter'
                    });
                    
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const margin = 20;
                    let y = margin;
                    
                    // Nombre de la institución
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(16);
                    doc.text(nombreInstitucionInput.value.toUpperCase(), pageWidth / 2, y, { align: 'center' });
                    y += 10;
                    
                    // Título de la carta
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.text('CARTA DE COMPROMISO DOCENTE', pageWidth / 2, y, { align: 'center' });
                    y += 8;
                    
                    // Fecha
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(11);
                    const hoy = new Date();
                    const opcionesFecha = { year: 'numeric', month: 'long', day: 'numeric' };
                    doc.text(`Lugar y Fecha: Medellín, ${hoy.toLocaleDateString('es-ES', opcionesFecha)}`, pageWidth / 2, y, { align: 'center' });
                    y += 15;
                    
                    // Cuerpo del documento
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(12);
                    // Usar los valores posiblemente editados desde la vista previa
                    const nombreDoc = cartaNombreDocente.textContent || nombreDocenteInput.value;
                    const idDoc = cartaIdDocente.textContent || idDocenteInput.value;
                    const institucion = document.querySelector('.cartaInstitucionInline').textContent || nombreInstitucionInput.value;
                    const periodo = cartaPeriodo.textContent || periodoAcademicoInput.value;
                    const tipoContrato = cartaTipoContrato.textContent || tipoContratoInput.value;
                    const horasContrato = cartaHorasContrato.textContent || horasContratoSemanalInput.value;
                    
                    const textoInicial = `Yo, ${nombreDoc}, identificado con código ${idDoc}, en calidad de docente de la ${institucion} para el período académico ${periodo}, con contrato de tipo ${tipoContrato} (${horasContrato} horas semanales), me comprometo a cumplir con las siguientes actividades académicas:`;
                    doc.text(textoInicial, margin, y, { maxWidth: pageWidth - margin * 2, align: 'justify' });
                    
                    // Calcular el alto del texto
                    const alturaTextoInicial = doc.getTextDimensions(textoInicial, {
                        maxWidth: pageWidth - margin * 2
                    }).h;
                    y += alturaTextoInicial + 10;
                    
                    // Lista de horas
                    doc.setFont('helvetica', 'bold');
                    doc.text('Distribución de horas de trabajo semanal:', margin, y);
                    y += 8;
                    
                    doc.setFont('helvetica', 'normal');
                    let totalHoras = 0;
                    
                    for (const key in horasInputs) {
                        const horas = parseInt(horasInputs[key].value) || 0;
                        if (horas > 0) {
                            doc.text(`• ${etiquetasHoras[key]}: ${horas} horas`, margin + 5, y);
                            y += 7;
                            totalHoras += horas;
                            
                            // Añadir página si es necesario
                            if (y > pageHeight - margin * 2) {
                                doc.addPage();
                                y = margin;
                            }
                        }
                    }
                    
                    y += 5;
                    
                    // Total de horas
                    const textoTotal = `El total de horas semanales asignadas es de ${totalHoras} horas, que se distribuyen según el detalle anterior. Me comprometo a cumplir con los horarios y actividades establecidas por la institución.`;
                    doc.text(textoTotal, margin, y, { maxWidth: pageWidth - margin * 2, align: 'justify' });
                    
                    const alturaTextoTotal = doc.getTextDimensions(textoTotal, {
                        maxWidth: pageWidth - margin * 2
                    }).h;
                    y += alturaTextoTotal + 10;
                    
                    // Horas extras (si aplica)
                    const horasExtras = totalHoras - parseInt(horasContratoSemanalInput.value);
                    if (horasExtras > 0) {
                        doc.setTextColor(255, 0, 0);
                        doc.setFont('helvetica', 'bold');
                        const textoExtras = `Este compromiso incluye ${horasExtras} horas adicionales a mi carga contractual, que serán reconocidas según las políticas de la institución para horas extras.`;
                        doc.text(textoExtras, margin, y, { maxWidth: pageWidth - margin * 2, align: 'justify' });
                        
                        const alturaTextoExtras = doc.getTextDimensions(textoExtras, {
                            maxWidth: pageWidth - margin * 2
                        }).h;
                        y += alturaTextoExtras + 10;
                        
                        doc.setTextColor(0, 0, 0);
                    }
                    
                    // Texto de cierre
                    doc.setFont('helvetica', 'normal');
                    doc.text('Comprendo que el incumplimiento de este compromiso tendrá consecuencias según los reglamentos institucionales.', 
                        margin, y, { maxWidth: pageWidth - margin * 2, align: 'justify' });
                    y += 25;
                    
                    // Firma
                    doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
                    y += 5;
                    doc.setFont('helvetica', 'bold');
                    doc.text(nombreDocenteInput.value, pageWidth / 2, y, { align: 'center' });
                    y += 5;
                    doc.setFont('helvetica', 'normal');
                    doc.text(idDocenteInput.value, pageWidth / 2, y, { align: 'center' });
                    y += 5;
                    doc.text(`Docente ${tipoContratoInput.value}`, pageWidth / 2, y, { align: 'center' });
                    
                    // Pie de página
                    y = pageHeight - 20;
                    doc.setFontSize(9);
                    doc.text('Este documento es una carta de compromiso formal entre el docente y la institución.', 
                        pageWidth / 2, y, { align: 'center' });
                    
                    // Guardar archivo
                    const nombreArchivo = `Carta_Compromiso_${nombreDocenteInput.value.replace(/\s+/g, '_')}_${idDocenteInput.value}.pdf`;
                    doc.save(nombreArchivo);
                    
                    mostrarNotificacion('Éxito', 'Carta de compromiso exportada en formato PDF.', 'success');
                } catch (error) {
                    console.error('Error al generar PDF:', error);
                    mostrarNotificacion('Error', `No se pudo generar el PDF: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 200);
        } catch (error) {
            mostrarNotificacion('Error', `Error inesperado: ${error.message}`, 'error');
            mostrarCargando(false);
        }
    }
    
    // Exportar carta a Excel
    function exportarCartaExcel() {
        if (!selectorProfesorCarta.value) {
            mostrarNotificacion('Error', 'Por favor, seleccione un docente primero.', 'error');
            return;
        }
        
        try {
            mostrarCargando(true);
            
            setTimeout(() => {
                try {
                    // Crear workbook de Excel
                    const wb = XLSX.utils.book_new();
                    
                    // Datos básicos - Usar los valores de la vista previa si han sido editados
                    const nombreDoc = cartaNombreDocente.textContent || nombreDocenteInput.value;
                    const idDoc = cartaIdDocente.textContent || idDocenteInput.value;
                    const institucion = document.querySelector('.cartaInstitucionInline').textContent || nombreInstitucionInput.value;
                    const periodo = cartaPeriodo.textContent || periodoAcademicoInput.value;
                    const tipoContrato = cartaTipoContrato.textContent || tipoContratoInput.value;
                    const horasContrato = cartaHorasContrato.textContent || horasContratoSemanalInput.value;
                    
                    const infoData = [
                        ['CARTA DE COMPROMISO DOCENTE'],
                        [''],
                        ['Institución:', institucion.toUpperCase()],
                        ['Fecha:', new Date().toLocaleDateString('es-ES')],
                        ['Periodo Académico:', periodo],
                        [''],
                        ['INFORMACIÓN DEL DOCENTE'],
                        ['Nombre:', nombreDoc],
                        ['Código/ID:', idDoc],
                        ['Tipo de Contrato:', tipoContrato],
                        ['Horas Contractuales Semanales:', parseInt(horasContrato)],
                        [''],
                        ['DISTRIBUCIÓN DE HORAS DE TRABAJO SEMANAL'],
                    ];
                    
                    // Añadir horas
                    let totalHoras = 0;
                    for (const key in horasInputs) {
                        const horas = parseInt(horasInputs[key].value) || 0;
                        if (horas > 0) {
                            infoData.push([etiquetasHoras[key], horas]);
                            totalHoras += horas;
                        }
                    }
                    
                    infoData.push(['']);
                    infoData.push(['Total Horas Asignadas:', totalHoras]);
                    
                    // Horas extras (si aplica)
                    const horasExtras = totalHoras - parseInt(horasContratoSemanalInput.value);
                    if (horasExtras > 0) {
                        infoData.push(['Horas Extras:', horasExtras]);
                    }
                    
                    infoData.push(['']);
                    infoData.push(['Este documento representa el compromiso formal del docente con la institución para el periodo académico indicado.']);
                    
                    // Crear hoja de trabajo
                    const ws = XLSX.utils.aoa_to_sheet(infoData);
                    
                    // Configurar anchos de columna
                    ws['!cols'] = [
                        { wch: 35 }, // Primera columna
                        { wch: 30 }  // Segunda columna
                    ];
                    
                    // Añadir la hoja al libro
                    XLSX.utils.book_append_sheet(wb, ws, 'Carta Compromiso');
                    
                    // Crear hoja de materias
                    const profesor = estado.profesores.find(p => p.id === selectorProfesorCarta.value);
                    if (profesor && profesor.materiasQueDicta && profesor.materiasQueDicta.length > 0) {
                        const materiasData = [
                            ['MATERIAS ASIGNADAS'],
                            [''],
                            ['Código', 'Nombre', 'Semestre', 'Tipo Aula', 'Horas Semanales', 'Clon Virtual', 'Parte de carga']
                        ];
                        
                        profesor.materiasQueDicta.forEach(materiaId => {
                            const materia = estado.materias.find(m => m.id === materiaId);
                            if (materia) {
                                const materiasDetalle = profesor.materiasDetalle && profesor.materiasDetalle[materiaId];
                                const esVirtual = materiasDetalle && materiasDetalle.esVirtual;
                                const parteCarga = materiasDetalle && materiasDetalle.partOfLoad !== false;
                                
                                materiasData.push([
                                    materia.codigo || 'N/A',
                                    materia.nombre || 'N/A',
                                    materia.semestre || 'N/A',
                                    materia.tipoAula || 'Normal',
                                    materia.horasSemana || 0,
                                    esVirtual ? 'Sí' : 'No',
                                    parteCarga ? 'Sí' : 'No'
                                ]);
                            }
                        });
                        
                        const wsMaterias = XLSX.utils.aoa_to_sheet(materiasData);
                        wsMaterias['!cols'] = [
                            { wch: 15 }, // Código
                            { wch: 30 }, // Nombre
                            { wch: 10 }, // Semestre
                            { wch: 15 }, // Tipo Aula
                            { wch: 15 }, // Horas
                            { wch: 12 }, // Virtual
                            { wch: 12 }  // Parte Carga
                        ];
                        XLSX.utils.book_append_sheet(wb, wsMaterias, 'Materias');
                    }
                    
                    // Guardar archivo
                    const nombreArchivo = `Carta_Compromiso_${nombreDocenteInput.value.replace(/\s+/g, '_')}_${idDocenteInput.value}.xlsx`;
                    XLSX.writeFile(wb, nombreArchivo);
                    
                    mostrarNotificacion('Éxito', 'Carta de compromiso exportada en formato Excel.', 'success');
                } catch (error) {
                    console.error('Error al generar Excel:', error);
                    mostrarNotificacion('Error', `No se pudo generar el archivo Excel: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 200);
        } catch (error) {
            mostrarNotificacion('Error', `Error inesperado: ${error.message}`, 'error');
            mostrarCargando(false);
        }
    }
    
    // Event listeners
    selectorProfesorCarta.addEventListener('change', function() {
        if (this.value) {
            console.log(`Seleccionado profesor con ID: ${this.value}`);
            mostrarNotificacion('Información', 'Cargando datos del docente...', 'info');
            
            // Pequeño timeout para permitir que la UI se actualice
            setTimeout(() => {
                try {
                    cargarDatosProfesor(this.value);
                    // Vista previa se generará automáticamente en cargarDatosProfesor
                    mostrarNotificacion('Éxito', 'Datos del docente cargados correctamente', 'success');
                } catch (error) {
                    console.error("Error al cargar datos del profesor:", error);
                    mostrarNotificacion('Error', 'No se pudieron cargar los datos del docente. Consulta la consola para más detalles.', 'error');
                    
                    // Intentar recuperarse del error
                    Object.values(horasInputs).forEach(input => input.value = 0);
                }
            }, 100);
        } else {
            Object.values(horasInputs).forEach(input => input.value = 0);
            nombreDocenteInput.value = '';
            idDocenteInput.value = '';
            cartaPreview.classList.add('hidden');
        }
    });
    
    // Botón para refrescar la lista de profesores
    const refreshProfesorListaBtn = document.getElementById('refreshProfesorListaBtn');
    if (refreshProfesorListaBtn) {
        refreshProfesorListaBtn.addEventListener('click', function() {
            mostrarNotificacion('Información', 'Actualizando lista de profesores...', 'info');
            
            try {
                cargarProfesores();
                mostrarNotificacion('Éxito', 'Lista de profesores actualizada', 'success');
            } catch (error) {
                console.error('Error al refrescar lista de profesores:', error);
                mostrarNotificacion('Error', 'No se pudo actualizar la lista de profesores', 'error');
            }
        });
    }
    
    generarCartaBtn.addEventListener('click', generarCarta);
    exportarCartaPDFBtn.addEventListener('click', exportarCartaPDF);
    exportarCartaExcelBtn.addEventListener('click', exportarCartaExcel);
    
    // Agregar listeners para actualizar los datos mientras se editan
    Object.values(horasInputs).forEach(input => {
        input.addEventListener('change', function() {
            if (selectorProfesorCarta.value) {
                generarCarta();
            }
        });
    });
    
    // Inicializar - Esto se ejecutará cuando existan datos de profesores cargados
    function inicializarModulo() {
        console.log("[Reporte-Docente] Inicializando módulo...");
        
        if (estado && estado.profesores && estado.profesores.length > 0) {
            cargarProfesores();
            
            // Establecer valores por defecto
            nombreInstitucionInput.value = estado.configuracion?.nombreInstitucion || 'Universidad';
            periodoAcademicoInput.value = estado.configuracion?.periodoAcademico || 'Actual';
            
            console.log("[Reporte-Docente] Módulo inicializado correctamente.");
            console.log(`[Reporte-Docente] ${estado.profesores.length} profesores disponibles.`);
            return true;
        } else {
            console.error("[Reporte-Docente] No hay datos de profesores disponibles.");
            return false;
        }
    }
    
    // Intentar inicializar, o registrar para inicialización posterior
    if (!inicializarModulo()) {
        if (window.addEventListener) {
            console.log("[Reporte-Docente] Esperando carga de datos para inicializar...");
            window.addEventListener('datosDisponibles', inicializarModulo, { once: true });
            
            // También intentar inicializar después de un tiempo por si acaso
            setTimeout(() => {
                if (estado && estado.profesores && estado.profesores.length > 0 && selectorProfesorCarta.options.length <= 1) {
                    console.log("[Reporte-Docente] Intentando inicialización retrasada...");
                    inicializarModulo();
                }
            }, 2000);
        }
    }
});
