// 1. PRELOAD DATA ENGINE (PARALLEL & FAST)

async function getPrice(itemName) {
    let response = await fetch("?action=get_price&item=" + encodeURIComponent(itemName));
    let price = await response.text();
    return parseFloat(price) || 0;
}

async function preloadPricesOnLoad() {
    // 🚀 FIXED: Comma (,) lagakar dono selectors ko ek sath ek hi rows me merge kar diya
    // Isse index1 par #table-body tr mil jayega aur index2 par #inr-table tr bina crash hue mil jayega
    let rows = document.querySelectorAll("#table-body tr, #inr-table tr");
    
    let pricePromises = Array.from(rows).map(async (row) => {
        // Safe check: category bars ya grand totals ko skip karein taaki loop crash na ho
        if (row.querySelector("th") || row.classList.contains("category-row") || row.classList.contains("grand-total-row")) {
            return;
        }

        let itemNode = row.querySelector(".item");
        let priceInput = row.querySelector(".unit-price");

        if (itemNode && priceInput) {
            let itemName = itemNode.innerText.trim().replace(/\s+/g, ' ');
            let databasePrice = await getPrice(itemName);
            if (databasePrice > 0) {
                // 📝 COMMENT: Input box me sirf shudh floating digits set honge bina kisi text symbol ke
                priceInput.value = databasePrice.toFixed(2);
                priceInput.setAttribute('value', databasePrice.toFixed(2)); // Locked for PDF conversion
            }
        }
    });

    await Promise.all(pricePromises);
}



// 2. INITIALIZATION FLOW (STRICTSEQUENCE)

document.addEventListener("DOMContentLoaded",init);

async function init() {
    // 🔥 CLEAR EVERYTHING ON REFRESH
    localStorage.removeItem("clientName");
    localStorage.removeItem("clientAddress");
    localStorage.removeItem("dateInput");
    localStorage.removeItem("refInput");
    localStorage.removeItem("savedOdSizeRaw");
    localStorage.removeItem("savedOdSize");
    localStorage.removeItem("totalStationsCount");
    localStorage.removeItem("totalBlowersCount");
    localStorage.removeItem("detectedBlowerKw");
    localStorage.removeItem("detectedCarrierType");
    localStorage.removeItem("powerPackCount");
    localStorage.removeItem("zoneCount");

    if (typeof preloadPricesOnLoad === "function") {
        await preloadPricesOnLoad();
    }

    bindEvents();
    
    // 📝 COMMENT: Sabhi values safely parse hone ke baad primary aur secondary mathematical hooks triggers honge
    if (typeof calculate === "function") calculate(); 
    if (typeof fillMiddleRowsCalculation === "function") fillMiddleRowsCalculation();
}


// 3. EVENT BINDING ENGINE (CLEAN & NON-CLASHING SETUP)

