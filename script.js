document.addEventListener('DOMContentLoaded', () => {
    const convertBtn = document.getElementById('convertBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resultSection = document.getElementById('result-section');

    // Daily Reference Values (DRV) - Taiwan TFDA
    const DRV = {
        calories: 2000,
        protein: 60,
        fat: 60,
        saturatedFat: 18,
        carbs: 300,
        sodium: 2000,
        transFat: null, // No reference value
        sugar: null      // No reference value
    };

    // TFDA Rounding & 0-Labeling Rules
    const applyRules = (value, type) => {
        if (value === null || value === undefined || isNaN(value)) return "0";
        const v = parseFloat(value);

        switch (type) {
            case 'calories':
                // User requested 1 decimal accuracy
                return v <= 4 ? "0" : v.toFixed(1);
            case 'sodium':
                // Sodium <= 5 mg -> 0, usually integer in Taiwan
                return v <= 5 ? "0" : v.toFixed(0);
            case 'protein':
            case 'fat':
            case 'carbs':
            case 'sugar':
                return v <= 0.5 ? "0" : v.toFixed(1);
            case 'saturatedFat':
                return v <= 0.1 ? "0" : v.toFixed(1);
            case 'transFat':
                return v <= 0.3 ? "0" : v.toFixed(1);
            default:
                return v.toFixed(1);
        }
    };

    const calculatePercent = (value, key) => {
        if (DRV[key] === null) return "＊";
        const percent = (value / DRV[key]) * 100;
        return percent.toFixed(1);
    };

    const updateLabel = (data, format, containerId) => {
        const servingSize = parseFloat(document.getElementById('servingSize').value) || 0;
        const servingsPerContainer = parseFloat(document.getElementById('servingsPerContainer').value) || 0;

        // Update top-level info
        const displayServings = document.querySelectorAll(`#${containerId} .display-serving-text`);
        const displayContainers = document.querySelectorAll(`#${containerId} .display-container-text`);
        displayServings.forEach(el => el.textContent = `每一份量 ${servingSize} 公克(或毫升)`);
        displayContainers.forEach(el => el.textContent = `本包裝含 ${servingsPerContainer} 份`);

        const rowsContainer = document.querySelector(`#${containerId} .nutrient-rows`) ||
            document.querySelector(`#${containerId} .nutrient-rows-percent`);
        rowsContainer.innerHTML = '';

        const nutrients = [
            { key: 'calories', label: '熱量', unit: '大卡', bold: true },
            { key: 'protein', label: '蛋白質', unit: '公克', bold: true },
            { key: 'fat', label: '脂肪', unit: '公克', bold: true },
            { key: 'saturatedFat', label: '　飽和脂肪', unit: '公克', bold: false, indent: true },
            { key: 'transFat', label: '　反式脂肪', unit: '公克', bold: false, indent: true },
            { key: 'carbs', label: '碳水化合物', unit: '公克', bold: true },
            { key: 'sugar', label: '　糖', unit: '公克', bold: false, indent: true },
            { key: 'sodium', label: '鈉', unit: '毫克', bold: true }
        ];

        nutrients.forEach(n => {
            const row = document.createElement('div');
            row.className = `label-row ${n.bold ? 'bold' : ''} ${n.indent ? 'indent' : ''}`;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = n.label;

            const val1Span = document.createElement('span');
            val1Span.textContent = `${applyRules(data[n.key].perServing, n.key)} ${n.unit}`;

            const val2Span = document.createElement('span');
            if (format === 1) {
                val2Span.textContent = `${applyRules(data[n.key].per100, n.key)} ${n.unit}`;
            } else {
                const p = calculatePercent(data[n.key].perServing, n.key);
                val2Span.textContent = p === "＊" ? "＊" : `${p} %`;
            }

            row.appendChild(nameSpan);
            row.appendChild(val1Span);
            row.appendChild(val2Span);
            rowsContainer.appendChild(row);
        });
    };

    const calculate = () => {
        const servingSize = parseFloat(document.getElementById('servingSize').value) || 100;
        const basis = document.getElementById('inputBasis').value;

        const inputs = document.querySelectorAll('.nutrient-input');
        const data = {};

        inputs.forEach(input => {
            const key = input.getAttribute('data-key');
            const val = parseFloat(input.value) || 0;

            let perServing, per100;
            if (basis === 'per100') {
                per100 = val;
                perServing = (val * servingSize) / 100;
            } else {
                perServing = val;
                per100 = (val * 100) / servingSize;
            }
            data[key] = { perServing, per100 };
        });

        // Update Both Labels
        updateLabel(data, 1, 'label-format-1');
        updateLabel(data, 2, 'label-format-2');

        // Show result section
        resultSection.style.display = 'block';
        window.scrollTo({
            top: resultSection.offsetTop - 50,
            behavior: 'smooth'
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    convertBtn.addEventListener('click', calculate);

    // Custom Modal Logic
    const resetModal = document.getElementById('reset-modal');
    const confirmResetBtn = document.getElementById('confirmReset');
    const cancelResetBtn = document.getElementById('cancelReset');

    const showModal = () => resetModal.classList.add('active');
    const hideModal = () => resetModal.classList.remove('active');

    resetBtn.addEventListener('click', showModal);
    cancelResetBtn.addEventListener('click', hideModal);

    confirmResetBtn.addEventListener('click', () => {
        // Clear ALL inputs EXCEPT logoUrl
        document.querySelectorAll('input').forEach(input => {
            if (input.id !== 'logoUrl') {
                input.value = '';
            }
        });
        
        // Hide result section
        resultSection.style.display = 'none';
        hideModal();
        
        // Refresh icons if needed
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // Close modal if clicking outside the card
    resetModal.addEventListener('click', (e) => {
        if (e.target === resetModal) hideModal();
    });

    downloadPdfBtn.addEventListener('click', () => {
        const label1 = document.getElementById('label-format-1');
        const label2 = document.getElementById('label-format-2');
        const logoUrl = document.getElementById('logoUrl').value || 'https://www.sgs.com.tw/Content/Images/SGS_Logo.png';
        if (!label1 || !label2) return;

        // Open a new tab
        const reportWindow = window.open('', '_blank');

        // Generate the HTML for the SGS-style report tab
        const html = `
            <!DOCTYPE html>
            <html lang="zh-TW">
            <head>
                <meta charset="UTF-8">
                <title>SGS 安心資訊平台 - 營養標示報表</title>
                <link rel="stylesheet" href="style.css">
                <style>
                    body { 
                        background: #f3f4f6; 
                        margin: 0; 
                        padding: 0; 
                        font-family: 'Inter', 'Noto Sans TC', sans-serif;
                    }
                    .report-page {
                        background: white;
                        margin: 40px auto;
                        padding: 10mm 15mm;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                        width: 210mm; /* A4 size width */
                        min-height: auto !important; /* Allow to shrink vertically */
                        display: flex;
                        flex-direction: column;
                        box-sizing: border-box;
                        position: relative;
                        page-break-after: always;
                    }
                    
                    /* SGS Template Header */
                    .sgs-header {
                        display: flex;
                        justify-content: flex-start;
                        align-items: center;
                        margin-bottom: 25px;
                    }
                    .sgs-logo { height: 60px; }
                    .sgs-platform-name {
                        margin-left: 35px;
                        font-size: 40px; /* Revert to balanced size */
                        font-weight: 700;
                        color: #666;
                        letter-spacing: 2px;
                    }
                    .report-title {
                        font-size: 34px; /* Revert to balanced size */
                        font-weight: 800;
                        color: black;
                        margin-bottom: 20px;
                    }
                    .title-underline {
                        border-bottom: 2px solid #333;
                        width: 100%;
                        margin-bottom: 40px;
                    }
                    
                    /* Label Formatting */
                    .format-tag {
                        text-align: center;
                        font-size: 20px;
                        margin-bottom: 15px;
                        font-weight: 500;
                        color: #444;
                    }
                    .label-container {
                        display: flex;
                        justify-content: center;
                        margin-bottom: 30px;
                    }
                    .nutrition-label {
                        border: 2px solid black !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        min-height: auto !important;
                        display: flex;
                        flex-direction: column;
                        padding: 15px 25px !important;
                        box-sizing: border-box !important;
                        font-family: "PMingLiU", "MingLiU", serif !important;
                        font-weight: 400 !important;
                    }
                    .nutrition-label * { font-weight: 400 !important; }
                    
                    .label-header {
                        font-size: 32px;
                        font-weight: 900 !important;
                        border-bottom: 12px solid black;
                        padding-bottom: 6px;
                        margin-bottom: 8px;
                        text-align: center;
                        letter-spacing: 3px;
                    }

                    .label-row {
                        font-size: 19px; /* Revert to balanced 19px */
                        padding-top: 4px !important;
                        padding-bottom: 2px !important;
                        line-height: 1.3 !important;
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: baseline !important;
                        border-bottom: 1.5px solid black;
                    }
                    .label-row:last-of-type { border-bottom: none; }
                    
                    .label-row span:nth-child(1) { flex: 0 0 40% !important; text-align: left !important; }
                    .label-row span:nth-child(2) { flex: 0 0 30% !important; text-align: right !important; }
                    .label-row span:nth-child(3) { flex: 0 0 30% !important; text-align: right !important; }
                    
                    /* Footer styles */
                    .sgs-footer {
                        margin-top: 40px;
                        display: flex;
                        justify-content: space-between;
                        font-size: 13px;
                        color: #333;
                        padding-top: 15px;
                        border-top: 2px solid #DDD;
                    }
                    .disclaimer { flex-basis: 80%; line-height: 1.6; }
                    .page-number { font-weight: bold; }

                    @media print {
                        body { background: white; padding: 0; margin: 0; }
                        .report-page { 
                            margin: 0;
                            padding: 10mm 15mm;
                            box-shadow: none; 
                            width: 210mm;
                            min-height: auto !important;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- Page 1 -->
                <div class="report-page">
                    <div class="sgs-header">
                        <img src="${logoUrl}" class="sgs-logo" onerror="this.src='https://www.sgs.com.tw/Content/Images/SGS_Logo.png'">
                        <div class="sgs-platform-name">安心資訊平台</div>
                    </div>
                    <div class="report-title">營養標示換算結果</div>
                    <div class="title-underline"></div>
                    
                    <div class="format-tag">(格式一)</div>
                    <div class="label-container">
                        ${label1.outerHTML}
                    </div>
                    
                    <div class="sgs-footer">
                        <div class="disclaimer">*本營養標示換算工具不對產品合法性做判斷，所提供之換算結果與表格僅供參考，請以最新公告法規內容為準。</div>
                        <div class="page-number">Page:1/2</div>
                    </div>
                </div>

                <!-- Page 2 -->
                <div class="report-page">
                    <div class="sgs-header">
                        <img src="${logoUrl}" class="sgs-logo" onerror="this.src='https://www.sgs.com.tw/Content/Images/SGS_Logo.png'">
                        <div class="sgs-platform-name">安心資訊平台</div>
                    </div>
                    <div class="report-title">營養標示換算結果</div>
                    <div class="title-underline"></div>
                    
                    <div class="format-tag">(格式二)</div>
                    <div class="label-container">
                        ${label2.outerHTML}
                    </div>
                    
                    <div class="sgs-footer">
                        <div class="disclaimer">*本營養標示換算工具不對產品合法性做判斷，所提供之換算結果與表格僅供參考，請以最新公告法規內容為準。</div>
                        <div class="page-number">Page:2/2</div>
                    </div>
                </div>
            </body>
            </html>
        `;

        reportWindow.document.write(html);
        reportWindow.document.close();
    });
});
