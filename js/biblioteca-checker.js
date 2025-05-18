// Archivo para verificar y garantizar la disponibilidad de bibliotecas
console.log("[Biblioteca-Checker] Iniciando verificación de bibliotecas externas...");

// Verificar que jsPDF esté disponible
function verificarJSPDF() {
    if (!window.jspdf && !window.jsPDF) {
        console.error("[Biblioteca-Checker] jsPDF no está disponible");
        alert("Error: No se ha podido cargar la biblioteca jsPDF necesaria para generar reportes PDF. Intente recargar la página o contacte al administrador del sistema.");
        return false;
    }
    
    console.log("[Biblioteca-Checker] jsPDF disponible:", window.jspdf ? "namespace" : "global");
    
    // Intenta crear una instancia para verificar que funciona correctamente
    try {
        let jsPDFClass;
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDFClass = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDFClass = window.jsPDF;
        } else {
            throw new Error("No se encontró ninguna versión de jsPDF");
        }
        
        const testDoc = new jsPDFClass();
        console.log("[Biblioteca-Checker] jsPDF instancia creada correctamente");
        
        // Verificar si AutoTable está disponible
        if (typeof testDoc.autoTable === 'function') {
            console.log("[Biblioteca-Checker] jsPDF-AutoTable disponible");
        } else {
            console.warn("[Biblioteca-Checker] jsPDF-AutoTable no está disponible");
        }
        
        return true;
    } catch (error) {
        console.error("[Biblioteca-Checker] Error al crear instancia de jsPDF:", error);
        alert(`Error: Problema al inicializar la biblioteca jsPDF: ${error.message}. Los reportes PDF pueden no funcionar correctamente.`);
        return false;
    }
}

// Verificar que SheetJS (XLSX) esté disponible
function verificarXLSX() {
    if (!window.XLSX) {
        console.error("[Biblioteca-Checker] SheetJS (XLSX) no está disponible");
        alert("Error: No se ha podido cargar la biblioteca SheetJS necesaria para generar reportes Excel. Intente recargar la página o contacte al administrador del sistema.");
        return false;
    }
    
    console.log("[Biblioteca-Checker] SheetJS (XLSX) disponible");
    
    // Verificar que las funciones esenciales estén disponibles
    if (typeof window.XLSX.utils.book_new !== 'function' || 
        typeof window.XLSX.utils.aoa_to_sheet !== 'function' ||
        typeof window.XLSX.writeFile !== 'function') {
        
        console.error("[Biblioteca-Checker] Faltan funciones esenciales de SheetJS (XLSX)");
        alert("Error: La biblioteca SheetJS (XLSX) está incompleta. Los reportes Excel pueden no funcionar correctamente.");
        return false;
    }
    
    console.log("[Biblioteca-Checker] Todas las funciones de SheetJS (XLSX) están disponibles");
    return true;
}

// Realizar la verificación al cargar
window.addEventListener('load', function() {
    console.log("[Biblioteca-Checker] Verificando bibliotecas al cargar página...");
    const jspdfOK = verificarJSPDF();
    const xlsxOK = verificarXLSX();
    
    if (jspdfOK && xlsxOK) {
        console.log("[Biblioteca-Checker] Todas las bibliotecas están disponibles y funcionando correctamente");
    } else {
        console.warn("[Biblioteca-Checker] Algunas bibliotecas tienen problemas. Los reportes pueden no funcionar correctamente.");
    }
});