function bindEvents() {
    let allNumericInputs = document.querySelectorAll('.station-input, .blower-input, .qty');

    allNumericInputs.forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.which < 48 || event.which > 57) {
                event.preventDefault();
            }
        });

        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    });

    // HAR TYPE PAR SUB-FIELD MATRICES SIMULTANEOUSLY RUN HONGE
    document.querySelectorAll('.station-input, .blower-input, .qty, .unit-price').forEach(input => {
        input.addEventListener('input', () => {
            calculate();
            fillMiddleRowsCalculation();
        });
    });

    // Dynamic database live prices elements updater on input type
    document.querySelectorAll('.station-input, .blower-input, .qty').forEach(input => {
        input.addEventListener('input', async function() {
            let row = this.closest("tr");
            let itemNode = row.querySelector(".item");
            let priceInput = row.querySelector(".unit-price");

            if (itemNode && priceInput) {
                let cleanVal = priceInput.value.replace(/[^0-9.]/g, '');
                if (parseFloat(cleanVal) > 0) {
                    return; 
                }

                let itemName = itemNode.innerText.trim().replace(/\s+/g, ' ');
                let databasePrice = await getPrice(itemName); 
                priceInput.value = databasePrice;
            }
            calculate();
            fillMiddleRowsCalculation();
        });
    });    

    // OD INPUT SCANNER
    let odSizeInput = document.getElementById('odSizeInput');
    if (odSizeInput) {
        let savedRaw = localStorage.getItem('savedOdSizeRaw');
        if (savedRaw) odSizeInput.value = savedRaw;

        odSizeInput.addEventListener('input', () => {
            if (typeof filterTable === "function") filterTable();
            calculate();
            fillMiddleRowsCalculation();
        });
    }

    const clientNameInput = document.getElementById("clientName");
    const clientAddressInput = document.getElementById("clientAddress");
    const dateInputField = document.getElementById("dateInput");
    const refInputField = document.getElementById("refInput");

    [clientNameInput, clientAddressInput, dateInputField, refInputField]
    .forEach(input => {
        if (!input) return;
        input.addEventListener("input", function () {
            localStorage.setItem(input.id, input.value);
            if (typeof renderBox === "function") renderBox();
        });
    });
}
// ================= SERIAL NUMBERING =================
function updateSerialNumbers(tableSelector) {
    let serial = 0;
    document.querySelectorAll(tableSelector + " tr").forEach(row => {
        let rowText = row.innerText.trim().toLowerCase();
        let isHeader = row.querySelector("th") || row.classList.contains("category-row") || row.classList.contains("grand-total-row") || rowText === "";
        if (isHeader) {
            serial = 0;
            return;
        }
        let serialCell = row.querySelector(".s-no");
        if (serialCell) {
            serial++;
            serialCell.innerText = serial;
        }
    });
}

// ================= CURRENCY FORMATTER =================
function formatCurrency(amount, row) {
    if (row.closest('#inr-table')) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', currencyDisplay: 'symbol' }).format(amount);
    }
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', currencyDisplay: 'symbol' }).format(amount);
}

