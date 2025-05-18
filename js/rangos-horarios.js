// Este archivo contiene la lógica para manejar los rangos de horarios de la aplicación

// Definición de los rangos de horarios predefinidos
const RANGOS_PREDEFINIDOS = {
    "6-18": { horaInicio: "06:00", horaFin: "18:00", descripcion: "Jornada completa 6AM-6PM" },
    "7-19": { horaInicio: "07:00", horaFin: "19:00", descripcion: "Jornada completa 7AM-7PM" },
    "6-22": { horaInicio: "06:00", horaFin: "22:00", descripcion: "Jornada extendida 6AM-10PM" },
    "7-22": { horaInicio: "07:00", horaFin: "22:00", descripcion: "Jornada extendida 7AM-10PM" },
    "custom": { descripcion: "Horario personalizado" }
};

// Función para aplicar un rango de horario predefinido
function aplicarRangoHorario(rangoId) {
    if (!RANGOS_PREDEFINIDOS[rangoId]) {
        console.warn(`Rango de horario no reconocido: ${rangoId}`);
        return false;
    }
    
    const rango = RANGOS_PREDEFINIDOS[rangoId];
    
    // Si es personalizado, no modificamos los valores actuales
    if (rangoId === "custom") {
        return true;
    }
    
    // Actualizar campos de la interfaz
    const horaInicio = document.getElementById('horaInicio');
    const horaFin = document.getElementById('horaFin');
    
    if (horaInicio && horaFin) {
        horaInicio.value = rango.horaInicio;
        horaFin.value = rango.horaFin;
        
        // También actualizar el estado global para mantener consistencia
        estado.configuracion.horaInicio = rango.horaInicio;
        estado.configuracion.horaFin = rango.horaFin;
        estado.configuracion.rangoHorario = rangoId;
        
        console.log(`Rango de horario aplicado: ${rangoId} (${rango.horaInicio} - ${rango.horaFin})`);
        return true;
    }
    
    return false;
}

// Función para detectar si un horario personalizado coincide con algún predefinido
function detectarRangoPredefinido(horaInicio, horaFin) {
    for (const [id, rango] of Object.entries(RANGOS_PREDEFINIDOS)) {
        if (id !== 'custom' && rango.horaInicio === horaInicio && rango.horaFin === horaFin) {
            return id;
        }
    }
    return "custom";
}

// Función para validar que la hora de fin sea posterior a la de inicio
function validarRangoHorario(horaInicio, horaFin) {
    try {
        const [hI, mI] = horaInicio.split(':').map(Number);
        const [hF, mF] = horaFin.split(':').map(Number);
        const minutosInicio = hI * 60 + mI;
        const minutosFin = hF * 60 + mF;
        
        return {
            valido: minutosFin > minutosInicio,
            horasTotal: (minutosFin - minutosInicio) / 60
        };
    } catch(e) {
        console.error("Error validando formato de horas:", e);
        return {
            valido: false,
            horasTotal: 0
        };
    }
}

// Función para mostrar información sobre el rango horario actual
function mostrarInfoRangoHorario() {
    const rangoId = estado.configuracion.rangoHorario || "custom";
    const horaInicio = estado.configuracion.horaInicio;
    const horaFin = estado.configuracion.horaFin;
    
    const validacion = validarRangoHorario(horaInicio, horaFin);
    if (!validacion.valido) {
        return `<span class="text-red-600">⚠️ Rango horario inválido</span>`;
    }
    
    const infoRango = RANGOS_PREDEFINIDOS[rangoId] || RANGOS_PREDEFINIDOS.custom;
    const bloques = Math.floor((validacion.horasTotal * 60) / estado.configuracion.duracionBloque);
    
    return `
        <span class="text-blue-600 font-medium">${infoRango.descripcion}</span>
        <span class="text-sm text-gray-600 ml-2">(${horaInicio} - ${horaFin}, ${validacion.horasTotal.toFixed(1)}h, ${bloques} bloques posibles)</span>
    `;
}
