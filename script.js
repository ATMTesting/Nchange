document.addEventListener('DOMContentLoaded', () => {
    const convertBtn = document.getElementById('convertBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resultSection = document.getElementById('result-section');
    
    // Clear serving inputs on load to ensure empty on Ctrl+F5
    const servingSizeInput = document.getElementById('servingSize');
    const servingsPerContainerInput = document.getElementById('servingsPerContainer');
    if (servingSizeInput) servingSizeInput.value = '';
    if (servingsPerContainerInput) servingsPerContainerInput.value = '';

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
        if (value === null || value === undefined || isNaN(value)) return "0.0";
        const v = parseFloat(value);
        
        // TFDA rules for 0-labeling (not applicable here as user wants 0.0, but keeping logic for future)
        // However, user explicitly requested "0.0" for one-decimal format
        return v.toFixed(1);
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

        const tableContainer = document.getElementById(format === 1 ? 'table-content-1' : 'table-content-2');
        if (!tableContainer) return;
        tableContainer.innerHTML = '';

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

        const table = document.createElement('table');
        table.className = 'nutrition-table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th></th>
            <th>每份</th>
            <th>${format === 1 ? '每 100 公克' : '每日參考值百分比'}</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        nutrients.forEach(n => {
            const tr = document.createElement('tr');
            if (n.indent) tr.className = 'indent';
            
            const nameTd = document.createElement('td');
            nameTd.textContent = n.label;
            
            const val1Td = document.createElement('td');
            const v1Num = applyRules(data[n.key].perServing, n.key);
            val1Td.innerHTML = `<div class="data-wrapper"><span class="v-num">${v1Num}</span><span class="v-unit">${n.unit}</span></div>`;
            
            const val2Td = document.createElement('td');
            if (format === 1) {
                const v2Num = applyRules(data[n.key].per100, n.key);
                val2Td.innerHTML = `<div class="data-wrapper"><span class="v-num">${v2Num}</span><span class="v-unit">${n.unit}</span></div>`;
            } else {
                const p = calculatePercent(data[n.key].perServing, n.key);
                if (p === "＊") {
                    val2Td.innerHTML = `<div style="text-align: center;">＊</div>`;
                } else {
                    const v2Num = parseFloat(p).toFixed(1);
                    val2Td.innerHTML = `<div class="data-wrapper"><span class="v-num">${v2Num}</span><span class="v-unit">%</span></div>`;
                }
            }
            
            tr.appendChild(nameTd);
            tr.appendChild(val1Td);
            tr.appendChild(val2Td);
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        tableContainer.appendChild(table);
    };

    const calculate = () => {
        const servingSizeInputVal = parseFloat(document.getElementById('servingSize').value) || 0;
        const servingsPerContainerVal = parseFloat(document.getElementById('servingsPerContainer').value) || 0;
        
        // --- SGS VALIDATION SPECS START ---
        const totalFatVal = parseFloat(document.querySelector('[data-key="fat"]').value) || 0;
        const satFatVal = parseFloat(document.querySelector('[data-key="saturatedFat"]').value) || 0;
        const transFatVal = parseFloat(document.querySelector('[data-key="transFat"]').value) || 0;
        const carbsVal = parseFloat(document.querySelector('[data-key="carbs"]').value) || 0;
        const sugarVal = parseFloat(document.querySelector('[data-key="sugar"]').value) || 0;

        const errors = [];
        if ((satFatVal + transFatVal) > totalFatVal) {
            errors.push('「<b>飽和脂肪</b>」與「<b>反式脂肪</b>」的總和不可超過「<b>脂肪</b>」');
        }
        if (sugarVal > carbsVal) {
            errors.push('「<b>糖</b>」含量不可超過「<b>碳水化合物</b>」');
        }

        if (errors.length > 0) {
            showValidationModal(errors);
            return;
        }
        // --- SGS VALIDATION SPECS END ---

        const servingSize = servingSizeInputVal || 100;
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

    // Custom Modal Logic - Reset
    const resetModal = document.getElementById('reset-modal');
    const confirmResetBtn = document.getElementById('confirmReset');
    const cancelResetBtn = document.getElementById('cancelReset');

    const showModal = () => resetModal.classList.add('active');
    const hideModal = () => resetModal.classList.remove('active');

    resetBtn.addEventListener('click', showModal);
    cancelResetBtn.addEventListener('click', hideModal);

    confirmResetBtn.addEventListener('click', () => {
        document.querySelectorAll('input').forEach(input => {
            if (input.id !== 'logoUrl') input.value = '';
        });
        resultSection.style.display = 'none';
        hideModal();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // Custom Modal Logic - Validation
    const validationModal = document.getElementById('validation-modal');
    const validationMsgList = document.getElementById('validation-msg-list');
    const closeValidationBtn = document.getElementById('closeValidation');

    const showValidationModal = (msgs) => {
        validationMsgList.innerHTML = msgs.map(m => `<li>${m}</li>`).join('');
        validationModal.classList.add('active');
    };
    const hideValidationModal = () => validationModal.classList.remove('active');

    closeValidationBtn.addEventListener('click', hideValidationModal);

    // Close modals if clicking outside
    [resetModal, validationModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    const getFormattedDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getReportStyles = () => {
        return `
            body { 
                background: #f8fafc; 
                margin: 0; 
                padding: 0; 
                font-family: 'Noto Sans TC', sans-serif;
            }
            .report-page {
                background: white;
                margin: 20px auto;
                padding: 10mm 15mm;
                width: 210mm; 
                min-height: 295mm;
                display: flex;
                flex-direction: column;
                box-sizing: border-box;
                position: relative;
                page-break-after: always;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .sgs-header {
                display: flex;
                justify-content: flex-start;
                align-items: center;
                margin-bottom: 25px;
            }
            .sgs-logo { height: 60px; max-width: 200px; object-fit: contain; }
            .logo-placeholder { font-size: 24px; font-weight: 800; color: #1e5128; border-left: 4px solid #1e5128; padding-left: 15px; }
            .sgs-platform-name {
                margin-left: 35px;
                font-size: 40px;
                font-weight: 900;
                color: #666;
                letter-spacing: 2px;
            }
            .report-title {
                font-size: 34px;
                font-weight: 900;
                color: black;
                margin-bottom: 20px;
            }
            .title-underline {
                border-bottom: 2px solid #333;
                width: 100%;
                margin-bottom: 40px;
            }
            .format-tag {
                text-align: center;
                font-size: 20px;
                margin-bottom: 15px;
                font-weight: 700;
                color: #444;
            }
            .label-container {
                display: flex;
                justify-content: center;
                margin-bottom: 30px;
            }
            .nutrition-label {
                border: 2.5px solid black !important;
                box-shadow: none !important;
                width: 100% !important;
                padding: 15px 25px !important;
                box-sizing: border-box !important;
                font-family: 'Noto Sans TC', sans-serif !important;
            }
            .label-header {
                font-size: 32px;
                font-weight: 900 !important;
                border-bottom: 12px solid black;
                padding-bottom: 6px;
                margin-bottom: 8px;
                text-align: center;
                letter-spacing: 3px;
            }
            .nutrition-table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                margin-top: 5px !important;
            }
            .nutrition-table th, .nutrition-table td {
                padding: 3px 0 !important;
                vertical-align: baseline !important;
                border-bottom: 2px solid black !important;
                font-weight: 700 !important;
            }
            .nutrition-table tr:last-child td { border-bottom: none !important; }
            .nutrition-table td:nth-child(1) { width: 34% !important; text-align: left !important; }
            .nutrition-table td:nth-child(2), .nutrition-table td:nth-child(3) { width: 33% !important; }
            .data-wrapper { display: flex !important; justify-content: center !important; align-items: baseline !important; width: 100% !important; }
            .v-num { width: 4.5em !important; text-align: right !important; padding-right: 0.1rem !important; }
            .v-unit { width: 3.5em !important; text-align: left !important; padding-left: 0.1rem !important; }
            .nutrition-table thead th { text-align: center !important; border-bottom: 3px solid black !important; font-weight: 900 !important; }
            .indent td:nth-child(1) { padding-left: 18px !important; }
            .sgs-footer {
                margin-top: auto;
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                color: #555;
                padding-top: 15px;
                border-top: 2px solid #EEE;
                font-weight: 500;
            }
            .disclaimer { flex-basis: 80%; line-height: 1.6; }
            .page-number { font-weight: 900; }
            
            @media print {
                body { background: white !important; }
                .report-page { margin: 0; box-shadow: none; border: none; }
                .report-page { page-break-after: always; }
            }
        `;
    };

    const getReportBody = (label1Html, label2Html, logoUrl) => {
        const logoHtml = logoUrl ? `<img src="${logoUrl}" class="sgs-logo">` : `<div class="logo-placeholder">專業換算結果報表</div>`;
        return `
            <div class="report-page">
                <div class="sgs-header">
                    ${logoHtml}
                    <div class="sgs-platform-name">營養標報表</div>
                </div>
                <div class="report-title">數據換算結果清單</div>
                <div class="title-underline"></div>
                <div class="format-tag">【 格式一：每份與每 100 公克 】</div>
                <div class="label-container">${label1Html}</div>
                <div class="sgs-footer">
                    <div class="disclaimer">*本報表由系統自動產出，數據僅供參考。請依政府最新法規公告為準。</div>
                    <div class="page-number">Page:1/2</div>
                </div>
            </div>
            <div class="report-page">
                <div class="sgs-header">
                    ${logoHtml}
                    <div class="sgs-platform-name">營養標報表</div>
                </div>
                <div class="report-title">數據換算結果清單</div>
                <div class="title-underline"></div>
                <div class="format-tag">【 格式二：每份與每日參考值百分比 】</div>
                <div class="label-container">${label2Html}</div>
                <div class="sgs-footer">
                    <div class="disclaimer">*本報表由系統自動產出，數據僅供參考。請依政府最新法規公告為準。</div>
                    <div class="page-number">Page:2/2</div>
                </div>
            </div>
        `;
    };

    const previewReportBtn = document.getElementById('previewReportBtn');
    if (previewReportBtn) {
        previewReportBtn.addEventListener('click', () => {
            const label1 = document.getElementById('label-format-1');
            const label2 = document.getElementById('label-format-2');
            const logoUrlInput = document.getElementById('logoUrl').value || 'https://www.atmlabs.com.tw/wp-content/uploads/idx_logo1A.png';
            if (!label1 || !label2) return;

            const reportWindow = window.open('', '_blank');
            const html = `
                <!DOCTYPE html>
                <html lang="zh-TW">
                <head>
                    <meta charset="UTF-8">
                    <title>${getFormattedDate()}_報表預覽</title>
                    <link rel="preconnect" href="https://fonts.googleapis.com">
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>${getReportStyles()}</style>
                </head>
                <body>
                    ${getReportBody(label1.outerHTML, label2.outerHTML, logoUrlInput)}
                </body>
                </html>
            `;
            reportWindow.document.write(html);
            reportWindow.document.close();
        });
    }
});
