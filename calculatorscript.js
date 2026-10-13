const display = document.getElementById("display");
const buttons = document.querySelector(".buttons");

// ===== State =====
let currentInput = "0";
let previousValue = null;
let operator = null;
let waitingForOperand = false;

// ===== Display Updates =====
function updateDisplay() {
    display.textContent = currentInput;

    // Dynamic font scaling
    const len = currentInput.length;
    display.classList.remove("long-number", "very-long-number");
    if (len > 12) {
        display.classList.add("very-long-number");
    } else if (len > 9) {
        display.classList.add("long-number");
    }
}

// ===== Floating Point Fix =====
function roundToPrecision(num) {
    return Math.round(num * 1e10) / 1e10;
}

function formatResult(number) {
    if (!Number.isFinite(number)) return "Error";
    const rounded = roundToPrecision(number);

    // Scientific notation for extreme values
    const abs = Math.abs(rounded);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
        let str = rounded.toExponential(6);
        // Clean up: remove unnecessary zeros in exponent
        str = str.replace(/\.?0+e/, "e");
        // Ensure + sign on negative exponents for consistency
        return str;
    }

    // Cap string length
    const str = String(rounded);
    if (str.length > 12) {
        return rounded.toPrecision(10).replace(/\.?0+$/, "");
    }
    return str;
}

// ===== Core Functions =====
function clearCalculator() {
    currentInput = "0";
    previousValue = null;
    operator = null;
    waitingForOperand = false;
    updateActiveOperator();
    updateDisplay();
}

function inputNumber(number) {
    if (currentInput === "Error") {
        clearCalculator();
    }

    if (waitingForOperand) {
        currentInput = number;
        waitingForOperand = false;
        updateActiveOperator();
    } else {
        // Limit input length
        if (currentInput.replace(/[^0-9]/g, "").length >= 12) return;
        currentInput = currentInput === "0" ? number : currentInput + number;
    }

    updateDisplay();
}

function inputDoubleZero() {
    if (currentInput === "Error") {
        clearCalculator();
        return;
    }

    if (waitingForOperand) {
        currentInput = "0";
        waitingForOperand = false;
        updateActiveOperator();
    } else if (currentInput !== "0") {
        // Limit length
        if (currentInput.replace(/[^0-9]/g, "").length + 2 > 12) return;
        currentInput += "00";
    }

    updateDisplay();
}

function inputDecimal() {
    if (currentInput === "Error") {
        clearCalculator();
    }

    if (waitingForOperand) {
        currentInput = "0.";
        waitingForOperand = false;
        updateActiveOperator();
    } else if (!currentInput.includes(".")) {
        currentInput += ".";
    }

    updateDisplay();
}

function calculate(a, b, op) {
    switch (op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return b === 0 ? null : a / b;
        default: return b;
    }
}

function chooseOperator(nextOperator) {
    if (currentInput === "Error") {
        clearCalculator();
        return;
    }

    const inputValue = Number(currentInput);

    if (operator && !waitingForOperand) {
        // Chain: evaluate previous operation first
        const result = calculate(previousValue, inputValue, operator);

        if (result === null) {
            currentInput = "Error";
            previousValue = null;
            operator = null;
            waitingForOperand = true;
            updateActiveOperator();
            updateDisplay();
            return;
        }

        currentInput = formatResult(result);
        updateDisplay();
        previousValue = Number(currentInput);
    } else {
        previousValue = inputValue;
    }

    operator = nextOperator;
    waitingForOperand = true;
    updateActiveOperator();
}

function calculateResult() {
    if (currentInput === "Error" || operator === null || previousValue === null) {
        return;
    }

    const secondValue = Number(currentInput);
    const result = calculate(previousValue, secondValue, operator);

    currentInput = result === null ? "Error" : formatResult(result);
    previousValue = null;
    operator = null;
    waitingForOperand = true;

    updateActiveOperator();
    updateDisplay();
}

function calculatePercent() {
    if (currentInput === "Error") {
        clearCalculator();
        return;
    }

    currentInput = formatResult(Number(currentInput) / 100);
    waitingForOperand = true;
    updateActiveOperator();
    updateDisplay();
}

// ===== Active Operator Highlight =====
function updateActiveOperator() {
    // Remove active class from all operator buttons
    document.querySelectorAll(".operator.active").forEach(btn => {
        btn.classList.remove("active");
    });

    // Add active class to the current operator if one is selected
    if (operator && waitingForOperand) {
        const activeBtn = buttons.querySelector(
            `.operator[data-value="${CSS.escape(operator)}"]`
        );
        if (activeBtn) {
            activeBtn.classList.add("active");
        }
    }
}

// ===== Event: Button Clicks =====
buttons.addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const value = button.dataset.value;

    if (action === "clear") {
        clearCalculator();
    } else if (action === "double-zero") {
        inputDoubleZero();
    } else if (action === "decimal") {
        inputDecimal();
    } else if (action === "percent") {
        calculatePercent();
    } else if (action === "operator") {
        chooseOperator(value);
    } else if (action === "equals") {
        calculateResult();
    } else if (value !== undefined) {
        inputNumber(value);
    }
});

// ===== Event: Keyboard Support =====
document.addEventListener("keydown", function (event) {
    const key = event.key;

    // Number keys
    if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        inputNumber(key);
        highlightButton(`[data-value="${key}"]`, ".num");
        return;
    }

    // Double zero
    if (key === "00" || (key === "0" && event.shiftKey)) {
        event.preventDefault();
        inputDoubleZero();
        highlightButton('[data-value="0"]', ".num.zero");
        return;
    }

    // Operators
    const operatorMap = {
        "+": "+",
        "-": "-",
        "*": "*",
        "/": "/",
    };
    if (operatorMap[key] !== undefined) {
        event.preventDefault();
        chooseOperator(operatorMap[key]);
        highlightButton(`[data-value="${operatorMap[key]}"]`, ".operator");
        return;
    }

    // Equals
    if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculateResult();
        highlightButton('[data-action="equals"]', ".operator");
        return;
    }

    // Decimal
    if (key === "." || key === ",") {
        event.preventDefault();
        inputDecimal();
        highlightButton('[data-action="decimal"]', ".num");
        return;
    }

    // Percent
    if (key === "%") {
        event.preventDefault();
        calculatePercent();
        highlightButton('[data-action="percent"]', ".function");
        return;
    }

    // Clear
    if (key === "Escape" || key === "Delete" || key === "c" || key === "C") {
        event.preventDefault();
        clearCalculator();
        highlightButton('[data-action="clear"]', ".function");
        return;
    }
});

// ===== Button Highlight Helper (keyboard feedback) =====
function highlightButton(selector, group) {
    const btn = buttons.querySelector(`${group}${selector}`);
    if (!btn) return;

    btn.style.filter = "brightness(1.4)";
    btn.style.transform = "scale(0.94)";

    setTimeout(() => {
        btn.style.filter = "";
        btn.style.transform = "";
    }, 120);
}

// ===== Initialize =====
updateDisplay();