// ================= MAIN CALCULATION ENGINE (SINGLE ITERATION) =================
function calculate() {
    let totalStations = 0;
    let totalBlowers = 0;

    document.querySelectorAll('.qty').forEach(input => { totalStations += parseInt(input.value) || 0; });
    document.querySelectorAll('.qty').forEach(input => { totalBlowers += parseInt(input.value) || 0; });
    localStorage.setItem('totalStationsCount', totalStations);
    localStorage.setItem('totalBlowersCount', totalBlowers);

    let odSizeInput = document.getElementById('odSizeInput');
    if (odSizeInput) {
        let text = odSizeInput.value.trim();
        localStorage.setItem('savedOdSizeRaw', text);
        let clean = "";
        if (text !== "") {
            let match = text.match(/([A-Za-z]{2}\d+)/) || text.match(/(\d+)/);
            if (match) { clean = match[1] || match[0]; }
        }
        localStorage.setItem('savedOdSize', clean);
    }

    let detectedBlowerKw = "";
    let detectedCarrierType = "";
    let powerPackQty = 0;
    let totalZoneQty = 0;
    
    // 🚀 STRICT RESET ON EACH ACTIVE RE-RUN (Into 2 / Value doubling logic block)
    let euroGrandTotal = 0;
    let inrGrandTotal = 0;

    let rows = document.querySelectorAll("#table-body tr, #inr-table tr");
    
    rows.forEach(row => {
        if (row.querySelector("th") || row.classList.contains("category-row") || row.classList.contains("grand-total-row")) {
            return;
        }

        let cells = row.querySelectorAll("td");
        let qtyInput = row.querySelector(".qty, .station-input, .blower-input");
        let priceInput = row.querySelector(".unit-price");
        let amountCell = row.querySelector(".amount-cell, [class*='amount']");

        if (qtyInput && priceInput && amountCell) {
            let qty = parseFloat(qtyInput.value) || 0;
            let rawPriceText = priceInput.value || priceInput.innerText || "0";
            let cleanPrice = parseFloat(rawPriceText.replace(/[^0-9.-]/g, '')) || 0;

            let rowTotal = qty * cleanPrice;

            if (qty === 0) {
                amountCell.innerText = row.closest('#inr-table') ? "₹0.00" : "€0.00";
            } else {
                amountCell.innerText = formatCurrency(rowTotal, row);
            }

            // 🚀 DYNAMIC COMPONENT LOOKUP MATRIX (100% SECURE FROM CONSOLE ERRORS)
            
            // 🟢 OLD JS FORMAT WITH STRICT QUANTITY SAFETY LOCK (BINA TEXT BIGADE)
            
            if (qty > 0 && cells.length >= 2) {
                let materialText = cells[1] ? cells[1].innerText.toLowerCase() : "";

                
                // 1. BLOWER TRACKING (Strictly matching via your old text keywords logic)
                if (materialText.includes("blower")) {
                    if (materialText.includes("2.2")) { detectedBlowerKw = "2.2 kW"; }
                    else if (materialText.includes("4")) { detectedBlowerKw = "4 kW"; }
                    else if (materialText.includes("5.5")) { detectedBlowerKw = "5.5 kW"; }
                }

                // 2. CARRIER TRACKING (Strictly matching via your old text keywords logic)
                if (materialText.includes("carrier")) {
                    if (materialText.includes("230")) { detectedCarrierType = "230 x 120mm"; }
                    else if (materialText.includes("315")) { detectedCarrierType = "315 x 120mm"; }
                    else if (materialText.includes("330")) { detectedCarrierType = "330 x 120mm"; }
                    else if (materialText.includes("400")) { detectedCarrierType = "400 x 120mm"; }
                }

                if (materialText.includes("power pack")) { powerPackQty = qty; }
                if (materialText.includes("zone")) { totalZoneQty += qty; }
            }


            if (row.closest('#inr-table')) {
                inrGrandTotal += rowTotal;
            } else {
                euroGrandTotal += rowTotal;
            }
        }
    });

    let inputAmtField = document.getElementById("input-amount");
    let totalAmtField = document.getElementById("total-amount");
    let descValue = 0;

    if (inputAmtField && totalAmtField) {
        let rawVal = inputAmtField.value.replace(/[^0-9.]/g, '');
        descValue = parseFloat(rawVal) || 0;

        // Live typing ke waqt bina format bigade dono jagah symbol lock rahega
        if (descValue > 0) {
            if (document.activeElement !== inputAmtField) {
                inputAmtField.value = "₹ " + descValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            totalAmtField.value = "₹ " + descValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            // Agar box khali ho jaye to automatic zero layout show hoga
            totalAmtField.value = "₹ 0.00";
        }
                // ✅ JS KE ZARIYE INPUT BOX KE TEXT KO BOLD KARNA:
        if (totalAmtField) {
            totalAmtField.style.fontWeight = "bold";
        }

    }

    // DISPLAY VALUES DIRECT OUTSIDE THE ITERATION
    let exWorksGermanyCell = document.getElementById("exWorksGermany");
    if (exWorksGermanyCell) {
        exWorksGermanyCell.innerText = new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(euroGrandTotal);
    }

    localStorage.setItem('detectedBlowerKw', detectedBlowerKw);
    localStorage.setItem('detectedCarrierType', detectedCarrierType);
    localStorage.setItem('powerPackCount', powerPackQty);
    localStorage.setItem('zoneCount', totalZoneQty);

    // 🚀 INDEX 2 LIVE SUM ENGINE: Loop ke bahar direct elements calculate kiya
    // =========================================================================
    // 🟢 FIXED INDEX 2 ENGINE: SAME AS ESTIMATE AMOUNT IN INR STYLE
    // =========================================================================
    let totalRowCell = document.getElementById("total-page-2");
    if (totalRowCell) {
        totalRowCell.innerText = "₹ " + inrGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        let packingInput = document.getElementById("PackingTransportationCharges");
        let packingCharges = 0;

        // Same Excel Trigger Event Listeners (Sirf tabhi format hoga jab focusout hoga)
        if (packingInput && !packingInput.hasAttribute('data-excel-bound')) {
            packingInput.setAttribute('data-excel-bound', 'true');
            
            packingInput.addEventListener('focusout', function() {
                if (this.value.trim() !== "") calculate();
            });

            packingInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') { this.blur(); }
            });
        }

        if (packingInput) {
            let cleanPackingStr = packingInput.value.replace(/[^0-9.]/g, '');
            if (cleanPackingStr !== "" && !isNaN(cleanPackingStr)) {
                packingCharges = parseFloat(cleanPackingStr);
            }
            
            // Symbol lock format strictly inside input only on focusout
            if (packingCharges > 0 && document.activeElement !== packingInput) {
                packingInput.value = "₹ " + packingCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }

        let hospitalRow = Array.from(document.querySelectorAll("#inr-table tr")).find(r => r.innerText.toUpperCase().includes("F.O.R. HOSPITAL"));
        if (hospitalRow) {
            let hospitalCell = hospitalRow.cells[hospitalRow.cells.length - 1];
            if (hospitalCell) {
                hospitalCell.innerText = "₹ " + (inrGrandTotal + packingCharges).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        }
    }


    if (typeof renderSummary === "function") renderSummary();
    if (typeof renderBox === "function") renderBox();
    
    updateSerialNumbers("#table-body");
    if (document.querySelector("#inr-table")) updateSerialNumbers("#inr-table");
}


// 4. MIDDLE ROWS INDEPENDENT ENGINE (EXCHANGE RATE & TAXES COMPILATION)

document.addEventListener("input", fillMiddleRowsCalculation);
document.addEventListener("change", fillMiddleRowsCalculation);

function fillMiddleRowsCalculation() {
    // 📝 SUDHAAR: Loop shuru hone se pehle math variable ko hamesha ZERO par reset kiya
    // Taaki function trigger hone par values baar-baar aapas me multiply hoke into 2 (*2) na ho.
    let totalMainEuro = 0;

    document.querySelectorAll("#table-body tr").forEach(row => {
        if (row.querySelector("th") || row.classList.contains("category-row") || row.classList.contains("grand-total-row")) return;

        let qtyInput = row.querySelector(".qty, .station-input, .blower-input");
        let priceInput = row.querySelector(".unit-price");

        if (qtyInput && priceInput) {
            let qty = parseInt(qtyInput.value) || 0;
            let rawPriceText = priceInput.value || priceInput.innerText || "0";
            let price = parseFloat(rawPriceText.replace(/[^0-9.-]/g, '')) || 0;
                        
            let rowAmount = qty * price;
            totalMainEuro += rowAmount;
        }
    });

    // Fallback if loop returns zero initially
    if (totalMainEuro === 0) {
        let exWorksCell = document.getElementById("exWorksGermany");
        if (exWorksCell) {
            let textVal = exWorksCell.innerText.replace(/[€\s,]/g, '');
            totalMainEuro = parseFloat(textVal) || 0;
        }
    }

    
    // 🟢 STRICT EXCEL INLINE ENGINE (ONLY FOR ESTIMATE AMOUNT IN INR ROW)
    
    let testimateCell = document.getElementById("testimateInr");
    let userRateInput = testimateCell ? testimateCell.querySelector("input") : null;
    let euroToInrRate = 0; 

    if (userRateInput && !userRateInput.hasAttribute('data-excel-bound')) {
        userRateInput.setAttribute('data-excel-bound', 'true');
        
        userRateInput.addEventListener('focusout', function() {
            if (this.value.trim() !== "") {
                fillMiddleRowsCalculation();
            }
        });

        userRateInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                this.blur();
            }
        });

        testimateCell.addEventListener('dblclick', function() {
            let input = this.querySelector("input");
            if (input) {
                input.style.display = "inline-block";
                input.focus();
                fillMiddleRowsCalculation();
            }
        });
    }

    if (userRateInput) {
        userRateInput.setAttribute('value', userRateInput.value); 
        let cleanRate = userRateInput.value.replace(/[^0-9.]/g, '');
        if (cleanRate !== "" && !isNaN(cleanRate)) {
            euroToInrRate = parseFloat(cleanRate);
        }
    }

    let packingCharges = totalMainEuro * 0.04; 
    let freightCharges = totalMainEuro * 0.10; 
    let cifTotalEuro = totalMainEuro + packingCharges + freightCharges; 
    let amountInInr = cifTotalEuro * euroToInrRate; 
    let cdchaCharges = amountInInr * 0.11; 
    let finalTotalInr = amountInInr + cdchaCharges;

    let exWorksGermanyCell = document.getElementById("exWorksGermany");
    if (exWorksGermanyCell) exWorksGermanyCell.innerText = "€ " + totalMainEuro.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let packingCell = document.getElementById("packingCharges");
    if (packingCell) packingCell.innerText = "€ " + packingCharges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let freightCell = document.getElementById("freightInsurance");
    if (freightCell) freightCell.innerText = "€ " + freightCharges.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let cifCell = document.getElementById("cifIndianSeaPort");
    if (cifCell) cifCell.innerText = "€ " + cifTotalEuro.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 🚀 STRICT EXCEL BEHAVIOUR IN SINGLE CELL ONLY
    if (testimateCell && userRateInput) {
        if (document.activeElement !== userRateInput && userRateInput.value.trim() !== "") {
            userRateInput.style.display = "none"; 
            let formattedInr = "₹ " + amountInInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
            testimateCell.innerHTML = ''; 
            testimateCell.appendChild(userRateInput); 
            testimateCell.appendChild(document.createTextNode(formattedInr));
            testimateCell.style.textAlign = "right";
            testimateCell.style.fontWeight = "bold";
        }
    }

    let cdchaCell = document.getElementById("cdchaCharges");
    if (cdchaCell) cdchaCell.innerText = "₹ " + cdchaCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let finalTotalCell = document.getElementById("finalTotalAmount");
    if (finalTotalCell) {
        finalTotalCell.innerText = "₹ " + finalTotalInr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        finalTotalCell.style.setProperty("text-align", "right", "important");
        finalTotalCell.style.setProperty("font-weight", "bold", "important");
        finalTotalCell.style.setProperty("background-color", "transparent", "important"); 
    }

    
}

