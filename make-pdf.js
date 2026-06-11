const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

// आपकी सही नेटवर्क IP और फोल्डर का नाम
const serverUrl = "http://192.168.1.47/Offer_Templets/"; 

async function createSinglePdf() {
  const browser = await puppeteer.launch({ headless: "new" });
  const mergedPdf = await PDFDocument.create();

  const page = await browser.newPage();
  
  try {
    console.log("Processing live filled HTML page via Server URL...");
    
    // 👉 यहाँ ध्यान दें: यह PHP द्वारा बनाई गई temp_preview.html को असली URL की तरह खोलेगा
    await page.goto(`${serverUrl}/temp_preview.html`, { 
        waitUntil: 'networkidle0', // जब तक सारी CSS और इमेजेस लोड न हो जाएँ, रुकें
        timeout: 60000 
    });
    
    // PDF buffer generate करें (Header/Footer के साथ)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,      // इससे बैकग्राउंड कलर्स और डिज़ाइन आएँगे
      preferCSSPageSize: true,    // 🔥 FIX: Tells Puppeteer to respect your HTML/CSS 210mm size layout
      displayHeaderFooter: false, // Set to true if you explicitly want to use the native templates below
      headerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; margin-top: 5px;">
            <img src="${serverUrl}/img/header.png" style="width: 90%; max-height: 40px; object-fit: contain;" />
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; margin-bottom: 5px; padding: 0 20px;">
            <img src="${serverUrl}/img/footer.png" style="width: 90%; max-height: 40px; object-fit: contain;" />
            <div style="color: #888; font-size: 9px; text-align: right; margin-top: 5px; width: 90%;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      `,
      // 🔥 FIX: Overriding hardcoded margins with 0px so it perfectly aligns with your frontend container system
      margin: { 
        top: '0px', 
        bottom: '0px', 
        left: '0px', 
        right: '0px' 
      }
    });

    const tempDoc = await PDFDocument.load(pdfBuffer);
    const copiedPages = await mergedPdf.copyPages(tempDoc, tempDoc.getPageIndices());
    copiedPages.forEach((p) => mergedPdf.addPage(p));
    
  } catch (pageError) {
    console.error(`Error processing PDF generation:`, pageError);
  } finally {
    await page.close();
  }

  const finalPdfBytes = await mergedPdf.save();
  fs.writeFileSync('Combined_Website.pdf', finalPdfBytes);
  
  await browser.close();
  console.log("SUCCESS: PDF generated perfectly with precise alignment!");
}

createSinglePdf().catch(err => {
  console.error("Global Script Error:", err);
  process.exit(1);
});
