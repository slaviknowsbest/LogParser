// Import the file system module for reading files
const fs = require('fs');

function parseLogs() {
    // Define the path to our log file
    const file = 'app.log';
    // Initialize an object to store different types of log events
    const logs = {
        loginLogout: [],
        configChanges: [],
        daemonStopped: []
    };

    // Create a readable stream for the log file with UTF-8 encoding
    const readStream = fs.createReadStream(file, { encoding: 'utf8' });

    // Buffer to store partial lines from chunks
    let buffer = '';

    // Event listener for incoming chunks of data from the file
    readStream.on('data', chunk => {
        // Append the new chunk to the buffer
        buffer += chunk;
        // Split the buffer into lines, keeping the last (potentially incomplete) line for later
        let lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line

        // Process each complete line
        lines.forEach(line => {
            // Regex to match log entry format: time | level | pid | message
            const match = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \| (\w) \| (\d+) \| (.*)/);
            if (match) {
                const [, time, level, pid, message] = match;
                const logEntry = { time, level, pid, message };

                // 1.1. User Login/Logout
                if (message.includes('Linked to Filespace') || message.includes('Unlinked from Filespace')) {
                    // Extract user name from the message or default to 'user1'
                    const userMatch = message.match(/user "([^"]+)"/);
                    const action = message.includes('Linked') ? 'logged in' : 'logged out';
                    logs.loginLogout.push({
                        ...logEntry,
                        user: userMatch ? userMatch[1] : 'user1',
                        action
                    });
                }

                // 1.2. Local Configuration Changes
                if (message.includes('Config changed')) {
                    // Extract any details about the config change or mark as unspecified
                    const changeDetails = message.replace('Config changed. Informing running legacy apps.', '').trim();
                    logs.configChanges.push({
                        ...logEntry,
                        change: changeDetails || 'unspecified'
                    });
                }

                // 1.3. Daemon Stopped from Outside
                if (message.includes('Stopping Lucid daemon') && !message.includes('USER ACTION')) {
                    // Log that the daemon was stopped externally
                    logs.daemonStopped.push(logEntry);
                }
            }
        });
    });

    // Event listener for when the stream ends (file reading is complete)
    readStream.on('end', () => {
        // Process any remaining data in the buffer (last line)
        if (buffer) {
            const match = buffer.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \| (\w) \| (\d+) \| (.*)/);
            if (match) {
                const [, time, level, pid, message] = match;
                const logEntry = { time, level, pid, message };

                // Handle the last line if it matches our criteria
                if (message.includes('Linked to Filespace') || message.includes('Unlinked from Filespace')) {
                    const userMatch = message.match(/user "([^"]+)"/);
                    const action = message.includes('Linked') ? 'logged in' : 'logged out';
                    logs.loginLogout.push({
                        ...logEntry,
                        user: userMatch ? userMatch[1] : 'unknown',
                        action
                    });
                }
                if (message.includes('Config changed')) {
                    const changeDetails = message.replace('Config changed. Informing running legacy apps.', '').trim();
                    logs.configChanges.push({
                        ...logEntry,
                        change: changeDetails || 'unspecified'
                    });
                }
                if (message.includes('Stopping Lucid daemon') && !message.includes('USER ACTION')) {
                    logs.daemonStopped.push(logEntry);
                }
            }
        }
        // Output the collected logs
        console.log('Login/Logout Events:', logs.loginLogout);
        console.log('Configuration Changes:', logs.configChanges);
        console.log('Daemon Stopped from Outside:', logs.daemonStopped);
    });

    // Event listener for errors during file reading
    readStream.on('error', error => {
        console.error('Error reading file:', error.message);
    });
}

// Call the function to start parsing the logs
parseLogs();