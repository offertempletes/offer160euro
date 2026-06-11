<?php
// लाइव Aiven MySQL डेटाबेस कनेक्शन
$host = '://aivencloud.com';
$db   = 'defaultdb';
$user = 'avnadmin';
$pass = 'AVNS_ZjA0vSNjm1SuDz-jHys'; // यहाँ स्क्रीन पर आँख वाले आइकॉन पर क्लिक करके अपना पासवर्ड देखकर लिखें
$port = '25466';

try {
    $conn = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

    // लाइव कीमत (Price List) लाने का सुरक्षित लॉजिक (PDO Prepared Statement)
    if (isset($_GET['action']) && $_GET['action'] == 'get_price') {
        $item = $_GET['item'];
        
        $stmt = $conn->prepare("SELECT `PRICE_LIST` FROM costing_sheet WHERE `PRODUCT_NAME` = :item LIMIT 1");
        $stmt->execute([':item' => $item]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo $row ? $row['PRICE_LIST'] : "0";
        exit;
    }


// पीडीएफ (PDF) जनरेट करने का बैकएंड लॉजिक
if (isset($_POST['generate_pdf'])) {
    $fullHtml = $_POST['html_content'];
    file_put_contents('temp_preview.html', $fullHtml);

    $nodePath = '"C:\\Program Files\\nodejs\\node.exe"'; 
    $scriptPath = 'make-pdf.js';
    exec("$nodePath $scriptPath 2>&1", $output, $return_var);

    if(file_exists('temp_preview.html')) unlink('temp_preview.html');

    $file = 'Combined_Website.pdf';
    if ($return_var === 0 && file_exists($file)) {
        ob_clean();
        header('Content-Description: File Transfer');
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="'.basename($file).'"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        exit;
    } else {
        header("HTTP/1.1 500 Internal Server Error");
        echo "Node Error Output:\n" . implode("\n", $output);
        exit;
    }
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <title>SNG Dashboard</title>
    <link rel="stylesheet" href="globe.css"> 
    <style>
        .dashboard-header { background: #ffb600; padding: 15px 20px; color: black; font-weight: bold; font-size: 22px; font-family: Arial, sans-serif; }
        .grid { display: flex; gap: 12px; padding: 15px 20px; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-family: Arial, sans-serif; }
        .card { background: #ffb600; padding: 12px 24px; border-radius: 6px; text-decoration: none; color: black; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.2s; }
        .card:hover { background: #ffb600; }
        .card.active-btn { background: #d48800; color: white; }
    </style>
</head>
<body>

    <div class="dashboard-header">SNG</div>

    <div class="grid">
        <?php $current_form = isset($_GET['form']) ? $_GET['form'] : ''; ?>
        <a href="?form=nw160_euro" class="card <?php echo ($current_form == 'nw160_euro') ? 'active-btn' : ''; ?>">NW160 Euro</a>
        <a href="?form=nw110_euro" class="card <?php echo ($current_form == 'nw110_euro') ? 'active-btn' : ''; ?>">NW110 Euro</a>
        <a href="?form=nw160_inr" class="card <?php echo ($current_form == 'nw160_inr') ? 'active-btn' : ''; ?>">NW160 INR</a>
        <a href="?form=nw110_inr" class="card <?php echo ($current_form == 'nw110_inr') ? 'active-btn' : ''; ?>">NW110 INR</a>
    </div>

    <div class="form-content-wrapper">
        
        <?php if ($current_form == 'nw160_euro'): ?>
            <!-- NW160 Euro का पूरा मल्टी-पेज सेट -->
            <div id="step-1" class="step-page"><?php include('front.html'); ?></div>   
            <div id="step-2" class="step-page"><?php include('summary.html'); ?></div>
            <div id="step-3" class="step-page"><?php include('index.html'); ?></div>
            <div id="step-4" class="step-page"><?php include('index2.html'); ?></div>
            <div id="step-5" class="step-page"><?php include('tnc.html'); ?></div>
            <div id="step-6" class="step-page">
                <?php include('assignment.html'); ?>
                <div class="btn-wrapper" style="text-align: center; margin-top: 20px;">
                    <button id="final-download-btn" style="padding: 15px 30px; background-color: green; color: white; border: none; cursor: pointer; font-size: 18px; border-radius: 5px; font-weight: bold;">
                        Generate & Download PDF
                    </button>
                </div>
            </div>

        <?php elseif ($current_form == 'nw110_euro'): ?>
            <h2>NW110 Euro Form (Coming Soon...)</h2>

        <?php elseif ($current_form == 'nw160_inr'): ?>
            <h2>NW160 INR Form (Coming Soon...)</h2>

        <?php elseif ($current_form == 'nw110_inr'): ?>
            <h2>NW110 INR Form (Coming Soon...)</h2>

        <?php else: ?>
            <h2 style="text-align: center; color: #888;">Select Any Form Above</h2>
        <?php endif; ?>

    </div>

    <!-- 2. आपकी मुख्य कैलकुलेशन फाइल जो इनपुट्स और डेटाबेस को संभालती है -->
    <script src="script.js"></script>

    <!-- 3. आपका सुधरा हुआ केवल PDF डाउनलोड वाला स्क्रिप्ट लॉजिक -->
    <!-- आपके पेज के आखिरी हिस्से में जहाँ स्क्रिप्ट शुरू होती है -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const downloadBtn = document.getElementById('final-download-btn');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault(); // डिफ़ॉल्ट फॉर्म सबमिशन को रोकना
            
            const btn = this;
            btn.innerText = "Generating PDF... Please Wait...";
            btn.style.backgroundColor = "gray";
            btn.disabled = true;

            // नियम 1: सभी लाइव इनपुट वैल्यूज को HTML में सिंक करना
            document.querySelectorAll('input:not([type="checkbox"]):not([type="radio"])').forEach(input => {
                input.setAttribute('value', input.value);
            });
            document.querySelectorAll('textarea').forEach(textarea => {
                textarea.innerHTML = textarea.value;
            });
            document.querySelectorAll('select').forEach(select => {
                select.querySelectorAll('option').forEach(opt => opt.removeAttribute('selected'));
                if (select.options[select.selectedIndex]) {
                    select.options[select.selectedIndex].setAttribute('selected', 'selected');
                }
            });
            document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(checkbox => {
                if (checkbox.checked) {
                    checkbox.setAttribute('checked', 'checked');
                    checkbox.defaultChecked = true;
                } else {
                    checkbox.removeAttribute('checked');
                    checkbox.defaultChecked = false;
                }
            });

            // नियम 2: क्लीन DOM क्लोन तैयार करना
            
            let tempDoc = document.documentElement.cloneNode(true);
            let tempBody = tempDoc.querySelector('body');

            // डैशबोर्ड हेडर, बटन्स ग्रिड और अनचाहे एलिमेंट्स को हटाना
            let elementsToRemove = tempBody.querySelectorAll(
                '#final-download-btn, .pagination, .step-page-navigation, .no-print, button, .btn, .btn-wrapper, .dashboard-header, .grid'
            );
            elementsToRemove.forEach(el => el.remove());

            tempBody.querySelectorAll('*').forEach(el => {
                if (el.innerText && (el.innerText.includes("Generating PDF") || el.innerText.includes("Generate & Download PDF"))) {
                    el.remove();
                }
            });

            // नियम 3: 0 क्वांटिटी वाली रो हटाना
            let targetRows = tempBody.querySelectorAll("#table-body tr, #inr-table tr");
            targetRows.forEach(row => {
                if (row.querySelector("th") || row.classList.contains("category-row") || row.classList.contains("grand-total-row")) {
                    return;
                }
                let qtyInput = row.querySelector(".qty, .station-input, .blower-input");
                if (qtyInput) {
                    let qtyValue = parseInt(qtyInput.value) || 0; // .getAttribute की जगह .value का उपयोग
                    if (qtyValue === 0) {
                        row.remove();
                    }
                }
            });

            // नियम 4: खाली कैटेगरीज हटाना
            let categories = Array.from(tempBody.querySelectorAll(".category-row"));
            for (let i = categories.length - 1; i >= 0; i--) {
                let currentCat = categories[i];
                let nextSibling = currentCat.nextElementSibling;
                if (!nextSibling || nextSibling.classList.contains("category-row") || nextSibling.classList.contains("grand-total-row") || nextSibling.innerText.toLowerCase().includes("total as above")) {
                    currentCat.remove();
                }
            }

            // नियम 5: सीरियल नंबर री-इंडेक्स करना
            let serial = 0;
            tempBody.querySelectorAll("#table-body tr, #inr-table tr").forEach(row => {
                let isHeader = row.querySelector("th") || row.classList.contains("category-row") || row.innerText.trim() === "";
                if (isHeader) { serial = 0; return; }
                if (row.classList.contains("grand-total-row") || row.innerText.toLowerCase().includes("total as above")) return;
                let serialCell = row.querySelector(".s-no");
                if (serialCell) { serial++; serialCell.innerText = serial; }
            });

            // नियम 6: A4 और फुटर सेटिंग्स (FIXED SYNTAX)
            // नियम 6: फ़िक्स कंटेनर, हेडर और फुटर लॉजिक (CLEAN METHOD)
            const allContainers = tempBody.querySelectorAll('.container');
            allContainers.forEach((container, index) => {
                // 1. Header ko dhoondh kar container mein sabse upar bhejein (Prepend)
                let headerEl = container.querySelector('.header');
                if (headerEl) {
                    container.prepend(headerEl); 
                }

                // 2. Footer ko dhoondh kar container mein sabse neeche bhejein (Append)
                let footerEl = container.querySelector('.footer');
                if (footerEl) {
                    container.appendChild(footerEl); 
                }
                container.style.setProperty("margin", "0 auto", "important");
                
                // 4. Har page ke baad automatic clean break
                if (index < allContainers.length - 1) {
                    container.style.setProperty("page-break-after", "always", "important");
                    container.style.setProperty("break-after", "page", "important");
                }
            });

            // नियम 7: AJAX Fetch के ज़रिए डेटा सबमिट करना
            const fullHtmlMarkup = tempDoc.outerHTML;
            const formData = new URLSearchParams();
            formData.append('generate_pdf', '1');
            formData.append('html_content', fullHtmlMarkup);

            fetch('', { // खाली स्ट्रिंग का मतलब है इसी मौजूदा PHP फाइल पर रिक्वेस्ट भेजना
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },   
                body: formData.toString()
            })
            .then(response => {
                if (response.ok) return response.blob();
                throw new Error('Not getting response from server।');
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "Combined_Website.pdf";
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(error => {
                console.error('Error generating PDF:', error);
                alert('Erro PDF not Genereted: ' + error.message);
            })
            .finally(() => {
                btn.innerText = "Generate & Download PDF";
                btn.style.backgroundColor = "green";
                btn.disabled = false;
            });
        });
    }
});
</script>
