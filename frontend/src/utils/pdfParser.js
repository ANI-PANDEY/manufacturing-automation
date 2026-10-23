import * as pdfjsLib from 'pdfjs-dist';

// Configure worker URL
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  } catch (e) {
    console.warn('PDF Worker config warning:', e);
  }
}

/**
 * Extracts structured tabular text from a PDF ArrayBuffer
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<Array<Object>>} Parsed product rows
 */
export const extractProductsFromPdf = async (arrayBuffer) => {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const extractedLines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Group text items by vertical position Y
      // We group close Y coordinates (within 4 pixels) to capture the same line
      const linesMap = {};

      textContent.items.forEach((item) => {
        if (!item.str || !item.str.trim()) return;
        const y = Math.round(item.transform[5] / 4) * 4;
        const x = Math.round(item.transform[4]);

        if (!linesMap[y]) linesMap[y] = [];
        linesMap[y].push({ text: item.str.trim(), x });
      });

      // Sort lines top to bottom (higher Y in PDF is higher up on page)
      const sortedY = Object.keys(linesMap)
        .map(Number)
        .sort((a, b) => b - a);

      sortedY.forEach((y) => {
        // Sort items in line from left to right by X coordinate
        const lineItems = linesMap[y].sort((a, b) => a.x - b.x);
        extractedLines.push(lineItems.map((i) => i.text));
      });
    }

    // Now convert lines into structured product rows
    const parsedProducts = [];

    extractedLines.forEach((tokens) => {
      if (!tokens || tokens.length < 2) return;

      const fullLine = tokens.join(' ');

      // Ignore headers / metadata / page numbers
      if (
        /^(page|date|invoice|bill\s+to|ship\s+to|subtotal|total|tax|gstin|pan|sl\.?\s*no|sr\.?\s*no)/i.test(
          fullLine
        )
      ) {
        return;
      }

      // Check for price / rate (look for numbers with or without decimals)
      // Usually rates are at the end or penultimate column
      let foundPrice = null;
      let foundPriceIndex = -1;
      let foundQuantity = null;

      // Scan tokens backwards for price
      for (let i = tokens.length - 1; i >= 0; i--) {
        const rawToken = tokens[i].replace(/[₹,$\s]/g, '');
        const num = parseFloat(rawToken);

        if (!isNaN(num) && num > 0 && foundPrice === null) {
          foundPrice = num;
          foundPriceIndex = i;
        } else if (!isNaN(num) && num > 0 && foundPrice !== null && foundQuantity === null) {
          foundQuantity = num;
        }
      }

      if (foundPrice !== null && foundPriceIndex > 0) {
        // Text before price is typically Product Name & SKU
        const nameTokens = tokens.slice(0, foundPriceIndex);
        let skuCandidate = '';
        let nameCandidate = '';

        // Check if first or second token looks like an SKU (alphanumeric with hyphen or code)
        if (
          nameTokens.length > 1 &&
          /^[A-Z0-9_-]{3,12}$/i.test(nameTokens[0]) &&
          !/^(the|and|for|with)$/i.test(nameTokens[0])
        ) {
          skuCandidate = nameTokens[0];
          nameCandidate = nameTokens.slice(1).join(' ');
        } else if (
          nameTokens.length > 2 &&
          /^[A-Z0-9_-]{3,12}$/i.test(nameTokens[1])
        ) {
          skuCandidate = nameTokens[1];
          nameCandidate = [nameTokens[0], ...nameTokens.slice(2)].join(' ');
        } else {
          nameCandidate = nameTokens.join(' ');
        }

        // Clean name
        nameCandidate = nameCandidate.replace(/^[0-9]+[.\-)]\s*/, '').trim();

        if (nameCandidate.length >= 2) {
          parsedProducts.push({
            productName: nameCandidate,
            sku: skuCandidate,
            unitPrice: foundPrice,
            stockQuantity: foundQuantity || 0,
            unit: detectUnitFromText(fullLine),
            category: 'Finished Goods',
          });
        }
      }
    });

    return parsedProducts;
  } catch (err) {
    console.error('PDF parsing error:', err);
    throw new Error(`Failed to extract products from PDF: ${err.message}`);
  }
};

const detectUnitFromText = (text) => {
  const lower = text.toLowerCase();
  if (/\b(kg|kgs|kilogram)\b/.test(lower)) return 'Kg';
  if (/\b(mtr|meter|meters|m)\b/.test(lower)) return 'Meters';
  if (/\b(ton|metric\s*ton|mt)\b/.test(lower)) return 'Metric Ton';
  if (/\b(strip|strips)\b/.test(lower)) return 'Strips';
  if (/\b(box|boxes)\b/.test(lower)) return 'Boxes';
  if (/\b(roll|rolls)\b/.test(lower)) return 'Rolls';
  if (/\b(liter|liters|ltr|l)\b/.test(lower)) return 'Liters';
  if (/\b(sq\s*ft|sqft)\b/.test(lower)) return 'Sq Ft';
  return 'Pieces';
};
