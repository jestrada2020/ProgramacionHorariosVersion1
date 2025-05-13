// Exportar a Excel
        function exportarHorariosExcel() {
            const tipoVista = document.getElementById('filtroVistaHorario').value;
            const elementoId = document.getElementById('elementoSeleccionado').value;
            const { horario: datosHorario, titulo } = obtenerDatosParaVista(tipoVista, elementoId);

            if (!datosHorario || Object.keys(datosHorario).length === 0) {
                 mostrarNotificacion('Error', 'No hay datos en la vista actual para exportar a Excel.', 'error');
                 return;
            }

            mostrarCargando(true);
            setTimeout(() => { // Dar tiempo a que se muestre el loading
                try {
                    const wb = XLSX.utils.book_new();
                    const diasHabiles = obtenerDiasHabiles();
                    const horasPorDia = calcularHorasPorDia();
                    const data = [];

                    // Añadir título como primera fila (fusionada)
                    const titleRow = [titulo];
                    data.push(titleRow);

                    // Cabecera de la tabla
                    const header = ['Hora', ...diasHabiles];
                    data.push(header);

                    // Datos del horario
                    horasPorDia.forEach(hora => {
                        const row = [hora];
                        diasHabiles.forEach(dia => {
                            const sesion = datosHorario[dia]?.[hora];
                            // Formato de celda: Materia (Profesor) [Aula] {Semestre}
                            let cellText = '';
                            if (sesion) {
                                cellText = `${sesion.materia}\n(${sesion.profesor})\n[${sesion.aula}]`;
                                if (sesion.semestre && tipoVista !== 'semestre') { // Añadir semestre si no es vista por semestre
                                    cellText += `\n{S${sesion.semestre}}`;
                                }
                            }
                            row.push(cellText);
                        });
                        data.push(row);
                    });

                    const ws = XLSX.utils.aoa_to_sheet(data);

                    // Fusionar celdas para el título
                    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: diasHabiles.length } }];

                    // Estilo básico para saltos de línea y ajuste
                    const cellStyle = { alignment: { wrapText: true, vertical: 'top' } };
                    Object.keys(ws).forEach(cellRef => {
                        if (cellRef[0] === '!') return; // Saltar metadatos
                        ws[cellRef].s = cellStyle;
                    });


                    const cols = header.map((_, i) => ({ wch: i === 0 ? 8 : 25 })); // Ajustar ancho
                    ws['!cols'] = cols;

                    XLSX.utils.book_append_sheet(wb, ws, 'Horario'); // Nombre de la hoja
                    XLSX.writeFile(wb, `Horario_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
                    mostrarNotificacion('Éxito', 'Horarios exportados a Excel.', 'success');
                } catch (error) {
                    console.error('Error exportando a Excel:', error);
                    mostrarNotificacion('Error', `No se pudo exportar a Excel: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 100); // Pequeño delay
        }

        // Exportar a PDF
        function exportarHorariosPDF() {
            const tipoVista = document.getElementById('filtroVistaHorario').value;
            const elementoId = document.getElementById('elementoSeleccionado').value;
            const { horario: datosHorario, titulo } = obtenerDatosParaVista(tipoVista, elementoId);
            const pageSize = document.getElementById('pdfPageSize').value; // letter, legal, a4
            const orientation = document.getElementById('pdfOrientation').value; // landscape, portrait

            if (!datosHorario || Object.keys(datosHorario).length === 0) {
                 mostrarNotificacion('Error', 'No hay datos en la vista actual para exportar a PDF.', 'error');
                 return;
            }

            mostrarCargando(true);
            setTimeout(() => {
                try {
                    const { jsPDF } = window.jspdf;
                    // Definir tamaño Oficio (aproximado, puede variar)
                    const oficioWidthMM = 216;
                    const oficioHeightMM = 330; // Ajustado para 'legal' típico
                    const format = pageSize === 'legal' ? [oficioWidthMM, oficioHeightMM] : pageSize; // Usar dimensiones para oficio/legal

                    const doc = new jsPDF({ orientation: orientation, unit: 'mm', format: format });
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const margin = 10;
                    const usableWidth = pageWidth - 2 * margin;
                    let y = margin;

                    doc.setFontSize(16);
                    doc.text(titulo, pageWidth / 2, y, { align: 'center' });
                    y += 8;
                    doc.setFontSize(10);
                    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - margin, y, { align: 'right' });
                    y += 10;

                    const diasHabiles = obtenerDiasHabiles();
                    const horasPorDia = calcularHorasPorDia();
                    const numCols = diasHabiles.length + 1;
                    const colWidth = usableWidth / numCols;
                    const headerHeight = orientation === 'landscape' ? 6 : 7; // Más compacto en horizontal
                    const rowHeight = orientation === 'landscape' ? 9 : 11; // Altura para ~3 líneas pequeñas

                    // --- Cabecera de la tabla ---
                    doc.setFontSize(orientation === 'landscape' ? 7 : 8);
                    doc.setFont(undefined, 'bold');
                    doc.setFillColor(230, 230, 230);
                    doc.rect(margin, y, usableWidth, headerHeight, 'F');
                    doc.rect(margin, y, colWidth, headerHeight, 'S'); // Celda Hora
                    doc.text('Hora', margin + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                    diasHabiles.forEach((dia, i) => {
                        const x = margin + colWidth * (i + 1);
                        doc.rect(x, y, colWidth, headerHeight, 'S');
                        doc.text(dia, x + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                    });
                    y += headerHeight;
                    doc.setFont(undefined, 'normal');
                    // --- Fin Cabecera ---

                    // --- Filas de datos ---
                    horasPorDia.forEach(hora => {
                        if (y + rowHeight > pageHeight - margin) { // Salto de página si no cabe
                            doc.addPage();
                            y = margin;
                            // Repetir cabecera en nueva página
                            doc.setFontSize(orientation === 'landscape' ? 7 : 8); doc.setFont(undefined, 'bold'); doc.setFillColor(230, 230, 230);
                            doc.rect(margin, y, usableWidth, headerHeight, 'F');
                            doc.rect(margin, y, colWidth, headerHeight, 'S');
                            doc.text('Hora', margin + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' });
                            diasHabiles.forEach((dia, i) => { const x = margin + colWidth * (i + 1); doc.rect(x, y, colWidth, headerHeight, 'S'); doc.text(dia, x + colWidth / 2, y + headerHeight / 2 + (orientation === 'landscape' ? 1.5 : 2), { align: 'center' }); });
                            y += headerHeight; doc.setFont(undefined, 'normal');
                        }

                        // Celda de Hora
                        doc.setFillColor(245, 245, 245);
                        doc.rect(margin, y, colWidth, rowHeight, 'FD'); // Con borde
                        doc.setFontSize(orientation === 'landscape' ? 7 : 8); doc.setFont(undefined, 'bold');
                        doc.text(hora, margin + colWidth / 2, y + rowHeight / 2 + (orientation === 'landscape' ? 1 : 1.5), { align: 'center' });
                        doc.setFont(undefined, 'normal');

                        // Celdas de Sesiones
                        diasHabiles.forEach((dia, i) => {
                            const x = margin + colWidth * (i + 1);
                            doc.rect(x, y, colWidth, rowHeight, 'S'); // Solo borde
                            const sesion = datosHorario[dia]?.[hora];
                            if (sesion) {
                                doc.setFontSize(orientation === 'landscape' ? 5 : 6); // Tamaño muy pequeño
                                let textLines = [ sesion.materia, `(${sesion.profesor})`, `[${sesion.aula}]` ];
                                if (sesion.semestre && tipoVista !== 'semestre') textLines.push(`{S${sesion.semestre}}`);

                                if (sesion.fijado) doc.setTextColor(139, 92, 246); // Morado
                                doc.text(textLines, x + 1, y + (orientation === 'landscape' ? 2 : 2.5), { maxWidth: colWidth - 2 });
                                if (sesion.fijado) doc.setTextColor(0, 0, 0); // Reset color
                            }
                        });
                        y += rowHeight;
                    });

                    // Numeración de páginas
                    const totalPages = doc.internal.getNumberOfPages();
                    for (let i = 1; i <= totalPages; i++) {
                        doc.setPage(i);
                        doc.setFontSize(8);
                        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
                    }

                    doc.save(`Horario_${titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
                    mostrarNotificacion('Éxito', 'Horarios exportados a PDF.', 'success');
                } catch (error) {
                    console.error('Error exportando a PDF:', error);
                    mostrarNotificacion('Error', `No se pudo exportar a PDF: ${error.message}`, 'error');
                } finally {
                    mostrarCargando(false);
                }
            }, 100);
        }