// 5. DASHBOARD SUMMARY DROP-DOWNS RENDER ENGINE

function renderSummary() {
    let stations = localStorage.getItem('totalStationsCount') || 0;
    let blowers = localStorage.getItem('totalBlowersCount') || 0;
    let odSize = (localStorage.getItem('savedOdSize') || '').toUpperCase();
    let zones = localStorage.getItem('zoneCount') || 0;
    let selectedBlower = localStorage.getItem('detectedBlowerKw') || "";
    let selectedCarrier = localStorage.getItem('detectedCarrierType') || "";
    let powerPackQty = parseInt(localStorage.getItem('powerPackCount')) || 0;

    setText('#odSize', odSize);
    setText('#totalStationsCount', stations);
    setText('#blowersCount', blowers);
    setText('#stationsDisplay', stations);
    setText('#blowerscount', blowers);
    setText('#zoneDisplay', zones);

    document.querySelectorAll('.odDisplay').forEach(el => {
        el.innerHTML = odSize ? ` NW160 ` : "";
    });

    // 🚀 SUDHAAR: Space-proof & case-insensitive dropdown selection logic for 2.2 kW Blower
    let blowerDropdown = document.getElementById("blower-row") || document.getElementById("blower-input");
    if (blowerDropdown && selectedBlower) { 
        blowerDropdown.value = selectedBlower; 
        
        if (blowerDropdown.selectedIndex === -1 || blowerDropdown.value !== selectedBlower) {
            let cleanSelectedBlower = selectedBlower.replace(/\s+/g, '').toLowerCase();
            Array.from(blowerDropdown.options).forEach(opt => {
                let cleanOptValue = opt.value.replace(/\s+/g, '').toLowerCase();
                let cleanOptText = opt.text.replace(/\s+/g, '').toLowerCase();
                if (cleanOptValue.includes(cleanSelectedBlower) || cleanOptText.includes(cleanSelectedBlower)) {
                    opt.selected = true;
                }
            });
        }
    }

    // Space-proof selection algorithm for Carrier dimensions drop-down dropdown
    let carrierDropdown = document.getElementById("carrier-dimension");
    if (carrierDropdown && selectedCarrier) { 
        carrierDropdown.value = selectedCarrier; 

        if (carrierDropdown.selectedIndex === -1 || carrierDropdown.value !== selectedCarrier) {
            let targetString = selectedCarrier.replace(/\s+/g, '').toLowerCase();
            Array.from(carrierDropdown.options).forEach(opt => {
                if (opt.value.replace(/\s+/g, '').toLowerCase() === targetString || opt.text.replace(/\s+/g, '').toLowerCase().includes(targetString)) {
                    opt.selected = true;
                }
            });
        }
    }

    let verbDisplay = document.getElementById("verbDisplay");
    if (verbDisplay) { verbDisplay.innerText = parseInt(blowers) > 1 ? "There are" : "There is"; }

    let ppVerb = document.getElementById("powerPackVerb");
    let ppCount = document.getElementById("powerPackCount");
    let ppText = document.getElementById("powerPackText");

    if (ppCount) {
        if (powerPackQty > 1) {
            if (ppVerb) ppVerb.innerText = "There are";
            ppCount.innerText = powerPackQty;
            if (ppText) ppText.innerText = "power packs ";
        } else if (powerPackQty === 1) {
            if (ppVerb) ppVerb.innerText = "There is";
            ppCount.innerText = "1";
            if (ppText) ppText.innerText = "power pack ";
        } else {
            if (ppVerb) ppVerb.innerText = "There is";
            ppCount.innerText = "0";
            if (ppText) ppText.innerText = "power pack ";
        }
    }
}


