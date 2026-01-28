let config = {};

window.onload = async () => {
    config = await fetch('config.json').then(res => res.json());
    createForm();
};

function createForm() {
    const form = document.getElementById('evaluationForm');
    const rankSelect = document.getElementById('scoutRank');

    // Load ranks into dropdown
    for (const rank in config.ranks) {
        const option = document.createElement('option');
        option.value = rank;
        option.textContent = `${rank} (${config.ranks[rank]}+ to pass)`;
        rankSelect.appendChild(option);
    }

    // Create input fields for each category
    for (const category in config.eval_categories) {
        const label = document.createElement('label');
        label.textContent = `${category}:`;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.max = 10;
        input.required = true;
        input.dataset.category = category;
        label.appendChild(input);
        form.appendChild(label);
    }
}

function calculateScore() {
    const name = document.getElementById('scoutName').value.trim();
    const rank = document.getElementById('scoutRank').value;
    const inputs = document.querySelectorAll('#evaluationForm input[data-category]');
    const resultBox = document.getElementById('result');
    const adultNames = document.querySelectorAll('.adult-name');
    const adultRatings = document.querySelectorAll('.adult-rating');

    let errors = [];

    // Validate name
    if (name === '') {
        errors.push("Scout Name is empty.");
    }

    // Validate category inputs
    inputs.forEach(input => {
        const cat = input.dataset.category;
        const value = input.value.trim();

        if (value === '') {
            errors.push(`${cat} category is empty.`);
        } else {
            const num = parseFloat(value);
            if (isNaN(num) || num < 0 || num > 10) {
                errors.push(`${cat} must be a number between 0 and 10.`);
            }
        }
    });

    // Validate adult inputs
    let adultTotal = 0;
    let numAdults = 0;
    for (let i = 0; i < adultRatings.length; i++) {
        const aName = adultNames[i].value.trim();
        const val = adultRatings[i].value.trim();

        if (aName === '' || val === '') {
            errors.push(`Adult ${i + 1} is incomplete.`);
            continue;
        }

        const score = parseFloat(val);
        if (isNaN(score) || score < 0 || score > 10) {
            errors.push(`Adult ${i + 1} rating must be between 0 and 10.`);
            continue;
        }

        adultTotal += score;
        numAdults++;
    }

    if (numAdults === 0) {
        errors.push("At least one adult rating is required.");
    }

    if (errors.length > 0) {
        resultBox.classList.add("error");
        resultBox.textContent = "Errors:\n" + errors.join('\n');
        return;
    }

    // Calculate weighted scores
    let total = 0;
    let weightSum = 0;

    inputs.forEach(input => {
        const cat = input.dataset.category;
        const score = parseFloat(input.value);
        const weight = config.eval_categories[cat];
        total += score * weight;
        weightSum += weight;
    });

    // Add adult weight
    const adultWeightTotal = 1.38;
    const perAdultWeight = adultWeightTotal / numAdults;
    weightSum += adultWeightTotal;

    adultRatings.forEach((input, i) => {
        const score = parseFloat(adultRatings[i].value);
        total += score * perAdultWeight;
    });

    // Final score is on a 0–10 scale, convert to 0–100 for display
    const finalScore = (total / weightSum) * 10;
    const passScore = config.ranks[rank];

    const resultText = `Scout: ${name}
Rank: ${rank}
Score: ${finalScore.toFixed(2)} / ${passScore.toFixed(2)}
Result: ${finalScore >= passScore ? 'PASS' : 'FAIL'}`;

    resultBox.classList.remove("error");
    resultBox.textContent = resultText;
}

function addAdult() {
    const container = document.getElementById('adultsContainer');
    const wrapper = document.createElement('div');
    wrapper.className = 'adult-entry';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Adult Name';
    nameInput.className = 'adult-name';

    const ratingInput = document.createElement('input');
    ratingInput.type = 'number';
    ratingInput.placeholder = 'Rating (1-10)';
    ratingInput.min = 1;
    ratingInput.max = 10;
    ratingInput.className = 'adult-rating';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-adult-btn';
    removeBtn.onclick = () => container.removeChild(wrapper);

    wrapper.appendChild(nameInput);
    wrapper.appendChild(ratingInput);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
}

// ==== Download Report Functionality ====

function generateReport() {
    const name = document.getElementById('scoutName').value.trim();
    const rank = document.getElementById('scoutRank').value;
    const inputs = document.querySelectorAll('#evaluationForm input[data-category]');
    const adultNames = document.querySelectorAll('.adult-name');
    const adultRatings = document.querySelectorAll('.adult-rating');

    const today = new Date();
    const dateStr = `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear()}`;
    let report = `Scout Evaluation Report\n=======================\nDate: ${dateStr}\n`;

    report += `Name: ${name}\n`;
    report += `Rank: ${rank}\n\n`;
    report += `Category Scores:\n`;

    inputs.forEach(input => {
        const cat = input.dataset.category;
        const score = input.value.trim();
        report += `  ${cat}: ${score}\n`;
    });

    report += `\nAdult Evaluations:\n`;
    for (let i = 0; i < adultRatings.length; i++) {
        const aName = adultNames[i].value.trim();
        const score = adultRatings[i].value.trim();
        report += `  ${aName}: ${score}\n`;
    }

    // Final score (reuse same logic)
    let total = 0;
    let weightSum = 0;

    inputs.forEach(input => {
        const cat = input.dataset.category;
        const score = parseFloat(input.value);
        const weight = config.eval_categories[cat];
        total += score * weight;
        weightSum += weight;
    });

    const adultWeightTotal = 1.38;
    const perAdultWeight = adultWeightTotal / adultRatings.length;
    weightSum += adultWeightTotal;

    adultRatings.forEach(input => {
        const score = parseFloat(input.value);
        total += score * perAdultWeight;
    });

    const finalScore = (total / weightSum) * 10;
    const passScore = config.ranks[rank];

    report += `\nFinal Score: ${finalScore.toFixed(2)} / ${passScore.toFixed(2)}\n`;
    report += `Result: ${finalScore >= passScore ? 'PASS' : 'FAIL'}\n`;

    return report;
}

function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const report = generateReport();
            const name = document.getElementById('scoutName').value.trim() || "scout";
            const rank = document.getElementById('scoutRank').value;

            const today = new Date();
            const dateStr = `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear()}`;
            const fileName = `${dateStr} - ${name}_${rank}_Evaluation.txt`;

            downloadTextFile(fileName, report);
        });
    }
});
