document.addEventListener('DOMContentLoaded', () => {
    const logBody = document.getElementById('logBody');

    chrome.storage.local.get('classificationLog', (result) => {
        const log = result.classificationLog || [];
        log.reverse().forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(entry.timestamp).toLocaleString()}</td>
                <td>${entry.text}</td>
                <td>${entry.classification}</td>
            `;
            logBody.appendChild(row);
        });
    });
});