// 6. CLIENT INFO BOX AND PERSISTENT STORAGE SYNC

function renderBox() {
    const infoBox = document.getElementById("infoBox");
    if (!infoBox) return;

    const clientName = localStorage.getItem("clientName") || "";
    const clientAddress = localStorage.getItem("clientAddress") || "";
    const dateInput = localStorage.getItem("dateInput") || "";
    const refInput = localStorage.getItem("refInput") || "";

    infoBox.innerHTML = "";

    function addLine(text) {
        const p = document.createElement("p");
        p.textContent = text;
        infoBox.appendChild(p);
    }

    if (clientName.trim() !== "") addLine(clientName);
    if (clientAddress.trim() !== "") addLine(clientAddress);

    addLine("Techno-Commercial Offer");

    if (dateInput.trim() !== "") {
        // Formatted Date: DD/MM/YYYY (en-GB)
        addLine(new Date(dateInput).toLocaleDateString("en-GB"));
    }

    if (refInput.trim() !== "") {
        addLine("Ref# " + refInput);
    }
}

function setText(selector, value) {
    let el = document.querySelector(selector);
    if (el) el.innerHTML = value;
}

function filterTable() {
    let input = document.getElementById("odSizeInput");
    if (!input) return;
}

//  [FIXED DOMContentLoaded]: Backend par data wipeout hone se rokne ke liye condition lagayi hai
window.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("clientName") !== null || localStorage.getItem("clientAddress") !== null) {
        if (document.getElementById("clientName"))
            document.getElementById("clientName").value = localStorage.getItem("clientName") || "";
        if (document.getElementById("clientAddress"))
            document.getElementById("clientAddress").value = localStorage.getItem("clientAddress") || "";
        if (document.getElementById("dateInput"))
            document.getElementById("dateInput").value = localStorage.getItem("dateInput") || "";
        if (document.getElementById("refInput")) 
            document.getElementById("refInput").value = localStorage.getItem("refInput") || "";
        
        // Input set hone ke baad live page par infoBox render karein
        renderBox();
    }
});

window.addEventListener('storage', function () {
    if (typeof renderSummary === "function") {
        renderSummary();
    }
    renderBox(); // Storage change hone par infoBox bhi update ho
});

