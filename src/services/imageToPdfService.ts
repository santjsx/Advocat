import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { v4 as uuidv4 } from 'uuid';

export interface ImageToPdfItem {
    id: string;
    uri: string;
    rotation: number; // 0, 90, 180, 270
    fileName?: string;
    fileSize?: number;
}

export interface PdfConversionOptions {
    title: string;
    pageSize: 'A4' | 'LEGAL';
    pageOrientation: 'PORTRAIT' | 'LANDSCAPE';
    marginStyle: 'COURT' | 'COMPACT' | 'ZERO';
    includePageNumbers: boolean;
    includeHeader: boolean;
    headerText?: string;
    annexureLabel?: string;
    courtFilingStandard?: boolean;
}

export interface GeneratedPdfResult {
    uri: string;
    fileName: string;
    fileSize: number;
    pageCount: number;
    createdAt: string;
}

/**
 * Converts a list of local images into a court-grade, high-resolution PDF.
 */
export async function convertImagesToPdf(
    items: ImageToPdfItem[],
    options: PdfConversionOptions,
    onProgress?: (progress: { stage: string; current: number; total: number; percent: number }) => void
): Promise<GeneratedPdfResult> {
    if (!items || items.length === 0) {
        throw new Error('Please select at least one image to convert.');
    }

    const total = items.length;
    const isLandscape = options.pageOrientation === 'LANDSCAPE';
    const isLegal = options.pageSize === 'LEGAL';

    // Page dimensions in CSS points (A4: 595.28 x 841.89 pt, Legal: 612 x 1008 pt)
    const pageWidth = isLandscape ? (isLegal ? '1008pt' : '842pt') : (isLegal ? '612pt' : '595pt');
    const pageHeight = isLandscape ? (isLegal ? '612pt' : '595pt') : (isLegal ? '1008pt' : '842pt');

    // Margins
    let pagePadding = '28pt 32pt';
    if (options.marginStyle === 'COMPACT') pagePadding = '14pt 16pt';
    if (options.marginStyle === 'ZERO') pagePadding = '0';

    onProgress?.({ stage: 'Reading and processing images...', current: 0, total, percent: 10 });

    // Build HTML pages
    const pagesHtml: string[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        onProgress?.({
            stage: `Processing image ${i + 1} of ${total}...`,
            current: i + 1,
            total,
            percent: Math.round(10 + ((i + 1) / total) * 60),
        });

        let base64Data = '';
        try {
            base64Data = await FileSystem.readAsStringAsync(item.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
        } catch (readErr) {
            console.warn(`[ImageToPdf] Failed to read base64 for image ${i + 1}, fallback to raw URI`, readErr);
        }

        const imgSrc = base64Data
            ? `data:image/jpeg;base64,${base64Data}`
            : item.uri;

        const rotationDeg = item.rotation % 360;
        const transformStyle = rotationDeg !== 0 ? `transform: rotate(${rotationDeg}deg);` : '';

        const isLastPage = i === items.length - 1;
        const pageBreak = isLastPage ? '' : 'page-break-after: always;';

        const headerHtml = options.includeHeader && options.headerText
            ? `<div class="court-header">
                <span class="court-header-title">${escapeHtml(options.headerText)}</span>
                ${options.annexureLabel ? `<span class="annexure-badge">${escapeHtml(options.annexureLabel)}</span>` : ''}
               </div>`
            : (options.annexureLabel
                ? `<div class="court-header" style="justify-content: flex-end;">
                    <span class="annexure-badge">${escapeHtml(options.annexureLabel)}</span>
                   </div>`
                : '');

        const footerHtml = options.includePageNumbers
            ? `<div class="court-footer">
                <span class="footer-left">${escapeHtml(options.title)}</span>
                <span class="footer-page-num">Page ${i + 1} of ${total}</span>
               </div>`
            : '';

        pagesHtml.push(`
            <div class="page-container" style="${pageBreak}">
                ${headerHtml}
                <div class="image-wrapper">
                    <img src="${imgSrc}" class="doc-image" style="${transformStyle}" alt="Page ${i + 1}" />
                </div>
                ${footerHtml}
            </div>
        `);
    }

    onProgress?.({ stage: 'Compiling high-resolution PDF...', current: total, total, percent: 80 });

    const completeHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(options.title)}</title>
        <style>
            @page {
                size: ${options.pageSize === 'LEGAL' ? 'legal' : 'A4'} ${options.pageOrientation.toLowerCase()};
                margin: 0;
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #FFFFFF;
                color: #111827;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .page-container {
                width: ${pageWidth};
                height: ${pageHeight};
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: ${pagePadding};
                position: relative;
                overflow: hidden;
                background-color: #FFFFFF;
            }
            .court-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1.5px solid #D4AF37;
                padding-bottom: 6px;
                margin-bottom: 8px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                color: #1F2937;
            }
            .annexure-badge {
                background-color: #F3F4F6;
                border: 1px solid #9CA3AF;
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: 800;
                font-size: 10px;
                color: #111827;
            }
            .image-wrapper {
                flex: 1;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }
            .doc-image {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: block;
            }
            .court-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #E5E7EB;
                padding-top: 6px;
                margin-top: 8px;
                font-size: 10px;
                color: #6B7280;
                font-weight: 500;
            }
            .footer-page-num {
                font-weight: 700;
                color: #374151;
            }
        </style>
    </head>
    <body>
        ${pagesHtml.join('\n')}
    </body>
    </html>
    `;

    onProgress?.({ stage: 'Rendering court document...', current: total, total, percent: 90 });

    const printResult = await Print.printToFileAsync({
        html: completeHtml,
    });

    // Ensure documents folder exists and copy to clean persistent destination
    const cleanFileName = sanitizeFileName(options.title || 'Advocat_Document') + `_${Date.now()}.pdf`;
    const destDir = `${FileSystem.documentDirectory}generated_pdfs/`;
    
    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    }

    const finalDestUri = `${destDir}${cleanFileName}`;
    await FileSystem.copyAsync({
        from: printResult.uri,
        to: finalDestUri,
    });

    const fileInfo = await FileSystem.getInfoAsync(finalDestUri);
    const fileSize = (fileInfo as any).size || 0;

    onProgress?.({ stage: 'Conversion Complete!', current: total, total, percent: 100 });

    return {
        uri: finalDestUri,
        fileName: cleanFileName,
        fileSize,
        pageCount: total,
        createdAt: new Date().toISOString(),
    };
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
