document.addEventListener('DOMContentLoaded', () => {
    const logTableBody = document.getElementById('logTableBody');

    chrome.storage.local.get('classificationLog', (result) => {
        const log = result.classificationLog || [];
        log.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(entry.timestamp).toLocaleString()}</td>
                <td>${entry.author}</td>
                <td>${entry.text}</td>
                <td>${entry.classification}</td>
                <td>${entry.engagement.replies}</td>
                <td>${entry.engagement.retweets}</td>
                <td>${entry.engagement.likes}</td>
                <td>${entry.engagement.views}</td>
            `;
            logTableBody.appendChild(row);
        });
    });
});