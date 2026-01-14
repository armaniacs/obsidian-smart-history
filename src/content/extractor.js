console.log("Obsidian Smart History: Content Script Loaded (DEBUG MODE)");

// Default settings
let minVisitDuration = 5; // seconds
let minScrollDepth = 50;  // percentage

let startTime = Date.now();
let maxScrollPercentage = 0;
let isValidVisitReported = false;

// Load settings
chrome.storage.local.get(['min_visit_duration', 'min_scroll_depth'], (result) => {
    if (result.min_visit_duration) minVisitDuration = parseInt(result.min_visit_duration, 10);
    if (result.min_scroll_depth) minScrollDepth = parseInt(result.min_scroll_depth, 10);
    console.log(`Settings loaded: Min Dur=${minVisitDuration}s, Min Scroll=${minScrollDepth}%`);
});

function checkConditions() {
    if (isValidVisitReported) return;

    const duration = (Date.now() - startTime) / 1000;

    // DEBUG LOG: Show status every second
    // console.log(`Status: Duration=${duration.toFixed(1)}s, MaxScroll=${maxScrollPercentage.toFixed(1)}%`);

    // Check if conditions are met
    if (duration >= minVisitDuration && maxScrollPercentage >= minScrollDepth) {
        reportValidVisit();
    }
}

function updateMaxScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;

    // Prevent division by zero
    if (docHeight <= 0) return;

    const scrollPercentage = (scrollTop / docHeight) * 100;

    if (scrollPercentage > maxScrollPercentage) {
        maxScrollPercentage = scrollPercentage;
        // console.log(`New Max Scroll: ${maxScrollPercentage.toFixed(1)}%`);
    }

    checkConditions();
}

function reportValidVisit() {
    isValidVisitReported = true;
    console.log(">>> VALID VISIT DETECTED! Sending message to background... <<<");

    const content = document.body.innerText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 10000);

    try {
        chrome.runtime.sendMessage({
            type: 'VALID_VISIT',
            payload: {
                content: content
            }
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("SendMessage Error:", chrome.runtime.lastError.message);
            } else if (response && !response.success) {
                console.error("Background Worker Error:", response.error);
                alert(`Obsidian Smart History Error:\n${response.error}`); // Optional: alert the user directly
            } else {
                console.log("Message sent successfully. Response:", response);
            }
        });
    } catch (e) {
        console.error("Exception sending message:", e);
    }
}

// Event Listeners
window.addEventListener('scroll', updateMaxScroll);

// Check duration periodically
setInterval(checkConditions, 1000);


