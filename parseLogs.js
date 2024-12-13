const fs = require('fs');

function parseLogs() {
    // The paths to the log files we want to read
    const filePaths = ['app.log', 'Lucid.log'];
    
    // Object to store different types of log events
    const logs = { 
        loginLogout: [], 
        configChanges: [], 
        daemonStopped: [] 
    };

    filePaths.forEach(filePath => {
        // Create a readable stream for each log file with UTF-8 encoding
        let readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
        
        // Variable to hold the last line fragment when splitting chunks
        let lastLineData = '';

        // Event listener for when data is read from the file
        readStream.on('data', chunk => {
            // Combine any previous partial line with the new chunk and split into lines
            let lines = (lastLineData + chunk).split('\n');
            
            // Save the last line of this chunk if it's not complete
            lastLineData = lines.pop() || ''; 

            // Process each complete line
            lines.forEach(line => {
                // Regex to match log entry format: time | level | pid | message
                const match = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \| (\w) \| (\d+) \| (.*)/);
                if (match) {
                    const [, time, level, pid, message] = match;

                    // Check for login/logout events
                    if (message.includes('Linked to Filespace') || message.includes('Unlinked from Filespace')) {
                        const userMatch = message.match(/user "([^"]+)"/);
                        const user = userMatch ? userMatch[1] : 'user1';
                        logs.loginLogout.push({ time, level, pid, user, action: message.includes('Linked') ? 'logged in' : 'logged out' });
                    }

                    // Check for configuration changes
                    if (message.includes('Config changed')) {
                        logs.configChanges.push({ 
                            time, 
                            level, 
                            pid, 
                            change: message.replace('Config changed. Informing running legacy apps.', '').trim() || 'unspecified' 
                        });
                    }

                    // Check if the daemon was stopped from outside the application
                    if (message.includes('Stopping Lucid daemon') && !message.includes('USER ACTION')) {
                        logs.daemonStopped.push({ time, level, pid, message });
                    }
                }
            });
        });

        // Event listener for when the stream ends (file reading is complete)
        readStream.on('end', () => {
            // Process any remaining data in lastLineData which wasn't a complete line
            if (lastLineData) {
                const match = lastLineData.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \| (\w) \| (\d+) \| (.*)/);
                if (match) {
                    const [, time, level, pid, message] = match;
                    // Handle this last line just like others in the 'data' event
                    if (message.includes('Linked to Filespace') || message.includes('Unlinked from Filespace')) {
                        const userMatch = message.match(/user "([^"]+)"/);
                        const user = userMatch ? userMatch[1] : 'user1';
                        logs.loginLogout.push({ time, level, pid, user, action: message.includes('Linked') ? 'logged in' : 'logged out' });
                    }
                    if (message.includes('Config changed')) {
                        logs.configChanges.push({ 
                            time, 
                            level, 
                            pid, 
                            change: message.replace('Config changed. Informing running legacy apps.', '').trim() || 'unspecified' 
                        });
                    }
                    if (message.includes('Stopping Lucid daemon') && !message.includes('USER ACTION')) {
                        logs.daemonStopped.push({ time, level, pid, message });
                    }
                }
            }
            // Only log the results after processing the last file
            if (filePath === filePaths[filePaths.length - 1]) {
                console.log('Login/Logout Events:', logs.loginLogout);
                console.log('Configuration Changes:', logs.configChanges);
                console.log('Daemon Stopped from Outside:', logs.daemonStopped);
            }
        });

        // Event listener for any errors during reading or processing
        readStream.on('error', error => {
            console.error(`Error reading or processing file ${filePath}:`, error.message);
        });
    });
}

// Call the function to start parsing the logs
parseLogs();
